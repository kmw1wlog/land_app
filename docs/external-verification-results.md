# External Verification Results

Updated: 2026-05-11

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
