import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroImg from "@/assets/sekos-hero.jpg";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk toggle masing-masing password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
    // #region agent log
    fetch("http://127.0.0.1:7410/ingest/1bad6591-db48-487e-a518-f50e865918d8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "186559" },
      body: JSON.stringify({
        sessionId: "186559",
        runId: "security-audit",
        hypothesisId: "S3",
        location: "src/routes/register.tsx:30",
        message: "register submit called",
        data: {
          emailDomain: email.includes("@") ? email.split("@")[1] : "invalid",
          passwordLength: password.length,
          passwordComplexity,
          confirmMatches: password === confirm,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (password.length < 6) return toast.error("Password minimal 6 karakter");
    if (password !== confirm) return toast.error("Konfirmasi password tidak cocok");

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message.includes("already") ? "Email sudah terdaftar" : error.message);
      return;
    }
    toast.success("Akun dibuat! Selamat datang di SEKOS.");
    navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <Link to="/" className="font-display text-2xl font-bold text-primary md:hidden">
              SEKOS
            </Link>
            <h1 className="mt-2 font-display text-3xl font-bold text-primary">Daftar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bergabung dengan komunitas SEKOS.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Username</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>

          {/* NOTE: Input Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* NOTE: Input Konfirmasi Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Konfirmasi Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? "Memproses…" : "Buat Akun"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </div>
      <div className="hidden flex-col items-center justify-center bg-gradient-cream p-12 md:flex">
        <Link to="/" className="font-display text-3xl font-bold text-primary">
          SEKOS
        </Link>
        <img src={heroImg} alt="" className="mt-8 max-w-sm" />
        <p className="mt-6 max-w-xs text-center font-display text-lg text-primary">
          "Bersama pelajar, untuk pelajar."
        </p>
      </div>
    </div>
  );
}
