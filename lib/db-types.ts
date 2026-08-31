import type { FieldOutputTypes } from "@/generated/prisma8/contract"

/// Prisma 8 infers row types per query rather than emitting a named type per
/// model, but plenty of code here passes whole rows around. `FieldOutputTypes`
/// is the emitted per-field output map, so a full row is just a mapped type
/// over it — and it stays correct as the contract changes.
type Models = FieldOutputTypes["public"]

export type Row<M extends keyof Models> = {
  -readonly [F in keyof Models[M]]: Models[M][F]
}

export type UserRow = Row<"User">
export type GroupRow = Row<"Group">
export type GroupMemberRow = Row<"GroupMember">
export type ExpenseRow = Row<"Expense">
export type ExpensePayerRow = Row<"ExpensePayer">
export type ExpenseSplitRow = Row<"ExpenseSplit">
export type SettlementRow = Row<"Settlement">
export type CategoryRow = Row<"Category">
export type CommentRow = Row<"Comment">
export type InviteCodeRow = Row<"InviteCode">
export type ActivityRow = Row<"Activity">
export type NotificationRow = Row<"Notification">
export type PushSubscriptionRow = Row<"PushSubscription">
export type RecurringExpenseRow = Row<"RecurringExpense">
export type RecurringRunRow = Row<"RecurringRun">
export type AuditLogRow = Row<"AuditLog">

/// Enums reach the app as literal unions on the columns that carry them, so
/// they are read off the row types rather than imported from a generated
/// enums module.
export type GroupType = GroupRow["type"]
export type MemberRole = GroupMemberRow["role"]
export type SplitMethod = ExpenseRow["splitMethod"]
export type SettlementMethod = SettlementRow["method"]
export type RecurrenceFreq = RecurringExpenseRow["frequency"]
export type EventType = ActivityRow["type"]
export type AuditAction = AuditLogRow["action"]

/// The shape a `Json`/`Jsonb` column accepts. Declared here rather than
/// imported so nothing outside the data layer reaches into a framework package.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
