import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";

const VideoUploader = ({ channelId, channelName }: any) => {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        notify.error("Please upload a valid video file.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        notify.error("File size exceeds 100MB limit.");
        return;
      }
      setVideoFile(file);
      const filename = file.name;
      if (!videoTitle) {
        setVideoTitle(filename);
      }
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        notify.error("Please upload a valid image thumbnail.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        notify.error("Thumbnail size exceeds 5MB limit.");
        return;
      }
      setThumbnailFile(file);
    }
  };
  const resetForm = () => {
    setVideoFile(null);
    setThumbnailFile(null);
    setCaptionFile(null);
    setVideoTitle("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
    if (captionInputRef.current) {
      captionInputRef.current.value = "";
    }
  };
  const cancelUpload = () => {
    if (isUploading) {
      notify.error("Your video upload has been cancelled");
    }
  };
  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      notify.error("Please provide file and title");
      return;
    }
    const formdata = new FormData();
    formdata.append("file", videoFile);
    if (thumbnailFile) {
      formdata.append("thumbnail", thumbnailFile);
    }
    if (captionFile) {
      formdata.append("captions", captionFile);
    }
    formdata.append("videotitle", videoTitle);
    formdata.append("videochanel", channelName);
    formdata.append("uploader", channelId);
    try {
      setIsUploading(true);
      setUploadProgress(0);
      const res = await axiosClient.post("/video/upload", formdata, {
        onUploadProgress: (progresEvent: any) => {
          const progress = Math.round(
            (progresEvent.loaded * 100) / progresEvent.total
          );
          setUploadProgress(progress);
        },
      });
      notify.success("Video uploaded successfully!");

      if (typeof window !== "undefined") {
        const uploadedVideo =
          res?.data && typeof res.data === "object" ? res.data : null;

        window.dispatchEvent(
          new CustomEvent("video:uploaded", {
            detail: { uploader: channelId, video: uploadedVideo },
          })
        );
      }

      resetForm();
    } catch (error) {
      console.error("Error uploading video:", error);
      notify.error("There was an error uploading your video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold mb-4">Upload a video</h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer transition-colors hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-lg font-medium">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <div className="rounded-md bg-muted p-2">
                <FileVideo className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{videoFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <X className="w-5 h-5" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-muted p-1 rounded-full">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
                <div className="mt-1 flex gap-2 items-center">
                  <Input
                    id="thumbnail"
                    type="file"
                    ref={thumbnailInputRef}
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    disabled={isUploading || uploadComplete}
                  />
                  {thumbnailFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setThumbnailFile(null);
                        if (thumbnailInputRef.current) {
                          thumbnailInputRef.current.value = "";
                        }
                      }}
                      disabled={isUploading || uploadComplete}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                {thumbnailFile ? (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Selected: {thumbnailFile.name}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="captions">Captions (optional)</Label>
                <div className="mt-1 flex gap-2 items-center">
                  <Input
                    id="captions"
                    type="file"
                    ref={captionInputRef}
                    accept=".vtt,text/vtt"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const file = files[0];
                      const name = String(file.name || "").toLowerCase();
                      if (!name.endsWith(".vtt")) {
                        notify.error("Please upload a .vtt captions file");
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        notify.error("Caption file is too large (max 2MB)");
                        return;
                      }
                      setCaptionFile(file);
                    }}
                    disabled={isUploading || uploadComplete}
                  />
                  {captionFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCaptionFile(null);
                        if (captionInputRef.current) {
                          captionInputRef.current.value = "";
                        }
                      }}
                      disabled={isUploading || uploadComplete}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                {captionFile ? (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Selected: {captionFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Upload WebVTT (example: captions.en.vtt)
                  </p>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!uploadComplete && (
                <>
                  <Button onClick={cancelUpload} disabled={uploadComplete}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      isUploading || !videoTitle.trim() || uploadComplete
                    }
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;