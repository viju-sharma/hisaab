import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/app/generated/prisma/client"
import { tracingExtension } from "@/lib/observability/prisma-extension"

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  }).$extends(tracingExtension)
}

/// `$extends` returns a client with a *different* type, so the singleton is
/// typed from the factory. Annotating it as `PrismaClient` would silently drop
/// the extension's types.
type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/// The transactional client handed to service functions. Derived rather than
/// hand-written so it stays correct as extensions change.
export type PrismaTransaction = Omit<
  ExtendedPrismaClient,
  "$connect" | "$disconnect" | "$transaction" | "$extends"
>
