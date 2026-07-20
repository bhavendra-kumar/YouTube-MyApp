import Head from "next/head";
import Link from "next/link";
import { CheckCircle, Zap, Crown, Star } from "lucide-react";
import UpgradeToPremiumButton from "@/components/UpgradeToPremiumButton";
import { useUser } from "@/context/AuthContext";

const PLANS = [
  {
    name: "Basic",
    price: "Free",
    period: "",
    features: [
      "Watch up to 3 videos/day",
      "Standard quality streaming",
      "3 downloads/day",
      "Basic recommendations",
    ],
    cta: "Current plan",
    isCurrent: true,
    gradient: "from-slate-600 to-slate-700",
    icon: <Star className="h-6 w-6" />,
  },
  {
    name: "Bronze",
    price: "₹10",
    period: "/month",
    features: [
      "Unlimited video views",
      "HD streaming",
      "10 downloads/day",
      "No ads",
      "Priority support",
    ],
    cta: "Upgrade to Bronze",
    isCurrent: false,
    gradient: "from-amber-700 to-orange-800",
    icon: <Zap className="h-6 w-6" />,
    planKey: "BRONZE",
  },
  {
    name: "Silver",
    price: "₹50",
    period: "/month",
    features: [
      "Everything in Bronze",
      "4K streaming",
      "50 downloads/day",
      "Offline viewing",
      "Early access to features",
    ],
    cta: "Upgrade to Silver",
    isCurrent: false,
    gradient: "from-slate-400 to-gray-500",
    icon: <Crown className="h-6 w-6" />,
    planKey: "SILVER",
    badge: "Popular",
  },
  {
    name: "Gold",
    price: "₹100",
    period: "/month",
    features: [
      "Everything in Silver",
      "Unlimited downloads",
      "AI recommendations",
      "Creator analytics",
      "Custom channel badge",
      "Super Chat credits",
    ],
    cta: "Upgrade to Gold",
    isCurrent: false,
    gradient: "from-yellow-500 to-amber-600",
    icon: <Crown className="h-6 w-6 text-yellow-300" />,
    planKey: "GOLD",
    badge: "Best value",
  },
];

export default function PremiumPage() {
  const { user } = useUser();
  const currentPlan = String(user?.plan || "FREE").toUpperCase();

  return (
    <>
      <Head>
        <title>MyTube Premium - Upgrade your experience</title>
        <meta name="description" content="Upgrade to MyTube Premium for ad-free streaming, HD quality, downloads, and more." />
      </Head>
      <main className="px-4 md:px-8 py-12 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ background: "linear-gradient(135deg, #ff0000, #ff6b35)", color: "white" }}>
            <Crown className="h-4 w-4" />
            <span className="text-sm font-semibold">MyTube Premium</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Upgrade your<br />
            <span style={{ color: "#ff0000" }}>MyTube</span> experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ad-free streaming, HD quality, offline downloads, and exclusive features. Choose the plan that's right for you.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
          {PLANS.map((plan) => {
            const isUserPlan = plan.planKey ? currentPlan === plan.planKey : (currentPlan === "FREE" || !user?._id);
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border overflow-hidden ${plan.badge ? "border-red-500/50 ring-2 ring-red-500/20" : "border-border"}`}
              >
                {plan.badge && (
                  <div className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#ff0000", color: "white" }}>
                    {plan.badge}
                  </div>
                )}
                {/* Plan header */}
                <div className={`bg-linear-to-br ${plan.gradient} p-5 text-white`}>
                  <div className="flex items-center gap-2 mb-3">
                    {plan.icon}
                    <span className="font-bold text-lg">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-white/70 text-sm">{plan.period}</span>}
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 flex flex-col gap-4">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isUserPlan ? (
                    <div className="py-2 rounded-full text-center text-sm font-medium bg-muted text-muted-foreground">
                      Current plan
                    </div>
                  ) : plan.planKey ? (
                    <UpgradeToPremiumButton />
                  ) : (
                    <div className="py-2 rounded-full text-center text-sm font-medium bg-muted text-muted-foreground">
                      Free
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time. Your premium features will remain active until the end of your billing period." },
              { q: "What payment methods are accepted?", a: "We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay." },
              { q: "Is there a free trial?", a: "New users can try any paid plan free for 7 days before being charged." },
              { q: "Can I share my subscription?", a: "Premium plans are for individual accounts only and cannot be shared." },
            ].map((item) => (
              <div key={item.q} className="bg-card border border-border rounded-xl p-4">
                <p className="font-medium mb-1">{item.q}</p>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
