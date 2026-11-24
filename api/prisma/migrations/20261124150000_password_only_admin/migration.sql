-- Owner-approved password-only sign-in for the single main admin (demo phase).
ALTER TABLE "User" ADD COLUMN "passwordOnly" BOOLEAN NOT NULL DEFAULT false;
