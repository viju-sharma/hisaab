import type { Metadata } from "next"

import { GroupForm } from "@/components/hisaab/group-form"
import { PageHeader } from "@/components/hisaab/page-header"

export const metadata: Metadata = { title: "New group" }

export default function NewGroupPage() {
  return (
    <>
      <PageHeader
        title="New group"
        description="Give it a name now — you can invite people the moment it exists."
      />
      <GroupForm />
    </>
  )
}
