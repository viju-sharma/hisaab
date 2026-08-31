import type { MemberRole } from "@/app/generated/prisma/enums"
import type { GroupMemberModel, UserModel } from "@/app/generated/prisma/models"
import { ForbiddenError, getOrCreateUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const RANK: Record<MemberRole, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 }

export type GroupAccess = {
  user: UserModel
  membership: GroupMemberModel
}

/// The real authorisation boundary. Next's proxy runs before rendering and the
/// docs are explicit that it is not an authorisation mechanism, so every
/// group-scoped read and write goes through here instead.
export async function requireGroupMember(
  groupId: string,
  minimumRole: MemberRole = "MEMBER"
): Promise<GroupAccess> {
  const user = await getOrCreateUser()

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  })

  if (!membership || membership.leftAt) {
    throw new ForbiddenError("You are not a member of this group.")
  }
  if (RANK[membership.role] < RANK[minimumRole]) {
    throw new ForbiddenError(
      minimumRole === "OWNER"
        ? "Only the group owner can do that."
        : "Only group admins can do that."
    )
  }

  return { user, membership }
}

export function requireGroupAdmin(groupId: string) {
  return requireGroupMember(groupId, "ADMIN")
}

export function requireGroupOwner(groupId: string) {
  return requireGroupMember(groupId, "OWNER")
}
