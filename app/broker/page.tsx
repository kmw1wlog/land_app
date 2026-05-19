"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Label } from "@/components/Label";
import { Metric } from "@/components/Metric";
import { formatKRW, formatMonthly } from "@/lib/format";

type BrokerRow = {
  id: string;
  officeName: string;
  licenseNumber: string;
  region: string;
  isVerified: boolean;
  verificationStatus: string;
  responseRate: number;
  rating: number;
  falseListingPenalty: number;
};

type ListingRow = {
  id: string;
  title: string;
  listingType: string;
  region?: string | null;
  salePrice: number;
  deposit?: number | null;
  monthlyRent?: number | null;
  isAd: boolean;
  status: string;
  verificationStatus: string;
  compliance?: { status: string; missingFields?: string[] | null };
  photos?: Array<{ id: string; url?: string | null; moderationStatus: string; consentStatus: string }>;
  directVerification?: Record<string, string | null>;
};

type LeadRow = {
  id: string;
  leadType: string;
  message?: string | null;
  status: string;
  consentGiven: boolean;
  routingScore?: number | null;
  userBudget?: number | null;
};

export default function BrokerPage() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [title, setTitle] = useState("수성구 직영 검증 후보");
  const [salePrice, setSalePrice] = useState(650_000_000);
  const [listingType, setListingType] = useState("direct_verified");

  const load = async () => {
    const response = await fetch("/api/brokerage/leads", { cache: "no-store" });
    const json = await response.json();
    setBrokers(json.brokers ?? []);
    setListings(json.listings ?? []);
    setLeads(json.leads ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const primaryBroker = brokers[0];

  return (
    <AppShell title="중개사/직영 대시보드" subtitle="광고, 제휴, 직영 검증, 상담 리드를 DB 기준으로 관리합니다.">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="인증 중개사" value={`${brokers.filter((item) => item.isVerified).length}곳`} />
          <Metric label="등록 매물" value={`${listings.length}개`} />
          <Metric label="상담 리드" value={`${leads.length}건`} />
        </div>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">중개사 인증</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="h-11 rounded-md bg-moss text-sm font-black text-white"
              onClick={async () => {
                await fetch("/api/brokerage/brokers/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    officeName: "수성 시나리오 공인중개",
                    representative: "대표 공인중개사",
                    licenseNumber: `27260-${Date.now()}`,
                    region: "대구 수성구",
                    address: "대구 수성구 범어동 1",
                    phone: "053-000-0000",
                    specialties: ["move_up", "cash_flow"]
                  })
                });
                await load();
              }}
            >
              중개사 등록
            </button>
            <button
              className="h-11 rounded-md bg-ink text-sm font-black text-white"
              disabled={!primaryBroker}
              onClick={async () => {
                if (!primaryBroker) return;
                await fetch("/api/brokerage/brokers/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ brokerId: primaryBroker.id, status: "verified" })
                });
                await load();
              }}
            >
              첫 중개사 인증
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {brokers.slice(0, 3).map((broker) => (
              <article key={broker.id} className="rounded-md bg-black/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-black text-ink">{broker.officeName}</p>
                  <Label tone={broker.isVerified ? "direct" : "risk"}>{broker.verificationStatus}</Label>
                </div>
                <p className="mt-1 text-xs text-black/55">
                  {broker.region} · 허위매물 패널티 {broker.falseListingPenalty}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-base font-black text-ink">매물 등록</h2>
          <input
            className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm font-bold"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="h-11 rounded-md border border-black/10 px-3 text-sm font-bold"
              inputMode="numeric"
              value={Math.round(salePrice / 10_000)}
              onChange={(event) => setSalePrice(Number(event.target.value || 0) * 10_000)}
            />
            <select
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold"
              value={listingType}
              onChange={(event) => setListingType(event.target.value)}
            >
              <option value="normal">일반</option>
              <option value="partner">제휴 중개사</option>
              <option value="direct_verified">직영 검증</option>
            </select>
          </div>
          <button
            className="mt-2 h-11 w-full rounded-md bg-coral text-sm font-black text-white"
            onClick={async () => {
              await fetch("/api/brokerage/listings/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  brokerId: primaryBroker?.id,
                  listingType,
                  title,
                  region: "대구 수성구",
                  propertyType: "apartment",
                  transactionType: "sale",
                  salePrice,
                  deposit: 50_000_000,
                  monthlyRent: 1_400_000,
                  exclusiveAreaM2: 84.9,
                  supplyAreaM2: 112,
                  floor: 12,
                  totalFloors: 29,
                  direction: "남동향",
                  moveInDate: "협의",
                  managementFee: 220_000,
                  roomCount: 3,
                  bathroomCount: 2,
                  parkingInfo: "세대당 1.2대",
                  isViolationBuilding: false,
                  ownerConsentConfirmed: listingType !== "normal",
                  isAd: listingType === "partner"
                })
              });
              await load();
            }}
          >
            DB 매물 등록
          </button>
        </section>

        <section className="space-y-3">
          {listings.slice(0, 8).map((listing) => (
            <article key={listing.id} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {listing.isAd ? <Label tone="ad">광고</Label> : null}
                {listing.listingType === "partner" ? <Label tone="ad">제휴 중개사 매물</Label> : null}
                {listing.listingType === "direct_verified" ? <Label tone="direct">직영 검증 매물</Label> : null}
                {listing.listingType === "normal" ? <Label>일반 후보</Label> : null}
              </div>
              <h3 className="mt-3 text-lg font-black text-ink">{listing.title}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label="매매가" value={formatKRW(listing.salePrice)} />
                <Metric label="보증금" value={formatKRW(listing.deposit ?? 0)} />
                <Metric label="월세" value={formatMonthly(listing.monthlyRent ?? 0)} />
              </div>
              {listing.listingType === "direct_verified" ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-black/58">
                  <span>소유자 의뢰 확인: {listing.directVerification?.ownerMandateChecked ?? "pending"}</span>
                  <span>사진 권리 확인: {listing.directVerification?.photoRightsChecked ?? "pending"}</span>
                  <span>건축물대장 확인: {listing.directVerification?.buildingLedgerChecked ?? "pending"}</span>
                  <span>실거래 comparable: {listing.directVerification?.valuationChecked ?? "pending"}</span>
                </div>
              ) : null}
              <div className="mt-3 rounded-md bg-black/5 p-3 text-xs leading-5 text-black/58">
                표시광고 검증: {listing.compliance?.status ?? "미평가"}
                {listing.compliance?.missingFields?.length ? ` · 누락 ${listing.compliance.missingFields.join(", ")}` : ""}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(listing.photos?.length ? listing.photos : [null, null, null]).slice(0, 3).map((photo, index) => (
                  <div key={photo?.id ?? index} className="aspect-square overflow-hidden rounded-md bg-[linear-gradient(135deg,#d9e8df,#f1b66c)]">
                    {photo?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                ))}
              </div>
              <label className="mt-3 flex h-11 cursor-pointer items-center justify-center rounded-md bg-moss text-sm font-black text-white">
                사진 업로드
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.set("file", file);
                    form.set("roomType", "exterior");
                    form.set("consentStatus", "owner_confirmed");
                    await fetch(`/api/brokerage/listings/${listing.id}/photos`, { method: "POST", body: form });
                    await load();
                  }}
                />
              </label>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-black text-ink">상담 리드</h2>
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <Label tone="good">{lead.leadType}</Label>
                <p className="text-xs font-bold text-black/45">{lead.status}</p>
              </div>
              <p className="mt-3 text-sm font-bold text-black/70">{lead.message}</p>
              <p className="mt-2 text-xs text-black/50">
                동의 {lead.consentGiven ? "완료" : "미완료"} · 라우팅 점수 {lead.routingScore ?? "-"}
              </p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
