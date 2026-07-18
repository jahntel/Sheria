/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Scale, Shield, Landmark, User, Briefcase, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";
import { UserRole, AuthResponse } from "../types";

interface LandingPageProps {
  onAuthSuccess: (auth: AuthResponse) => void;
}

export default function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("citizen");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick credentials filler for testing
  const fillCredentials = (role: UserRole) => {
    setSelectedRole(role);
    setIsLogin(true);
    if (role === "citizen") {
      setEmail("citizen@juasheria.co.ke");
      setPassword("citizen123");
    } else {
      setEmail("lawyer@juasheria.co.ke");
      setPassword("lawyer123");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin 
      ? { email, password }
      : { email, password, fullName, role: selectedRole };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please check credentials.");
      }

      // Success
      localStorage.setItem("jua_sheria_token", data.token);
      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-page" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Flag stripe header - Elegant touch representing Kenyan national brand colors */}
      <div className="h-2 w-full flex">
        <div className="bg-black flex-1" />
        <div className="bg-red-600 flex-1 border-y-2 border-white" />
        <div className="bg-emerald-600 flex-1" />
      </div>

      {/* Top Brand Bar */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-900 text-white rounded-xl shadow-md">
            <Scale className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              Jua <span className="text-emerald-700">Sheria</span>
            </span>
            <span className="block text-[10px] tracking-widest text-slate-400 font-bold uppercase">
              Kenyan Legal Intelligence Portal
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Laws of Kenya • Verified Access</span>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Interactive Brand Presentation & Quick Links */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Dual-Persona Adaptive Artificial Intelligence</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
            Democratizing and Empowering <br />
            <span className="text-emerald-800 relative inline-block">
              Kenyan Legal Practice
            </span>
          </h1>

          <p className="text-slate-600 text-base md:text-lg max-w-xl leading-relaxed">
            Choose your dedicated workspace below. Jua Sheria uses advanced contextual grounding 
            to translate statutes for citizens, or brainstorm trial strategy and elements of proof for advocates.
          </p>

          {/* Dual Portal Selection Cards */}
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            {/* Citizen Portal Info */}
            <div
              id="portal-citizen-info"
              onClick={() => fillCredentials("citizen")}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
                selectedRole === "citizen" && isLogin
                  ? "bg-white border-emerald-600 ring-2 ring-emerald-600/10"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${selectedRole === "citizen" ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <User className="w-5 h-5" />
                </div>
                {selectedRole === "citizen" && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">Selected</span>}
              </div>
              <h3 className="font-bold text-slate-900 text-base">Citizen Portal</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Simple terms, analogies, Swahili translations, and legal rights guidelines for everyday citizens.
              </p>
              <button className="mt-3.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                Demo Citizen Account &rarr;
              </button>
            </div>

            {/* Lawyer Portal Info */}
            <div
              id="portal-lawyer-info"
              onClick={() => fillCredentials("lawyer")}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
                selectedRole === "lawyer" && isLogin
                  ? "bg-white border-emerald-600 ring-2 ring-emerald-600/10"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${selectedRole === "lawyer" ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                {selectedRole === "lawyer" && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">Selected</span>}
              </div>
              <h3 className="font-bold text-slate-900 text-base">Lawyer Workspace</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Statutory analytics, legal brainstorming, elements of proof, split-screen drafting, and litigation templates.
              </p>
              <button className="mt-3.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                Demo Lawyer Account &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Authentication Form */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
          {/* Subtle branding background glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full filter blur-2xl opacity-50 -mr-6 -mt-6" />

          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">
              {isLogin ? "Sign In to Portal" : "Create Account"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your persona below to experience specialized intelligence.
            </p>
          </div>

          {/* Toggle Role Selector within form */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl">
            <button
              id="role-toggle-citizen"
              type="button"
              onClick={() => setSelectedRole("citizen")}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                selectedRole === "citizen"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Citizen
            </button>
            <button
              id="role-toggle-lawyer"
              type="button"
              onClick={() => setSelectedRole("lawyer")}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                selectedRole === "lawyer"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Advocate
            </button>
          </div>

          {error && (
            <div id="auth-error-banner" className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name / Legal Title
                </label>
                <div className="relative">
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={selectedRole === "lawyer" ? "e.g., Counsel Jane Doe, Advocate" : "e.g., Jane Kamau"}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/10 focus:border-emerald-600 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@juasheria.co.ke"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/10 focus:border-emerald-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Password</span>
                {isLogin && (
                  <span className="text-[10px] text-slate-400 normal-case font-medium">Forgot?</span>
                )}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/10 focus:border-emerald-600 outline-none transition-all"
                />
                <button
                  id="toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-900 hover:bg-emerald-850 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <span>Access Jua Sheria &rarr;</span>
              ) : (
                <span>Register Portal &rarr;</span>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="pt-2 text-center text-xs">
            <span className="text-slate-500">
              {isLogin ? "New to Jua Sheria?" : "Already have an account?"}{" "}
            </span>
            <button
              id="toggle-auth-mode-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              {isLogin ? "Create a Portal Profile" : "Login to Portal"}
            </button>
          </div>

          {/* Quick Demo Info banner */}
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Landmark className="w-3.5 h-3.5" /> Quick Demo Accounts
            </p>
            <div className="flex gap-2 justify-center mt-1">
              <button
                id="quick-demo-citizen"
                onClick={() => fillCredentials("citizen")}
                className="px-2 py-1 text-[11px] bg-white border border-slate-200 text-slate-700 font-semibold rounded-md hover:border-emerald-600 hover:text-emerald-900 transition-colors cursor-pointer"
              >
                Citizen Profile
              </button>
              <button
                id="quick-demo-lawyer"
                onClick={() => fillCredentials("lawyer")}
                className="px-2 py-1 text-[11px] bg-white border border-slate-200 text-slate-700 font-semibold rounded-md hover:border-emerald-600 hover:text-emerald-900 transition-colors cursor-pointer"
              >
                Lawyer Workspace
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 bg-slate-900 text-slate-400 text-xs text-center border-t border-slate-850">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-medium text-slate-500">
            © 2026 Jua Sheria. Built in compliance with Laws.Africa and the Laws of Kenya Constitution 2010.
          </p>
          <div className="flex gap-4 font-semibold">
            <span className="hover:text-white transition-colors cursor-pointer">Constitution</span>
            <span className="hover:text-white transition-colors cursor-pointer">Employment Act</span>
            <span className="hover:text-white transition-colors cursor-pointer">Rent Restriction</span>
            <span className="hover:text-white transition-colors cursor-pointer">Penal Code</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
