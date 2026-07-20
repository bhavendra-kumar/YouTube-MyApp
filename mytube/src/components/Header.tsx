import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  Plus,
  Radio,
  Upload,
  Youtube,
  ChevronDown,
  Crown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import UpgradeToPremiumButton from "@/components/UpgradeToPremiumButton";
import { useUser } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { notify } from "@/services/toast";
import axiosClient from "@/services/http/axios";
import NotificationsPanel from "@/components/NotificationsPanel";
import UploadModal from "@/components/UploadModal";

const KEYBOARD_SHORTCUTS = [
  { key: "k / Space", desc: "Play / Pause" },
  { key: "f", desc: "Toggle fullscreen" },
  { key: "m", desc: "Mute / Unmute" },
  { key: "t", desc: "Toggle theater mode" },
  { key: "i", desc: "Toggle mini player" },
  { key: "← / →", desc: "Seek 5 seconds" },
  { key: "J / L", desc: "Seek 10 seconds" },
  { key: "↑ / ↓", desc: "Volume up / down 5%" },
  { key: "Shift+P", desc: "Previous video" },
  { key: "Shift+N", desc: "Next video" },
  { key: "/", desc: "Focus search" },
  { key: "0–9", desc: "Seek to 0–90%" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

const LOCATIONS = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
];

export default function Header() {
  const router = useRouter();
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile } = useSidebar();
  const { user, logout } = useUser();
  const { theme, setTheme } = useTheme();

  const isPremiumUser = Boolean(user?.isPremium) || ["BRONZE", "SILVER", "GOLD", "PREMIUM"].includes(String(user?.plan || "").toUpperCase());

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [location, setLocation] = useState("IN");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Voice search
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Premium upgrade modal
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedLang = window.localStorage.getItem("yt:language");
      const savedLoc = window.localStorage.getItem("yt:location");
      const savedRestricted = window.localStorage.getItem("yt:restricted");
      if (savedLang) setLanguage(savedLang);
      if (savedLoc) setLocation(savedLoc);
      if (savedRestricted) setRestrictedMode(savedRestricted === "1");
    } catch {}
  }, []);

  const persistPref = (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(key, value); } catch {}
  };

  // Fetch search suggestions
  useEffect(() => {
    if (!debouncedSearch.trim() || !searchFocused) {
      setSuggestions([]);
      return;
    }
    axiosClient
      .get("/video/getall", { params: { q: debouncedSearch.trim(), limit: 6 } })
      .then((res) => {
        const items: any[] = Array.isArray(res.data?.items) ? res.data.items : [];
        const titles = items.map((v: any) => String(v.videotitle || "")).filter(Boolean);
        setSuggestions([...new Set(titles)].slice(0, 6));
      })
      .catch(() => setSuggestions([]));
  }, [debouncedSearch, searchFocused]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user?._id) { setUnreadCount(0); return; }
    axiosClient.get("/notifications?unread=true").then((res) => {
      setUnreadCount(Number(res.data?.count ?? res.data?.data?.length ?? 0));
    }).catch(() => {});
  }, [user?._id]);

  const handleSearch = useCallback((q?: string) => {
    const query = (q ?? searchQuery).trim();
    if (!query) return;
    setSuggestions([]);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [router, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (suggestionIdx >= 0 && suggestions[suggestionIdx]) {
        handleSearch(suggestions[suggestionIdx]);
      } else {
        handleSearch();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
  };

  // Global "/" shortcut for search focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      notify.success("Signed out");
      router.push("/");
    } catch {
      notify.error("Failed to sign out");
    }
  };

  const searchBar = (isMobile: boolean) => (
    <div className={`flex items-center gap-2 ${isMobile ? "flex-1" : "w-full"}`}>
      <div className={`relative flex items-center ${isMobile ? "flex-1" : "w-full"}`}>
        <div
          className={`flex items-center rounded-l-full border h-10 flex-1 transition-colors ${
            searchFocused
              ? "border-[#1c62b9] ring-1 ring-[#1c62b9]/50"
              : "border-border"
          } bg-background`}
        >
          {/* Magnifier inside search bar when focused */}
          {searchFocused && (
            <Search className="h-4 w-4 ml-3 text-muted-foreground shrink-0" />
          )}
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSuggestionIdx(-1); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => { setSearchFocused(false); setSuggestions([]); }, 150)}
            onKeyDown={handleKeyDown}
            className={`yt-search-input ${searchFocused ? "pl-2" : "pl-4"} pr-4 h-10`}
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSuggestions([]); searchInputRef.current?.focus(); }}
              className="mr-1 p-1 rounded-full hover:bg-muted transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Search button — YouTube gray bg */}
        <button
          type="button"
          onClick={() => handleSearch()}
          className="h-10 px-5 rounded-r-full border border-l-0 border-border flex items-center gap-2 shrink-0 transition-colors"
          style={{ background: "var(--secondary)" }}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Suggestions dropdown — flat top, rounded bottom like YouTube */}
        {searchFocused && suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={() => handleSearch(s)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors ${i === suggestionIdx ? "bg-accent" : ""}`}
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mic button */}
      <button
        type="button"
        onClick={() => setVoiceOpen(true)}
        className="h-10 w-10 rounded-full flex items-center justify-center transition-colors shrink-0"
        style={{ background: "var(--secondary)" }}
        aria-label="Search by voice"
      >
        <Mic className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6">

        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) toggleMobile();
              else toggleCollapsed();
            }}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-1 ml-1" aria-label="MyTube Home">
            {/* SVG logo mark */}
            <svg viewBox="0 0 28 20" className="h-5 w-7 shrink-0" fill="none">
              <rect width="28" height="20" rx="4" fill="#FF0000" />
              <polygon points="11,5 21,10 11,15" fill="white" />
            </svg>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">
              <span className="text-foreground">My</span>
              <span className="text-foreground">Tube</span>
            </span>
          </Link>
        </div>

        {/* Center: Search — hidden on mobile, shown on desktop */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <div className="w-full max-w-150">
            {searchBar(false)}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile search toggle */}
          <button
            type="button"
            className="md:hidden h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Create button */}
          {user?._id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden sm:flex h-9 items-center gap-1.5 px-3 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
                  aria-label="Create"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline">Create</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setUploadModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => notify.info("Live streaming coming soon")}>
                  <Radio className="mr-2 h-4 w-4" /> Go live
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          {user?._id && (
            <div className="relative">
              <button
                type="button"
                className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors relative"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="yt-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <NotificationsPanel
                  onClose={() => setNotifOpen(false)}
                  onMarkRead={() => setUnreadCount(0)}
                />
              )}
            </div>
          )}

          {/* Profile / Sign in */}
          {user?._id ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-full" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="text-sm font-medium bg-primary/10">
                      {(user?.name || user?.channelname || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="text-sm font-medium bg-primary/10">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">{user?.name || user?.channelname}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    <Link href="/profile" className="text-xs mt-0.5" style={{ color: "#3ea6ff" }}>
                      View your channel
                    </Link>
                  </div>
                </div>
                <DropdownMenuSeparator />

                {!isPremiumUser && (
                  <>
                    <DropdownMenuItem onClick={() => setPremiumModalOpen(true)} className="text-yellow-600 dark:text-yellow-400 font-medium">
                      <Crown className="mr-3 h-4 w-4" /> Upgrade to Premium
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => router.push("/studio")}>
                  <Youtube className="mr-3 h-4 w-4" /> Creator Studio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <UserCircle2 className="mr-3 h-4 w-4" /> Your profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-3 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Appearance submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {theme === "dark" ? <Moon className="mr-3 h-4 w-4" /> : <Sun className="mr-3 h-4 w-4" />}
                    Appearance: {theme === "dark" ? "Dark" : "Light"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme ?? "dark"} onValueChange={setTheme}>
                      <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" /> Dark</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" /> Light</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system"><Globe className="mr-2 h-4 w-4" /> Device default</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Language submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="mr-3 h-4 w-4" /> Language: {LANGUAGES.find((l) => l.code === language)?.label ?? "English"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                    <DropdownMenuRadioGroup value={language} onValueChange={(v) => { setLanguage(v); persistPref("yt:language", v); }}>
                      {LANGUAGES.map((l) => (
                        <DropdownMenuRadioItem key={l.code} value={l.code}>{l.label}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Location submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="mr-3 h-4 w-4" /> Location: {LOCATIONS.find((l) => l.code === location)?.label ?? "India"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={location} onValueChange={(v) => { setLocation(v); persistPref("yt:location", v); }}>
                      {LOCATIONS.map((l) => (
                        <DropdownMenuRadioItem key={l.code} value={l.code}>{l.label}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                  <Keyboard className="mr-3 h-4 w-4" /> Keyboard shortcuts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setRestrictedMode((r) => !r); persistPref("yt:restricted", restrictedMode ? "0" : "1"); }}>
                  <Shield className="mr-3 h-4 w-4" /> Restricted mode: {restrictedMode ? "On" : "Off"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-3 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 h-9 px-3 rounded-full border text-sm font-medium hover:bg-muted transition-colors relative z-50"
              style={{ borderColor: "#3ea6ff", color: "#3ea6ff" }}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden">
          <div className="flex items-center gap-2 h-14 px-4 border-b border-border">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">{searchBar(true)}</div>
          </div>
        </div>
      )}

      {/* Voice Search Dialog */}
      <Dialog open={voiceOpen} onOpenChange={setVoiceOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Voice search</DialogTitle>
            <DialogDescription>
              Speak now...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Voice search requires browser microphone access</p>
          <Button variant="outline" onClick={() => setVoiceOpen(false)}>Cancel</Button>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {KEYBOARD_SHORTCUTS.map((s) => (
              <div key={s.key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm">{s.desc}</span>
                <kbd className="text-xs font-mono bg-muted px-2 py-1 rounded">{s.key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />

      {/* Premium Plans Modal */}
      <Dialog open={premiumModalOpen} onOpenChange={setPremiumModalOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="text-xl">🚀 Upgrade to Premium</DialogTitle>
            <DialogDescription>
              Choose a plan that works for you and unlock exclusive features.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <UpgradeToPremiumButton />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
