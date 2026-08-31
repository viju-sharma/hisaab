import "dotenv/config"

import postgres from "@prisma/orm-postgres/runtime"

import type { Contract } from "../generated/prisma8/contract"
import contractJson from "../generated/prisma8/contract.json" with { type: "json" }
import { fromDate } from "../lib/db-time"
import { newId } from "../lib/id"

const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL,
})

/// Shared with every group (groupId null). Ordered by how often an Indian
/// household or trip actually reaches for them.
const CATEGORIES = [
  { key: "food", label: "Food & drinks", emoji: "🍛" },
  { key: "groceries", label: "Groceries", emoji: "🛒" },
  { key: "transport", label: "Auto & cab", emoji: "🛺" },
  { key: "fuel", label: "Fuel", emoji: "⛽" },
  { key: "rent", label: "Rent", emoji: "🏠" },
  { key: "utilities", label: "Utilities", emoji: "💡" },
  { key: "internet", label: "Internet & phone", emoji: "📶" },
  { key: "stay", label: "Stay", emoji: "🏨" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "entertainment", label: "Entertainment", emoji: "🎬" },
  { key: "shopping", label: "Shopping", emoji: "🛍️" },
  { key: "health", label: "Health", emoji: "🩺" },
  { key: "education", label: "Education", emoji: "📚" },
  { key: "household", label: "Household", emoji: "🧹" },
  { key: "gifts", label: "Gifts", emoji: "🎁" },
  { key: "subscriptions", label: "Subscriptions", emoji: "🔁" },
  { key: "other", label: "Other", emoji: "🏷️" },
]

async function main() {
  for (const [index, category] of CATEGORIES.entries()) {
    const existing = await db.orm.public.Category.where((entry) =>
      entry.groupId.isNull()
    )
      .where((entry) => entry.key.eq(category.key))
      .first()

    if (existing) {
      await db.orm.public.Category.where((entry) =>
        entry.id.eq(existing.id)
      ).update({ ...category, sortOrder: index })
    } else {
      await db.orm.public.Category.create({
        id: newId(),
        groupId: null,
        ...category,
        color: null,
        sortOrder: index,
        createdAt: fromDate(new Date()),
      })
    }
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.close())
