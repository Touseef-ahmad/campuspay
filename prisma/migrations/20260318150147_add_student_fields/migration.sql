/*
  Warnings:

  - A unique constraint covering the columns `[studentId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "academicYear" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "enrollmentDate" TIMESTAMP(3),
ADD COLUMN     "studentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");
