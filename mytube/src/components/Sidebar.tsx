import Link from "next/link";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import {
  Home,
  Flame,
  Rss,
  Clock,
  ThumbsUp,
  Download,
  History,
  ListVideo,
  Music2,
  Gamepad2,
  Newspaper,
  Trophy,
  Cpu,
  Clapperboard,
  Shirt,
  GraduationCap,
  Plane,
  UtensilsCrossed,
  Video,
  Settings,
  HelpCircle,
  MessageSquareWarning,
  Youtube,
  Tv2,
  Users,
  UserCircle,
  ChevronDown,
  ChevronUp,
  PlaySquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { notify } from "@/services/toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
};

// ─── SidebarItem ──────────────────────────────────────────────────────────────
const SidebarItem = ({
  href,
  icon,
  label,
  isCollapsed,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={cn(
      // Base: 40px tall, 10px radius, 12px horizontal padding, 16px icon-text gap
      "flex items-center w-full h-10 px-3 gap-4 rounded-[10px]",
      "text-sm text-foreground cursor-pointer select-none",
      "transition-colors duration-100 hover:bg-accent",
      isCollapsed && "justify-center px-0",
      isActive && "bg-accent font-medium"
    )}
  >
    <span className="shrink-0">{icon}</span>
    <AnimatePresence>
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.15 }}
          className="truncate text-sm overflow-hidden whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  </Link>
);

// ─── Section Divider ─────────────────────────────────────────────────────────
// YouTube: thin 1px border, then 16px padding before label
const SectionDivider = ({
  label,
  isCollapsed,
  href,
}: {
  label?: string;
  isCollapsed: boolean;
  href?: string;
}) => (
  <div className="py-2">
    <div className="border-t border-border" />
    {label && !isCollapsed && (
      href ? (
        <Link
          href={href}
          className="flex items-center justify-between px-3 pt-3 pb-1 group"
        >
          <span className="text-sm font-medium leading-none">{label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      ) : (
        <p className="px-3 pt-3 pb-1 text-sm font-medium leading-none">{label}</p>
      )
    )}
  </div>
);

// ─── Custom Shorts icon ───────────────────────────────────────────────────────
const ShortsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 10-2.68-6.99l-6.1 2.36a3.75 3.75 0 00.49 7.12l1.2.49-1.44.56a3.75 3.75 0 00.49 7.12l6.09 2.36a3.75 3.75 0 002.68-6.99l.44-.17a3.75 3.75 0 00-.5-7.6zm-5.5 4.05l-2.44-.94a1.25 1.25 0 01-.17-2.37l2.44-.95 4.08 1.58-3.91 1.68zm3.6-5.87l-2.44-.95 3.91-1.51 2.44.95a1.25 1.25 0 01.17 2.37l-2.44.94-1.64-.8z" />
  </svg>
);

