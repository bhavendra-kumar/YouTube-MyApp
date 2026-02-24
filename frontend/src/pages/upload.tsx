import React, { useMemo, useState } from "react";

import { useUser } from "@/context/AuthContext";
import VideoUploader from "@/components/VideoUploader";
import Channeldialogue from "@/components/channeldialogue";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const { user } = useUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const channelName = useMemo(() => {
    return String(user?.channelname || "").trim();
  }, [user?.channelname]);

  if (!user?._id) {
    // ProtectedRoute will handle redirect; this avoids rendering flicker.
    return null;
  }

  if (!channelName) {
    return (
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
          <h1 className="text-2xl font-bold">Create your channel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a channel before you can upload videos.
          </p>

          <div className="mt-6">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              Create channel
            </Button>
          </div>

          <Channeldialogue
            isopen={isCreateOpen}
            onclose={() => setIsCreateOpen(false)}
            channeldata={user}
            mode="create"
            onSaved={() => {
              setIsCreateOpen(false);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <VideoUploader channelId={user._id} channelName={channelName} />
      </div>
    </main>
  );
}

UploadPage.requireAuth = true;
