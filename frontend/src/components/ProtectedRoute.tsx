import { useRouter } from "next/router";
import { useEffect } from "react";

import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import { Skeleton } from "@/components/ui/skeleton";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, ready } = useUser();

  useEffect(() => {
    if (!ready) return;
    if (user) return;

    notify.info("Please sign in to continue");
    const next = router.asPath || "/";
    void router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, router, user]);

  if (!ready) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}



