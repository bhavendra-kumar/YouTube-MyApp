import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";
import type { AppPropsWithAuth } from "@/types/next";
import { UserProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App({ Component, pageProps }: AppPropsWithAuth) {
  const content = Component.requireAuth ? (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black">
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
    </UserProvider>
  );
}