import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BrandingProvider } from "@/context/branding";
import { BrandingStyles } from "@/components/site/BrandingStyles";
import { ContentProvider } from "@/context/content";
import { ProfileProvider } from "@/context/profile";
import { HeartRainfallProvider, useHeartRainfall } from "@/context/heartRainfall";
import { WebSocketProvider } from "@/context/websocket";
import { HeartRainfall } from "@/components/effects/HeartRainfall";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ui/ThemeToggle";
import { useEffect, useRef } from "react";
import { applyObjectFitPolyfill } from "@/utils/imageOptimization";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { ClerkApiAuth } from "@/components/auth/ClerkApiAuth";
import { useProfile } from "@/context/profile";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl">This memory hasn't happened yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for is somewhere else.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
      },
      { title: "USFLIX — Our Story, Streaming Always" },
      { name: "description", content: "A cinematic photo album of our memories together." },
      { name: "theme-color", content: "#1a0808" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "USFLIX — Our Story, Streaming Always" },
      { name: "twitter:title", content: "USFLIX — Our Story, Streaming Always" },
      { property: "og:description", content: "A cinematic photo album of our memories together." },
      { name: "twitter:description", content: "A cinematic photo album of our memories together." },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a0d8eaeb-e895-4b93-ae13-54a4b2f2c420/id-preview-3a168c80--10e47b88-7b34-4e21-9c67-9012b9534a98.lovable.app-1778693777946.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a0d8eaeb-e895-4b93-ae13-54a4b2f2c420/id-preview-3a168c80--10e47b88-7b34-4e21-9c67-9012b9534a98.lovable.app-1778693777946.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <ClerkProvider
          publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        >
          {children}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppLayout() {
  const router = useRouter();
  const { active: heartRainfallActive } = useHeartRainfall();
  const { isSignedIn, isLoaded } = useAuth();
  const { activeProfile, profilesReady } = useProfile();
  const pageRef = useRef<HTMLDivElement>(null);

  const path = router.state.location.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isSignInRoute = path === "/sign-in" || path.startsWith("/sign-in/");
  const isSignUpRoute = path === "/sign-up" || path.startsWith("/sign-up/");
  const isProfileSelectRoute = path === "/select-profile";
  const isProfilesRoute = path === "/profiles";
  const isJoinRoute = path === "/join" || path.startsWith("/invite/");
  const isAuthRoute = isSignInRoute || isSignUpRoute;
  const isProfileExempt = isProfileSelectRoute || isProfilesRoute || isAuthRoute || isJoinRoute;

  useEffect(() => {
    if (!isLoaded || isAdminRoute) return;

    if (!isSignedIn && !isAuthRoute && !isJoinRoute) {
      router.navigate({ to: "/sign-in/$", params: { _splat: "" }, search: { redirect: undefined } });
    }
  }, [isLoaded, isSignedIn, isAdminRoute, isAuthRoute, isJoinRoute, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isProfileExempt || isAdminRoute) return;
    if (profilesReady && !activeProfile) {
      router.navigate({ to: "/select-profile" });
    }
  }, [isLoaded, isSignedIn, profilesReady, activeProfile, isProfileExempt, isAdminRoute, router]);

  const awaitingAuth =
    !isLoaded ||
    (!isSignedIn && !isAuthRoute && !isJoinRoute && !isAdminRoute);

  const awaitingProfile =
    isLoaded &&
    isSignedIn &&
    !isAdminRoute &&
    !isProfileExempt &&
    (!profilesReady || !activeProfile);

  // Block all routes (including exempt) until Clerk resolves
  if (!isLoaded) {
    return <AuthLoadingScreen message="Checking your session…" />;
  }

  if (awaitingAuth) {
    return <AuthLoadingScreen message="Redirecting to sign in…" />;
  }

  // Signed-in users on protected routes must pick a profile first
  if (awaitingProfile) {
    return <AuthLoadingScreen message="Loading your profiles…" />;
  }

  // Hide chrome on auth and profile screens
  if (isAuthRoute || isProfileSelectRoute || isProfilesRoute || isJoinRoute) {
    return <Outlet />;
  }

  return (
    <div ref={pageRef} data-heart-rainfall-page className="relative">
      <Header />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Footer />
      {heartRainfallActive && <HeartRainfall containerRef={pageRef} />}
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Apply mobile image optimization polyfills
  useEffect(() => {
    applyObjectFitPolyfill();

    // Re-apply polyfill only when new images are added to the DOM.
    // Scoped to <main> to avoid firing on every tiny mutation across the page.
    const target = document.querySelector("main") ?? document.body;
    const observer = new MutationObserver((mutations) => {
      const hasNewImages = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (n) => n instanceof HTMLElement && (n.tagName === "IMG" || n.querySelector?.("img")),
        ),
      );
      if (hasNewImages) applyObjectFitPolyfill();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkApiAuth />
      <SmoothScroll>
        <ThemeProvider>
          <ToastProvider>
            <ProfileProvider>
              <WebSocketProvider>
                <HeartRainfallProvider>
                  <ContentProvider>
                    <BrandingProvider>
                      <BrandingStyles />
                      <AppLayout />
                      <InstallPrompt />
                    </BrandingProvider>
                  </ContentProvider>
                </HeartRainfallProvider>
              </WebSocketProvider>
            </ProfileProvider>
          </ToastProvider>
        </ThemeProvider>
      </SmoothScroll>
    </QueryClientProvider>
  );
}
