import { prisma } from "@/server/db";
import { JusoClient } from "../clients/jusoClient";
import { VWorldClient } from "../clients/vworldClient";
import { mockNormalizeAddress } from "../adapters/mockPublicDataAdapter";
import type { NormalizedAddressResult } from "../types";
import { buildPnu, parseJibun } from "../utils/pnu";
import { allowGeocoderPersist, getPublicDataMode } from "../utils/env";
import { findLegalDongByAddress } from "./legalDongService";

export async function normalizeAddress(inputAddress: string): Promise<NormalizedAddressResult> {
  const juso = new JusoClient();
  const vworld = new VWorldClient();
  const mode = getPublicDataMode();
  const warnings: string[] = [];

  let result: NormalizedAddressResult;

  if (process.env.DISABLE_JUSO === "true" || !juso.isConfigured()) {
    const legalDong = await findLegalDongByAddress(inputAddress);
    const parsed = parseJibun(inputAddress);
    if (legalDong && parsed) {
      result = {
        source: "legal_dong_db",
        inputAddress,
        roadAddress: null,
        jibunAddress: inputAddress,
        legalDongCode10: legalDong.code10,
        lawdCode5: legalDong.lawdCode5,
        mountainFlag: parsed.mountainFlag,
        bun: parsed.bun,
        ji: parsed.ji,
        pnu: buildPnu({
          legalDongCode10: legalDong.code10,
          mountainFlag: parsed.mountainFlag,
          bun: parsed.bun,
          ji: parsed.ji
        }),
        lat: null,
        lng: null,
        warnings: ["Juso 없이 법정동코드 DB와 지번 파싱으로 정규화했습니다."]
      };
    } else if (mode === "live") {
      throw new Error("JUSO_CONFIRM_KEY is required for live address normalization");
    } else {
      result = mockNormalizeAddress(inputAddress);
    }
  } else {
    const rows = await juso.searchAddress(inputAddress);
    const selected = rows[0];

    if (!selected) {
      result = mockNormalizeAddress(inputAddress);
      result.warnings.push("Juso 검색 결과가 없어 mock 결과를 사용했습니다.");
    } else {
      const parsed = parseJibun(selected.jibunAddr ?? inputAddress);
      const legalDongCode10 = selected.admCd ?? null;
      const pnu =
        legalDongCode10 && parsed
          ? buildPnu({
              legalDongCode10,
              mountainFlag: parsed.mountainFlag,
              bun: parsed.bun,
              ji: parsed.ji
            })
          : null;

      result = {
        source: "juso",
        inputAddress,
        roadAddress: selected.roadAddr ?? null,
        jibunAddress: selected.jibunAddr ?? null,
        legalDongCode10,
        lawdCode5: legalDongCode10?.slice(0, 5) ?? null,
        mountainFlag: parsed?.mountainFlag ?? null,
        bun: parsed?.bun ?? null,
        ji: parsed?.ji ?? null,
        pnu,
        lat: null,
        lng: null,
        warnings
      };
    }
  }

  if (vworld.isConfigured() && (result.roadAddress || result.jibunAddress)) {
    try {
      const geo = await vworld.geocodeAddress(result.roadAddress || result.jibunAddress || inputAddress, "parcel");
      if (allowGeocoderPersist()) {
        result.lat = geo.lat;
        result.lng = geo.lng;
      } else {
        warnings.push("VWorld 좌표는 저장 제한 때문에 영구 저장하지 않았습니다.");
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "VWorld geocoder failed");
    }
  }

  result.warnings = [...new Set([...result.warnings, ...warnings])];

  const saved = await prisma.normalizedAddress.create({
    data: {
      inputAddress: result.inputAddress,
      source: result.source,
      roadAddress: result.roadAddress,
      jibunAddress: result.jibunAddress,
      legalDongCode10: result.legalDongCode10,
      lawdCode5: result.lawdCode5,
      mountainFlag: result.mountainFlag,
      bun: result.bun,
      ji: result.ji,
      pnu: result.pnu,
      lat: allowGeocoderPersist() ? result.lat : null,
      lng: allowGeocoderPersist() ? result.lng : null,
      raw: {
        source: result.source,
        warnings: result.warnings
      }
    }
  });

  return {
    ...result,
    id: saved.id
  };
}
