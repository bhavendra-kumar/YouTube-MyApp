import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { ensureRazorpayLoaded } from "@/services/payments/razorpay";
import { notify } from "@/services/toast";

type PlanKey = "bronze" | "silver" | "gold";

const PLANS: Record<PlanKey, { label: string; price: number; limit: string; color: string; badge: string }> = {
  bronze: {
    label: "Bronze",
    price: 10,
    limit: "7 min/video",
    color: "from-amber-600 to-amber-400",
    badge: "🥉",
  },
  silver: {
    label: "Silver",
    price: 50,
    limit: "10 min/video",
    color: "from-slate-500 to-slate-300",
    badge: "🥈",
  },
  gold: {
    label: "Gold",
    price: 100,
    limit: "Unlimited",
    color: "from-yellow-500 to-yellow-300",
    badge: "🥇",
  },
};

const PLAN_ORDER: Record<string, number> = { FREE: 0, BRONZE: 1, SILVER: 2, GOLD: 3 };

function isPlanActive(userPlan: string, planKey: PlanKey) {
  return String(userPlan).toUpperCase() === planKey.toUpperCase();
}

function isPlanUpgradeable(userPlan: string, planKey: PlanKey) {
  const current = PLAN_ORDER[String(userPlan).toUpperCase()] ?? 0;
  const target = PLAN_ORDER[planKey.toUpperCase()] ?? 0;
  return target > current;
}

export default function UpgradeToPremiumButton({ compact = false }: { compact?: boolean }) {
  const { user, updateUser } = useUser();
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  const userPlan = user?.plan || "FREE";

  const onUpgrade = async (planKey: PlanKey) => {
    if (!user?._id) {
      notify.info("Sign in to upgrade");
      return;
    }

    try {
      setBusy(planKey);

      const createRes = await axiosClient.post<any>("/payment/create-order", { plan: planKey });
      const keyId = String(createRes.data?.keyId || "").trim();
      const order = createRes.data?.order;

      if (!keyId || !order?.id) {
        notify.error("Could not create payment order");
        return;
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded || typeof window === "undefined" || !window.Razorpay) {
        notify.error("Razorpay failed to load");
        return;
      }

      const planInfo = PLANS[planKey];

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: `YouTube Clone — ${planInfo.label} Plan`,
        description: `Upgrade to ${planInfo.label} — ₹${planInfo.price}`,
        order_id: order.id,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#ff0000" },
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosClient.post("/payment/verify", {
              ...response,
              plan: planKey,
            });

            const updatedUser = verifyRes.data;
            updateUser({
              isPremium: true,
              plan: (updatedUser?.plan || planKey.toUpperCase()) as any,
              planPurchasedAt: updatedUser?.planPurchasedAt ?? null,
              planAmountPaid: typeof updatedUser?.planAmountPaid === "number" ? updatedUser.planAmountPaid : undefined,
              invoiceId: updatedUser?.invoiceId ?? null,
            });
            setShowPlans(false);
            notify.success(`🎉 Upgraded to ${planInfo.label} plan! Invoice sent to your email.`);
          } catch (e: any) {
            notify.error(e?.response?.data?.message || "Payment verification failed");
          }
        },
        modal: { ondismiss: () => {} },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      notify.error(e?.response?.data?.message || "Could not start upgrade");
    } finally {
      setBusy(null);
    }
  };

  if (compact) {
    // Compact inline button for headers/sidebars
    if (userPlan === "GOLD") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-600">
          🥇 Gold
        </span>
      );
    }
    return (
      <Button size="sm" onClick={() => setShowPlans(true)} className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs">
        Upgrade
      </Button>
    );
  }

  return (
    <div className="w-full">
      {/* Current plan badge */}
      {userPlan !== "FREE" && !showPlans && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium">
          <span>{userPlan === "GOLD" ? "🥇" : userPlan === "SILVER" ? "🥈" : "🥉"}</span>
          <span>{userPlan} Plan Active</span>
          {userPlan !== "GOLD" && (
            <button
              className="ml-auto text-xs underline text-muted-foreground hover:text-foreground"
              onClick={() => setShowPlans(true)}
            >
              Upgrade
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      {(showPlans || userPlan === "FREE") && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const active = isPlanActive(userPlan, key);
            const upgradeable = isPlanUpgradeable(userPlan, key);

            return (
              <div
                key={key}
                className={`relative overflow-hidden rounded-2xl border-2 transition-all
                  ${active ? "border-yellow-400 shadow-lg shadow-yellow-400/20" : "border-border hover:border-primary/40"}
                  bg-card`}
              >
                {/* Gradient header */}
                <div className={`bg-linear-to-br ${plan.color} p-5`}>
                  <div className="text-4xl mb-1">{plan.badge}</div>
                  <div className="text-white font-bold text-xl">{plan.label}</div>
                  <div className="text-white/80 text-sm mt-1">{plan.limit}</div>
                </div>

                {/* Price + CTA */}
                <div className="p-4 space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/one-time</span>
                  </div>

                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Watch {plan.limit}</li>
                    <li>✓ Unlimited downloads</li>
                    <li>✓ Invoice via email</li>
                  </ul>

                  {active ? (
                    <div className="w-full text-center py-2 rounded-xl bg-yellow-400/20 text-yellow-600 font-semibold text-sm">
                      ✓ Current Plan
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-xl"
                      disabled={!upgradeable || busy === key || !user?._id}
                      onClick={() => void onUpgrade(key)}
                    >
                      {busy === key ? "Opening…" : upgradeable ? `Upgrade to ${plan.label}` : "✓ Active"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPlans && userPlan !== "FREE" && (
        <button
          className="mt-3 text-sm text-muted-foreground underline"
          onClick={() => setShowPlans(false)}
        >
          Close
        </button>
      )}
    </div>
  );
}
