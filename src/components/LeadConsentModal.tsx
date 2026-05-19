"use client";

import { useState } from "react";
import type { CurrentHome, Property, UserProfile } from "@/types";
import { formatKRW } from "@/lib/format";

interface LeadConsentModalProps {
  property: Property;
  profile: UserProfile;
  currentHome: CurrentHome;
  leadType?: "buy_consulting" | "sell_consulting" | "move_up" | "cash_flow_investment" | "direct_brokerage";
  message?: string;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function LeadConsentModal({
  property,
  profile,
  currentHome,
  leadType = "move_up",
  message,
  open,
  onClose,
  onCreated
}: LeadConsentModalProps) {
  const [financialInfo, setFinancialInfo] = useState(false);
  const [currentHomeInfo, setCurrentHomeInfo] = useState(false);
  const [contactInfo, setContactInfo] = useState(false);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const budgetBand = budgetBandFor(property.salePrice);

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/brokerage/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          leadType,
          message: message ?? `${property.name} 내 상황 기준 상담 연결 요청`,
          consentGiven: true,
          targetRegion: property.region,
          targetPrice: property.salePrice,
          budgetBand,
          consents: {
            financialInfo,
            currentHomeInfo,
            contactInfo
          },
          userBudget: financialInfo ? property.salePrice : undefined,
          userCash: financialInfo ? profile.cashOnHand : undefined,
          userMonthlyIncome: financialInfo ? profile.monthlyIncome : undefined,
          currentHomeSummary: currentHomeInfo
            ? {
                address: currentHome.address,
                region: currentHome.region,
                estimatedCurrentPrice: currentHome.estimatedCurrentPrice,
                loanBalance: currentHome.loanBalance
              }
            : undefined,
          contactInfo: contactInfo ? contact : undefined
        })
      });
      onCreated?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4">
      <div className="w-full rounded-lg bg-white p-4 shadow-soft">
        <h3 className="text-lg font-black text-ink">상담 연결 동의</h3>
        <p className="mt-2 text-sm leading-6 text-black/62">
          기본 동의로는 관심지역, 상담유형, 희망 예산대, 메시지만 전달됩니다.
          월급·현금·현재 집 상세정보·연락처는 아래에서 별도로 선택한 경우에만 전달됩니다.
        </p>
        <div className="mt-3 rounded-md bg-black/5 p-3 text-xs leading-5 text-black/58">
          전달 예정: {property.name} · {property.region} · {budgetBand} · 목표가 {formatKRW(property.salePrice)}
        </div>
        <div className="mt-3 space-y-2 text-sm font-bold text-ink">
          <label className="flex items-center gap-2 rounded-md border border-black/10 p-3">
            <input type="checkbox" checked={financialInfo} onChange={(event) => setFinancialInfo(event.target.checked)} />
            월소득/보유 현금 전달 동의
          </label>
          <label className="flex items-center gap-2 rounded-md border border-black/10 p-3">
            <input type="checkbox" checked={currentHomeInfo} onChange={(event) => setCurrentHomeInfo(event.target.checked)} />
            현재 집 주소/추정가/대출잔액 전달 동의
          </label>
          <label className="flex items-center gap-2 rounded-md border border-black/10 p-3">
            <input type="checkbox" checked={contactInfo} onChange={(event) => setContactInfo(event.target.checked)} />
            연락처 전달 동의
          </label>
          {contactInfo ? (
            <input
              className="h-11 w-full rounded-md border border-black/10 px-3 text-sm"
              placeholder="연락 가능한 번호 또는 이메일"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="h-11 rounded-md bg-black/8 text-sm font-black text-ink" onClick={onClose}>
            취소
          </button>
          <button className="h-11 rounded-md bg-moss text-sm font-black text-white" disabled={loading} onClick={submit}>
            {loading ? "연결 중" : "동의하고 연결"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function budgetBandFor(price: number) {
  const unit = 100_000_000;
  const low = Math.floor(price / unit);
  const high = low + 1;
  return `${low}억~${high}억`;
}
