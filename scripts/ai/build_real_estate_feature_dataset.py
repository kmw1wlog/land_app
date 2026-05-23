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
            monthlyRent AS monthly_rent
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
        dense["weighted_price"] = dense["median_price"].ewm(span=3, adjust=False, min_periods=1).mean()
        dense["weighted_price"] = dense["weighted_price"].fillna(dense["median_price"])
        dense["weighted_price"] = dense["weighted_price"].fillna(0)
        running_high = dense["weighted_price"].replace(0, np.nan).cummax()
        dense["drawdown_from_high"] = np.where(
            running_high.gt(0),
            (dense["weighted_price"] / running_high - 1.0) * 100.0,
            0.0,
        )
        prev_trade_mean = dense["trade_count"].rolling(3, min_periods=1).mean().shift(1)
        prev_trade_mean = prev_trade_mean.replace(0, np.nan)
        dense["transaction_heat"] = (dense["trade_count"] / prev_trade_mean).fillna(dense["trade_count"].clip(lower=0))
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
        full_frames.append(dense)

    features = pd.concat(full_frames, ignore_index=True)
    leader_rank = features.groupby(["lawd_code5", "month", "property_type"])["weighted_price"].rank(
        pct=True, method="average"
    )
    features["leader_score"] = leader_rank.fillna(0.0) * 100.0
    features["median_price"] = features["median_price"].fillna(0.0)
    features["jeonse_median"] = features["jeonse_median"].fillna(0.0)
    features["monthly_rent_median"] = features["monthly_rent_median"].fillna(0.0)
    numeric_cols = [
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
            "jeonse_ratio",
            "drawdown_from_high",
            "transaction_heat",
            "reacceleration_score",
            "liquidity_score",
            "leader_score",
        ]
    ].sort_values(["complex_id", "month"])


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build complex monthly features from the local SQLite database.")
    parser.add_argument("--db-path", default="prisma/dev.db")
    parser.add_argument("--output-path", default="artifacts/complex_monthly_features.csv")
    parser.add_argument("--summary-path", default="artifacts/complex_monthly_features.summary.json")
    return parser


def main() -> None:
    args = make_parser().parse_args()
    transactions = load_transactions(args.db_path)
    features = build_feature_frame(transactions)

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
    }
    summary_path = Path(args.summary_path)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
