import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";
import type { AppPropsWithAuth } from "@/types/next";
import { UserProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "next-themes";
import CallUI from "@/components/CallUI";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import MiniPlayer from "@/components/MiniPlayer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppPropsWithAuth) {
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);

  // Page transition: fade in on route change
  useEffect(() => {
    const handleRouteChange = () => {
      if (mainRef.current) {
        mainRef.current.classList.remove("page-enter");
        void mainRef.current.offsetWidth; // reflow
        mainRef.current.classList.add("page-enter");
      }
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  const content = Component.requireAuth ? (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <UserProvider>
          <CallProvider>
            <SidebarProvider>
              <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
                <Head>
                  <title>MyTube</title>
                  <meta name="description" content="MyTube - Watch, share, and discover videos" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <meta name="theme-color" content="#0f0f0f" />
                  <link rel="preconnect" href="https://fonts.googleapis.com" />
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                </Head>
                <Header />
                <MiniPlayer />
                <CallUI />
                <Toaster
                  position="bottom-left"
                  toastOptions={{
                    style: {
                      background: "#1f1f1f",
                      color: "#f1f1f1",
                      border: "1px solid #2f2f2f",
                      borderRadius: "8px",
                      fontSize: "14px",
                    },
                  }}
                />
                <div className="flex flex-1 min-h-0">
                  <Sidebar />
                  <div ref={mainRef} className="flex-1 min-w-0 page-enter">
                    {content}
                  </div>
                </div>
                <BottomNav />
              </div>
            </SidebarProvider>
          </CallProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
