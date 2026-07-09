"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Cpu, Search, Database, ShieldAlert, Award, ArrowRight } from "lucide-react";
import { getToken } from "../lib/api";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-black text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black overflow-hidden">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Decorative Metro Path Lines */}
      <div className="absolute top-[20%] -left-10 w-[120%] h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-20 transform -rotate-6 pointer-events-none" />
      <div className="absolute top-[50%] -left-10 w-[120%] h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-15 transform rotate-3 pointer-events-none" />
      <div className="absolute top-[80%] -left-10 w-[120%] h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-20 transform -rotate-12 pointer-events-none" />
      
      {/* Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none">
              METROMIND <span className="text-cyan-400 font-medium">AI</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">Kochi Metro Rail Ltd.</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-semibold text-sm transition-all duration-300 shadow-md shadow-cyan-600/10 flex items-center gap-2 hover:-translate-y-0.5"
            >
              Enterprise Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="px-5 py-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/60 font-semibold text-sm transition-all duration-300"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex-1 flex flex-col justify-center items-center text-center px-6 max-w-6xl mx-auto z-10 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          <Award className="w-3.5 h-3.5" /> Next-Generation Decision Support System
        </div>
        
        <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mb-6">
          The Intelligent Document & <br />
          <span className="gradient-text-light">Knowledge Brain for KMRL</span>
        </h2>
        
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Instantly search, summarize, analyze, and converse with organizational documents.
          Connect Operations, Finance, Safety, and Compliance data in a visual Knowledge Graph.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link 
            href={isLoggedIn ? "/dashboard" : "/login"} 
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-white text-base transition-all duration-300 shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            Launch Platform <ArrowRight className="w-5 h-5" />
          </Link>
          <a 
            href="#features" 
            className="px-8 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/50 font-bold text-slate-300 hover:text-white text-base transition-all duration-300 flex items-center justify-center"
          >
            Explore Capabilities
          </a>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-white">Smart Ingestion & OCR</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ingest PDF, DOCX, XLSX, and scanned drawings. Automatically trigger text extraction, language detection, and document classification.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-white">Hybrid Semantic Search</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Query text with instant semantic mapping. Filter reports by KMRL department, date ranges, and categories with precise citation scoring.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-white">RAG Conversational Chat</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Converse with single or multiple corporate guidelines. Chat dynamically with citations referencing safety thresholds or maintenance cost overruns.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-800/60 flex flex-col md:flex-row justify-between items-center z-10 gap-4 text-xs text-slate-500">
        <p>© 2026 Kochi Metro Rail Limited (KMRL). All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300">System Logs</a>
          <a href="#" className="hover:text-slate-300">Administrator Console</a>
        </div>
      </footer>
    </div>
  );
}
