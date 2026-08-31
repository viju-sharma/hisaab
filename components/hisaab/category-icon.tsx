import { createElement } from "react"
import {
  BookOpen,
  Bus,
  CircleDashed,
  Clapperboard,
  Fuel,
  Gift,
  Hotel,
  House,
  Lightbulb,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/// Drawn icons rather than the emoji the categories are seeded with: emoji
/// render differently on every platform, carry a colour the palette never
/// chose, and at 16px are mostly noise.
const ICONS: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  groceries: ShoppingCart,
  transport: Bus,
  fuel: Fuel,
  rent: House,
  utilities: Lightbulb,
  internet: Wifi,
  stay: Hotel,
  travel: Plane,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  health: Stethoscope,
  education: BookOpen,
  household: WashingMachine,
  gifts: Gift,
  subscriptions: Repeat,
  other: CircleDashed,
}

/// Built with createElement rather than by assigning the looked-up icon to a
/// capitalised local: the reference is stable (it comes from a module-level
/// map), but doing it in JSX reads to the compiler as defining a component
/// mid-render.
export function CategoryIcon({
  categoryKey,
  className,
}: {
  categoryKey?: string | null
  className?: string
}) {
  const icon = (categoryKey && ICONS[categoryKey]) || CircleDashed
  return createElement(icon, { className: cn("size-4", className) })
}
