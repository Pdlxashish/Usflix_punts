/**

 * /join?code=XXX  — Partner accept-invite page.

 * Shown when someone clicks a partner invite link.

 */

import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";

import { useCallback, useEffect, useRef, useState } from "react";

import { Heart, Loader2, CheckCircle, XCircle } from "lucide-react";

import { useAuth } from "@clerk/tanstack-react-start";

import { useProfile } from "@/context/profile";

import { api } from "@/lib/api";



export const Route = createFileRoute("/join")({

  component: JoinPage,

  validateSearch: (s: Record<string, unknown>) => ({ code: String(s.code ?? "") }),

  head: () => ({ meta: [{ title: "Join Partner Space — USFLIX" }] }),

});



interface InviteInfo {

  ownerName: string;

  ownerEmail: string;

  invitedEmail?: string;

  expiresAt: string;

}



type PageState = "loading" | "info" | "accepting" | "success" | "error";



function JoinPage() {

  const { code } = useSearch({ from: "/join" });

  const { isSignedIn, isLoaded } = useAuth();

  const { refreshProfiles } = useProfile();

  const navigate = useNavigate();

  const acceptStarted = useRef(false);



  const [state, setState] = useState<PageState>("loading");

  const [info, setInfo] = useState<InviteInfo | null>(null);

  const [error, setError] = useState<string>("");



  const acceptInvite = useCallback(async () => {

    if (!code || acceptStarted.current) return;

    acceptStarted.current = true;

    setState("accepting");

    try {

      const result = await api.post<{ ok: boolean; error?: string }>(`/invitations/${code}/accept`);

      if (result.ok) {

        await refreshProfiles();

        setState("success");

      } else {

        acceptStarted.current = false;

        setState("error");

        setError(result.error ?? "Failed to accept invite");

      }

    } catch (e: unknown) {

      acceptStarted.current = false;

      setState("error");

      setError(e instanceof Error ? e.message : "Network error");

    }

  }, [code, refreshProfiles]);



  // Validate invite code

  useEffect(() => {

    if (!code) {

      setState("error");

      setError("No invite code provided.");

      return;

    }

    api

      .get<{

        ok: boolean;

        ownerName: string;

        ownerEmail: string;

        invitedEmail?: string;

        expiresAt: string;

        error?: string;

      }>(`/invitations/${code}`)

      .then((data) => {

        if (!data.ok) {

          setState("error");

          setError(data.error ?? "Invalid invite");

          return;

        }

        setInfo({

          ownerName: data.ownerName,

          ownerEmail: data.ownerEmail,

          invitedEmail: data.invitedEmail,

          expiresAt: data.expiresAt,

        });

        setState("info");

      })

      .catch(() => {

        setState("error");

        setError("Could not load invite info.");

      });

  }, [code]);



  // Auto-accept once signed in (covers sign-up return without a second click)

  useEffect(() => {

    if (!isLoaded || !isSignedIn || state !== "info") return;

    acceptInvite();

  }, [isLoaded, isSignedIn, state, acceptInvite]);



  const handleAccept = async () => {

    if (!isSignedIn) {

      navigate({

        to: "/sign-in/$",

        params: { _splat: "" },

        search: { redirect: `/join?code=${code}` },

      });

      return;

    }

    await acceptInvite();

  };



  if (!isLoaded || state === "loading") {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black">

        <Loader2 className="h-8 w-8 animate-spin text-primary" />

      </div>

    );

  }



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black px-4">

      <div className="max-w-md w-full">

        <div className="text-center mb-8">

          <Heart className="h-12 w-12 text-primary fill-primary mx-auto mb-4" />

          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 tracking-tight">

            USFLIX

          </h1>

        </div>



        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">

          {state === "info" && info && (

            <>

              <h2 className="text-2xl font-semibold text-white mb-2 text-center">You're Invited!</h2>

              <p className="text-neutral-400 text-center mb-6">

                <span className="text-white font-medium">{info.ownerName}</span> has invited you to

                join their shared memory space on USFLIX.

              </p>

              {info.invitedEmail && (

                <p className="text-xs text-neutral-500 text-center mb-4">

                  Intended for <span className="text-neutral-300">{info.invitedEmail}</span>

                </p>

              )}

              <p className="text-xs text-neutral-500 text-center mb-6">

                Expires {new Date(info.expiresAt).toLocaleString()}

              </p>

              {!isSignedIn && (

                <p className="text-sm text-amber-400 text-center mb-4">

                  You'll need to sign in or create an account first.

                </p>

              )}

              <button

                onClick={handleAccept}

                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity"

              >

                {isSignedIn ? "Accept Invite & Join" : "Sign In & Accept"}

              </button>

            </>

          )}



          {state === "accepting" && (

            <div className="flex flex-col items-center gap-4 py-4">

              <Loader2 className="h-8 w-8 animate-spin text-primary" />

              <p className="text-neutral-400">Linking your accounts…</p>

            </div>

          )}



          {state === "success" && (

            <div className="flex flex-col items-center gap-4 py-4 text-center">

              <CheckCircle className="h-12 w-12 text-green-400" />

              <h3 className="text-xl font-semibold text-white">You're Connected!</h3>

              <p className="text-neutral-400 text-sm">

                Your account is now linked. You'll share the same memory space.

              </p>

              <button

                onClick={() => navigate({ to: "/select-profile" })}

                className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"

              >

                Choose your profile →

              </button>

            </div>

          )}



          {state === "error" && (

            <div className="flex flex-col items-center gap-4 py-4 text-center">

              <XCircle className="h-12 w-12 text-red-400" />

              <h3 className="text-xl font-semibold text-white">Something went wrong</h3>

              <p className="text-neutral-400 text-sm">{error}</p>

              {isSignedIn && code && (

                <button

                  onClick={() => {

                    acceptStarted.current = false;

                    setState("info");

                    setError("");

                  }}

                  className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"

                >

                  Try again

                </button>

              )}

              <button

                onClick={() => navigate({ to: "/" })}

                className="mt-4 px-6 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"

              >

                Back home

              </button>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


