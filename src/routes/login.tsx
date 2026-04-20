import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroImg from "@/assets/sekos-hero.jpg";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
      return;
    }
    toast.success("Selamat datang kembali!");
    navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col items-center justify-center bg-gradient-cream p-12 md:flex">
        <Link to="/" className="font-display text-3xl font-bold text-primary">SEKOS</Link>
        <img src={heroImg} alt="" className="mt-8 max-w-sm" />
        <p className="mt-6 max-w-xs text-center font-display text-lg text-primary">
          "Belajar lebih hemat, jual lebih cepat."
        </p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <Link to="/" className="font-display text-2xl font-bold text-primary md:hidden">SEKOS</Link>
            <h1 className="mt-2 font-display text-3xl font-bold text-primary">Masuk</h1>
            <p className="mt-1 text-sm text-muted-foreground">Senang melihat kamu lagi.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? "Memproses…" : "Masuk"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun? <Link to="/register" className="font-medium text-accent hover:underline">Daftar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
