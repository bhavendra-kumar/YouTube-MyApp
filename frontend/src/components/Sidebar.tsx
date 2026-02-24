import Link from "next/link"
import React from "react"
import { useRouter } from "next/router"
import {
    Clock,
    Compass,
    History,
    Home,
    PlaySquare,
    ThumbsUp,
    User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUser } from "@/context/AuthContext"
import { useSidebar } from "@/context/SidebarContext"
import { cn } from "@/lib/utils"

const Sidebar = () => {
    const { user } = useUser()
    const { isCollapsed, isMobileOpen, closeMobile } = useSidebar()
    const router = useRouter()

    const hasChannel = Boolean(String(user?.channelname || "").trim())

    const itemClass = cn(
        "w-full",
        isCollapsed ? "justify-center" : "justify-start"
    )
    const iconClass = cn(isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5")
    const labelClass = cn(isCollapsed ? "sr-only" : "")

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
        <nav className="space-y-1">
            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/" aria-label="Home">
                    <Home className={iconClass} />
                    <span className={labelClass}>Home</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/search" aria-label="Explore">
                    <Compass className={iconClass} />
                    <span className={labelClass}>Explore</span>
                </Link>
            </Button>

            <Button asChild variant="ghost" className={itemClass}>
                <Link href="/" aria-label="Subscriptions">
                    <PlaySquare className={iconClass} />
                    <span className={labelClass}>Subscriptions</span>
                </Link>
            </Button>

            {user && (
                <div className="mt-2 border-t pt-2">
                    <Button
                        asChild
                        variant="ghost"
                        className={itemClass}>
                        <Link href="/history" aria-label="History">
                            <History className={iconClass} />
                            <span className={labelClass}>History</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="ghost"
                        className={itemClass}>
                        <Link href="/liked" aria-label="Liked videos">
                            <ThumbsUp className={iconClass} />
                            <span className={labelClass}>Liked videos</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="ghost"
                        className={itemClass}
                    >
                        <Link
                            href="/watch-later"
                            aria-label="Watch later"
                        >
                            <Clock className={iconClass} />
                            <span className={labelClass}>Watch later</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="ghost"
                        className={itemClass}
                    >
                        <Link href={`/channel/${user._id}`} aria-label="Your channel">
                            <User className={iconClass} />
                            <span className={labelClass}>
                                {hasChannel ? "Your channel" : "Create channel"}
                            </span>
                        </Link>
                    </Button>
                </div>
            )}
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