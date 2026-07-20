import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  Clock,
  ThumbsUp,
  Globe,
  ArrowLeft,
} from "lucide-react";

const PERIODS = ["Last 7 days", "Last 28 days", "Last 90 days", "Last 365 days", "Lifetime"] as const;

function MetricCard({ label, value, change, icon }: { label: string; value: string; change?: string; icon: React.ReactNode }) {
  const isPositive = change?.startsWith("+");
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="text-muted-foreground">{icon}</div>
        {change && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function BarChartMock({ label }: { label: string }) {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95, 40, 65];
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold mb-4">{label}</p>
      <div className="flex items-end gap-1.5 h-32">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${h}%`, background: "#ff0000", opacity: 0.7 + (i % 3) * 0.1 }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-muted-foreground">14 days ago</span>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>
    </div>
  );
}

export default function StudioAnalyticsPage() {
  const [period, setPeriod] = useState<string>("Last 28 days");

  return (
    <>
      <Head>
        <title>Analytics - Creator Studio - MyTube</title>
        <meta name="description" content="View your channel analytics on MyTube Creator Studio." />
      </Head>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Back button */}
        <Link href="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Studio
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          {/* Period selector */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  period === p ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard icon={<Eye className="h-5 w-5" />} label="Views" value="—" change="+12%" />
          <MetricCard icon={<Clock className="h-5 w-5" />} label="Watch time (hrs)" value="—" change="+8%" />
          <MetricCard icon={<Users className="h-5 w-5" />} label="Subscribers" value="—" change="+3%" />
          <MetricCard icon={<ThumbsUp className="h-5 w-5" />} label="Likes" value="—" change="+5%" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <BarChartMock label="Views over time" />
          <BarChartMock label="Watch time over time" />
        </div>

        {/* Traffic sources */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold mb-4">Traffic sources</h2>
          <div className="space-y-3">
            {[
              { source: "YouTube search", pct: 45 },
              { source: "Suggested videos", pct: 30 },
              { source: "Direct / unknown", pct: 15 },
              { source: "Browse features", pct: 10 },
            ].map((row) => (
              <div key={row.source} className="flex items-center gap-3">
                <span className="text-sm w-40 shrink-0 text-muted-foreground">{row.source}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: "#ff0000" }} />
                </div>
                <span className="text-sm w-10 text-right text-muted-foreground">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geography */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4" /> Geography</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {["India", "United States", "United Kingdom", "Canada", "Australia"].map((country, i) => (
              <div key={country} className="flex items-center justify-between">
                <span>{country}</span>
                <span>{[40, 25, 15, 10, 10][i]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
