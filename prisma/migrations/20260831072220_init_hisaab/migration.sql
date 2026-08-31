-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('HOME', 'TRIP', 'COUPLE', 'EVENT', 'PROJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SplitMethod" AS ENUM ('EQUAL', 'EXACT', 'PERCENT', 'SHARES', 'ITEMISED');

-- CreateEnum
CREATE TYPE "SettlementMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurrenceFreq" AS ENUM ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GROUP_CREATED', 'GROUP_UPDATED', 'GROUP_ARCHIVED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_ROLE_CHANGED', 'INVITE_CREATED', 'INVITE_REVOKED', 'EXPENSE_ADDED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'COMMENT_ADDED', 'SETTLEMENT_RECORDED', 'SETTLEMENT_DELETED', 'RECURRING_CREATED', 'RECURRING_UPDATED', 'RECURRING_GENERATED', 'PAYMENT_REMINDER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'JOIN', 'LEAVE', 'SETTLE', 'INVITE', 'REVOKE');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "actorId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "data" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "requestId" TEXT,
    "actorUserId" TEXT,
    "actorClerkId" TEXT,
    "groupId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "diff" JSONB,
    "route" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏷️',
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "categoryId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountMinor" INTEGER NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "groupAmountMinor" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL',
    "createdById" TEXT NOT NULL,
    "recurringExpenseId" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpensePayer" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "ExpensePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "weight" INTEGER,
    "percentBp" INTEGER,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'OTHER',
    "emoji" TEXT NOT NULL DEFAULT '🧾',
    "colorKey" TEXT NOT NULL DEFAULT 'indigo',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "simplifyDebts" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "nickname" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "data" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "categoryId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountMinor" INTEGER NOT NULL,
    "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL',
    "payerConfig" JSONB NOT NULL,
    "splitConfig" JSONB NOT NULL,
    "frequency" "RecurrenceFreq" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "anchorDay" INTEGER,
    "weekday" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRun" (
    "id" TEXT NOT NULL,
    "recurringExpenseId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expenseId" TEXT,
    "error" TEXT,

    CONSTRAINT "RecurringRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountMinor" INTEGER NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "groupAmountMinor" INTEGER NOT NULL,
    "method" "SettlementMethod" NOT NULL DEFAULT 'UPI',
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_groupId_createdAt_idx" ON "Activity"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_actorId_createdAt_idx" ON "Activity"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_traceId_idx" ON "AuditLog"("traceId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_groupId_createdAt_idx" ON "AuditLog"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Category_groupId_idx" ON "Category"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_groupId_key_key" ON "Category"("groupId", "key");

-- CreateIndex
CREATE INDEX "Expense_groupId_deletedAt_date_idx" ON "Expense"("groupId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE INDEX "Expense_recurringExpenseId_idx" ON "Expense"("recurringExpenseId");

-- CreateIndex
CREATE INDEX "ExpensePayer_userId_idx" ON "ExpensePayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePayer_expenseId_userId_key" ON "ExpensePayer"("expenseId", "userId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_userId_idx" ON "ExpenseSplit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_userId_key" ON "ExpenseSplit"("expenseId", "userId");

-- CreateIndex
CREATE INDEX "Comment_expenseId_createdAt_idx" ON "Comment"("expenseId", "createdAt");

-- CreateIndex
CREATE INDEX "Group_createdById_idx" ON "Group"("createdById");

-- CreateIndex
CREATE INDEX "Group_deletedAt_idx" ON "Group"("deletedAt");

-- CreateIndex
CREATE INDEX "GroupMember_userId_leftAt_idx" ON "GroupMember"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_leftAt_idx" ON "GroupMember"("groupId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_token_key" ON "InviteCode"("token");

-- CreateIndex
CREATE INDEX "InviteCode_groupId_revokedAt_idx" ON "InviteCode"("groupId", "revokedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_groupId_idx" ON "Notification"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "RecurringExpense_isPaused_deletedAt_nextRunAt_idx" ON "RecurringExpense"("isPaused", "deletedAt", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringExpense_groupId_idx" ON "RecurringExpense"("groupId");

-- CreateIndex
CREATE INDEX "RecurringRun_scheduledFor_idx" ON "RecurringRun"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringRun_recurringExpenseId_scheduledFor_key" ON "RecurringRun"("recurringExpenseId", "scheduledFor");

-- CreateIndex
CREATE INDEX "Settlement_groupId_deletedAt_date_idx" ON "Settlement"("groupId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "Settlement_fromUserId_idx" ON "Settlement"("fromUserId");

-- CreateIndex
CREATE INDEX "Settlement_toUserId_idx" ON "Settlement"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayer" ADD CONSTRAINT "ExpensePayer_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayer" ADD CONSTRAINT "ExpensePayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRun" ADD CONSTRAINT "RecurringRun_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
