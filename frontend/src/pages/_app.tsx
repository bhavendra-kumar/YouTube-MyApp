import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";
import type { AppPropsWithAuth } from "@/types/next";
import { UserProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "next-themes";

export default function App({ Component, pageProps }: AppPropsWithAuth) {
  const content = Component.requireAuth ? (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserProvider>
        <SidebarProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Head>
              <title>YouTube</title>
            </Head>
            <Header />
            <Toaster />
            <div className="flex">
              <Sidebar />
              {content}
            </div>
          </div>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
