import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

export const Route = createFileRoute("/sign-up/$")({
  component: SignUpPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "Sign Up — USFLIX" }],
  }),
});

function resolvePostAuthPath(redirect?: string): string {
  return redirect?.startsWith("/") ? redirect : "/select-profile";
}

function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const postAuthPath = resolvePostAuthPath(redirect);
  const signInUrl = redirect
    ? `/sign-in?redirect=${encodeURIComponent(postAuthPath)}`
    : "/sign-in";

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (postAuthPath.startsWith("/join")) {
      const url = new URL(postAuthPath, window.location.origin);
      navigate({
        to: "/join",
        search: { code: url.searchParams.get("code") ?? "" },
      });
      return;
    }
    navigate({ to: postAuthPath as "/" | "/select-profile" });
  }, [isLoaded, isSignedIn, postAuthPath, navigate]);

  if (!isLoaded) {
    return <AuthLoadingScreen message="Checking your session…" />;
  }

  if (isSignedIn) {
    return <AuthLoadingScreen message="Redirecting…" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 mb-2 tracking-tight">
            USFLIX
          </h1>
          <p className="text-neutral-400 text-lg">Your Personal Memory Archive</p>
        </div>
        <SignUp
          forceRedirectUrl={postAuthPath}
          signInUrl={signInUrl}
        />
      </div>
    </div>
  );
}
