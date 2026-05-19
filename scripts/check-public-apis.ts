import { DataGoKrClient } from "../src/server/public-data/clients/dataGoKrClient";

process.loadEnvFile?.(".env.local");
process.loadEnvFile?.(".env");

type ApiProbe = {
  key: string;
  label: string;
  endpoint: string;
  params: Record<string, string | number>;
};

const probes: ApiProbe[] = [
  {
    key: "apartmentTrade",
    label: "아파트 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "apartmentRent",
    label: "아파트 전월세 실거래가",
    endpoint: "/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "officetelTrade",
    label: "오피스텔 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "officetelRent",
    label: "오피스텔 전월세 실거래가",
    endpoint: "/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "rowHouseTrade",
    label: "연립다세대 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "rowHouseRent",
    label: "연립다세대 전월세 실거래가",
    endpoint: "/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "detachedHouseTrade",
    label: "단독다가구 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "detachedHouseRent",
    label: "단독다가구 전월세 실거래가",
    endpoint: "/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "commercialTrade",
    label: "상업업무용 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  },
  {
    key: "landTrade",
    label: "토지 매매 실거래가",
    endpoint: "/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade",
    params: { LAWD_CD: "27260", DEAL_YMD: "202604", numOfRows: 3, pageNo: 1 }
  }
];

async function main() {
  const client = new DataGoKrClient();
  const rows = [];

  for (const probe of probes) {
    try {
      const result = await client.getXml(probe.endpoint, probe.params);
      const raw = result.raw;
      rows.push({
        key: probe.key,
        label: probe.label,
        status: raw.includes("<item>") || raw.includes("<totalCount>") ? "ok" : "empty_or_unknown",
        endpoint: probe.endpoint
      });
    } catch (error) {
      rows.push({
        key: probe.key,
        label: probe.label,
        status: "error",
        endpoint: probe.endpoint,
        error: error instanceof Error ? error.message.slice(0, 180) : String(error)
      });
    }
  }

  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
