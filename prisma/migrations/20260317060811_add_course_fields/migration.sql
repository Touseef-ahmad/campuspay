-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable: rename name → title, add new fields
ALTER TABLE "Course"
  RENAME COLUMN "name" TO "title";

ALTER TABLE "Course"
  ADD COLUMN "credits" INTEGER,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "duration" TEXT,
  ADD COLUMN "maxStudents" INTEGER,
  ADD COLUMN "semester" TEXT,
  ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE';
