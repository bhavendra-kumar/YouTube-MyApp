import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Bell, Menu, Mic, Search, User, Video } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

type HeaderUser = {
    id: string
    name: string
    email: string
    image: string
}

const Header = () => {
    const router = useRouter()

    // Replace this with your real auth state later.
    const user: HeaderUser | null = {
        id: "1",
        name: "Bhavendra Kumar",
        email: "bhavendrakumar007@gmail.com",
        image: "https://github.com/shadcn.png?height=32&width=32",
    }

    const [searchQuery, setSearchQuery] = useState("")

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const query = searchQuery.trim()
        if (!query) return
        // Keep the user on the homepage (no missing-route 404s).
        void router.push(`/?search=${encodeURIComponent(query)}`)
    }

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-4 py-2">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="Menu">
                    <Menu className="size-5" />
                </Button>

                <Link href="/" className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded bg-red-600 p-1">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="white"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path d="M9 7.5v9l7.5-4.5L9 7.5z" />
                        </svg>
                    </span>
                    <span className="text-lg font-semibold tracking-tight">YouTube</span>
                    <span className="text-xs text-muted-foreground">IN</span>
                </Link>
            </div>

            <form
                onSubmit={onSearch}
                className="mx-4 flex w-full max-w-2xl items-center gap-2"
            >
                <div className="flex flex-1 items-center">
                    <Input
                        type="search"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-r-none border-r-0"
                        aria-label="Search"
                    />
                    <Button
                        type="submit"
                        variant="outline"
                        size="icon"
                        className="rounded-l-none"
                        aria-label="Search"
                    >
                        <Search className="size-5" />
                    </Button>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Voice search"
                >
                    <Mic className="size-5" />
                </Button>
            </form>

            <div className="flex items-center gap-1">
                {user ? (
                    <>
                        <Button variant="ghost" size="icon" aria-label="Create">
                            <Video className="size-5" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Notifications">
                            <Bell className="size-5" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    aria-label="Account menu"
                                >
                                    <Avatar>
                                        <AvatarImage src={user.image} alt={user.name} />
                                        <AvatarFallback>
                                            {user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                    onSelect={() => {
                                        // TODO: Navigate when channel pages exist.
                                    }}
                                >
                                    Your channel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        // TODO: Navigate when history page exists.
                                    }}
                                >
                                    History
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        // TODO: Navigate when liked page exists.
                                    }}
                                >
                                    Liked videos
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        // TODO: Navigate when watch-later page exists.
                                    }}
                                >
                                    Watch later
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        // TODO: Wire this to your auth later.
                                    }}
                                >
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            void router.push("/signin")
                        }}
                    >
                        <User className="size-4" />
                        Sign in
                    </Button>
                )}
            </div>
        </header>
    )
}

export default Header
