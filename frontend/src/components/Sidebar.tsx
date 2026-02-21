import Link from "next/link"
import React from "react"
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

type SidebarUser = {
    id: string
    name: string
    email: string
    image: string
}

const Sidebar = () => {
    // Replace this with your real auth state later.
    const user: SidebarUser | null = {
        id: "1",
        name: "Bhavendra Kumar",
        email: "bhavendrakumar007@gmail.com",
        image: "https://github.com/shadcn.png?height=32&width=32",
    }

    return (
        <aside className="w-64 shrink-0 border-r bg-white p-2">
            <nav className="space-y-1">
                <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/" aria-label="Home">
                        <Home className="mr-3 h-5 w-5" />
                        Home
                    </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/?section=explore" aria-label="Explore">
                        <Compass className="mr-3 h-5 w-5" />
                        Explore
                    </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/?section=subscriptions" aria-label="Subscriptions">
                        <PlaySquare className="mr-3 h-5 w-5" />
                        Subscriptions
                    </Link>
                </Button>

                {user && (
                    <div className="mt-2 border-t pt-2">
                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Link href="/?section=history" aria-label="History">
                                <History className="mr-3 h-5 w-5" />
                                History
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Link href="/?section=liked" aria-label="Liked videos">
                                <ThumbsUp className="mr-3 h-5 w-5" />
                                Liked videos
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Link
                                href="/?section=watch-later"
                                aria-label="Watch later"
                            >
                                <Clock className="mr-3 h-5 w-5" />
                                Watch later
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Link href="/?section=channel" aria-label="Your channel">
                                <User className="mr-3 h-5 w-5" />
                                Your channel
                            </Link>
                        </Button>
                    </div>
                )}
            </nav>
        </aside>
    )
}

export default Sidebar
