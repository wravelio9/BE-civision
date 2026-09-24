/*
  Warnings:

  - You are about to alter the column `status` on the `violation` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `violation` MODIFY `status` ENUM('unverified', 'valid', 'invalid') NOT NULL DEFAULT 'unverified';
