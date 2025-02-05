/*
  Warnings:

  - Added the required column `activity_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_id` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "activity_id" TEXT NOT NULL,
ADD COLUMN     "source_id" TEXT NOT NULL;
