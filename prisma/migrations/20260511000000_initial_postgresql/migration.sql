-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "LegalDongCode" (
    "id" TEXT NOT NULL,
    "code10" TEXT NOT NULL,
    "lawdCode5" TEXT NOT NULL,
    "sido" TEXT,
    "sigungu" TEXT,
    "eupmyeon" TEXT,
    "ri" TEXT,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDongCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedAddress" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "inputAddress" TEXT NOT NULL,
    "roadAddress" TEXT,
    "jibunAddress" TEXT,
    "legalDongCode10" TEXT,
    "lawdCode5" TEXT,
    "mountainFlag" TEXT,
    "bun" TEXT,
    "ji" TEXT,
    "pnu" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealTransaction" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "lawdCode5" TEXT NOT NULL,
    "legalDongCode10" TEXT,
    "pnu" TEXT,
    "legalDong" TEXT,
    "jibun" TEXT,
    "complexName" TEXT,
    "buildingName" TEXT,
    "floor" INTEGER,
    "areaM2" DOUBLE PRECISION,
    "dealYear" INTEGER,
    "dealMonth" INTEGER,
    "dealDay" INTEGER,
    "dealAmount" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "monthlyRent" DOUBLE PRECISION,
    "builtYear" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "lawdCode5" TEXT,
    "legalDongCode10" TEXT,
    "pnu" TEXT,
    "propertyType" TEXT NOT NULL,
    "salePrice" BIGINT NOT NULL,
    "jeonsePrice" BIGINT NOT NULL,
    "expectedMonthlyRent" BIGINT NOT NULL,
    "expectedDeposit" BIGINT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "floor" INTEGER NOT NULL,
    "builtYear" INTEGER NOT NULL,
    "pricePerM2" INTEGER NOT NULL,
    "previousHighPrice" BIGINT NOT NULL,
    "drawdownFromHigh" DOUBLE PRECISION NOT NULL,
    "jeonseRatio" DOUBLE PRECISION NOT NULL,
    "supplyRiskScore" INTEGER NOT NULL,
    "vacancyRiskScore" INTEGER NOT NULL,
    "growthScore" INTEGER NOT NULL,
    "stabilityScore" INTEGER NOT NULL,
    "communityHeatScore" INTEGER NOT NULL,
    "isDirectListing" BOOLEAN NOT NULL DEFAULT false,
    "isPartnerListing" BOOLEAN NOT NULL DEFAULT false,
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "valuationSnapshotId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCallLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "paramsHash" TEXT,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "resultCode" TEXT,
    "message" TEXT,
    "durationMs" INTEGER,
    "rawPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingLedger" (
    "id" TEXT NOT NULL,
    "ledgerType" TEXT NOT NULL DEFAULT 'title',
    "pnu" TEXT,
    "sigunguCd" TEXT NOT NULL,
    "bjdongCd" TEXT NOT NULL,
    "bun" TEXT NOT NULL,
    "ji" TEXT NOT NULL,
    "buildingName" TEXT,
    "mainUse" TEXT,
    "approvalDate" TEXT,
    "platArea" DOUBLE PRECISION,
    "archArea" DOUBLE PRECISION,
    "totalFloorArea" DOUBLE PRECISION,
    "bcRat" DOUBLE PRECISION,
    "vlRat" DOUBLE PRECISION,
    "householdCount" INTEGER,
    "familyCount" INTEGER,
    "parkingCount" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandInfo" (
    "id" TEXT NOT NULL,
    "pnu" TEXT NOT NULL,
    "landCategory" TEXT,
    "landArea" DOUBLE PRECISION,
    "useDistrict" TEXT,
    "officialLandPrice" INTEGER,
    "officialLandPriceBaseDate" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyValuationSnapshot" (
    "id" TEXT NOT NULL,
    "normalizedAddressId" TEXT,
    "pnu" TEXT,
    "lawdCode5" TEXT,
    "propertyType" TEXT,
    "estimatedPrice" INTEGER,
    "estimatedJeonsePrice" INTEGER,
    "jeonseRatio" DOUBLE PRECISION,
    "drawdownFromHigh" DOUBLE PRECISION,
    "recentTradeCount" INTEGER,
    "nearbyDiscount" DOUBLE PRECISION,
    "method" TEXT NOT NULL,
    "comparableIds" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyValuationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "officeName" TEXT NOT NULL,
    "representative" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "businessNumber" TEXT,
    "region" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "falseListingPenalty" INTEGER NOT NULL DEFAULT 0,
    "specialties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "brokerId" TEXT,
    "listingType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "region" TEXT,
    "propertyType" TEXT,
    "transactionType" TEXT,
    "exclusiveAreaM2" DOUBLE PRECISION,
    "supplyAreaM2" DOUBLE PRECISION,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "direction" TEXT,
    "moveInDate" TEXT,
    "managementFee" BIGINT,
    "roomCount" INTEGER,
    "bathroomCount" INTEGER,
    "parkingInfo" TEXT,
    "isViolationBuilding" BOOLEAN,
    "ownerMandateStatus" TEXT NOT NULL DEFAULT 'pending',
    "salePrice" BIGINT NOT NULL,
    "deposit" BIGINT,
    "monthlyRent" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "adProduct" TEXT,
    "adPriority" INTEGER NOT NULL DEFAULT 0,
    "ownerConsentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "brokerDisplayName" TEXT,
    "requiredDisplayInfo" JSONB,
    "riskWarnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "roomType" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL,
    "copyrightOwner" TEXT,
    "licenseStatus" TEXT NOT NULL DEFAULT 'declared',
    "consentStatus" TEXT NOT NULL DEFAULT 'pending',
    "moderationStatus" TEXT NOT NULL DEFAULT 'pending',
    "width" INTEGER,
    "height" INTEGER,
    "phash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDisplayCompliance" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "hasBrokerOfficeName" BOOLEAN NOT NULL DEFAULT false,
    "hasBrokerRegistrationNo" BOOLEAN NOT NULL DEFAULT false,
    "hasBrokerAddress" BOOLEAN NOT NULL DEFAULT false,
    "hasBrokerPhone" BOOLEAN NOT NULL DEFAULT false,
    "hasAddress" BOOLEAN NOT NULL DEFAULT false,
    "hasArea" BOOLEAN NOT NULL DEFAULT false,
    "hasPrice" BOOLEAN NOT NULL DEFAULT false,
    "hasPropertyType" BOOLEAN NOT NULL DEFAULT false,
    "hasTransactionType" BOOLEAN NOT NULL DEFAULT false,
    "hasFloorInfo" BOOLEAN NOT NULL DEFAULT false,
    "hasMoveInDate" BOOLEAN NOT NULL DEFAULT false,
    "hasManagementFee" BOOLEAN NOT NULL DEFAULT false,
    "hasDirection" BOOLEAN NOT NULL DEFAULT false,
    "hasRoomBathInfo" BOOLEAN NOT NULL DEFAULT false,
    "hasParkingInfo" BOOLEAN NOT NULL DEFAULT false,
    "hasViolationBuildingFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "missingFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDisplayCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brokerId" TEXT,
    "listingId" TEXT,
    "propertyId" TEXT,
    "leadType" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentText" TEXT,
    "userBudget" BIGINT,
    "userCash" BIGINT,
    "userMonthlyIncome" BIGINT,
    "budgetBand" TEXT,
    "contactInfo" TEXT,
    "targetRegion" TEXT,
    "targetPrice" BIGINT,
    "currentHomeSummary" JSONB,
    "message" TEXT,
    "routingScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentHomeId" TEXT,
    "address" TEXT NOT NULL,
    "region" TEXT,
    "expectedPrice" BIGINT,
    "message" TEXT,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedBrokerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectVerificationChecklist" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "ownerMandateChecked" TEXT NOT NULL DEFAULT 'pending',
    "photoRightsChecked" TEXT NOT NULL DEFAULT 'pending',
    "buildingLedgerChecked" TEXT NOT NULL DEFAULT 'pending',
    "registryChecked" TEXT NOT NULL DEFAULT 'pending',
    "valuationChecked" TEXT NOT NULL DEFAULT 'pending',
    "priceReasonableness" TEXT NOT NULL DEFAULT 'pending',
    "riskDisclosureChecked" TEXT NOT NULL DEFAULT 'pending',
    "assignedReviewerId" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectVerificationChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealTransactionAudit" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealTransactionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicDataSeedJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "mode" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "summary" JSONB,
    "results" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDataSeedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiQuotaDaily" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "quotaLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiQuotaDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostDb" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "region" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorBadge" TEXT,
    "verificationLabel" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT NOT NULL DEFAULT 'visible',
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPostDb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRoom" (
    "id" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "propertyId" TEXT,
    "region" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "writePolicy" TEXT NOT NULL DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMembership" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verificationBadgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvidence" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "userId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCommentDb" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityCommentDb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionPoll" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "region" TEXT,
    "question" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVerificationBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVerificationBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "purpose" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDongCode_code10_key" ON "LegalDongCode"("code10");

-- CreateIndex
CREATE INDEX "LegalDongCode_lawdCode5_idx" ON "LegalDongCode"("lawdCode5");

-- CreateIndex
CREATE INDEX "LegalDongCode_fullName_idx" ON "LegalDongCode"("fullName");

-- CreateIndex
CREATE INDEX "NormalizedAddress_pnu_idx" ON "NormalizedAddress"("pnu");

-- CreateIndex
CREATE INDEX "NormalizedAddress_lawdCode5_idx" ON "NormalizedAddress"("lawdCode5");

-- CreateIndex
CREATE UNIQUE INDEX "RealTransaction_externalKey_key" ON "RealTransaction"("externalKey");

-- CreateIndex
CREATE INDEX "RealTransaction_lawdCode5_idx" ON "RealTransaction"("lawdCode5");

-- CreateIndex
CREATE INDEX "RealTransaction_pnu_idx" ON "RealTransaction"("pnu");

-- CreateIndex
CREATE INDEX "RealTransaction_legalDongCode10_idx" ON "RealTransaction"("legalDongCode10");

-- CreateIndex
CREATE INDEX "RealTransaction_complexName_idx" ON "RealTransaction"("complexName");

-- CreateIndex
CREATE INDEX "RealTransaction_buildingName_idx" ON "RealTransaction"("buildingName");

-- CreateIndex
CREATE INDEX "RealTransaction_dealYear_dealMonth_idx" ON "RealTransaction"("dealYear", "dealMonth");

-- CreateIndex
CREATE INDEX "RealTransaction_propertyType_dealType_idx" ON "RealTransaction"("propertyType", "dealType");

-- CreateIndex
CREATE INDEX "Property_region_idx" ON "Property"("region");

-- CreateIndex
CREATE INDEX "Property_lawdCode5_idx" ON "Property"("lawdCode5");

-- CreateIndex
CREATE INDEX "Property_pnu_idx" ON "Property"("pnu");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_isAd_idx" ON "Property"("isAd");

-- CreateIndex
CREATE INDEX "Property_isDirectListing_idx" ON "Property"("isDirectListing");

-- CreateIndex
CREATE INDEX "ApiCallLog_provider_idx" ON "ApiCallLog"("provider");

-- CreateIndex
CREATE INDEX "ApiCallLog_endpoint_idx" ON "ApiCallLog"("endpoint");

-- CreateIndex
CREATE INDEX "ApiCallLog_status_idx" ON "ApiCallLog"("status");

-- CreateIndex
CREATE INDEX "ApiCallLog_createdAt_idx" ON "ApiCallLog"("createdAt");

-- CreateIndex
CREATE INDEX "BuildingLedger_pnu_idx" ON "BuildingLedger"("pnu");

-- CreateIndex
CREATE INDEX "BuildingLedger_ledgerType_idx" ON "BuildingLedger"("ledgerType");

-- CreateIndex
CREATE INDEX "BuildingLedger_sigunguCd_bjdongCd_bun_ji_idx" ON "BuildingLedger"("sigunguCd", "bjdongCd", "bun", "ji");

-- CreateIndex
CREATE UNIQUE INDEX "LandInfo_pnu_key" ON "LandInfo"("pnu");

-- CreateIndex
CREATE INDEX "PropertyValuationSnapshot_pnu_idx" ON "PropertyValuationSnapshot"("pnu");

-- CreateIndex
CREATE INDEX "PropertyValuationSnapshot_lawdCode5_idx" ON "PropertyValuationSnapshot"("lawdCode5");

-- CreateIndex
CREATE INDEX "Broker_region_idx" ON "Broker"("region");

-- CreateIndex
CREATE INDEX "Broker_isVerified_idx" ON "Broker"("isVerified");

-- CreateIndex
CREATE INDEX "Listing_brokerId_idx" ON "Listing"("brokerId");

-- CreateIndex
CREATE INDEX "Listing_region_idx" ON "Listing"("region");

-- CreateIndex
CREATE INDEX "Listing_listingType_idx" ON "Listing"("listingType");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_isAd_idx" ON "Listing"("isAd");

-- CreateIndex
CREATE INDEX "ListingPhoto_listingId_idx" ON "ListingPhoto"("listingId");

-- CreateIndex
CREATE INDEX "ListingPhoto_moderationStatus_idx" ON "ListingPhoto"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDisplayCompliance_listingId_key" ON "ListingDisplayCompliance"("listingId");

-- CreateIndex
CREATE INDEX "ListingDisplayCompliance_status_idx" ON "ListingDisplayCompliance"("status");

-- CreateIndex
CREATE INDEX "Lead_brokerId_idx" ON "Lead"("brokerId");

-- CreateIndex
CREATE INDEX "Lead_leadType_idx" ON "Lead"("leadType");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "SellerIntent_userId_idx" ON "SellerIntent"("userId");

-- CreateIndex
CREATE INDEX "SellerIntent_region_idx" ON "SellerIntent"("region");

-- CreateIndex
CREATE INDEX "SellerIntent_status_idx" ON "SellerIntent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DirectVerificationChecklist_listingId_key" ON "DirectVerificationChecklist"("listingId");

-- CreateIndex
CREATE INDEX "RealTransactionAudit_externalKey_idx" ON "RealTransactionAudit"("externalKey");

-- CreateIndex
CREATE INDEX "RealTransactionAudit_action_idx" ON "RealTransactionAudit"("action");

-- CreateIndex
CREATE INDEX "RealTransactionAudit_createdAt_idx" ON "RealTransactionAudit"("createdAt");

-- CreateIndex
CREATE INDEX "PublicDataSeedJob_status_idx" ON "PublicDataSeedJob"("status");

-- CreateIndex
CREATE INDEX "PublicDataSeedJob_createdAt_idx" ON "PublicDataSeedJob"("createdAt");

-- CreateIndex
CREATE INDEX "ApiQuotaDaily_provider_idx" ON "ApiQuotaDaily"("provider");

-- CreateIndex
CREATE INDEX "ApiQuotaDaily_date_idx" ON "ApiQuotaDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiQuotaDaily_provider_date_key" ON "ApiQuotaDaily"("provider", "date");

-- CreateIndex
CREATE INDEX "CommunityPostDb_roomId_idx" ON "CommunityPostDb"("roomId");

-- CreateIndex
CREATE INDEX "CommunityPostDb_propertyId_idx" ON "CommunityPostDb"("propertyId");

-- CreateIndex
CREATE INDEX "CommunityPostDb_region_idx" ON "CommunityPostDb"("region");

-- CreateIndex
CREATE INDEX "CommunityPostDb_category_idx" ON "CommunityPostDb"("category");

-- CreateIndex
CREATE INDEX "CommunityPostDb_isHidden_idx" ON "CommunityPostDb"("isHidden");

-- CreateIndex
CREATE INDEX "CommunityRoom_propertyId_idx" ON "CommunityRoom"("propertyId");

-- CreateIndex
CREATE INDEX "CommunityRoom_region_idx" ON "CommunityRoom"("region");

-- CreateIndex
CREATE INDEX "CommunityRoom_roomType_idx" ON "CommunityRoom"("roomType");

-- CreateIndex
CREATE INDEX "CommunityMembership_userId_idx" ON "CommunityMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMembership_roomId_userId_key" ON "CommunityMembership"("roomId", "userId");

-- CreateIndex
CREATE INDEX "CommunityEvidence_postId_idx" ON "CommunityEvidence"("postId");

-- CreateIndex
CREATE INDEX "CommunityEvidence_userId_idx" ON "CommunityEvidence"("userId");

-- CreateIndex
CREATE INDEX "CommunityCommentDb_postId_idx" ON "CommunityCommentDb"("postId");

-- CreateIndex
CREATE INDEX "CommunityReport_postId_idx" ON "CommunityReport"("postId");

-- CreateIndex
CREATE INDEX "CommunityReport_userId_idx" ON "CommunityReport"("userId");

-- CreateIndex
CREATE INDEX "PredictionPoll_postId_idx" ON "PredictionPoll"("postId");

-- CreateIndex
CREATE INDEX "PredictionPoll_region_idx" ON "PredictionPoll"("region");

-- CreateIndex
CREATE INDEX "PredictionVote_pollId_idx" ON "PredictionVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionVote_pollId_userId_key" ON "PredictionVote"("pollId", "userId");

-- CreateIndex
CREATE INDEX "UserVerificationBadge_userId_idx" ON "UserVerificationBadge"("userId");

-- CreateIndex
CREATE INDEX "UserVerificationBadge_badge_idx" ON "UserVerificationBadge"("badge");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

-- CreateIndex
CREATE INDEX "ConsentRecord_consentType_idx" ON "ConsentRecord"("consentType");

-- CreateIndex
CREATE INDEX "AccessAuditLog_actorType_idx" ON "AccessAuditLog"("actorType");

-- CreateIndex
CREATE INDEX "AccessAuditLog_targetType_idx" ON "AccessAuditLog"("targetType");

-- CreateIndex
CREATE INDEX "AccessAuditLog_createdAt_idx" ON "AccessAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserDeletionRequest_userId_idx" ON "UserDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "UserDeletionRequest_status_idx" ON "UserDeletionRequest"("status");

