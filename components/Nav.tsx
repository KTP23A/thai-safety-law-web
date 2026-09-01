"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/weekly", label: "Weekly" },
  { href: "/board", label: "Board" },
  { href: "/quarters", label: "Quarters" },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
