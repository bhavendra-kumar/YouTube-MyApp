import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  return (
    <main className="flex-1 p-4">
      <div className="mx-auto w-full max-w-md rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to upload videos.
        </p>

        <div className="mt-6">
          <Button
            className="w-full"
            onClick={() => {
              handlegooglesignin();
            }}
          >
            Continue with Google
          </Button>
        </div>
      </div>
    </main>
  );
}
