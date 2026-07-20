import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import dynamic from "next/dynamic";
import { useUser } from "@/context/AuthContext";

const VideoUploader = dynamic(() => import("./VideoUploader"), {
  loading: () => <div className="py-10 text-center text-sm text-muted-foreground">Loading uploader...</div>,
  ssr: false,
});

type UploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Upload videos</DialogTitle>
          <DialogDescription className="sr-only">Upload a new video to your channel</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-2 max-h-[80vh] overflow-y-auto">
          {user ? (
            <VideoUploader 
              channelId={user._id} 
              channelName={user.name || user.channelname || "Channel"} 
              onSuccess={() => onOpenChange(false)}
            />
          ) : (
            <div className="py-10 text-center">
              Please sign in to upload videos.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
