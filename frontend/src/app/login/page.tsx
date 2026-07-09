"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { authApi } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: "admin" | "employee") => {
    if (role === "admin") {
      setEmail("admin@kmrl.co.in");
      setPassword("adminpassword");
    } else {
      setEmail("employee@kmrl.co.in");
      setPassword("employeepassword");
    }
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-black text-white flex flex-col justify-center items-center px-4 overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px] -top-52 -left-36 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] -bottom-40 -right-20 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Brand logo header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-2xl tracking-tight leading-none">
              METROMIND <span className="text-cyan-400 font-medium">AI</span>
            </h1>
          </Link>
          <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">KMRL PORTAL SIGN IN</span>
        </div>

        {/* Glass Box */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative">
          <h2 className="text-xl font-bold text-white mb-6">Sign In to Organizational Brain</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@kmrl.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Password</label>
                <a href="#" className="text-xs text-cyan-400 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-md shadow-cyan-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Access Dashboard"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Demo logins */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-3">Quick Login (Review/Testing)</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin("admin")}
                className="px-3 py-2 text-xs rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-400 font-semibold transition-colors text-center"
              >
                Super Admin
              </button>
              <button
                onClick={() => handleQuickLogin("employee")}
                className="px-3 py-2 text-xs rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 text-blue-400 font-semibold transition-colors text-center"
              >
                Operations Crew
              </button>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-cyan-400 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
