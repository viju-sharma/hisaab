import type { NextRequest } from "next/server"

import { netBalances } from "@/lib/balance"
import { isAuthorisedCron } from "@/lib/cron"
import { formatMoney } from "@/lib/money"
import { log } from "@/lib/observability/logger"
import { withBackgroundContext } from "@/lib/observability/request"
import { db } from "@/lib/db"
import { fromDate, now } from "@/lib/db-time"
import { newId } from "@/lib/id"
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
    const since = fromDate(new Date(Date.now() - COOLDOWN_MS))

    const groups = await db.orm.public.Group.where((group) =>
      group.deletedAt.isNull()
    )
      .where((group) => group.archivedAt.isNull())
      .select("id", "name", "currency")
      .all()

    let sent = 0

    for (const group of groups) {
      const ledger = await loadGroupLedger(group.id)
      const debtors = netBalances(ledger).filter(
        (entry) => entry.netMinor <= -MINIMUM_MINOR
      )
      if (debtors.length === 0) continue

      const candidates = await db.orm.public.User.where((user) =>
        user.id.in(debtors.map((entry) => entry.userId))
      )
        .where((user) => user.remindersEnabled.eq(true))
        .where((user) => user.deletedAt.isNull())
        .select("id")
        .all()
      if (candidates.length === 0) continue

      // Skip anyone already reminded about this group recently. Read as its own
      // query rather than a `none` relation predicate so the cooldown stays
      // legible next to the window it is measured against.
      const reminded = await db.orm.public.Notification.where((notification) =>
        notification.userId.in(candidates.map((user) => user.id))
      )
        .where((notification) => notification.groupId.eq(group.id))
        .where((notification) => notification.type.eq("PAYMENT_REMINDER"))
        .where((notification) => notification.createdAt.gte(since))
        .select("userId")
        .all()
      const recentlyReminded = new Set(reminded.map((entry) => entry.userId))

      const eligible = candidates.filter(
        (user) => !recentlyReminded.has(user.id)
      )
      if (eligible.length === 0) continue

      const owedBy = new Map(
        debtors.map((entry) => [entry.userId, -entry.netMinor])
      )

      await db.orm.public.Notification.createAll(
        eligible.map((user) => ({
          id: newId(),
          userId: user.id,
          groupId: group.id,
          type: "PAYMENT_REMINDER" as const,
          title: `You owe ${formatMoney(owedBy.get(user.id) ?? 0, group.currency)} in ${group.name}`,
          body: "Settle up to keep the group balanced.",
          href: `/groups/${group.id}/balances`,
          entityType: null,
          entityId: null,
          data: null,
          readAt: null,
          createdAt: now(),
        }))
      )

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
