"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useUser } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";

export type CallPeer = {
  _id: string;
  name?: string;
  channelname?: string;
  image?: string;
};

export type IncomingCall = {
  callId: string;
  from: CallPeer;
  offer: RTCSessionDescriptionInit;
};

export type ActiveCall = {
  callId: string;
  role: "caller" | "callee";
  peer: CallPeer;
  offer?: RTCSessionDescriptionInit;
};

type CallContextValue = {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  startCall: (peer: CallPeer) => void;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  endCall: () => void;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

function createCallId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const socket = useMemo(() => getSocket(), []);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    // Keep Socket.IO connection alive for other features; just (re)register the user room when logged in.
    try {
      socket.connect();
    } catch {
      // ignore
    }

    if (user?._id) {
      socket.emit("user:register", user._id);
    }
  }, [socket, user?._id]);

  useEffect(() => {
    const onOffer = (payload: any) => {
      const toUserId = String(payload?.toUserId || "");
      const callId = String(payload?.callId || "");
      const fromUserId = String(payload?.fromUserId || "");
      if (!callId || !fromUserId) return;

      if (user?._id && toUserId && String(user._id) !== toUserId) return;

      // If already in a call, ignore the new incoming request.
      if (activeCall) return;

      setIncomingCall({
        callId,
        from: {
          _id: fromUserId,
          name: payload?.fromName,
          channelname: payload?.fromChannelname,
          image: payload?.fromImage,
        },
        offer: payload?.sdp,
      });
    };

    const onEnd = (payload: any) => {
      const callId = String(payload?.callId || "");
      if (!callId) return;

      setIncomingCall((prev) => (prev?.callId === callId ? null : prev));
      setActiveCall((prev) => (prev?.callId === callId ? null : prev));
    };

    socket.on("call:offer", onOffer);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:end", onEnd);
    };
  }, [activeCall, socket, user?._id]);

  const startCall = (peer: CallPeer) => {
    if (!user?._id) return;
    if (!peer?._id) return;
    const callId = createCallId();
    setIncomingCall(null);
    setActiveCall({ callId, role: "caller", peer });
  };

  const acceptIncoming = () => {
    if (!incomingCall) return;
    setActiveCall({
      callId: incomingCall.callId,
      role: "callee",
      peer: incomingCall.from,
      offer: incomingCall.offer,
    });
    setIncomingCall(null);
  };

  const rejectIncoming = () => {
    if (!user?._id) return;
    if (!incomingCall) return;

    socket.emit("call:end", {
      callId: incomingCall.callId,
      fromUserId: user._id,
      toUserId: incomingCall.from._id,
      reason: "rejected",
    });

    setIncomingCall(null);
  };

  const endCall = () => {
    if (!user?._id) {
      setActiveCall(null);
      setIncomingCall(null);
      return;
    }

    if (activeCall) {
      socket.emit("call:end", {
        callId: activeCall.callId,
        fromUserId: user._id,
        toUserId: activeCall.peer._id,
        reason: "hangup",
      });
    }

    setActiveCall(null);
    setIncomingCall(null);
  };

  const value = useMemo<CallContextValue>(
    () => ({ incomingCall, activeCall, startCall, acceptIncoming, rejectIncoming, endCall }),
    [incomingCall, activeCall]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
