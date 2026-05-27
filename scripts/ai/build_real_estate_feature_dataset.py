#!/usr/bin/env python3
"""
Build monthly complex-level features for the HomePath Transformer prototype.

The source is the local Prisma SQLite database. The output is a compact CSV that can be
fed directly into `real_estate_transformer_model.py`.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd


def area_bucket_from_area(area_m2: float | None) -> str:
    if area_m2 is None or pd.isna(area_m2):
        return "unknown"
    if area_m2 < 40:
        return "under_40"
    if area_m2 < 67:
        return "59"
    if area_m2 < 80:
        return "74"
    if area_m2 < 95:
        return "84"
    if area_m2 <= 101:
        return "101"
    return "over_101"


def load_transactions(db_path: str) -> pd.DataFrame:
    query = """
        SELECT
            lawdCode5 AS lawd_code5,
            propertyType AS property_type,
            dealType AS deal_type,
            complexName AS complex_name,
            areaM2 AS area_m2,
            dealYear AS deal_year,
            dealMonth AS deal_month,
            dealAmount AS deal_amount,
            deposit,
            monthlyRent AS monthly_rent,
            floor,
            builtYear AS built_year
        FROM RealTransaction
        WHERE complexName IS NOT NULL
          AND dealYear IS NOT NULL
          AND dealMonth IS NOT NULL
          AND propertyType IN ('apartment', 'officetel')
    """
    with sqlite3.connect(db_path) as conn:
        df = pd.read_sql_query(query, conn)
    if df.empty:
        raise ValueError("No real transactions found in the source database.")
    return df


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["area_bucket"] = df["area_m2"].map(area_bucket_from_area)
    df["month"] = pd.to_datetime(
        {
            "year": df["deal_year"].astype(int),
            "month": df["deal_month"].astype(int),
            "day": 1,
        }
    )
    df["complex_id"] = (
        df["lawd_code5"].astype(str)
        + "|"
        + df["complex_name"].astype(str)
        + "|"
        + df["property_type"].astype(str)
        + "|"
        + df["area_bucket"].astype(str)
    )

    trade = (
        df[df["deal_type"] == "trade"]
        .dropna(subset=["deal_amount"])
        .groupby(["complex_id", "lawd_code5", "property_type", "area_bucket", "month"], as_index=False)
        .agg(
            median_price=("deal_amount", "median"),
            trade_count=("deal_amount", "size"),
            median_floor=("floor", "median"),
            median_built_year=("built_year", "median"),
        )
    )
    rent = (
        df[df["deal_type"] == "rent"]
        .dropna(subset=["deposit"])
        .groupby(["complex_id", "lawd_code5", "property_type", "area_bucket", "month"], as_index=False)
        .agg(
            rent_count=("deposit", "size"),
            jeonse_median=("deposit", "median"),
            monthly_rent_median=("monthly_rent", "median"),
        )
    )

    grouped = pd.merge(
        trade,
        rent,
        on=["complex_id", "lawd_code5", "property_type", "area_bucket", "month"],
        how="outer",
    )
    grouped = grouped.sort_values(["complex_id", "month"]).reset_index(drop=True)

    full_frames: list[pd.DataFrame] = []
    for complex_id, group in grouped.groupby("complex_id", sort=False):
        base = group.iloc[0]
        month_index = pd.period_range(group["month"].min(), group["month"].max(), freq="M").to_timestamp()
        dense = pd.DataFrame({"month": month_index})
        dense["complex_id"] = complex_id
        dense["lawd_code5"] = base["lawd_code5"]
        dense["property_type"] = base["property_type"]
        dense["area_bucket"] = base["area_bucket"]
        dense = dense.merge(group, on=["complex_id", "lawd_code5", "property_type", "area_bucket", "month"], how="left")
        dense["trade_count"] = dense["trade_count"].fillna(0)
        dense["rent_count"] = dense["rent_count"].fillna(0)
        dense["median_price"] = dense["median_price"].ffill()
        dense["jeonse_median"] = dense["jeonse_median"].ffill()
        dense["monthly_rent_median"] = dense["monthly_rent_median"].ffill()
        dense["median_floor"] = dense["median_floor"].ffill().bfill()
        dense["median_built_year"] = dense["median_built_year"].ffill().bfill()
        dense["weighted_price"] = dense["median_price"].ewm(span=3, adjust=False, min_periods=1).mean()
        dense["weighted_price"] = dense["weighted_price"].fillna(dense["median_price"])
        dense["weighted_price"] = dense["weighted_price"].fillna(0)
        price_for_change = dense["weighted_price"].replace(0, np.nan)
        dense["price_mom_pct"] = price_for_change.pct_change(fill_method=None).replace([np.inf, -np.inf], np.nan) * 100.0
        dense["price_3m_momentum"] = ((price_for_change / price_for_change.shift(3)) - 1.0) * 100.0
        dense["price_6m_momentum"] = ((price_for_change / price_for_change.shift(6)) - 1.0) * 100.0
        dense["price_volatility_3m"] = price_for_change.pct_change(fill_method=None).rolling(3, min_periods=2).std() * 100.0
        running_high = dense["weighted_price"].replace(0, np.nan).cummax()
        dense["drawdown_from_high"] = np.where(
            running_high.gt(0),
            (dense["weighted_price"] / running_high - 1.0) * 100.0,
            0.0,
        )
        running_low = dense["weighted_price"].replace(0, np.nan).cummin()
        dense["recovery_from_trough"] = np.where(
            running_low.gt(0),
            (dense["weighted_price"] / running_low - 1.0) * 100.0,
            0.0,
        )
        prev_trade_mean = dense["trade_count"].rolling(3, min_periods=1).mean().shift(1)
        prev_trade_mean = prev_trade_mean.replace(0, np.nan)
        dense["transaction_heat"] = (dense["trade_count"] / prev_trade_mean).fillna(dense["trade_count"].clip(lower=0))
        prev_rent_mean = dense["rent_count"].rolling(3, min_periods=1).mean().shift(1)
        prev_rent_mean = prev_rent_mean.replace(0, np.nan)
        dense["trade_mom_pct"] = ((dense["trade_count"] / prev_trade_mean) - 1.0) * 100.0
        dense["rent_mom_pct"] = ((dense["rent_count"] / prev_rent_mean) - 1.0) * 100.0
        dense["trade_count_3m"] = dense["trade_count"].rolling(3, min_periods=1).sum()
        dense["trade_count_6m"] = dense["trade_count"].rolling(6, min_periods=1).sum()
        dense["rent_count_3m"] = dense["rent_count"].rolling(3, min_periods=1).sum()
        dense["rent_count_6m"] = dense["rent_count"].rolling(6, min_periods=1).sum()
        recent_trade = dense["trade_count"].rolling(2, min_periods=1).mean()
        prior_trade = recent_trade.shift(2).replace(0, np.nan)
        dense["reacceleration_score"] = (recent_trade / prior_trade).fillna(1.0)
        rolling_liquidity = dense["trade_count"].rolling(3, min_periods=1).sum()
        max_liquidity = float(rolling_liquidity.max()) if len(rolling_liquidity) else 0.0
        if max_liquidity > 0:
            dense["liquidity_score"] = (rolling_liquidity / max_liquidity) * 100.0
        else:
            dense["liquidity_score"] = 0.0
        dense["jeonse_ratio"] = np.where(
            dense["weighted_price"].gt(0) & dense["jeonse_median"].notna(),
            (dense["jeonse_median"] / dense["weighted_price"]) * 100.0,
            0.0,
        )
        dense["jeonse_ratio_change_3m"] = dense["jeonse_ratio"] - dense["jeonse_ratio"].shift(3)

        months_since_trade: list[int] = []
        months_since_rent: list[int] = []
        last_trade_index = -1
        last_rent_index = -1
        for idx, row in dense.reset_index(drop=True).iterrows():
            if float(row["trade_count"]) > 0:
                last_trade_index = idx
            if float(row["rent_count"]) > 0:
                last_rent_index = idx
            months_since_trade.append(idx - last_trade_index if last_trade_index >= 0 else idx + 1)
            months_since_rent.append(idx - last_rent_index if last_rent_index >= 0 else idx + 1)
        dense["months_since_trade"] = months_since_trade
        dense["months_since_rent"] = months_since_rent
        full_frames.append(dense)

    features = pd.concat(full_frames, ignore_index=True)
    region_keys = ["lawd_code5", "month", "property_type"]
    features["region_weighted_price"] = features.groupby(region_keys)["weighted_price"].transform(
        lambda values: values.replace(0, np.nan).median()
    )
    features["region_trade_count"] = features.groupby(region_keys)["trade_count"].transform("sum")
    features["relative_price_to_region"] = np.where(
        features["region_weighted_price"].gt(0),
        (features["weighted_price"] / features["region_weighted_price"] - 1.0) * 100.0,
        0.0,
    )
    features["trade_share_in_region"] = np.where(
        features["region_trade_count"].gt(0),
        (features["trade_count"] / features["region_trade_count"]) * 100.0,
        0.0,
    )
    leader_rank = features.groupby(["lawd_code5", "month", "property_type"])["weighted_price"].rank(
        pct=True, method="average"
    )
    features["leader_score"] = leader_rank.fillna(0.0) * 100.0
    features["median_price"] = features["median_price"].fillna(0.0)
    features["jeonse_median"] = features["jeonse_median"].fillna(0.0)
    features["monthly_rent_median"] = features["monthly_rent_median"].fillna(0.0)
    features["median_floor"] = features["median_floor"].fillna(0.0)
    features["median_built_year"] = features["median_built_year"].fillna(0.0)
    numeric_cols = [
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
    ]
    features[numeric_cols] = features[numeric_cols].replace([np.inf, -np.inf], 0.0).fillna(0.0)
    features["month"] = features["month"].dt.strftime("%Y-%m")
    return features[
        [
            "complex_id",
            "month",
            "lawd_code5",
            "property_type",
            "area_bucket",
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
        ]
    ].sort_values(["complex_id", "month"])


def enrich_with_fusion_seed_features(
    features: pd.DataFrame,
    kreb_seed_path: str,
    hug_seed_path: str,
    transport_seed_path: str,
) -> pd.DataFrame:
    enriched = features.copy()
    enriched["lawd_code5"] = enriched["lawd_code5"].astype(str)
    enriched["fusion_seed_flag"] = 0.0
    enriched["fusion_real_provider_count"] = 1.0
    enriched["fusion_confidence"] = 0.4

    kreb_path = Path(kreb_seed_path)
    if kreb_path.exists():
        kreb = pd.read_csv(kreb_path, dtype={"lawdCode5": str})
        kreb = kreb.rename(
            columns={
                "lawdCode5": "lawd_code5",
                "saleIndex": "kreb_sale_index",
                "rentIndex": "kreb_rent_index",
                "saleMom": "kreb_sale_mom",
                "rentMom": "kreb_rent_mom",
                "volatilityScore": "kreb_volatility_score",
            }
        )
        enriched = enriched.merge(
            kreb[
                [
                    "month",
                    "lawd_code5",
                    "kreb_sale_index",
                    "kreb_rent_index",
                    "kreb_sale_mom",
                    "kreb_rent_mom",
                    "kreb_volatility_score",
                ]
            ],
            on=["month", "lawd_code5"],
            how="left",
        )
        enriched["fusion_seed_flag"] = np.where(enriched["kreb_sale_mom"].notna(), 1.0, enriched["fusion_seed_flag"])
        if "sourceType" in kreb.columns and (kreb["sourceType"] == "real").all():
            enriched["fusion_real_provider_count"] = np.where(enriched["kreb_sale_mom"].notna(), enriched["fusion_real_provider_count"] + 1.0, enriched["fusion_real_provider_count"])
            enriched["fusion_confidence"] = np.where(enriched["kreb_sale_mom"].notna(), enriched["fusion_confidence"] + 0.2, enriched["fusion_confidence"])

    hug_path = Path(hug_seed_path)
    if hug_path.exists():
        hug = pd.read_csv(hug_path, dtype={"lawdCode5": str})
        hug = hug.rename(columns={"lawdCode5": "lawd_code5", "jeonseRiskScore": "hug_jeonse_risk_score"})
        enriched = enriched.merge(
            hug[["month", "lawd_code5", "hug_jeonse_risk_score"]],
            on=["month", "lawd_code5"],
            how="left",
        )
        enriched["fusion_seed_flag"] = np.where(enriched["hug_jeonse_risk_score"].notna(), 1.0, enriched["fusion_seed_flag"])
        if "sourceType" in hug.columns and (hug["sourceType"] == "real").all():
            enriched["fusion_real_provider_count"] = np.where(enriched["hug_jeonse_risk_score"].notna(), enriched["fusion_real_provider_count"] + 1.0, enriched["fusion_real_provider_count"])
            enriched["fusion_confidence"] = np.where(enriched["hug_jeonse_risk_score"].notna(), enriched["fusion_confidence"] + 0.2, enriched["fusion_confidence"])

    transport_path = Path(transport_seed_path)
    if transport_path.exists():
        transport = pd.read_csv(transport_path, dtype={"lawdCode5": str})
        transport = transport.rename(
            columns={
                "lawdCode5": "lawd_code5",
                "transitAccessibilityScore": "transit_accessibility_score",
                "commuteAccessScore": "commute_access_score",
            }
        )
        enriched = enriched.merge(
            transport[["lawd_code5", "transit_accessibility_score", "commute_access_score"]].drop_duplicates("lawd_code5"),
            on="lawd_code5",
            how="left",
        )
        enriched["fusion_seed_flag"] = np.where(enriched["transit_accessibility_score"].notna(), 1.0, enriched["fusion_seed_flag"])
        if "sourceType" in transport.columns and (transport["sourceType"] == "real").all():
            enriched["fusion_real_provider_count"] = np.where(enriched["transit_accessibility_score"].notna(), enriched["fusion_real_provider_count"] + 1.0, enriched["fusion_real_provider_count"])
            enriched["fusion_confidence"] = np.where(enriched["transit_accessibility_score"].notna(), enriched["fusion_confidence"] + 0.2, enriched["fusion_confidence"])

    defaults = {
        "kreb_sale_index": 0.0,
        "kreb_rent_index": 0.0,
        "kreb_sale_mom": 0.0,
        "kreb_rent_mom": 0.0,
        "kreb_volatility_score": 45.0,
        "hug_jeonse_risk_score": 55.0,
        "transit_accessibility_score": 55.0,
        "commute_access_score": 55.0,
        "fusion_confidence": 0.4,
        "fusion_real_provider_count": 1.0,
    }
    for column, default in defaults.items():
        if column not in enriched.columns:
            enriched[column] = default
        enriched[column] = enriched[column].replace([np.inf, -np.inf], np.nan).fillna(default).astype(float)

    molit_score = (
        55
        + enriched["transaction_heat"].clip(0, 3) / 3 * 18
        + np.where(enriched["jeonse_ratio"].between(45, 70), 14, 5)
        + np.where(enriched["drawdown_from_high"].abs().between(5, 18), 8, 4)
    ).clip(0, 100)
    kreb_score = (
        70
        + enriched["kreb_sale_mom"].clip(-1.5, 1.5) * 8
        + enriched["kreb_rent_mom"].clip(-1.5, 1.5) * 4
        - enriched["kreb_volatility_score"].clip(0, 100) * 0.35
    ).clip(0, 100)
    hug_score = (100 - enriched["hug_jeonse_risk_score"].clip(0, 100)).clip(0, 100)
    transit_score = enriched["transit_accessibility_score"].clip(0, 100)
    enriched["fused_stability_score"] = (molit_score * 0.4 + kreb_score * 0.2 + hug_score * 0.2 + transit_score * 0.2).round(2)
    enriched["fusion_confidence"] = enriched["fusion_confidence"].clip(0, 1).round(2)
    enriched["fusion_real_provider_count"] = enriched["fusion_real_provider_count"].clip(0, 4)
    return enriched


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build complex monthly features from the local SQLite database.")
    parser.add_argument("--db-path", default="prisma/dev.db")
    parser.add_argument("--output-path", default="artifacts/complex_monthly_features.csv")
    parser.add_argument("--summary-path", default="artifacts/complex_monthly_features.summary.json")
    parser.add_argument("--kreb-seed-path", default="data/fusion/kreb_region_index_seed.csv")
    parser.add_argument("--hug-seed-path", default="data/fusion/hug_jeonse_risk_seed.csv")
    parser.add_argument("--transport-seed-path", default="data/fusion/transport_access_seed.csv")
    return parser


def select_fusion_path(real_path: str, fallback_path: str) -> str:
    return real_path if Path(real_path).exists() else fallback_path


def main() -> None:
    args = make_parser().parse_args()
    transactions = load_transactions(args.db_path)
    features = build_feature_frame(transactions)
    features = enrich_with_fusion_seed_features(
        features,
        select_fusion_path("data/fusion/kreb_region_index_real.csv", args.kreb_seed_path),
        select_fusion_path("data/fusion/hug_jeonse_risk_real.csv", args.hug_seed_path),
        select_fusion_path("data/fusion/transport_access_real.csv", args.transport_seed_path),
    )

    output_path = Path(args.output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    features.to_csv(output_path, index=False)

    summary = {
        "db_path": args.db_path,
        "output_path": args.output_path,
        "row_count": int(len(features)),
        "complex_count": int(features["complex_id"].nunique()),
        "month_count": int(features["month"].nunique()),
        "month_min": str(features["month"].min()),
        "month_max": str(features["month"].max()),
        "feature_count": int(len([col for col in features.columns if col not in {"complex_id", "month", "lawd_code5", "property_type", "area_bucket"}])),
    }
    summary_path = Path(args.summary_path)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
