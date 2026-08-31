import { headers } from "next/headers"

import { InviteCard } from "@/components/hisaab/invite-card"
import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { GroupDangerZone } from "@/components/hisaab/group-danger-zone"
import { Badge } from "@/components/ui/badge"
import { SectionHeading } from "@/components/hisaab/section-heading"
import { getGroupDetail } from "@/server/queries/group"

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const [group, headerList] = await Promise.all([
    getGroupDetail(groupId),
    headers(),
  ])
  const isAdmin = group.viewer.role !== "MEMBER"

  const host = headerList.get("host") ?? ""
  const protocol = host.startsWith("localhost") ? "http" : "https"
  const origin = host ? `${protocol}://${host}` : ""

  return (
    <div className="space-y-6 pb-8">
      {group.invite ? (
        <InviteCard
          groupId={group.id}
          groupName={group.name}
          code={group.invite.code}
          token={group.invite.token}
          origin={origin}
          canRotate={isAdmin}
        />
      ) : null}

      <section>
        <SectionHeading>Members</SectionHeading>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {group.members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar member={member} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {member.name}
                  {member.userId === group.viewer.userId ? " (you)" : ""}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.email}
                </span>
              </span>
              {member.role !== "MEMBER" ? (
                <Badge variant="secondary" className="capitalize">
                  {member.role.toLowerCase()}
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-sans text-sm font-medium">About this group</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium">{group.currency}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Simplify debts</dt>
            <dd className="font-medium">{group.simplifyDebts ? "On" : "Off"}</dd>
          </div>
          {group.description ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Note</dt>
              <dd className="max-w-[60%] text-right">{group.description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <GroupDangerZone
        groupId={group.id}
        role={group.viewer.role}
        archived={Boolean(group.archivedAt)}
      />
    </div>
  )
}
