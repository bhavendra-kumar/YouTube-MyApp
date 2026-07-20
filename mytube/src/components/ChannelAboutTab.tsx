import React from "react";

export default function ChannelAboutTab({ channel }: { channel: any }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-xl font-semibold">About</h2>
      <div className="mt-3 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Description: </span>
          <span>{channel?.description || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Joined: </span>
          <span>
            {channel?.joinedon
              ? new Date(channel.joinedon).toLocaleDateString()
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
