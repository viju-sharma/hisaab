/*
  Warnings:

  - Added the required column `groupAmountMinor` to the `ExpensePayer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupAmountMinor` to the `ExpenseSplit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExpensePayer" ADD COLUMN     "groupAmountMinor" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseSplit" ADD COLUMN     "groupAmountMinor" INTEGER NOT NULL;
