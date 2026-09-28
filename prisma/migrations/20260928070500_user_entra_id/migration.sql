-- Microsoft sign-in links an invited user; local accounts keep a password.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "entraId" TEXT;
CREATE UNIQUE INDEX "User_entraId_key" ON "User"("entraId");