// ─── ShowMoreButton ───────────────────────────────────────────────────────────
const ShowMoreButton = ({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center w-full h-10 px-3 gap-4 rounded-[10px] text-sm cursor-pointer select-none transition-colors duration-100 hover:bg-accent"
  >
    <span className="shrink-0">
      {expanded ? (
        <ChevronUp className="h-6 w-6" strokeWidth={1.5} />
      ) : (
        <ChevronDown className="h-6 w-6" strokeWidth={1.5} />
      )}
    </span>
    <span>{label}</span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user } = useUser();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const router = useRouter();
  const [youExpanded, setYouExpanded] = useState(false);
  const [exploreExpanded, setExploreExpanded] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  const close = () => closeMobile();

  // YouTube uses 24px icons with strokeWidth 1.5 (outline style)
  const ic = "h-6 w-6";
  const sw = 1.5;

  // ── Nav sections ────────────────────────────────────────────────────────────
  const mainItems: NavItem[] = [
    { label: "Home",          href: "/",             icon: <Home       className={ic} strokeWidth={sw} /> },
    { label: "Shorts",        href: "/shorts",        icon: <ShortsIcon className={ic} /> },
    { label: "Subscriptions", href: "/subscriptions", icon: <Rss        className={ic} strokeWidth={sw} />, requiresAuth: true },
  ];

  // YouTube shows 5 by default, rest behind "Show more"
  const youItemsAll: NavItem[] = [
    { label: "Your channel", href: user?._id ? `/channel/${user._id}` : "/login", icon: <Video      className={ic} strokeWidth={sw} /> },
    { label: "History",      href: "/history",             icon: <History    className={ic} strokeWidth={sw} /> },
    { label: "Playlists",    href: "/playlists",           icon: <ListVideo  className={ic} strokeWidth={sw} /> },
    { label: "Your videos",  href: user?._id ? `/channel/${user._id}` : "/login", icon: <Video      className={ic} strokeWidth={sw} /> },
    { label: "Watch later",  href: "/watch-later",         icon: <Clock      className={ic} strokeWidth={sw} /> },
    { label: "Liked videos", href: "/liked",               icon: <ThumbsUp   className={ic} strokeWidth={sw} /> },
    { label: "Downloads",    href: "/profile/downloads",   icon: <Download   className={ic} strokeWidth={sw} /> },
  ];
  const YOU_DEFAULT = 5;
  const youItems = youExpanded ? youItemsAll : youItemsAll.slice(0, YOU_DEFAULT);

  const exploreItemsAll: NavItem[] = [
    { label: "Trending",   href: "/trending",   icon: <Flame          className={ic} strokeWidth={sw} /> },
    { label: "Music",      href: "/music",      icon: <Music2         className={ic} strokeWidth={sw} /> },
    { label: "Gaming",     href: "/gaming",     icon: <Gamepad2       className={ic} strokeWidth={sw} /> },
    { label: "News",       href: "/news",       icon: <Newspaper      className={ic} strokeWidth={sw} /> },
    { label: "Sports",     href: "/sports",     icon: <Trophy         className={ic} strokeWidth={sw} /> },
    { label: "Technology", href: "/technology", icon: <Cpu            className={ic} strokeWidth={sw} /> },
    { label: "Movies",     href: "/movies",     icon: <Clapperboard   className={ic} strokeWidth={sw} /> },
    { label: "Fashion",    href: "/fashion",    icon: <Shirt          className={ic} strokeWidth={sw} /> },
    { label: "Education",  href: "/education",  icon: <GraduationCap  className={ic} strokeWidth={sw} /> },
    { label: "Travel",     href: "/travel",     icon: <Plane          className={ic} strokeWidth={sw} /> },
    { label: "Food",       href: "/food",       icon: <UtensilsCrossed className={ic} strokeWidth={sw} /> },
  ];
  const EXPLORE_DEFAULT = 5;
  const exploreItems = exploreExpanded ? exploreItemsAll : exploreItemsAll.slice(0, EXPLORE_DEFAULT);

  const moreItems: NavItem[] = [
    { label: "MyTube Premium", href: "/premium", icon: <Youtube  className={ic} strokeWidth={sw} /> },
    { label: "Live",           href: "/live",    icon: <Tv2      className={ic} strokeWidth={sw} /> },
    { label: "Creator Studio", href: "/studio",  icon: <Users    className={ic} strokeWidth={sw} /> },
  ];

  const settingsItems: NavItem[] = [
    { label: "Settings",      href: "/settings", icon: <Settings            className={ic} strokeWidth={sw} /> },
    { label: "Help",          href: "/",         icon: <HelpCircle          className={ic} strokeWidth={sw} /> },
    { label: "Send feedback", href: "/",         icon: <MessageSquareWarning className={ic} strokeWidth={sw} /> },
  ];

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderItems = (items: NavItem[], extraOnClick?: () => void) =>
    items.map((item) => (
      <SidebarItem
        key={item.href + item.label}
        href={item.href}
        icon={item.icon}
        label={item.label}
        isCollapsed={isCollapsed}
        isActive={isActive(item.href)}
        onClick={() => {
          close();
          extraOnClick?.();
          if (item.requiresAuth && !user?._id) {
            notify.info("Sign in to access this feature");
          }
        }}
      />
    ));

  // ── Sidebar content ─────────────────────────────────────────────────────────
  const sidebarContent = (
    <nav
      className={cn(
        "flex flex-col overflow-y-auto overflow-x-hidden h-full pt-2 pb-6",
        isCollapsed ? "items-center px-0" : "px-2"
      )}
      aria-label="Main navigation"
    >
      {/* ── Main nav ── */}
      {renderItems(mainItems)}

      {/* ── You / Sign-in section ── */}
      {!isCollapsed && <SectionDivider label={user?._id ? "You" : undefined} isCollapsed={isCollapsed} href={user?._id ? `/channel/${user._id}` : undefined} />}
      {isCollapsed && <div className="my-2 w-8 border-t border-border" />}

      {user?._id ? (
        <>
          {renderItems(youItems)}
          {!isCollapsed && youItemsAll.length > YOU_DEFAULT && (
            <ShowMoreButton
              expanded={youExpanded}
              onToggle={() => setYouExpanded((v) => !v)}
              label={youExpanded ? "Show less" : "Show more"}
            />
          )}
        </>
      ) : (
        !isCollapsed && (
          <div className="px-3 pb-4 pt-2">
            <p className="text-sm text-muted-foreground mb-3 leading-snug">
              Sign in to like videos, comment, and subscribe.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium hover:bg-accent transition-colors"
              style={{ color: "#3ea6ff", borderColor: "#3ea6ff" }}
            >
              <UserCircle className="h-5 w-5" />
              Sign in
            </Link>
          </div>
        )
      )}

      {/* ── Explore ── */}
      {!isCollapsed && <SectionDivider label="Explore" isCollapsed={isCollapsed} />}
      {isCollapsed && <div className="my-2 w-8 border-t border-border" />}

      {renderItems(exploreItems)}
      {!isCollapsed && exploreItemsAll.length > EXPLORE_DEFAULT && (
        <ShowMoreButton
          expanded={exploreExpanded}
          onToggle={() => setExploreExpanded((v) => !v)}
          label={exploreExpanded ? "Show less" : "Show more"}
        />
      )}

      {/* ── More from MyTube ── */}
      {!isCollapsed && <SectionDivider label="More from MyTube" isCollapsed={isCollapsed} />}
      {isCollapsed && <div className="my-2 w-8 border-t border-border" />}

      {renderItems(moreItems)}

      {/* ── Settings / Help ── */}
      {!isCollapsed && <SectionDivider isCollapsed={isCollapsed} />}
      {isCollapsed && <div className="my-2 w-8 border-t border-border" />}

      {renderItems(settingsItems)}

      {/* ── Footer ── */}
      {!isCollapsed && (
        <div className="px-3 pt-4 space-y-1">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            © 2025 MyTube
          </p>
          <p className="text-[11px] text-muted-foreground">
            Privacy · Terms · About
          </p>
        </div>
      )}
    </nav>
  );

  // ── Mobile backdrop ─────────────────────────────────────────────────────────
  const backdrop = isMobileOpen ? (
    <div
      className="fixed inset-0 z-40 bg-black/60 md:hidden"
      onClick={close}
      aria-hidden
    />
  ) : null;

  return (
    <>
      {backdrop}

      {/* ── Mobile drawer (slides in from left) ── */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-background transition-transform duration-300 ease-in-out md:hidden",
          "w-60 overflow-hidden shadow-xl"
        )}
        style={{ transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)" }}
        aria-label="Sidebar"
      >
        {/* Mobile header with logo */}
        <div className="flex items-center gap-3 h-14 px-4">
          <button
            type="button"
            onClick={close}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors -ml-2"
            aria-label="Close sidebar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-1" aria-label="MyTube Home">
            <svg viewBox="0 0 28 20" className="h-5 w-7 shrink-0" fill="none">
              <rect width="28" height="20" rx="4" fill="#FF0000" />
              <polygon points="11,5 21,10 11,15" fill="white" />
            </svg>
            <span className="font-bold text-lg tracking-tight">MyTube</span>
          </Link>
        </div>
        <div className="h-[calc(100%-56px)] overflow-y-auto">{sidebarContent}</div>
      </div>

      {/* ── Desktop sidebar — sticky, no border, smooth width transition ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-[calc(100vh-56px)] sticky top-14 shrink-0 overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}