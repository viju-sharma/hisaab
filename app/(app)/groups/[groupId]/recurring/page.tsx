import { format } from "date-fns"

import { RecurringForm } from "@/components/hisaab/recurring-form"
import { RecurringRow } from "@/components/hisaab/recurring-row"
import { Money } from "@/components/hisaab/money"
import { SectionHeading } from "@/components/hisaab/section-heading"
import { describeRecurrence } from "@/lib/recurrence"
import { prisma } from "@/lib/prisma"
import { requireGroupMember } from "@/lib/authz"
import { getGroupDetail } from "@/server/queries/group"

export default async function GroupRecurringPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  await requireGroupMember(groupId)

  const [group, templates] = await Promise.all([
    getGroupDetail(groupId),
    prisma.recurringExpense.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { nextRunAt: "asc" },
      select: {
        id: true,
        description: true,
        currency: true,
        amountMinor: true,
        frequency: true,
        interval: true,
        anchorDay: true,
        weekday: true,
        nextRunAt: true,
        isPaused: true,
      },
    }),
  ])

  return (
    <div className="space-y-8 pb-8">
      <section>
        <SectionHeading>Scheduled</SectionHeading>

        {templates.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled. Rent, wifi and the maid are the usual suspects.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {template.description}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    <Money
                      minor={template.amountMinor}
                      currency={template.currency}
                    />{" "}
                    ·{" "}
                    {describeRecurrence({
                      frequency: template.frequency,
                      interval: template.interval,
                      anchorDay: template.anchorDay,
                      weekday: template.weekday,
                    })}
                    {template.isPaused
                      ? " · paused"
                      : ` · next ${format(template.nextRunAt, "d MMM")}`}
                  </span>
                </span>
                <RecurringRow
                  recurringId={template.id}
                  paused={template.isPaused}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading>Add a schedule</SectionHeading>
        <RecurringForm
          groupId={groupId}
          groupCurrency={group.currency}
          members={group.members.map((member) => ({
            userId: member.userId,
            name: member.name,
            imageUrl: member.imageUrl,
          }))}
          viewerId={group.viewer.userId}
        />
      </section>
    </div>
  )
}
