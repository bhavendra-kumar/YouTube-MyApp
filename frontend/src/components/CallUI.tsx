"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCall } from "@/context/CallContext";
import { useUser } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";
import { notify } from "@/services/toast";

type CallPhase = "connecting" | "ringing" | "in-call";

function buildStunServers(): RTCConfiguration {
  return {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
}

export default function CallUI() {
  const { user } = useUser();
  const { incomingCall, activeCall, acceptIncoming, rejectIncoming, endCall } = useCall();

  const socket = useMemo(() => getSocket(), []);

  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pendingIceRef = useRef<any[]>([]);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);

  const peerId = activeCall?.peer?._id || null;

  useEffect(() => {
    if (!recordUrl) return;
    return () => {
      try {
        URL.revokeObjectURL(recordUrl);
      } catch {
        // ignore
      }
    };
  }, [recordUrl]);

  useEffect(() => {
    if (!activeCall) {
      setPhase("connecting");
      setLocalStream(null);
      setRemoteStream(null);
      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
      }
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      pendingIceRef.current = [];
      setMicOn(true);
      setCamOn(true);
      setSharing(false);
      setRecording(false);
      if (recordUrl) setRecordUrl(null);

      try {
        pcRef.current?.close();
      } catch {
        // ignore
      }
      pcRef.current = null;

      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
        recorderRef.current = null;
      }

      return;
    }

    if (!user?._id) {
      notify.info("Sign in to call");
      endCall();
      return;
    }

    socket.connect();
    socket.emit("user:register", user._id);

    const callId = activeCall.callId;
    const fromUserId = user._id;
    const toUserId = activeCall.peer._id;

    const pc = new RTCPeerConnection(buildStunServers());
    pcRef.current = pc;

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (ev) => {
      for (const track of ev.streams?.[0]?.getTracks?.() || []) {
        remote.addTrack(track);
      }
      // Fallback: some browsers provide track without stream.
      if (ev.track) remote.addTrack(ev.track);
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socket.emit("call:ice", {
        callId,
        fromUserId,
        toUserId,
        candidate: ev.candidate,
      });
    };

    const onIce = async (payload: any) => {
      if (String(payload?.callId || "") !== String(callId)) return;
      if (!payload?.candidate) return;
      const candidate = payload.candidate;

      const pcCurrent = pcRef.current;
      if (!pcCurrent) return;

      // If remote description isn't set yet, queue ICE.
      if (!pcCurrent.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }

      try {
        await pcCurrent.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    };

    const onAnswer = async (payload: any) => {
      if (String(payload?.callId || "") !== String(callId)) return;
      if (activeCall.role !== "caller") return;
      if (!payload?.sdp) return;

      try {
        await pc.setRemoteDescription(payload.sdp);
        // Flush queued ICE
        const queued = pendingIceRef.current;
        pendingIceRef.current = [];
        for (const c of queued) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await pc.addIceCandidate(c);
          } catch {
            // ignore
          }
        }
        setPhase("in-call");
      } catch {
        notify.error("Could not connect call");
        endCall();
      }
    };

    const onEnd = (payload: any) => {
      if (String(payload?.callId || "") !== String(callId)) return;
      endCall();
    };

    socket.on("call:ice", onIce);
    socket.on("call:answer", onAnswer);
    socket.on("call:end", onEnd);

    const setup = async () => {
      try {
        setPhase(activeCall.role === "caller" ? "ringing" : "connecting");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);

        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }

        if (activeCall.role === "caller") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call:offer", {
            callId,
            fromUserId,
            toUserId,
            fromName: user?.name,
            fromChannelname: user?.channelname,
            fromImage: user?.image,
            sdp: offer,
          });

          return;
        }

        // Callee: we already have the offer embedded in activeCall.
        if (!activeCall.offer) {
          notify.error("Missing call offer");
          endCall();
          return;
        }

        await pc.setRemoteDescription(activeCall.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          callId,
          fromUserId,
          toUserId,
          sdp: answer,
        });

        // Flush queued ICE candidates
        const queued = pendingIceRef.current;
        pendingIceRef.current = [];
        for (const c of queued) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await pc.addIceCandidate(c);
          } catch {
            // ignore
          }
        }

        setPhase("in-call");
      } catch (err: any) {
        notify.error(err?.message || "Could not start call");
        endCall();
      }
    };

    void setup();

    return () => {
      socket.off("call:ice", onIce);
      socket.off("call:answer", onAnswer);
      socket.off("call:end", onEnd);

      try {
        pc.close();
      } catch {
        // ignore
      }

      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
      }
      localStreamRef.current = null;

      const r = remoteStreamRef.current;
      if (r) {
        for (const t of r.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
      }

      remoteStreamRef.current = null;
      pcRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.callId]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el || !localStream) return;
    el.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el || !remoteStream) return;
    el.srcObject = remoteStream;
  }, [remoteStream]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const next = !micOn;
    track.enabled = next;
    setMicOn(next);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const next = !camOn;
    track.enabled = next;
    setCamOn(next);
  };

  const toggleShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      if (!sharing) {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const displayTrack = display.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (!sender || !displayTrack) return;

        await sender.replaceTrack(displayTrack);
        setSharing(true);

        displayTrack.onended = async () => {
          try {
            const camTrack = stream.getVideoTracks()[0];
            if (camTrack) await sender.replaceTrack(camTrack);
          } catch {
            // ignore
          }
          setSharing(false);
        };
        return;
      }

      // Stop sharing: replace with camera
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      const camTrack = stream.getVideoTracks()[0];
      if (sender && camTrack) {
        await sender.replaceTrack(camTrack);
      }
      setSharing(false);
    } catch (err: any) {
      notify.error(err?.message || "Screen share failed");
    }
  };

  const toggleRecording = () => {
    const stream = remoteStreamRef.current;
    if (!stream) {
      notify.info("Wait for the other participant to join");
      return;
    }

    if (recording) {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      setRecording(false);
      return;
    }

    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordUrl(url);
        chunksRef.current = [];
      };
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      notify.error(err?.message || "Recording not supported in this browser");
    }
  };

  const requestPiP = async () => {
    const el = remoteVideoRef.current;
    if (!el) return;
    const anyEl = el as any;
    if (!anyEl.requestPictureInPicture) {
      notify.error("Picture-in-Picture not supported");
      return;
    }

    try {
      await anyEl.requestPictureInPicture();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Dialog open={Boolean(incomingCall)} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming call</DialogTitle>
            <DialogDescription>
              {incomingCall?.from?.channelname || incomingCall?.from?.name || "Someone"} is calling you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={rejectIncoming}>Reject</Button>
            <Button onClick={acceptIncoming}>Accept</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeCall)} onOpenChange={(v) => { if (!v) endCall(); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Call</DialogTitle>
            <DialogDescription>
              {activeCall?.peer?.channelname || activeCall?.peer?.name || ""}
              {phase === "ringing" ? " • Ringing…" : phase === "connecting" ? " • Connecting…" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-3 right-3 h-32 w-48 rounded-md object-cover border border-white/20 bg-black"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</Button>
              <Button variant="outline" onClick={toggleCam}>{camOn ? "Camera off" : "Camera on"}</Button>
              <Button variant="outline" onClick={() => void toggleShare()}>{sharing ? "Stop share" : "Share screen"}</Button>
              <Button variant="outline" onClick={toggleRecording}>{recording ? "Stop rec" : "Record"}</Button>
              <Button variant="outline" onClick={() => void requestPiP()}>PiP</Button>
            </div>

            <Button variant="destructive" onClick={endCall}>End</Button>
          </div>

          {recordUrl ? (
            <div className="text-sm">
              <a className="underline" href={recordUrl} download={`call-${activeCall?.callId || "record"}.webm`}>
                Download recording
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
