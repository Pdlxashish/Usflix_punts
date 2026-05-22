/**
 * /admin/login — Req 9 (Administrative Authentication)
 * AC2: login form, session token on success
 * AC3: "Invalid credentials" error — no field-specific hint
 * AC5: rate limiting feedback
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/admin/login")(  {
  component: AdminLogin,
  head: () => ({
    meta: [{ title: "Login — USFLIX Admin" }],
  }),
});

function AdminLogin() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/admin" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.ok) {
      navigate({ to: "/admin" });
    } else {
      setError(result.error ?? "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <span className="font-display text-3xl tracking-tight text-primary">USFLIX</span>
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to access the Admin Panel</p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-card/50 border border-border/60 rounded-xl p-8 shadow-[var(--shadow-card)] backdrop-blur-sm"
        >
          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5 mb-5">
            <label htmlFor="login-username" className="text-sm font-medium text-foreground/80">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              className="w-full bg-input border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-sm"
              aria-label="Username"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5 mb-8">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground/80">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full bg-input border border-border rounded-md px-4 py-3 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-sm"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-md font-medium hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
