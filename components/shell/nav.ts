import {
  Activity,
  Bell,
  House,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /// Shown in the mobile tab bar as well as the desktop rail.
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, primary: true },
  { href: "/groups", label: "Groups", icon: Users, primary: true },
  { href: "/activity", label: "Activity", icon: Activity, primary: true },
  { href: "/notifications", label: "Alerts", icon: Bell, primary: true },
  { href: "/settings", label: "Settings", icon: Settings },
]
