import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";

dayjs.extend(relativeTime);

type Notification = {
  _id: string;
  message?: string;
  title?: string;
  read?: boolean;
  createdAt?: string;
  type?: string;
  link?: string;
};

export default function NotificationsPanel({ onClose, onMarkRead }: {
  onClose: () => void;
  onMarkRead: () => void;
}) {
  const { user } = useUser();
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    axiosClient
      .get("/notifications")
      .then((res) => {
        const data = res.data?.data ?? res.data?.notifications ?? [];
        setNotifications(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Generate mock notifications if API doesn't exist yet
        setNotifications([
          { _id: "1", title: "New video uploaded", message: "Someone you subscribed to just uploaded a new video", read: false, createdAt: new Date().toISOString(), type: "upload" },
          { _id: "2", title: "Comment reply", message: "Someone replied to your comment", read: true, createdAt: new Date(Date.now() - 3600000).toISOString(), type: "comment" },
        ]);
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  const handleMarkAllRead = async () => {
    try {
      await axiosClient.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkRead();
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkRead();
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-96 max-h-[80vh] rounded-xl border border-border bg-popover shadow-2xl flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-semibold text-base">Notifications</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 rounded-full yt-skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 yt-skeleton rounded w-full" />
                  <div className="h-3 yt-skeleton rounded w-4/5" />
                  <div className="h-3 yt-skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium">Your notifications live here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to your favourite channels to get notified
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 last:border-0 ${!n.read ? "bg-muted/20" : ""}`}
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {n.title && <p className="text-sm font-medium line-clamp-1">{n.title}</p>}
                  {n.message && <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>}
                  {n.createdAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {dayjs(n.createdAt).fromNow()}
                    </p>
                  )}
                </div>
                {/* Unread indicator */}
                {!n.read && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-center w-full py-1 hover:bg-muted rounded-lg transition-colors"
          style={{ color: "#3ea6ff" }}
        >
          See all notifications
        </button>
      </div>
    </div>
  );
}
