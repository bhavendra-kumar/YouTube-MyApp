import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { History, Home, PlaySquare, PlusSquare, Video } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
};

const items: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    isActive: (p) => p === "/",
  },
  {
    href: "/shorts",
    label: "Shorts",
    icon: Video,
    isActive: (p) => p === "/shorts",
  },
  {
    href: "/upload",
    label: "Upload",
    icon: PlusSquare,
    isActive: (p) => p === "/upload",
  },
  {
    href: "/subscriptions",
    label: "Subs",
    icon: PlaySquare,
    isActive: (p) => p === "/subscriptions",
  },
  {
    href: "/history",
    label: "History",
    icon: History,
    isActive: (p) => p === "/history",
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] md:hidden",
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex h-14 max-w-md items-stretch justify-between px-2">
        {items.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-md",
                "text-xs text-muted-foreground",
                active ? "text-foreground" : "hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-foreground" : "")} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
