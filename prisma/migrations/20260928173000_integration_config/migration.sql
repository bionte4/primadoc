CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpFrom" TEXT,
    "smtpPasswordEnc" TEXT,
    "openaiModel" TEXT,
    "openaiKeyEnc" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);
