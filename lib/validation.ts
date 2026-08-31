import { z } from "zod"

import { isSupportedCurrency } from "@/lib/currency"

const id = z.string().min(1)

const currency = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase())
  .refine(isSupportedCurrency, "That currency is not supported yet.")

const amountMinor = z
  .number()
  .int("Amounts are whole minor units.")
  .positive("Enter an amount greater than zero.")
  .max(2_000_000_000, "That amount is too large.")

export const groupTypeSchema = z.enum([
  "HOME",
  "TRIP",
  "COUPLE",
  "EVENT",
  "PROJECT",
  "OTHER",
])

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(60),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  type: groupTypeSchema.default("OTHER"),
  emoji: z.string().min(1).max(8).default("🧾"),
  colorKey: z.string().min(1).max(24).default("indigo"),
  currency: currency.default("INR"),
  simplifyDebts: z.boolean().default(true),
})

export const updateGroupSchema = createGroupSchema.partial().extend({
  groupId: id,
})

export const groupIdSchema = z.object({ groupId: id })

export const createInviteSchema = z.object({
  groupId: id,
  expiresInDays: z.number().int().min(1).max(90).nullable().default(null),
  maxUses: z.number().int().min(1).max(100).nullable().default(null),
})

export const joinGroupSchema = z.object({
  /// Accepts either the short typed code or the long link token.
  code: z.string().trim().min(4).max(64),
})

export const memberSchema = z.object({
  groupId: id,
  userId: id,
})

export const changeRoleSchema = memberSchema.extend({
  role: z.enum(["ADMIN", "MEMBER"]),
})

const payerSchema = z.object({ userId: id, amountMinor })

const splitConfigSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("EQUAL"),
    participants: z.array(id).min(1, "Pick at least one person."),
  }),
  z.object({
    method: z.literal("SHARES"),
    shares: z
      .array(z.object({ userId: id, weight: z.number().int().min(0).max(999) }))
      .min(1),
  }),
  z.object({
    method: z.literal("PERCENT"),
    percents: z
      .array(
        z.object({ userId: id, percentBp: z.number().int().min(0).max(10_000) })
      )
      .min(1),
  }),
  z.object({
    method: z.literal("EXACT"),
    amounts: z
      .array(z.object({ userId: id, amountMinor: z.number().int().min(0) }))
      .min(1),
  }),
  z.object({
    method: z.literal("ITEMISED"),
    items: z
      .array(
        z.object({
          amountMinor,
          participants: z.array(id).min(1),
        })
      )
      .min(1),
  }),
])

export const createExpenseSchema = z.object({
  groupId: id,
  description: z.string().trim().min(1, "What was it for?").max(120),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  categoryId: id.nullable().default(null),
  currency: currency.default("INR"),
  amountMinor,
  exchangeRate: z.number().positive().default(1),
  date: z.coerce.date(),
  payers: z.array(payerSchema).min(1, "Say who paid."),
  split: splitConfigSchema,
})

export const updateExpenseSchema = createExpenseSchema.extend({
  expenseId: id,
})

export const expenseIdSchema = z.object({ expenseId: id })

export const commentSchema = z.object({
  expenseId: id,
  body: z.string().trim().min(1).max(1000),
})

export const settlementSchema = z.object({
  groupId: id,
  fromUserId: id,
  toUserId: id,
  amountMinor,
  currency: currency.default("INR"),
  exchangeRate: z.number().positive().default(1),
  date: z.coerce.date(),
  method: z
    .enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"])
    .default("UPI"),
  note: z.string().trim().max(280).optional().or(z.literal("")),
})

export const recurringSchema = z.object({
  groupId: id,
  description: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  categoryId: id.nullable().default(null),
  currency: currency.default("INR"),
  amountMinor,
  payers: z.array(payerSchema).min(1),
  split: splitConfigSchema,
  frequency: z.enum([
    "DAILY",
    "WEEKLY",
    "FORTNIGHTLY",
    "MONTHLY",
    "QUARTERLY",
    "YEARLY",
  ]),
  interval: z.number().int().min(1).max(12).default(1),
  anchorDay: z.number().int().min(1).max(31).nullable().default(null),
  weekday: z.number().int().min(0).max(6).nullable().default(null),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().default(null),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export type SplitConfig = z.output<typeof splitConfigSchema>
export type CreateExpenseInput = z.output<typeof createExpenseSchema>
