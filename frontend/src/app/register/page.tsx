"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, User, Mail, Lock, Shield, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { authApi } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(3); // Default: Employee
  const [departmentId, setDepartmentId] = useState(1); // Default: Operations
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.register({
        name,
        email,
        password,
        role_id: roleId,
        department_id: departmentId
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-black text-white flex flex-col justify-center items-center px-4 overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px] -top-52 -left-36 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] -bottom-40 -right-20 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 py-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-2xl tracking-tight leading-none">
              METROMIND <span className="text-cyan-400 font-medium">AI</span>
            </h1>
          </Link>
          <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">KMRL ACCOUNT REGISTRATION</span>
        </div>

        {/* Glass Box */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative">
          <h2 className="text-xl font-bold text-white mb-6">Create Enterprise Account</h2>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm flex gap-3 items-start animate-pulse">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration Successful!</p>
                <p className="text-xs text-emerald-400 mt-1">Redirecting to login portal...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Employee Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@kmrl.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Role selection */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Security Clearance / Role</label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20 appearance-none"
                >
                  <option value={3} className="bg-slate-900">Employee / General User</option>
                  <option value={2} className="bg-slate-900">Department Admin</option>
                  <option value={1} className="bg-slate-900">Super Administrator</option>
                </select>
              </div>
            </div>

            {/* Department selection */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Metro Department Assignment</label>
              <div className="relative">
                <Cpu className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/60 focus:border-cyan-500 focus:outline-none text-sm transition-all focus:ring-2 focus:ring-cyan-500/20 appearance-none"
                >
                  <option value={1} className="bg-slate-900">Operations (OPS)</option>
                  <option value={2} className="bg-slate-900">HR & Administration (HR)</option>
                  <option value={3} className="bg-slate-900">Finance & Accounts (FIN)</option>
                  <option value={4} className="bg-slate-900">Legal Cell (LEG)</option>
                  <option value={5} className="bg-slate-900">Procurement (PRC)</option>
                  <option value={6} className="bg-slate-900">Maintenance (MNT)</option>
                  <option value={7} className="bg-slate-900">Safety & Quality (SAF)</option>
                  <option value={8} className="bg-slate-900">Compliance Control (COM)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-md shadow-cyan-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Registering account..." : "Submit Registration"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Return to sign in */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-400 font-semibold hover:underline">
            Sign In instead
          </Link>
        </p>
      </div>
    </div>
  );
}
