#!/usr/bin/env python3
"""
Real Estate Time-Series Transformer Prototype
============================================

Purpose
-------
Proof-of-concept AI model for the 2026 국토교통 데이터 활용 경진대회 제품/서비스 개발 부문.
The model predicts apartment/officetel complex-level future movement signals from public transaction data.
It is designed to support explainable recommendation and decision-support, not investment advice.

Inputs
------
Default expected input file:
    artifacts/complex_monthly_features.csv

Expected columns:
    complex_id: str                  # e.g. lawdCode5|complexName|propertyType|areaBucket
    month: YYYY-MM or YYYYMM
    lawd_code5: str
    property_type: str               # apartment/officetel
    area_bucket: str                 # 59/74/84/officetel_30_45 etc.
    median_price: float              # monthly median deal amount
    weighted_price: float            # time-weighted price if precomputed
    trade_count: float
    rent_count: float
    jeonse_median: float
    jeonse_ratio: float
    drawdown_from_high: float
    transaction_heat: float
    reacceleration_score: float
    liquidity_score: float
    leader_score: float

Outputs
-------
Default output directory:
    artifacts/model_outputs/

Files produced by this script:
    transformer_predictions.csv
    transformer_metrics.json
    feature_manifest.json

Target definition
-----------------
By default the label is created from future 6-month price movement:
    y = 1 if future weighted_price / current weighted_price - 1 >= target_return_threshold else 0
This can be replaced with another label such as future trading heat, drawdown recovery, or sellability.

Run example
-----------
    python3 scripts/ai/real_estate_transformer_model.py \
      --input-path artifacts/complex_monthly_features.csv \
      --output-dir artifacts/model_outputs \
      --epochs 20

Notes
-----
This is a prototype proof for AI 활용 증빙. It should not be described as a finished valuation engine.
It produces decision-support signals only and must not be used as a buy/sell recommendation.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "PyTorch is required. Install it before running this prototype: pip install torch"
    ) from exc


FEATURE_COLUMNS = [
    "median_price",
    "weighted_price",
    "trade_count",
    "rent_count",
    "jeonse_median",
    "jeonse_ratio",
    "drawdown_from_high",
    "transaction_heat",
    "reacceleration_score",
    "liquidity_score",
    "leader_score",
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


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def parse_month(value) -> pd.Timestamp:
    text = str(value)
    if len(text) == 6 and text.isdigit():
        text = f"{text[:4]}-{text[4:]}"
    return pd.to_datetime(text).to_period("M").to_timestamp()


def load_features(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"complex_id", "month", *FEATURE_COLUMNS}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    df = df.copy()
    df["month"] = df["month"].map(parse_month)
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    df[FEATURE_COLUMNS] = df.groupby("complex_id")[FEATURE_COLUMNS].transform(lambda x: x.ffill().bfill())
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0.0)
    return df.sort_values(["complex_id", "month"]).reset_index(drop=True)


def make_samples(df: pd.DataFrame, cfg: TrainConfig) -> Tuple[np.ndarray, np.ndarray, List[dict]]:
    X: List[np.ndarray] = []
    y: List[int] = []
    meta: List[dict] = []
    for complex_id, group in df.groupby("complex_id", sort=False):
        group = group.sort_values("month").reset_index(drop=True)
        prices = group["weighted_price"].replace(0, np.nan).fillna(group["median_price"]).astype(float).values
        features = group[FEATURE_COLUMNS].astype(float).values
        for end in range(cfg.sequence_length, len(group) - cfg.horizon_months):
            current_price = prices[end - 1]
            future_price = prices[end + cfg.horizon_months - 1]
            if current_price <= 0 or future_price <= 0:
                continue
            future_return = future_price / current_price - 1.0
            target = int(future_return >= cfg.target_return_threshold)
            X.append(features[end - cfg.sequence_length:end])
            y.append(target)
            meta.append(
                {
                    "complex_id": complex_id,
                    "asof_month": str(group.loc[end - 1, "month"].date()),
                    "future_return": future_return,
                    "current_price": current_price,
                    "future_price": future_price,
                }
            )
    if not X:
        raise ValueError("No valid training samples were created. Check input coverage and sequence/horizon settings.")
    return np.stack(X), np.array(y, dtype=np.float32), meta


def standardize_train_test(X: np.ndarray, train_idx: np.ndarray, test_idx: np.ndarray):
    mean = X[train_idx].mean(axis=(0, 1), keepdims=True)
    std = X[train_idx].std(axis=(0, 1), keepdims=True)
    std[std < 1e-8] = 1.0
    return (X - mean) / std, mean.squeeze().tolist(), std.squeeze().tolist()


class RealEstateSequenceDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray, indices: np.ndarray):
        self.X = torch.tensor(X[indices], dtype=torch.float32)
        self.y = torch.tensor(y[indices], dtype=torch.float32)
        self.indices = indices

    def __len__(self) -> int:
        return len(self.indices)

    def __getitem__(self, idx: int):
        return self.X[idx], self.y[idx]


class RealEstateSignalTransformer(nn.Module):
    def __init__(self, n_features: int, cfg: TrainConfig):
        super().__init__()
        self.input_projection = nn.Linear(n_features, cfg.d_model)
        self.position_embedding = nn.Parameter(torch.zeros(1, cfg.sequence_length, cfg.d_model))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=cfg.d_model,
            nhead=cfg.nhead,
            dim_feedforward=cfg.d_model * 4,
            dropout=cfg.dropout,
            batch_first=True,
            activation="gelu",
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=cfg.num_layers)
        self.head = nn.Sequential(
            nn.LayerNorm(cfg.d_model),
            nn.Linear(cfg.d_model, cfg.d_model // 2),
            nn.GELU(),
            nn.Dropout(cfg.dropout),
            nn.Linear(cfg.d_model // 2, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.input_projection(x) + self.position_embedding[:, : x.shape[1], :]
        h = self.encoder(h)
        pooled = h[:, -1, :]
        return self.head(pooled).squeeze(-1)


def split_indices(n: int, test_ratio: float, seed: int) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    indices = np.arange(n)
    rng.shuffle(indices)
    test_size = max(1, int(n * test_ratio))
    test_idx = indices[:test_size]
    train_idx = indices[test_size:]
    if len(train_idx) == 0:
        raise ValueError("Training split is empty. Reduce test_ratio or add data.")
    return train_idx, test_idx


def train_model(model: nn.Module, train_loader: DataLoader, test_loader: DataLoader, cfg: TrainConfig, device: str):
    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg.learning_rate)
    criterion = nn.BCEWithLogitsLoss()
    history = []
    for epoch in range(1, cfg.epochs + 1):
        model.train()
        train_losses = []
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
        print(f"epoch={epoch:03d} loss={metrics['train_loss']:.4f} auc={metrics['auc']:.4f} acc={metrics['accuracy']:.4f}")
    return history


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


def evaluate_model(model: nn.Module, loader: DataLoader, device: str) -> dict:
    model.eval()
    scores = []
    labels = []
    with torch.no_grad():
        for xb, yb in loader:
            logits = model(xb.to(device))
            probs = torch.sigmoid(logits).cpu().numpy()
            scores.append(probs)
            labels.append(yb.numpy())
    y_score = np.concatenate(scores) if scores else np.array([])
    y_true = np.concatenate(labels) if labels else np.array([])
    if len(y_true) == 0:
        return {"accuracy": float("nan"), "auc": float("nan"), "positive_rate": float("nan")}
    y_pred = (y_score >= 0.5).astype(int)
    return {
        "accuracy": float((y_pred == y_true).mean()),
        "auc": safe_auc(y_true, y_score),
        "positive_rate": float(y_true.mean()),
    }


def predict_all(model: nn.Module, X: np.ndarray, meta: List[dict], device: str) -> pd.DataFrame:
    model.eval()
    with torch.no_grad():
        xb = torch.tensor(X, dtype=torch.float32).to(device)
        logits = model(xb)
        probs = torch.sigmoid(logits).cpu().numpy()
    out = pd.DataFrame(meta)
    out["prob_future_recovery"] = probs
    out["candidate_ai_score"] = (out["prob_future_recovery"] * 100).round(2)
    return out


def write_outputs(
    output_dir: str,
    predictions: pd.DataFrame,
    cfg: TrainConfig,
    history: List[dict],
    feature_mean: list,
    feature_std: list,
) -> None:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(out / "transformer_predictions.csv", index=False)
    metrics = {
        "config": asdict(cfg),
        "final_metrics": history[-1] if history else {},
        "history": history,
    }
    (out / "transformer_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2))
    manifest = {
        "features": FEATURE_COLUMNS,
        "standardization": {"mean": feature_mean, "std": feature_std},
        "outputs": ["prob_future_recovery", "candidate_ai_score"],
        "decision_use": "candidate ranking and explainable decision-support only; not investment advice",
    }
    (out / "feature_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))


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
    return parser


def main() -> None:
    args = make_arg_parser().parse_args()
    cfg = TrainConfig(**vars(args))
    set_seed(cfg.seed)
    df = load_features(cfg.input_path)
    X, y, meta = make_samples(df, cfg)
    train_idx, test_idx = split_indices(len(y), cfg.test_ratio, cfg.seed)
    X_scaled, feature_mean, feature_std = standardize_train_test(X, train_idx, test_idx)
    train_ds = RealEstateSequenceDataset(X_scaled, y, train_idx)
    test_ds = RealEstateSequenceDataset(X_scaled, y, test_idx)
    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=cfg.batch_size, shuffle=False)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = RealEstateSignalTransformer(n_features=len(FEATURE_COLUMNS), cfg=cfg)
    history = train_model(model, train_loader, test_loader, cfg, device)
    predictions = predict_all(model, X_scaled, meta, device)
    write_outputs(cfg.output_dir, predictions, cfg, history, feature_mean, feature_std)
    print(f"wrote outputs to {cfg.output_dir}")


if __name__ == "__main__":
    main()
