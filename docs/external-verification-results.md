# External Verification Results

Updated: 2026-05-28

## Public Data API Live Probe

Source bundle:

```text
public-data-api-with-keys-20260528.zip
```

The key values were used only in local `.env.local` for verification and are not committed.

Commands:

```bash
npm run check:public-apis
npm run probe:building-ledger
npm run smoke:address-flow
curl http://127.0.0.1:3002/api/public-data/health
curl "http://127.0.0.1:3002/api/public-data/health?probe=true"
```

Results:

```text
Data.go.kr configured: true
Configured env name: DATA_GO_KR_SERVICE_KEY
Public-data mode: mixed
Health probe: apartmentTrade ok, apartmentRent ok
VWorld probe: ok
Juso probe: skipped because DISABLE_JUSO=true and the provided JUSO_CONFIRM_KEY value is empty
```

Real transaction endpoint probe:

```text
apartmentTrade: ok
apartmentRent: ok
officetelTrade: ok
officetelRent: ok
rowHouseTrade: ok
rowHouseRent: ok
detachedHouseTrade: ok
detachedHouseRent: ok
commercialTrade: ok
landTrade: ok
```

Address and valuation smoke:

```text
address source: legal_dong_db
lawdCode5: 27260
seed summary: inserted 99, updated 757, failed 0
transactionCount: 3960
valuation method: tier2_lawd_area_24m
```

## Building Ledger Endpoint

Confirmed endpoint family:

```text
/1613000/BldRgstHubService/getBrTitleInfo
/1613000/BldRgstHubService/getBrRecapTitleInfo
/1613000/BldRgstHubService/getBrExposInfo
/1613000/BldRgstHubService/getBrFlrOulnInfo
/1613000/BldRgstHubService/getBrJijiguInfo
```

Probe command:

```bash
npm run probe:building-ledger
```

Result:

```text
getBrTitleInfo: resultCode 00, hasItems true
getBrRecapTitleInfo: resultCode 00, hasItems true
getBrExposInfo: resultCode 00, hasItems true
getBrFlrOulnInfo: resultCode 00, hasItems true
getBrJijiguInfo: resultCode 00, hasItems true
```

Rejected endpoint family:

```text
/1613000/BldRgstService_v2/*
```

Result:

```text
500 Unexpected errors
```

## Legal Dong Code Full Seed

Source:

```text
https://www.code.go.kr/stdcode/regCodeL.do
```

Downloaded via:

```text
/etc/codeFullDown.do
codeseId=법정동코드
```

Saved file:

```text
data/legal-dong/legal-dong-code-full.txt
```

Seed command:

```bash
npm run seed:legal-dong:file
```

Result:

```json
{"sourceRows":50099,"dbCount":50099,"activeCount":20560}
```

## PostgreSQL Prisma Validation

This local container does not include a runnable PostgreSQL server, `psql`, Docker, or Podman. The PostgreSQL provider schema and migration SQL were still validated/generated.

Commands:

```bash
npm run db:postgres:validate
npm run db:postgres:diff
```

Results:

```text
prisma/schema.postgresql.prisma is valid
prisma/postgresql-migration.sql generated from empty PostgreSQL schema
```

Generated files:

```text
prisma/schema.postgresql.prisma
prisma/postgresql-migration.sql
```

When a live PostgreSQL URL is available, run:

```bash
DATABASE_URL=postgresql://... npx prisma migrate deploy --schema prisma/schema.postgresql.prisma
```

## Playwright Mobile Accessibility Smoke

Installed:

```text
@playwright/test
Chromium browser
```

Command:

```bash
npm run test:e2e
```

Result:

```text
14 passed
```

Coverage:

```text
/feed
/my-home
/goal-path
/community
/portfolio
/broker
```

Checked:

```text
mobile + desktop render
no horizontal overflow
headings visible
community write flow through UI/API
```
