import Link from "next/link"
import React from "react"
import { useRouter } from "next/router"
import {
    ChevronRight,
    Clock,
    Compass,
    Cpu,
    Download,
    Gamepad2,
    History,
    Home,
    ListVideo,
    Music2,
    Newspaper,
    PlaySquare,
    Trophy,
    Video,
    ThumbsUp,
    User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUser } from "@/context/AuthContext"
import { useSidebar } from "@/context/SidebarContext"
import { cn } from "@/lib/utils"
import { notify } from "@/services/toast"

const Sidebar = () => {
    const { user } = useUser()
    const { isCollapsed, isMobileOpen, closeMobile } = useSidebar()
    const router = useRouter()

    const hasChannel = Boolean(String(user?.channelname || "").trim())

    const itemClass = cn(
        "w-full rounded-lg",
        isCollapsed ? "justify-center px-0" : "justify-start px-3"
    )
    const iconClass = cn(isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5")
    const labelClass = cn(isCollapsed ? "sr-only" : "")

    const sectionHeadingClass = cn(
        "px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground",
        isCollapsed ? "sr-only" : ""
    )

    const youHeading = (
        <div className={cn("flex items-center justify-between px-3 pt-4 pb-2", isCollapsed ? "sr-only" : "")}>
            <div className="text-sm font-semibold">You</div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
    )

    const comingSoon = (label: string) => {
        notify.info(`${label} coming soon`)
    }

    React.useEffect(() => {
        if (!isMobileOpen) return
        const onRoute = () => closeMobile()

        router.events.on("routeChangeStart", onRoute)
        return () => {
            router.events.off("routeChangeStart", onRoute)
        }
    }, [closeMobile, isMobileOpen, router.events])

    React.useEffect(() => {
        if (typeof document === "undefined") return
        if (!isMobileOpen) return

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [isMobileOpen])

    const nav = (
        <nav className={cn("space-y-1", isCollapsed ? "px-1" : "px-2")}>
            {/* Top */}
            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/" aria-label="Home">
                    <Home className={iconClass} />
                    <span className={labelClass}>Home</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/shorts" aria-label="Shorts">
                    <Video className={iconClass} />
                    <span className={labelClass}>Shorts</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/subscriptions" aria-label="Subscriptions">
                    <PlaySquare className={iconClass} />
                    <span className={labelClass}>Subscriptions</span>
                </Link>
            </Button>

            <div className="my-2 border-t" />

            {/* You */}
            {user ? (
                <>
                    {youHeading}

                    <Button asChild variant="ghost" className={itemClass}>
                        <Link href="/history" aria-label="History">
                            <History className={iconClass} />
                            <span className={labelClass}>History</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="ghost"
                        className={itemClass}
                    >
                        <Link href="/playlists" aria-label="Playlists">
                            <ListVideo className={iconClass} />
                            <span className={labelClass}>Playlists</span>
                        </Link>
                    </Button>

                    <Button asChild variant="ghost" className={itemClass}>
                        <Link href="/watch-later" aria-label="Watch later">
                            <Clock className={iconClass} />
                            <span className={labelClass}>Watch later</span>
                        </Link>
                    </Button>

                    <Button asChild variant="ghost" className={itemClass}>
                        <Link href="/liked" aria-label="Liked videos">
                            <ThumbsUp className={iconClass} />
                            <span className={labelClass}>Liked videos</span>
                        </Link>
                    </Button>

                    <Button asChild variant="ghost" className={itemClass}>
                        <Link href={`/channel/${user._id}`} aria-label="Your videos">
                            <User className={iconClass} />
                            <span className={labelClass}>
                                {hasChannel ? "Your videos" : "Create channel"}
                            </span>
                        </Link>
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className={itemClass}
                        onClick={() => comingSoon("Downloads")}
                        aria-label="Downloads"
                    >
                        <Download className={iconClass} />
                        <span className={labelClass}>Downloads</span>
                    </Button>

                    <div className="my-2 border-t" />
                </>
            ) : null}

            {/* Explore */}
            <div className={sectionHeadingClass}>Explore</div>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "Music" } }} aria-label="Music">
                    <Music2 className={iconClass} />
                    <span className={labelClass}>Music</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "Movies" } }} aria-label="Movies">
                    <PlaySquare className={iconClass} />
                    <span className={labelClass}>Movies</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "Gaming" } }} aria-label="Gaming">
                    <Gamepad2 className={iconClass} />
                    <span className={labelClass}>Gaming</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "Sports" } }} aria-label="Sports">
                    <Trophy className={iconClass} />
                    <span className={labelClass}>Sports</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "News" } }} aria-label="News">
                    <Newspaper className={iconClass} />
                    <span className={labelClass}>News</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href={{ pathname: "/search", query: { q: "Technology" } }} aria-label="Technology">
                    <Cpu className={iconClass} />
                    <span className={labelClass}>Technology</span>
                </Link>
            </Button>

            {!isCollapsed ? (
                <div className="pt-4">
                    <Button asChild variant="ghost" className={cn(itemClass, "justify-start") }>
                        <Link href="/search" aria-label="Explore">
                            <Compass className={iconClass} />
                            <span className={labelClass}>Browse all</span>
                        </Link>
                    </Button>
                </div>
            ) : null}
        </nav>
    )

    return (
        <>
            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden md:block shrink-0 border-r bg-sidebar text-sidebar-foreground",
                    isCollapsed ? "w-20 p-1" : "w-64 p-2"
                )}
            >
                {nav}
            </aside>

            {/* Mobile drawer */}
            {isMobileOpen ? (
                <div
                    className="fixed inset-0 z-[70] md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Sidebar"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeMobile()
                    }}
                >
                    <div className="absolute inset-0 bg-black/60" />
                    <aside
                        className={cn(
                            "relative h-full w-72 max-w-[85vw] border-r bg-sidebar text-sidebar-foreground p-2",
                            "translate-x-0"
                        )}
                    >
                        {nav}
                    </aside>
                </div>
            ) : null}
        </>
    )
}





export default Sidebar