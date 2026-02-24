import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import {
    Bell,
    Globe,
    Keyboard,
    LogOut,
    Menu,
    Mic,
    Moon,
    Search,
    Settings,
    Shield,
    Sun,
    SwitchCamera,
    User,
    UserCircle2,
    Video,
    Wallet,
    X,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useUser } from "@/context/AuthContext"
import { useSidebar } from "@/context/SidebarContext"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { notify } from "@/services/toast"

const Header = () => {
    const router = useRouter()

    const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile } = useSidebar()

    const { user, logout } = useUser()

    const { theme, setTheme } = useTheme()

    const [shortcutsOpen, setShortcutsOpen] = useState(false)
    const [language, setLanguage] = useState("en")
    const [restrictedMode, setRestrictedMode] = useState(false)
    const [location, setLocation] = useState("IN")

    useEffect(() => {
        if (typeof window === "undefined") return
        try {
            const savedLang = window.localStorage.getItem("yt:language")
            const savedLoc = window.localStorage.getItem("yt:location")
            const savedRestricted = window.localStorage.getItem("yt:restricted")

            if (savedLang) setLanguage(savedLang)
            if (savedLoc) setLocation(savedLoc)
            if (savedRestricted) setRestrictedMode(savedRestricted === "1")
        } catch {
            // ignore
        }
    }, [])

    const persistPref = (key: string, value: string) => {
        if (typeof window === "undefined") return
        try {
            window.localStorage.setItem(key, value)
        } catch {
            // ignore
        }
    }

    const openExternal = (url: string) => {
        if (typeof window === "undefined") return
        window.open(url, "_blank", "noopener,noreferrer")
    }

    const initialQuery = typeof router.query.search === "string" ? router.query.search : ""
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const debouncedQuery = useDebouncedValue(searchQuery, 450)

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const [isListening, setIsListening] = useState(false)

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        if (typeof window === "undefined") return

        const mql = window.matchMedia("(max-width: 767px)")
        const onChange = () => setIsMobile(mql.matches)

        onChange()
        try {
            mql.addEventListener("change", onChange)
            return () => mql.removeEventListener("change", onChange)
        } catch {
            // Safari fallback
            const legacyMql = mql as unknown as {
                addListener: (listener: () => void) => void
                removeListener: (listener: () => void) => void
            }

            legacyMql.addListener(onChange)
            return () => {
                legacyMql.removeListener(onChange)
            }
        }
    }, [])

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
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-2">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                        isMobile
                            ? (isMobileOpen ? "Close menu" : "Open menu")
                            : (isCollapsed ? "Expand sidebar" : "Collapse sidebar")
                    }
                    aria-pressed={isMobile ? isMobileOpen : isCollapsed}
                    onClick={() => {
                        if (isMobile) {
                            toggleMobile()
                        } else {
                            toggleCollapsed()
                        }
                    }}
                >
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
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Create"
                            onClick={() => {
                                void router.push("/upload")
                            }}
                        >
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
                            <DropdownMenuContent align="end" className="w-80 p-0">
                                <div className="flex items-start gap-3 p-4">
                                    <Avatar className="size-10">
                                        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                                        <AvatarFallback>
                                            {String(user.name || "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">
                                            {user.name || "User"}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {user.email || ""}
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-2 text-sm font-medium text-primary hover:underline"
                                            onClick={() => {
                                                void router.push(`/channel/${user._id}`)
                                            }}
                                        >
                                            Create a channel
                                        </button>
                                    </div>
                                </div>

                                <DropdownMenuSeparator />

                                <div className="p-1">
                                    <DropdownMenuItem onSelect={() => openExternal("https://myaccount.google.com/") }>
                                        <UserCircle2 className="size-4" />
                                        Google Account
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={async () => {
                                            await logout()
                                            void router.push("/login")
                                        }}
                                    >
                                        <SwitchCamera className="size-4" />
                                        Switch account
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={async () => {
                                            await logout()
                                            void router.push("/login")
                                        }}
                                    >
                                        <LogOut className="size-4" />
                                        Sign out
                                    </DropdownMenuItem>
                                </div>

                                <DropdownMenuSeparator />

                                <div className="p-1">
                                    <DropdownMenuItem
                                        onSelect={() => {
                                            void router.push("/upload")
                                        }}
                                    >
                                        <Video className="size-4" />
                                        YouTube Studio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => openExternal("https://www.youtube.com/paid_memberships")}
                                    >
                                        <Wallet className="size-4" />
                                        Purchases and memberships
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => {
                                            void router.push("/history")
                                        }}
                                    >
                                        <User className="size-4" />
                                        Your data in YouTube
                                    </DropdownMenuItem>
                                </div>

                                <DropdownMenuSeparator />

                                <div className="p-1">
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Moon className="size-4" />
                                            Appearance: {theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Device theme"}
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56">
                                            <DropdownMenuRadioGroup
                                                value={theme || "system"}
                                                onValueChange={(value) => {
                                                    setTheme(value)
                                                }}
                                            >
                                                <DropdownMenuRadioItem value="system">
                                                    Device theme
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="light">
                                                    <Sun className="size-4" />
                                                    Light
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="dark">
                                                    <Moon className="size-4" />
                                                    Dark
                                                </DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Globe className="size-4" />
                                            Display language
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56">
                                            <DropdownMenuRadioGroup
                                                value={language}
                                                onValueChange={(value) => {
                                                    setLanguage(value)
                                                    persistPref("yt:language", value)
                                                    notify.success("Language preference saved")
                                                }}
                                            >
                                                <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="hi">Hindi</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Shield className="size-4" />
                                            Restricted Mode
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56">
                                            <DropdownMenuRadioGroup
                                                value={restrictedMode ? "on" : "off"}
                                                onValueChange={(value) => {
                                                    const next = value === "on"
                                                    setRestrictedMode(next)
                                                    persistPref("yt:restricted", next ? "1" : "0")
                                                    notify.success(`Restricted Mode ${next ? "On" : "Off"}`)
                                                }}
                                            >
                                                <DropdownMenuRadioItem value="off">Off</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="on">On</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Globe className="size-4" />
                                            Location
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-56">
                                            <DropdownMenuRadioGroup
                                                value={location}
                                                onValueChange={(value) => {
                                                    setLocation(value)
                                                    persistPref("yt:location", value)
                                                    notify.success("Location preference saved")
                                                }}
                                            >
                                                <DropdownMenuRadioItem value="IN">India</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="US">United States</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuItem
                                        onSelect={() => {
                                            setShortcutsOpen(true)
                                        }}
                                    >
                                        <Keyboard className="size-4" />
                                        Keyboard shortcuts
                                    </DropdownMenuItem>
                                </div>

                                <DropdownMenuSeparator />

                                <div className="p-1">
                                    <DropdownMenuItem
                                        onSelect={() => {
                                            void router.push("/settings")
                                        }}
                                    >
                                        <Settings className="size-4" />
                                        Settings
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                                    <DialogDescription>
                                        These shortcuts work on the watch page player.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between gap-4"><span>Play/Pause</span><span className="text-muted-foreground">K / Space</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Seek backward/forward</span><span className="text-muted-foreground">J / L</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Seek ±5s</span><span className="text-muted-foreground">← / →</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Volume</span><span className="text-muted-foreground">↑ / ↓</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Mute</span><span className="text-muted-foreground">M</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Fullscreen</span><span className="text-muted-foreground">F</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Theater mode</span><span className="text-muted-foreground">T</span></div>
                                    <div className="flex items-center justify-between gap-4"><span>Captions</span><span className="text-muted-foreground">C</span></div>
                                </div>
                            </DialogContent>
                        </Dialog>
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
