import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Bell, Menu, Mic, Search, User, Video, X } from "lucide-react"

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
import { useUser } from "@/context/AuthContext"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { notify } from "@/services/toast"

const Header = () => {
    const router = useRouter()

    const { user, logout } = useUser()

    const initialQuery = typeof router.query.search === "string" ? router.query.search : ""
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const debouncedQuery = useDebouncedValue(searchQuery, 450)

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const [isListening, setIsListening] = useState(false)

    const stopVoiceSearch = () => {
        try {
            recognitionRef.current?.stop()
        } catch {
            // ignore
        }
    }

    const startVoiceSearch = () => {
        if (typeof window === "undefined") return

        const SpeechRecognitionCtor =
            window.SpeechRecognition || window.webkitSpeechRecognition

        if (!SpeechRecognitionCtor) {
            notify.error("Voice search isn't supported in this browser.")
            return
        }

        // Toggle behavior: click again to stop.
        if (isListening) {
            stopVoiceSearch()
            return
        }

        const recognition = recognitionRef.current || new SpeechRecognitionCtor()
        recognitionRef.current = recognition

        recognition.lang = "en-US"
        recognition.interimResults = false
        recognition.maxAlternatives = 1

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onerror = () => {
            setIsListening(false)
            notify.error("Voice search failed. Please try again.")
        }
        recognition.onresult = (event) => {
            const transcript = event?.results?.[0]?.[0]?.transcript
            const query = String(transcript || "").trim()
            if (!query) return

            setSearchQuery(query)

            const target = router.pathname === "/search" ? "/search" : "/"
            void router.push(`${target}?search=${encodeURIComponent(query)}`)
        }

        try {
            recognition.start()
        } catch {
            // Can throw if already started
            notify.error("Voice search is already running.")
        }
    }

    useEffect(() => {
        return () => {
            try {
                recognitionRef.current?.stop()
            } catch {
                // ignore
            }
        }
    }, [])

    useEffect(() => {
        if (typeof router.query.search === "string") {
            setSearchQuery(router.query.search)
        }
        if (!router.query.search) {
            setSearchQuery("")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.query.search])

    useEffect(() => {
        if (!router.isReady) return
        const q = debouncedQuery.trim()
        // Only drive debounced search when user is on home or searching.
        // Keeps behavior predictable and avoids surprise navigation.
        if (router.pathname !== "/" && router.pathname !== "/search") return

        const nextQuery = q ? { ...router.query, search: q } : (() => {
            const { search, ...rest } = router.query
            return rest
        })()

        void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery])

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const query = searchQuery.trim()
        if (!query) return
        const target = router.pathname === "/search" ? "/search" : "/"
        void router.push(`${target}?search=${encodeURIComponent(query)}`)
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
                    className={
                        `relative rounded-full ${isListening ? "bg-muted" : ""}`
                    }
                    aria-label="Voice search"
                    aria-pressed={isListening}
                    onClick={startVoiceSearch}
                >
                    {isListening ? (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-muted-foreground/30 animate-ping"
                        />
                    ) : null}
                    <Mic className="relative size-5" />
                </Button>
            </form>

            {isListening ? (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Voice search listening"
                    onMouseDown={(e) => {
                        // Click outside closes
                        if (e.target === e.currentTarget) stopVoiceSearch()
                    }}
                >
                    <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 px-8 py-10 text-white shadow-lg">
                        <button
                            type="button"
                            className="absolute right-5 top-5 rounded-full p-2 hover:bg-white/10"
                            aria-label="Close voice search"
                            onClick={stopVoiceSearch}
                        >
                            <X className="size-5" />
                        </button>

                        <div className="text-3xl font-medium">Listening...</div>

                        <div className="mt-16 flex items-center justify-center">
                            <button
                                type="button"
                                aria-label="Stop listening"
                                onClick={stopVoiceSearch}
                                className="group relative flex size-16 items-center justify-center rounded-full bg-red-600"
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute -inset-3 rounded-full bg-red-600/20 animate-ping"
                                />
                                <Mic className="relative size-7 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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
                                        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                                        <AvatarFallback>
                                            {String(user.name || "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                    onSelect={() => {
                                        void router.push(`/channel/${user._id}`)
                                    }}
                                >
                                    Your channel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        void router.push("/history")
                                    }}
                                >
                                    History
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        void router.push("/liked")
                                    }}
                                >
                                    Liked videos
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        void router.push("/watch-later")
                                    }}
                                >
                                    Watch later
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        void logout()
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
                            void router.push("/login")
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
