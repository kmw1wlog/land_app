#!/usr/bin/env python3
"""
Real Estate Time-Series Transformer Prototype
============================================

Purpose
-------
Proof-of-concept AI model for the 2026 국토교통 데이터 활용 경진대회 제품/서비스 개발 부문.
The model predicts complex-level future recovery signals from public transaction data and
supports explainable decision-support, not investment advice.

Inputs
------
Default expected input file:
    artifacts/complex_monthly_features.csv

Expected columns:
    complex_id
    month
    lawd_code5
    property_type
    area_bucket
    median_price
    weighted_price
    trade_count
    rent_count
    jeonse_median
    monthly_rent_median
    jeonse_ratio
    jeonse_ratio_change_3m
    drawdown_from_high
    recovery_from_trough
    price_mom_pct
    price_3m_momentum
    price_6m_momentum
    price_volatility_3m
    transaction_heat
    trade_mom_pct
    rent_mom_pct
    trade_count_3m
    trade_count_6m
    rent_count_3m
    rent_count_6m
    months_since_trade
    months_since_rent
    reacceleration_score
    liquidity_score
    leader_score
    region_weighted_price
    region_trade_count
    relative_price_to_region
    trade_share_in_region
    median_floor
    median_built_year
    kreb_sale_mom
    kreb_rent_mom
    kreb_volatility_score
    hug_jeonse_risk_score
    transit_accessibility_score
    commute_access_score
    fused_stability_score
    fusion_seed_flag

Outputs
-------
Default output directory:
    artifacts/model_outputs/

Files produced by this script:
    transformer_predictions.csv
    transformer_metrics.json
    feature_manifest.json

Notes
-----
This is a prototype proof for AI 활용 증빙. It should not be described as a finished
valuation engine. It produces decision-support signals only and must not be used as a
buy/sell recommendation.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Sequence, Tuple

import numpy as np
import pandas as pd

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "PyTorch is required. Install it with `pip install -r scripts/ai/requirements.txt`."
    ) from exc


FEATURE_COLUMNS = [
    "median_price",
    "weighted_price",
    "trade_count",
    "rent_count",
    "jeonse_median",
    "monthly_rent_median",
    "jeonse_ratio",
    "jeonse_ratio_change_3m",
    "drawdown_from_high",
    "recovery_from_trough",
    "price_mom_pct",
    "price_3m_momentum",
    "price_6m_momentum",
    "price_volatility_3m",
    "transaction_heat",
    "trade_mom_pct",
    "rent_mom_pct",
    "trade_count_3m",
    "trade_count_6m",
    "rent_count_3m",
    "rent_count_6m",
    "months_since_trade",
    "months_since_rent",
    "reacceleration_score",
    "liquidity_score",
    "leader_score",
    "region_weighted_price",
    "region_trade_count",
    "relative_price_to_region",
    "trade_share_in_region",
    "median_floor",
    "median_built_year",
    "kreb_sale_mom",
    "kreb_rent_mom",
    "kreb_volatility_score",
    "hug_jeonse_risk_score",
    "transit_accessibility_score",
    "commute_access_score",
    "fused_stability_score",
    "fusion_seed_flag",
]

TARGET_COLUMNS = [
    "future_recovery",
    "transaction_reactivation",
    "downside_risk",
]


@dataclass
class TrainConfig:
    input_path: str
    output_dir: str
    sequence_length: int = 12
    horizon_months: int = 6
    target_return_threshold: float = 0.03
    epochs: int = 20
    batch_size: int = 64
    learning_rate: float = 1e-3
    d_model: int = 64
    nhead: int = 4
    num_layers: int = 2
    dropout: float = 0.1
    seed: int = 42
    test_ratio: float = 0.2
    device: str = "auto"
    checkpoint_every: int = 1


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def parse_month(value: object) -> pd.Timestamp:
    text = str(value)
    if len(text) == 6 and text.isdigit():
        text = f"{text[:4]}-{text[4:]}"
    return pd.to_datetime(text).to_period("M").to_timestamp()


def load_features(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    default_fusion_columns = {
        "kreb_sale_mom": 0.0,
        "kreb_rent_mom": 0.0,
        "kreb_volatility_score": 45.0,
        "hug_jeonse_risk_score": 55.0,
        "transit_accessibility_score": 55.0,
        "commute_access_score": 55.0,
        "fused_stability_score": 55.0,
        "fusion_seed_flag": 0.0,
    }
    for column, default in default_fusion_columns.items():
        if column not in df.columns:
            df[column] = default
    required = {"complex_id", "month", *FEATURE_COLUMNS}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.copy()
    df["month"] = df["month"].map(parse_month)
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    # Forward fill only to avoid leaking future information into earlier months.
    df[FEATURE_COLUMNS] = df.groupby("complex_id", sort=False)[FEATURE_COLUMNS].transform(lambda col: col.ffill())
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0.0)
    return df.sort_values(["complex_id", "month"]).reset_index(drop=True)


def make_samples(
    df: pd.DataFrame, cfg: TrainConfig
) -> Tuple[np.ndarray, np.ndarray, List[dict], np.ndarray]:
    X: List[np.ndarray] = []
    y: List[List[int]] = []
    meta: List[dict] = []
    group_ids: List[str] = []

    for complex_id, group in df.groupby("complex_id", sort=False):
        group = group.sort_values("month").reset_index(drop=True)
        prices = (
            group["weighted_price"].replace(0, np.nan).fillna(group["median_price"]).astype(float).values
        )
        features = group[FEATURE_COLUMNS].astype(float).values
        max_start = len(group) - cfg.horizon_months + 1
        for end in range(cfg.sequence_length, max_start):
            current_price = prices[end - 1]
            future_price = prices[end + cfg.horizon_months - 1]
            if current_price <= 0 or future_price <= 0:
                continue
            future_return = future_price / current_price - 1.0
            future_window = group.iloc[end : end + cfg.horizon_months]
            current_trade_3m = float(group.loc[end - 1, "trade_count_3m"])
            future_trade_count = float(future_window["trade_count"].sum())
            future_recovery = int(future_return >= cfg.target_return_threshold)
            transaction_reactivation = int(
                future_trade_count >= max(2.0, current_trade_3m * 1.2)
                and future_trade_count > float(group.loc[end - 1, "trade_count"])
            )
            downside_risk = int(future_return <= -cfg.target_return_threshold)
            X.append(features[end - cfg.sequence_length : end])
            y.append([future_recovery, transaction_reactivation, downside_risk])
            meta.append(
                {
                    "complex_id": complex_id,
                    "asof_month": str(group.loc[end - 1, "month"].date()),
                    "future_return": future_return,
                    "current_price": current_price,
                    "future_price": future_price,
                    "current_trade_3m": current_trade_3m,
                    "future_trade_count": future_trade_count,
                }
            )
            group_ids.append(complex_id)

    if not X:
        raise ValueError(
            "No valid training samples were created. Check the input coverage or lower the sequence/horizon settings."
        )

    return np.stack(X), np.array(y, dtype=np.float32), meta, np.array(group_ids)


def split_indices_by_group(
    group_ids: np.ndarray, test_ratio: float, seed: int
) -> Tuple[np.ndarray, np.ndarray, List[str], List[str], str]:
    unique_groups = np.unique(group_ids)
    if len(unique_groups) == 1:
        indices = np.arange(len(group_ids))
        split_at = max(1, int(len(indices) * (1 - test_ratio)))
        split_at = min(split_at, len(indices) - 1)
        train_idx = indices[:split_at]
        test_idx = indices[split_at:]
        return train_idx, test_idx, [str(unique_groups[0])], [str(unique_groups[0])], "single_group_time_fallback"

    rng = np.random.default_rng(seed)
    shuffled = unique_groups.copy()
    rng.shuffle(shuffled)
    test_size = max(1, int(len(shuffled) * test_ratio))
    test_groups = set(shuffled[:test_size].tolist())
    test_mask = np.isin(group_ids, list(test_groups))
    test_idx = np.flatnonzero(test_mask)
    train_idx = np.flatnonzero(~test_mask)
    if len(train_idx) == 0 or len(test_idx) == 0:
        raise ValueError("Group split produced an empty train/test set. Add more complexes or lower test_ratio.")

    train_groups = sorted(set(group_ids[train_idx].tolist()))
    held_out_groups = sorted(set(group_ids[test_idx].tolist()))
    return train_idx, test_idx, train_groups, held_out_groups, "group_holdout"


def standardize_from_train(X: np.ndarray, train_idx: np.ndarray) -> Tuple[np.ndarray, list, list]:
    mean = X[train_idx].mean(axis=(0, 1), keepdims=True)
    std = X[train_idx].std(axis=(0, 1), keepdims=True)
    std[std < 1e-8] = 1.0
    return (X - mean) / std, mean.squeeze().tolist(), std.squeeze().tolist()


class RealEstateSequenceDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray, indices: np.ndarray):
        self.X = torch.tensor(X[indices], dtype=torch.float32)
        self.y = torch.tensor(y[indices], dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.y)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.X[idx], self.y[idx]


class RealEstateSignalTransformer(nn.Module):
    def __init__(self, n_features: int, cfg: TrainConfig):
        super().__init__()
        self.input_norm = nn.LayerNorm(n_features)
        self.input_projection = nn.Linear(n_features, cfg.d_model)
        self.position_embedding = nn.Parameter(torch.zeros(1, cfg.sequence_length, cfg.d_model))
        self.temporal_mixer = nn.Conv1d(
            cfg.d_model,
            cfg.d_model,
            kernel_size=3,
            padding=1,
            groups=1,
        )
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=cfg.d_model,
            nhead=cfg.nhead,
            dim_feedforward=cfg.d_model * 4,
            dropout=cfg.dropout,
            batch_first=True,
            activation="gelu",
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=cfg.num_layers)
        self.attention_pool = nn.Sequential(
            nn.Linear(cfg.d_model, cfg.d_model // 2),
            nn.GELU(),
            nn.Linear(cfg.d_model // 2, 1),
        )
        self.head = nn.Sequential(
            nn.LayerNorm(cfg.d_model * 2),
            nn.Linear(cfg.d_model * 2, cfg.d_model),
            nn.GELU(),
            nn.Dropout(cfg.dropout),
            nn.Linear(cfg.d_model, cfg.d_model // 2),
            nn.GELU(),
            nn.Dropout(cfg.dropout),
            nn.Linear(cfg.d_model // 2, len(TARGET_COLUMNS)),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        hidden = self.input_projection(self.input_norm(x)) + self.position_embedding[:, : x.shape[1], :]
        mixed = self.temporal_mixer(hidden.transpose(1, 2)).transpose(1, 2)
        hidden = hidden + torch.nn.functional.gelu(mixed)
        hidden = self.encoder(hidden)
        weights = torch.softmax(self.attention_pool(hidden), dim=1)
        pooled = (hidden * weights).sum(dim=1)
        last_token = hidden[:, -1, :]
        return self.head(torch.cat([pooled, last_token], dim=-1))


def safe_auc(y_true: np.ndarray, y_score: np.ndarray) -> float:
    pos = y_true == 1
    neg = y_true == 0
    if pos.sum() == 0 or neg.sum() == 0:
        return float("nan")
    ranks = pd.Series(y_score).rank(method="average").to_numpy()
    rank_sum_pos = ranks[pos].sum()
    n_pos = pos.sum()
    n_neg = neg.sum()
    return float((rank_sum_pos - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def summarize_multitarget_metrics(y_true: np.ndarray, y_score: np.ndarray) -> dict:
    if len(y_true) == 0:
        return {
            "accuracy": float("nan"),
            "mean_auc": float("nan"),
            "targets": {},
        }
    y_pred = (y_score >= 0.5).astype(int)
    target_metrics: dict[str, dict[str, float]] = {}
    auc_values: list[float] = []
    for idx, target_name in enumerate(TARGET_COLUMNS):
        target_auc = safe_auc(y_true[:, idx], y_score[:, idx])
        if not np.isnan(target_auc):
            auc_values.append(target_auc)
        target_metrics[target_name] = {
            "accuracy": float((y_pred[:, idx] == y_true[:, idx]).mean()),
            "auc": target_auc,
            "positive_rate": float(y_true[:, idx].mean()),
        }

    return {
        "accuracy": float((y_pred == y_true).mean()),
        "exact_match_accuracy": float((y_pred == y_true).all(axis=1).mean()),
        "mean_auc": float(np.mean(auc_values)) if auc_values else float("nan"),
        "targets": target_metrics,
    }


def evaluate_model(model: nn.Module, loader: DataLoader, device: str) -> dict:
    model.eval()
    scores: List[np.ndarray] = []
    labels: List[np.ndarray] = []
    with torch.no_grad():
        for xb, yb in loader:
            logits = model(xb.to(device))
            probs = torch.sigmoid(logits).cpu().numpy()
            scores.append(probs)
            labels.append(yb.numpy())
    y_score = np.concatenate(scores) if scores else np.array([])
    y_true = np.concatenate(labels) if labels else np.array([])
    return summarize_multitarget_metrics(y_true, y_score)


def metric_value(metrics: dict, key: str) -> float:
    value = metrics.get(key, float("nan"))
    return float(value) if value == value else float("-inf")


def save_training_checkpoint(
    checkpoint_dir: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    cfg: TrainConfig,
    epoch: int,
    metrics: dict,
    history: List[dict],
    name: str,
) -> None:
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = checkpoint_dir / name
    tmp_path = checkpoint_dir / f".{name}.tmp"
    torch.save(
        {
            "epoch": epoch,
            "config": asdict(cfg),
            "feature_columns": FEATURE_COLUMNS,
            "target_columns": TARGET_COLUMNS,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "metrics": metrics,
            "history": history,
        },
        tmp_path,
    )
    tmp_path.replace(checkpoint_path)


def train_model(
    model: nn.Module, train_loader: DataLoader, test_loader: DataLoader, cfg: TrainConfig, device: str
) -> List[dict]:
    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg.learning_rate)
    train_labels = train_loader.dataset.y
    positive_counts = train_labels.sum(dim=0)
    negative_counts = len(train_labels) - positive_counts
    positive_weights = torch.where(
        positive_counts > 0,
        negative_counts / positive_counts.clamp(min=1.0),
        torch.ones_like(positive_counts),
    )
    criterion = nn.BCEWithLogitsLoss(pos_weight=positive_weights.to(device))
    history: List[dict] = []
    checkpoint_dir = Path(cfg.output_dir) / "checkpoints"
    best_mean_auc = float("-inf")

    for epoch in range(1, cfg.epochs + 1):
        model.train()
        train_losses: List[float] = []
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()
            train_losses.append(float(loss.detach().cpu()))

        metrics = evaluate_model(model, test_loader, device)
        metrics["epoch"] = epoch
        metrics["train_loss"] = float(np.mean(train_losses))
        history.append(metrics)
        (checkpoint_dir / "training_history_partial.json").parent.mkdir(parents=True, exist_ok=True)
        (checkpoint_dir / "training_history_partial.json").write_text(
            json.dumps(history, ensure_ascii=False, indent=2)
        )
        save_training_checkpoint(
            checkpoint_dir,
            model,
            optimizer,
            cfg,
            epoch,
            metrics,
            history,
            "latest.pt",
        )
        current_mean_auc = metric_value(metrics, "mean_auc")
        if current_mean_auc > best_mean_auc:
            best_mean_auc = current_mean_auc
            save_training_checkpoint(
                checkpoint_dir,
                model,
                optimizer,
                cfg,
                epoch,
                metrics,
                history,
                "best_mean_auc.pt",
            )
        if cfg.checkpoint_every > 0 and epoch % cfg.checkpoint_every == 0:
            save_training_checkpoint(
                checkpoint_dir,
                model,
                optimizer,
                cfg,
                epoch,
                metrics,
                history,
                f"epoch_{epoch:03d}.pt",
            )
        print(
            "epoch={epoch:03d} loss={loss:.4f} mean_auc={auc:.4f} acc={acc:.4f} recovery_auc={recovery_auc:.4f}".format(
                epoch=epoch,
                loss=metrics["train_loss"],
                auc=metrics["mean_auc"],
                acc=metrics["accuracy"],
                recovery_auc=metrics["targets"].get("future_recovery", {}).get("auc", float("nan")),
            ),
            flush=True,
        )

    return history


def predict_all(model: nn.Module, X: np.ndarray, meta: List[dict], device: str) -> pd.DataFrame:
    model.eval()
    with torch.no_grad():
        xb = torch.tensor(X, dtype=torch.float32).to(device)
        logits = model(xb)
        probs = torch.sigmoid(logits).cpu().numpy()
    out = pd.DataFrame(meta)
    out["prob_future_recovery"] = probs[:, 0]
    out["prob_transaction_reactivation"] = probs[:, 1]
    out["prob_downside_risk"] = probs[:, 2]
    out["candidate_ai_score"] = (
        (
            0.55 * out["prob_future_recovery"]
            + 0.25 * out["prob_transaction_reactivation"]
            + 0.20 * (1.0 - out["prob_downside_risk"])
        )
        * 100
    ).round(2)
    return out


def resolve_device(requested: str) -> str:
    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available in this environment.")
    if requested not in {"cpu", "cuda"}:
        raise ValueError("device must be one of: auto, cpu, cuda")
    return requested


def write_outputs(
    output_dir: str,
    predictions: pd.DataFrame,
    cfg: TrainConfig,
    history: List[dict],
    feature_mean: list,
    feature_std: list,
    train_groups: Sequence[str],
    test_groups: Sequence[str],
    split_strategy: str,
    device: str,
) -> None:
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(out_dir / "transformer_predictions.csv", index=False)

    metrics = {
        "config": asdict(cfg),
        "device": device,
        "split_strategy": split_strategy,
        "train_complex_count": len(train_groups),
        "test_complex_count": len(test_groups),
        "train_complex_ids": list(train_groups),
        "test_complex_ids": list(test_groups),
        "final_metrics": history[-1] if history else {},
        "history": history,
    }
    (out_dir / "transformer_metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2)
    )

    manifest = {
        "features": FEATURE_COLUMNS,
        "targets": TARGET_COLUMNS,
        "standardization": {"mean": feature_mean, "std": feature_std},
        "outputs": [
            "prob_future_recovery",
            "prob_transaction_reactivation",
            "prob_downside_risk",
            "candidate_ai_score",
        ],
        "decision_use": "candidate ranking and explainable decision-support only; not investment advice",
    }
    (out_dir / "feature_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )


def make_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train a real-estate signal Transformer prototype.")
    parser.add_argument("--input-path", default="artifacts/complex_monthly_features.csv")
    parser.add_argument("--output-dir", default="artifacts/model_outputs")
    parser.add_argument("--sequence-length", type=int, default=12)
    parser.add_argument("--horizon-months", type=int, default=6)
    parser.add_argument("--target-return-threshold", type=float, default=0.03)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--d-model", type=int, default=64)
    parser.add_argument("--nhead", type=int, default=4)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test-ratio", type=float, default=0.2)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--checkpoint-every", type=int, default=1)
    return parser


def main() -> None:
    args = make_arg_parser().parse_args()
    cfg = TrainConfig(**vars(args))
    set_seed(cfg.seed)

    df = load_features(cfg.input_path)
    X, y, meta, group_ids = make_samples(df, cfg)
    train_idx, test_idx, train_groups, test_groups, split_strategy = split_indices_by_group(
        group_ids, cfg.test_ratio, cfg.seed
    )
    X_scaled, feature_mean, feature_std = standardize_from_train(X, train_idx)
    split_labels = np.array(["train"] * len(meta), dtype=object)
    split_labels[test_idx] = "test"

    train_ds = RealEstateSequenceDataset(X_scaled, y, train_idx)
    test_ds = RealEstateSequenceDataset(X_scaled, y, test_idx)
    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=cfg.batch_size, shuffle=False)
    device = resolve_device(cfg.device)
    print(
        f"training_samples={len(train_idx)} test_samples={len(test_idx)} "
        f"train_complexes={len(train_groups)} test_complexes={len(test_groups)} device={device}",
        flush=True,
    )

    model = RealEstateSignalTransformer(n_features=len(FEATURE_COLUMNS), cfg=cfg)
    history = train_model(model, train_loader, test_loader, cfg, device)
    predictions = predict_all(model, X_scaled, meta, device)
    predictions["split"] = split_labels

    write_outputs(
        cfg.output_dir,
        predictions,
        cfg,
        history,
        feature_mean,
        feature_std,
        train_groups,
        test_groups,
        split_strategy,
        device,
    )
    print(f"wrote outputs to {cfg.output_dir}", flush=True)


if __name__ == "__main__":
    main()
