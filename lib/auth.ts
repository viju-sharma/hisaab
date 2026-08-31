import { auth, currentUser } from "@clerk/nextjs/server"

import { db } from "@/lib/db"
import type { UserRow } from "@/lib/db-types"
import { now } from "@/lib/db-time"
import { newId } from "@/lib/id"
import { identify } from "@/lib/observability/context"

export class UnauthorizedError extends Error {
  constructor(message = "You need to be signed in to do that.") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this.") {
    super(message)
    this.name = "ForbiddenError"
  }
}

/// Resolves the signed-in Clerk user to our `User` row, creating it on first
/// sight. The Clerk webhook keeps the row in sync afterwards, but webhooks can
/// lag behind a redirect, so this is the safety net that makes sign-up → first
/// action work every time.
export async function getOrCreateUser(): Promise<UserRow> {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new UnauthorizedError()

  const existing = await db.orm.public.User.where({ clerkId }).first()
  if (existing) {
    identify({ userId: existing.id, clerkId })
    return existing
  }

  const clerkUser = await currentUser()
  if (!clerkUser) throw new UnauthorizedError()

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress
  if (!email) throw new UnauthorizedError("Your account has no email address.")

  const timestamp = now()
  const user = await db.orm.public.User.where({ clerkId }).upsert({
    create: {
      id: newId(),
      clerkId,
      email,
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        null,
      imageUrl: clerkUser.imageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    update: {},
  })

  identify({ userId: user.id, clerkId })
  return user
}

/// Same as above but returns null instead of throwing, for pages that render
/// differently when signed out.
export async function getOptionalUser(): Promise<UserRow | null> {
  const { userId } = await auth()
  if (!userId) return null
  return getOrCreateUser()
}
