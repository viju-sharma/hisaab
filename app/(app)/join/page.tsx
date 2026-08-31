import type { Metadata } from "next"

import { JoinByCode } from "@/components/hisaab/join-by-code"
import { PageHeader } from "@/components/hisaab/page-header"

export const metadata: Metadata = { title: "Join a group" }

export default function JoinPage() {
  return (
    <>
      <PageHeader
        title="Join a group"
        description="Paste the link someone shared, or type the eight-character code."
      />
      <JoinByCode />
    </>
  )
}
