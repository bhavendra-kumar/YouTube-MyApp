import Head from "next/head";
import { useEffect, useState } from "react";
import { Radio, Users, MessageSquare, Heart, Send, Smile } from "lucide-react";
import { useUser } from "@/context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type ChatMessage = {
  id: string;
  user: string;
  message: string;
  time: Date;
  isSuper?: boolean;
  amount?: number;
};

const MOCK_STREAM_INFO = {
  title: "🔴 LIVE — MyTube Live Stream Demo",
  channel: "MyTube Official",
  viewers: 1247,
  startedAt: new Date(Date.now() - 45 * 60 * 1000),
};

const MOCK_INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", user: "VideoFan99", message: "This is so cool! 🔥", time: new Date(Date.now() - 5000) },
  { id: "2", user: "TechWatcher", message: "First time watching live!", time: new Date(Date.now() - 4000), isSuper: true, amount: 50 },
  { id: "3", user: "StreamLover", message: "Amazing content 👏", time: new Date(Date.now() - 3000) },
  { id: "4", user: "NightOwl", message: "Keep it going!", time: new Date(Date.now() - 2000) },
  { id: "5", user: "CodeNinja", message: "Great production quality", time: new Date(Date.now() - 1000) },
];

export default function LivePage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [viewers, setViewers] = useState(MOCK_STREAM_INFO.viewers);

  // Simulate live viewer count fluctuation
  useEffect(() => {
    const iv = setInterval(() => {
      setViewers((v) => v + Math.floor(Math.random() * 10 - 4));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Simulate incoming chat messages
  useEffect(() => {
    const names = ["MegaFan", "SuperUser", "WatchDog", "PixelMaster", "NightStream", "CodeGuru", "TechPro"];
    const msgs = ["Amazing! 🎉", "Great content!", "Love this!", "Keep going! 💪", "First time here", "🔥🔥🔥", "Subscribed!"];
    const iv = setInterval(() => {
      const newMsg: ChatMessage = {
        id: String(Date.now()),
        user: names[Math.floor(Math.random() * names.length)],
        message: msgs[Math.floor(Math.random() * msgs.length)],
        time: new Date(),
      };
      setMessages((prev) => [...prev.slice(-99), newMsg]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (!user?._id) { alert("Sign in to chat"); return; }
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      user: user.name || user.channelname || "You",
      message: inputMessage.trim(),
      time: new Date(),
    };
    setMessages((prev) => [...prev.slice(-99), newMsg]);
    setInputMessage("");
  };

  const duration = Math.floor((Date.now() - MOCK_STREAM_INFO.startedAt.getTime()) / 1000);
  const durationStr = `${Math.floor(duration / 3600).toString().padStart(2, "0")}:${Math.floor((duration % 3600) / 60).toString().padStart(2, "0")}:${(duration % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <Head>
        <title>Live - MyTube</title>
        <meta name="description" content="Watch and join live streams on MyTube." />
      </Head>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video player placeholder */}
          <div className="relative aspect-video bg-black max-h-[55vh] lg:max-h-none shrink-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Radio className="h-16 w-16 mb-4 text-red-500 animate-pulse" />
              <p className="text-xl font-semibold">Live stream demo</p>
              <p className="text-sm text-white/60 mt-2">Connect a streaming source to go live</p>
            </div>
            {/* Live badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="yt-live-badge"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />LIVE</span>
              <span className="text-white text-sm bg-black/50 px-2 py-0.5 rounded">{durationStr}</span>
            </div>
            {/* Viewer count */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 px-3 py-1 rounded-full">
              <Users className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-sm font-medium">{viewers.toLocaleString()}</span>
            </div>
          </div>

          {/* Stream info */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold line-clamp-2">{MOCK_STREAM_INFO.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {MOCK_STREAM_INFO.channel} • Started {dayjs(MOCK_STREAM_INFO.startedAt).fromNow()}
                </p>
              </div>
              <button type="button" className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors" style={{ background: "#ff0000", color: "white" }}>
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Live Chat */}
        <div className="lg:w-96 flex flex-col border-l border-border bg-background" style={{ minHeight: "300px" }}>
          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium text-sm">Live chat</span>
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {viewers.toLocaleString()} watching
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 flex flex-col justify-end">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors ${msg.isSuper ? "bg-amber-500/10 border border-amber-500/20" : ""}`}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold">
                  {msg.user.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${msg.isSuper ? "text-amber-500" : "text-muted-foreground"}`}>
                      {msg.user}
                    </span>
                    {msg.isSuper && msg.amount && (
                      <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
                        Super Chat ₹{msg.amount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm wrap-break-word">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            {user?._id ? (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Say something..."
                  maxLength={200}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-border"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Sign in to chat</p>
                <a href="/login" className="text-sm font-medium" style={{ color: "#3ea6ff" }}>Sign in</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
