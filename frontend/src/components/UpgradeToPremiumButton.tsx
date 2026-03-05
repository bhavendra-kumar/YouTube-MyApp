import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { ensureRazorpayLoaded } from "@/services/payments/razorpay";
import { notify } from "@/services/toast";

type CreateOrderResponse = {
  keyId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
};

export default function UpgradeToPremiumButton() {
  const { user, updateUser } = useUser();
  const [busy, setBusy] = useState(false);

  const onUpgrade = async () => {
    if (!user?._id) {
      notify.info("Sign in to upgrade");
      return;
    }

    try {
      setBusy(true);

      const createRes = await axiosClient.post<CreateOrderResponse>(
        "/payment/create-order"
      );

      const keyId = String((createRes.data as any)?.keyId || "").trim();
      const order = (createRes.data as any)?.order;

      if (!keyId || !order?.id) {
        notify.error("Could not create Razorpay order");
        return;
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded || typeof window === "undefined" || !window.Razorpay) {
        notify.error("Razorpay checkout failed to load");
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Premium",
        description: "Upgrade to Premium plan",
        order_id: order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosClient.post(
              "/payment/verify",
              response
            );

            const updatedUser = verifyRes.data;
            if (updatedUser?.plan) {
              updateUser({ plan: updatedUser.plan });
            } else {
              updateUser({ plan: "PREMIUM" });
            }

            notify.success("Upgraded to Premium");
          } catch (e: any) {
            console.error(e);
            notify.error(e?.response?.data?.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            // user closed the checkout
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not start upgrade");
    } finally {
      setBusy(false);
    }
  };

  const plan = user?.plan || "FREE";

  return (
    <Button
      onClick={() => void onUpgrade()}
      disabled={busy || !user?._id || plan === "PREMIUM"}
      variant={plan === "PREMIUM" ? "secondary" : "default"}
    >
      {plan === "PREMIUM"
        ? "Premium active"
        : busy
          ? "Opening checkout…"
          : "Upgrade to Premium"}
    </Button>
  );
}
