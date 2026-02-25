import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";
import { buildMediaUrl } from "@/lib/media";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  const channelId = channel?._id;

  const channelName: string =
    String(channel?.channelname || channel?.name || channel?.email || "").trim();
  const channelHandle = channelName
    ? `@${channelName.toLowerCase().replace(/\s+/g, "")}`
    : "";
  const avatarLetter = channelName ? channelName[0]?.toUpperCase() : "?";

  useEffect(() => {
    const load = async () => {
      if (!channelId) return;
      try {
        const countRes = await axiosClient.get(`/subscribe/count/${channelId}`);
        setSubscriberCount(Number(countRes.data?.subscribers ?? 0));

        if (user?._id) {
          const statusRes = await axiosClient.get(
            `/subscribe/status/${channelId}/${user._id}`
          );
          setIsSubscribed(Boolean(statusRes.data?.subscribed));
          if (typeof statusRes.data?.subscribers === "number") {
            setSubscriberCount(statusRes.data.subscribers);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    load();
  }, [channelId, user?._id]);

  const handleSubscribe = async () => {
    if (!user) {
      notify.info("Sign in to subscribe");
      return;
    }
    if (!channelId) return;
    if (String(user?._id) === String(channelId)) return;

    const prev = { isSubscribed, subscriberCount };

    try {
      if (isSubscribed) {
        setIsSubscribed(false);
        setSubscriberCount((n) => Math.max(0, n - 1));
      } else {
        setIsSubscribed(true);
        setSubscriberCount((n) => n + 1);
      }

      const res = await axiosClient.post(`/subscribe/${channelId}`, {
        userId: user?._id,
      });
      setIsSubscribed(Boolean(res.data?.subscribed));
      if (typeof res.data?.subscribers === "number") {
        setSubscriberCount(res.data.subscribers);
      }
    } catch (e) {
      console.error(e);
      setIsSubscribed(prev.isSubscribed);
      setSubscriberCount(prev.subscriberCount);
      notify.error("Could not update subscription");
    }
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 overflow-hidden bg-muted">
        {channel?.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={buildMediaUrl(channel.bannerUrl)}
            alt="Channel banner"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            {channel?.image ? (
              <AvatarImage src={buildMediaUrl(channel.image)} alt={channelName || "Channel"} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">{channelName || "Channel"}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {channelHandle ? <span>{channelHandle}</span> : null}
              <span>{subscriberCount.toLocaleString()} subscribers</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-gray-700 max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          {user && user?._id !== channel?._id && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? "outline" : "default"}
                className={
                  isSubscribed ? "bg-gray-100" : "bg-red-600 hover:bg-red-700"
                }
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;