import type { NextRequest } from "next/server"

import { netBalances } from "@/lib/balance"
import { isAuthorisedCron } from "@/lib/cron"
import { formatMoney } from "@/lib/money"
import { log } from "@/lib/observability/logger"
import { withBackgroundContext } from "@/lib/observability/request"
import { prisma } from "@/lib/prisma"
import { sendPushToUsers } from "@/lib/push"
import { loadGroupLedger } from "@/server/queries/group"

export const maxDuration = 300

/// A nudge no more than once a week per person per group, and only when there
/// is a real outstanding balance. Reminder fatigue is what makes people mute an
/// app, so the bar for sending is deliberately high.
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const MINIMUM_MINOR = 100

export async function GET(request: NextRequest) {
  if (!isAuthorisedCron(request)) {
    return new Response("Unauthorised", { status: 401 })
  }

  return withBackgroundContext("cron:reminders", async () => {
    const since = new Date(Date.now() - COOLDOWN_MS)

    const groups = await prisma.group.findMany({
      where: { deletedAt: null, archivedAt: null },
      select: { id: true, name: true, currency: true },
    })

    let sent = 0

    for (const group of groups) {
      const ledger = await loadGroupLedger(group.id)
      const debtors = netBalances(ledger).filter(
        (entry) => entry.netMinor <= -MINIMUM_MINOR
      )
      if (debtors.length === 0) continue

      const eligible = await prisma.user.findMany({
        where: {
          id: { in: debtors.map((entry) => entry.userId) },
          remindersEnabled: true,
          deletedAt: null,
          // Skip anyone already reminded about this group recently.
          notifications: {
            none: {
              groupId: group.id,
              type: "PAYMENT_REMINDER",
              createdAt: { gte: since },
            },
          },
        },
        select: { id: true },
      })
      if (eligible.length === 0) continue

      const owedBy = new Map(
        debtors.map((entry) => [entry.userId, -entry.netMinor])
      )

      await prisma.notification.createMany({
        data: eligible.map((user) => ({
          userId: user.id,
          groupId: group.id,
          type: "PAYMENT_REMINDER" as const,
          title: `You owe ${formatMoney(owedBy.get(user.id) ?? 0, group.currency)} in ${group.name}`,
          body: "Settle up to keep the group balanced.",
          href: `/groups/${group.id}/balances`,
        })),
      })

      for (const user of eligible) {
        await sendPushToUsers([user.id], {
          title: `You owe ${formatMoney(owedBy.get(user.id) ?? 0, group.currency)} in ${group.name}`,
          body: "Settle up to keep the group balanced.",
          href: `/groups/${group.id}/balances`,
          tag: `reminder-${group.id}`,
        })
      }

      sent += eligible.length
    }

    log.info("cron.reminders.done", { sent, groups: groups.length })
    return Response.json({ sent, groups: groups.length })
  })
}
