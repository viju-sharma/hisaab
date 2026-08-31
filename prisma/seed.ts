import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../app/generated/prisma/client"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
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
    const existing = await prisma.category.findFirst({
      where: { groupId: null, key: category.key },
    })
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { ...category, sortOrder: index },
      })
    } else {
      await prisma.category.create({
        data: { ...category, sortOrder: index },
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
  .finally(() => prisma.$disconnect())
