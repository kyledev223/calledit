-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('SOLANA', 'EVM');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('CRYPTO', 'TRADFI', 'MEMECOIN');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('BINANCE', 'COINGECKO', 'YAHOO');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('LIVE', 'PLAYED_OUT', 'MISSED', 'DELETED');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('AUTHOR_UPVOTE', 'AUTHOR_BUYTHROUGH', 'BACKER_BUYTHROUGH', 'REVERSAL', 'VOID', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "chain" "Chain" NOT NULL DEFAULT 'SOLANA',
    "displayName" VARCHAR(32),
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "chain" "Chain" NOT NULL DEFAULT 'SOLANA',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "source" "PriceSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "coingeckoId" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "level" DECIMAL(24,10) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "priceAtPost" DECIMAL(24,10) NOT NULL,
    "priceAtPostSource" "PriceSource" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'LIVE',
    "resolvedAt" TIMESTAMP(3),
    "resolvedPrice" DECIMAL(24,10),
    "resolvedSource" "PriceSource",
    "resolvedPriceAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upvote" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyThrough" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyThrough_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "note" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "amount" DECIMAL(24,10) NOT NULL,
    "token" TEXT NOT NULL,
    "rate" DECIMAL(24,10) NOT NULL,
    "txSignature" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidBy" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WalletLink" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_nonce_key" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_wallet_idx" ON "AuthNonce"("wallet");

-- CreateIndex
CREATE INDEX "AuthNonce_expiresAt_idx" ON "AuthNonce"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Call_status_expiresAt_idx" ON "Call"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Call_authorId_createdAt_idx" ON "Call"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");

-- CreateIndex
CREATE INDEX "Upvote_userId_idx" ON "Upvote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Upvote_callId_userId_key" ON "Upvote"("callId", "userId");

-- CreateIndex
CREATE INDEX "BuyThrough_userId_idx" ON "BuyThrough"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyThrough_callId_userId_key" ON "BuyThrough"("callId", "userId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_callId_idx" ON "LedgerEntry"("callId");

-- CreateIndex
CREATE INDEX "LedgerEntry_payoutId_idx" ON "LedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "WalletLink_userBId_idx" ON "WalletLink"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLink_userAId_userBId_key" ON "WalletLink"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "ActionLog_userId_action_createdAt_idx" ON "ActionLog"("userId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upvote" ADD CONSTRAINT "Upvote_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upvote" ADD CONSTRAINT "Upvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyThrough" ADD CONSTRAINT "BuyThrough_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyThrough" ADD CONSTRAINT "BuyThrough_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLink" ADD CONSTRAINT "WalletLink_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLink" ADD CONSTRAINT "WalletLink_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

