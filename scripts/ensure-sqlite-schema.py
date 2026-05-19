import hashlib
import sqlite3
from pathlib import Path

DB_PATH = Path("prisma/dev.db")


def has_column(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", (table,))
    return cursor.fetchone() is not None


def ensure_column(cursor, table, column, definition):
    if table_exists(cursor, table) and not has_column(cursor, table, column):
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def column_type(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    for row in cursor.fetchall():
        if row[1] == column:
            return (row[2] or "").upper()
    return ""


def tx_external_key(row):
    parts = [
        row["sourceType"],
        row["propertyType"],
        row["dealType"],
        row["lawdCode5"],
        row["legalDong"],
        row["jibun"],
        row["complexName"],
        row["buildingName"],
        row["areaM2"],
        row["floor"],
        row["dealYear"],
        row["dealMonth"],
        row["dealDay"],
        row["dealAmount"],
        row["deposit"],
        row["monthlyRent"],
    ]
    return hashlib.sha256("|".join("" if part is None else str(part) for part in parts).encode()).hexdigest()


def main():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    ensure_column(cur, "NormalizedAddress", "source", "TEXT NOT NULL DEFAULT 'manual'")
    ensure_column(cur, "RealTransaction", "externalKey", "TEXT")
    ensure_column(cur, "BuildingLedger", "ledgerType", "TEXT NOT NULL DEFAULT 'title'")

    if table_exists(cur, "RealTransaction"):
        if column_type(cur, "RealTransaction", "dealAmount") == "INTEGER":
            cur.executescript(
                """
                DROP INDEX IF EXISTS RealTransaction_externalKey_key;
                DROP INDEX IF EXISTS RealTransaction_lawdCode5_idx;
                DROP INDEX IF EXISTS RealTransaction_complexName_idx;
                DROP INDEX IF EXISTS RealTransaction_buildingName_idx;
                DROP INDEX IF EXISTS RealTransaction_dealYear_dealMonth_idx;
                DROP INDEX IF EXISTS RealTransaction_propertyType_dealType_idx;
                ALTER TABLE RealTransaction RENAME TO RealTransaction_old;
                CREATE TABLE RealTransaction (
                  id TEXT PRIMARY KEY NOT NULL,
                  externalKey TEXT,
                  sourceType TEXT NOT NULL,
                  propertyType TEXT NOT NULL,
                  dealType TEXT NOT NULL,
                  lawdCode5 TEXT NOT NULL,
                  legalDong TEXT,
                  jibun TEXT,
                  complexName TEXT,
                  buildingName TEXT,
                  floor INTEGER,
                  areaM2 REAL,
                  dealYear INTEGER,
                  dealMonth INTEGER,
                  dealDay INTEGER,
                  dealAmount REAL,
                  deposit REAL,
                  monthlyRent REAL,
                  builtYear INTEGER,
                  raw TEXT,
                  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO RealTransaction (
                  id, externalKey, sourceType, propertyType, dealType, lawdCode5, legalDong, jibun,
                  complexName, buildingName, floor, areaM2, dealYear, dealMonth, dealDay,
                  dealAmount, deposit, monthlyRent, builtYear, raw, createdAt, updatedAt
                )
                SELECT
                  id, externalKey, sourceType, propertyType, dealType, lawdCode5, legalDong, jibun,
                  complexName, buildingName, floor, areaM2, dealYear, dealMonth, dealDay,
                  CAST(dealAmount AS REAL), CAST(deposit AS REAL), CAST(monthlyRent AS REAL),
                  builtYear, raw, createdAt, updatedAt
                FROM RealTransaction_old;
                DROP TABLE RealTransaction_old;
                """
            )

        cur.execute("SELECT * FROM RealTransaction")
        seen = {}
        delete_ids = []
        for row in cur.fetchall():
            key = row["externalKey"] or tx_external_key(row)
            if key in seen:
                delete_ids.append(row["id"])
            else:
                seen[key] = row["id"]
                cur.execute("UPDATE RealTransaction SET externalKey = ? WHERE id = ?", (key, row["id"]))

        for row_id in delete_ids:
            cur.execute("DELETE FROM RealTransaction WHERE id = ?", (row_id,))

    cur.executescript(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS RealTransaction_externalKey_key ON RealTransaction(externalKey);

        CREATE TABLE IF NOT EXISTS Property (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          region TEXT NOT NULL,
          lawdCode5 TEXT,
          legalDongCode10 TEXT,
          pnu TEXT,
          propertyType TEXT NOT NULL,
          salePrice INTEGER NOT NULL,
          jeonsePrice INTEGER NOT NULL,
          expectedMonthlyRent INTEGER NOT NULL,
          expectedDeposit INTEGER NOT NULL,
          areaM2 REAL NOT NULL,
          floor INTEGER NOT NULL,
          builtYear INTEGER NOT NULL,
          pricePerM2 INTEGER NOT NULL,
          previousHighPrice INTEGER NOT NULL,
          drawdownFromHigh REAL NOT NULL,
          jeonseRatio REAL NOT NULL,
          supplyRiskScore INTEGER NOT NULL,
          vacancyRiskScore INTEGER NOT NULL,
          growthScore INTEGER NOT NULL,
          stabilityScore INTEGER NOT NULL,
          communityHeatScore INTEGER NOT NULL,
          isDirectListing BOOLEAN NOT NULL DEFAULT 0,
          isPartnerListing BOOLEAN NOT NULL DEFAULT 0,
          isAd BOOLEAN NOT NULL DEFAULT 0,
          valuationSnapshotId TEXT,
          source TEXT NOT NULL DEFAULT 'seed',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS Property_region_idx ON Property(region);
        CREATE INDEX IF NOT EXISTS Property_lawdCode5_idx ON Property(lawdCode5);
        CREATE INDEX IF NOT EXISTS Property_pnu_idx ON Property(pnu);
        CREATE INDEX IF NOT EXISTS Property_propertyType_idx ON Property(propertyType);
        CREATE INDEX IF NOT EXISTS Property_isAd_idx ON Property(isAd);
        CREATE INDEX IF NOT EXISTS Property_isDirectListing_idx ON Property(isDirectListing);

        CREATE TABLE IF NOT EXISTS ApiCallLog (
          id TEXT PRIMARY KEY NOT NULL,
          provider TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          paramsHash TEXT,
          status TEXT NOT NULL,
          statusCode INTEGER,
          resultCode TEXT,
          message TEXT,
          durationMs INTEGER,
          rawPreview TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ApiCallLog_provider_idx ON ApiCallLog(provider);
        CREATE INDEX IF NOT EXISTS ApiCallLog_endpoint_idx ON ApiCallLog(endpoint);
        CREATE INDEX IF NOT EXISTS ApiCallLog_status_idx ON ApiCallLog(status);
        CREATE INDEX IF NOT EXISTS ApiCallLog_createdAt_idx ON ApiCallLog(createdAt);

        CREATE TABLE IF NOT EXISTS Broker (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT,
          officeName TEXT NOT NULL,
          representative TEXT,
          licenseNumber TEXT NOT NULL,
          businessNumber TEXT,
          region TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          isVerified BOOLEAN NOT NULL DEFAULT 0,
          verificationStatus TEXT NOT NULL DEFAULT 'pending',
          responseRate REAL NOT NULL DEFAULT 0,
          rating REAL NOT NULL DEFAULT 0,
          falseListingPenalty INTEGER NOT NULL DEFAULT 0,
          specialties TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS Broker_region_idx ON Broker(region);
        CREATE INDEX IF NOT EXISTS Broker_isVerified_idx ON Broker(isVerified);

        CREATE TABLE IF NOT EXISTS Listing (
          id TEXT PRIMARY KEY NOT NULL,
          propertyId TEXT,
          brokerId TEXT,
          listingType TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          address TEXT,
          region TEXT,
          propertyType TEXT,
          salePrice INTEGER NOT NULL,
          deposit INTEGER,
          monthlyRent INTEGER,
          status TEXT NOT NULL DEFAULT 'active',
          verificationStatus TEXT NOT NULL DEFAULT 'pending',
          isAd BOOLEAN NOT NULL DEFAULT 0,
          adProduct TEXT,
          adPriority INTEGER NOT NULL DEFAULT 0,
          ownerConsentConfirmed BOOLEAN NOT NULL DEFAULT 0,
          brokerDisplayName TEXT,
          requiredDisplayInfo TEXT,
          riskWarnings TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS Listing_brokerId_idx ON Listing(brokerId);
        CREATE INDEX IF NOT EXISTS Listing_region_idx ON Listing(region);
        CREATE INDEX IF NOT EXISTS Listing_listingType_idx ON Listing(listingType);
        CREATE INDEX IF NOT EXISTS Listing_status_idx ON Listing(status);
        CREATE INDEX IF NOT EXISTS Listing_isAd_idx ON Listing(isAd);

        CREATE TABLE IF NOT EXISTS Lead (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          brokerId TEXT,
          listingId TEXT,
          propertyId TEXT,
          leadType TEXT NOT NULL,
          consentGiven BOOLEAN NOT NULL DEFAULT 0,
          consentText TEXT,
          userBudget INTEGER,
          userCash INTEGER,
          userMonthlyIncome INTEGER,
          targetRegion TEXT,
          targetPrice INTEGER,
          currentHomeSummary TEXT,
          message TEXT,
          routingScore REAL,
          status TEXT NOT NULL DEFAULT 'new',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS Lead_brokerId_idx ON Lead(brokerId);
        CREATE INDEX IF NOT EXISTS Lead_leadType_idx ON Lead(leadType);
        CREATE INDEX IF NOT EXISTS Lead_status_idx ON Lead(status);

        CREATE TABLE IF NOT EXISTS RealTransactionAudit (
          id TEXT PRIMARY KEY NOT NULL,
          externalKey TEXT NOT NULL,
          action TEXT NOT NULL,
          before TEXT,
          after TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS RealTransactionAudit_externalKey_idx ON RealTransactionAudit(externalKey);
        CREATE INDEX IF NOT EXISTS RealTransactionAudit_action_idx ON RealTransactionAudit(action);
        CREATE INDEX IF NOT EXISTS RealTransactionAudit_createdAt_idx ON RealTransactionAudit(createdAt);

        CREATE TABLE IF NOT EXISTS PublicDataSeedJob (
          id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          mode TEXT NOT NULL,
          request TEXT NOT NULL,
          summary TEXT,
          results TEXT,
          error TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS PublicDataSeedJob_status_idx ON PublicDataSeedJob(status);
        CREATE INDEX IF NOT EXISTS PublicDataSeedJob_createdAt_idx ON PublicDataSeedJob(createdAt);

        CREATE TABLE IF NOT EXISTS ApiQuotaDaily (
          id TEXT PRIMARY KEY NOT NULL,
          provider TEXT NOT NULL,
          date TEXT NOT NULL,
          callCount INTEGER NOT NULL DEFAULT 0,
          errorCount INTEGER NOT NULL DEFAULT 0,
          quotaLimit INTEGER,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ApiQuotaDaily_provider_date_key ON ApiQuotaDaily(provider, date);
        CREATE INDEX IF NOT EXISTS ApiQuotaDaily_provider_idx ON ApiQuotaDaily(provider);
        CREATE INDEX IF NOT EXISTS ApiQuotaDaily_date_idx ON ApiQuotaDaily(date);

        CREATE TABLE IF NOT EXISTS CommunityPostDb (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          propertyId TEXT,
          region TEXT,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          authorBadge TEXT,
          verificationLabel TEXT,
          isHidden BOOLEAN NOT NULL DEFAULT 0,
          moderationStatus TEXT NOT NULL DEFAULT 'visible',
          reportCount INTEGER NOT NULL DEFAULT 0,
          likes INTEGER NOT NULL DEFAULT 0,
          dislikes INTEGER NOT NULL DEFAULT 0,
          commentCount INTEGER NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS CommunityPostDb_propertyId_idx ON CommunityPostDb(propertyId);
        CREATE INDEX IF NOT EXISTS CommunityPostDb_region_idx ON CommunityPostDb(region);
        CREATE INDEX IF NOT EXISTS CommunityPostDb_category_idx ON CommunityPostDb(category);
        CREATE INDEX IF NOT EXISTS CommunityPostDb_isHidden_idx ON CommunityPostDb(isHidden);

        CREATE TABLE IF NOT EXISTS CommunityCommentDb (
          id TEXT PRIMARY KEY NOT NULL,
          postId TEXT NOT NULL,
          userId TEXT NOT NULL,
          content TEXT NOT NULL,
          isHidden BOOLEAN NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS CommunityCommentDb_postId_idx ON CommunityCommentDb(postId);

        CREATE TABLE IF NOT EXISTS CommunityReport (
          id TEXT PRIMARY KEY NOT NULL,
          postId TEXT NOT NULL,
          userId TEXT NOT NULL,
          reason TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS CommunityReport_postId_idx ON CommunityReport(postId);
        CREATE INDEX IF NOT EXISTS CommunityReport_userId_idx ON CommunityReport(userId);

        CREATE TABLE IF NOT EXISTS PredictionPoll (
          id TEXT PRIMARY KEY NOT NULL,
          postId TEXT,
          region TEXT,
          question TEXT NOT NULL,
          closesAt DATETIME,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS PredictionPoll_postId_idx ON PredictionPoll(postId);
        CREATE INDEX IF NOT EXISTS PredictionPoll_region_idx ON PredictionPoll(region);

        CREATE TABLE IF NOT EXISTS PredictionVote (
          id TEXT PRIMARY KEY NOT NULL,
          pollId TEXT NOT NULL,
          userId TEXT NOT NULL,
          choice TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS PredictionVote_pollId_userId_key ON PredictionVote(pollId, userId);
        CREATE INDEX IF NOT EXISTS PredictionVote_pollId_idx ON PredictionVote(pollId);

        CREATE TABLE IF NOT EXISTS UserVerificationBadge (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          badge TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          source TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS UserVerificationBadge_userId_idx ON UserVerificationBadge(userId);
        CREATE INDEX IF NOT EXISTS UserVerificationBadge_badge_idx ON UserVerificationBadge(badge);

        CREATE TABLE IF NOT EXISTS ConsentRecord (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          consentType TEXT NOT NULL,
          consentText TEXT NOT NULL,
          granted BOOLEAN NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ConsentRecord_userId_idx ON ConsentRecord(userId);
        CREATE INDEX IF NOT EXISTS ConsentRecord_consentType_idx ON ConsentRecord(consentType);

        CREATE TABLE IF NOT EXISTS AccessAuditLog (
          id TEXT PRIMARY KEY NOT NULL,
          actorId TEXT,
          actorType TEXT NOT NULL,
          action TEXT NOT NULL,
          targetType TEXT NOT NULL,
          targetId TEXT,
          purpose TEXT,
          metadata TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS AccessAuditLog_actorType_idx ON AccessAuditLog(actorType);
        CREATE INDEX IF NOT EXISTS AccessAuditLog_targetType_idx ON AccessAuditLog(targetType);
        CREATE INDEX IF NOT EXISTS AccessAuditLog_createdAt_idx ON AccessAuditLog(createdAt);

        CREATE TABLE IF NOT EXISTS UserDeletionRequest (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'requested',
          reason TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS UserDeletionRequest_userId_idx ON UserDeletionRequest(userId);
        CREATE INDEX IF NOT EXISTS UserDeletionRequest_status_idx ON UserDeletionRequest(status);
        """
    )
    ensure_column(cur, "RealTransaction", "legalDongCode10", "TEXT")
    ensure_column(cur, "RealTransaction", "pnu", "TEXT")
    cur.executescript(
        """
        CREATE INDEX IF NOT EXISTS RealTransaction_pnu_idx ON RealTransaction(pnu);
        CREATE INDEX IF NOT EXISTS RealTransaction_legalDongCode10_idx ON RealTransaction(legalDongCode10);
        """
    )
    conn.commit()
    conn.close()
    print(f"SQLite schema ensured at {DB_PATH}")


if __name__ == "__main__":
    main()
