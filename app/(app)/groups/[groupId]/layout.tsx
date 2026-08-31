import { notFound } from "next/navigation"

import { GroupHeader } from "@/components/hisaab/group-header"
import { ForbiddenError } from "@/lib/auth"
import { getGroupBalances } from "@/server/queries/balance"
import { getGroupDetail } from "@/server/queries/group"

async function loadGroup(groupId: string) {
  try {
    return await Promise.all([
      getGroupDetail(groupId),
      getGroupBalances(groupId),
    ])
  } catch (error) {
    // A non-member gets the same answer as a stranger with a made-up id: the
    // group's existence is not something to leak.
    if (error instanceof ForbiddenError) notFound()
    throw error
  }
}

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const [group, balances] = await loadGroup(groupId)

  const myNet =
    balances.balances.find((entry) => entry.userId === group.viewer.userId)
      ?.netMinor ?? 0

  return (
    <>
      <GroupHeader group={group} myNetMinor={myNet} />
      {children}
    </>
  )
}
