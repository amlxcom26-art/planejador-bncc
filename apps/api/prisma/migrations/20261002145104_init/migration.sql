-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('RASCUNHO');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bncc_skills" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "ano" INTEGER,
    "eixo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "explicacao" TEXT NOT NULL,
    "exemplos" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bncc_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "digitalResources" BOOLEAN NOT NULL,
    "pedagogicalInstruction" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'RASCUNHO',
    "isAiAssisted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_skills" (
    "planId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_skills_pkey" PRIMARY KEY ("planId","skillId")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "requestId" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "promptPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "bncc_skills_codigo_key" ON "bncc_skills"("codigo");

-- CreateIndex
CREATE INDEX "bncc_skills_codigo_idx" ON "bncc_skills"("codigo");

-- CreateIndex
CREATE INDEX "bncc_skills_nivel_ano_idx" ON "bncc_skills"("nivel", "ano");

-- CreateIndex
CREATE INDEX "bncc_skills_eixo_idx" ON "bncc_skills"("eixo");

-- CreateIndex
CREATE INDEX "plans_userId_idx" ON "plans"("userId");

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");

-- CreateIndex
CREATE INDEX "plan_skills_planId_idx" ON "plan_skills"("planId");

-- CreateIndex
CREATE INDEX "plan_skills_skillId_idx" ON "plan_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_runs_requestId_key" ON "ai_runs"("requestId");

-- CreateIndex
CREATE INDEX "ai_runs_userId_idx" ON "ai_runs"("userId");

-- CreateIndex
CREATE INDEX "ai_runs_requestId_idx" ON "ai_runs"("requestId");

-- CreateIndex
CREATE INDEX "ai_runs_status_idx" ON "ai_runs"("status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_skills" ADD CONSTRAINT "plan_skills_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_skills" ADD CONSTRAINT "plan_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "bncc_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
