-- Remember which OpenID Connect provider last signed the user in.
ALTER TABLE "User" ADD COLUMN "authProvider" TEXT;
ALTER TABLE "User" ADD COLUMN "externalId" TEXT;

UPDATE "User"
SET "authProvider" = 'azure-ad', "externalId" = "entraId"
WHERE "entraId" IS NOT NULL AND "externalId" IS NULL;

CREATE UNIQUE INDEX "User_authProvider_externalId_key" ON "User"("authProvider", "externalId");
