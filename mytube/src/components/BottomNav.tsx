import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Search, PlaySquare, Rss, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/AuthContext";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/shorts", icon: PlaySquare, label: "Shorts" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/subscriptions", icon: Rss, label: "Subscriptions" },
  { href: "/profile", icon: Video, label: "You" },
];

export default function BottomNav() {
  const router = useRouter();
  const { user } = useUser();

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ height: "var(--yt-bottom-nav-h, 56px)", paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex h-full items-center justify-around px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 px-2 transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("h-5 w-5", active && "stroke-[2.5]")}
                fill={active ? "currentColor" : "none"}
              />
              <span className={cn("text-[10px] font-medium", active ? "font-semibold" : "")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
