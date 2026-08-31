import { ArrowRight } from "lucide-react"

import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { Money, BalanceAmount, balanceLabel } from "@/components/hisaab/money"
import { SettleUpButton } from "@/components/hisaab/settle-up"
import { getGroupBalances } from "@/server/queries/balance"

export default async function GroupBalancesPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const data = await getGroupBalances(groupId)

  // The group's preference decides which view leads, but both are always
  // available: simplified answers "what do I pay?", pairwise answers "why?".
  const lead = data.simplifyDebts ? data.simplified : data.pairwise
  const alternate = data.simplifyDebts ? data.pairwise : data.simplified
  const alternateLabel = data.simplifyDebts
    ? "Who spent with whom"
    : "Fewest payments"

  const me = data.balances.find((entry) => entry.userId === data.viewerId)

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {balanceLabel(me?.netMinor ?? 0)}
        </p>
        <BalanceAmount
          minor={me?.netMinor ?? 0}
          currency={data.currency}
          size="xl"
          className="mt-1 block"
        />
      </section>

      <section>
        <h2 className="pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {data.simplifyDebts ? "Settle up in the fewest payments" : "Who owes whom"}
        </h2>

        {lead.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Everyone is square. Nothing to settle.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {lead.map((transfer, index) => (
              <li
                key={`${transfer.fromUserId}-${transfer.toUserId}`}
                style={{ "--stagger": index } as React.CSSProperties}
                className="animate-row-in flex items-center gap-3 px-4 py-3"
              >
                <MemberAvatar
                  member={{
                    userId: transfer.fromUserId,
                    name: transfer.fromName,
                    imageUrl: transfer.fromImageUrl,
                  }}
                />
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                <MemberAvatar
                  member={{
                    userId: transfer.toUserId,
                    name: transfer.toName,
                    imageUrl: transfer.toImageUrl,
                  }}
                />

                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {transfer.fromUserId === data.viewerId
                      ? "You"
                      : transfer.fromName}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {transfer.fromUserId === data.viewerId ? "owe" : "owes"}
                  </span>{" "}
                  <span className="font-medium">
                    {transfer.toUserId === data.viewerId ? "you" : transfer.toName}
                  </span>
                </span>

                <span className="shrink-0 text-sm font-medium">
                  <Money minor={transfer.amountMinor} currency={data.currency} />
                </span>

                <SettleUpButton
                  groupId={groupId}
                  currency={data.currency}
                  fromUserId={transfer.fromUserId}
                  toUserId={transfer.toUserId}
                  fromName={transfer.fromName}
                  toName={transfer.toName}
                  suggestedMinor={transfer.amountMinor}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Everyone
        </h2>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.balances.map((entry) => (
            <li key={entry.userId} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar member={entry} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {entry.name}
                {entry.userId === data.viewerId ? " (you)" : ""}
              </span>
              <span className="text-right">
                <BalanceAmount
                  minor={entry.netMinor}
                  currency={data.currency}
                  size="sm"
                  className="block"
                />
                <span className="text-[0.65rem] text-muted-foreground">
                  {entry.netMinor > 0
                    ? "is owed"
                    : entry.netMinor < 0
                      ? "owes"
                      : "settled"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {alternate.length > 0 ? (
        <section>
          <h2 className="pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {alternateLabel}
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border border-dashed">
            {alternate.map((transfer) => (
              <li
                key={`alt-${transfer.fromUserId}-${transfer.toUserId}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground"
              >
                <span className="min-w-0 flex-1 truncate">
                  {transfer.fromName} → {transfer.toName}
                </span>
                <Money minor={transfer.amountMinor} currency={data.currency} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
