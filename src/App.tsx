/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Scale, Loader2, Landmark } from "lucide-react";
import { User, AuthResponse } from "./types";
import LandingPage from "./components/LandingPage.tsx";
import CitizenPortal from "./components/CitizenPortal.tsx";
import LawyerWorkspace from "./components/LawyerWorkspace.tsx";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Check for existing JWT session on boot for full session persistence
  useEffect(() => {
    const storedToken = localStorage.getItem("jua_sheria_token");
    if (!storedToken) {
      setBootstrapping(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token stale or invalid
          localStorage.removeItem("jua_sheria_token");
        }
      } catch (err) {
        console.error("Session bootstrap failed:", err);
      } finally {
        setBootstrapping(false);
      }
    };

    checkSession();
  }, []);

  const handleAuthSuccess = (auth: AuthResponse) => {
    setUser(auth.user);
    setToken(auth.token);
  };

  const handleLogout = () => {
    localStorage.removeItem("jua_sheria_token");
    setUser(null);
    setToken(null);
  };

  // 1. Initial Session Loader Screen
  if (bootstrapping) {
    return (
      <div id="app-bootstrap-loader" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
        <div className="h-2 w-full absolute top-0 left-0 flex">
          <div className="bg-black flex-1" />
          <div className="bg-red-600 flex-1 border-y-2 border-white" />
          <div className="bg-emerald-600 flex-1" />
        </div>
        
        <div className="space-y-6 text-center animate-pulse">
          <div className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-2xl inline-flex shadow-lg shadow-emerald-950/20">
            <Scale className="w-12 h-12 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider">
              Jua <span className="text-emerald-400">Sheria</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              Kenyan Legal Intelligence Portal
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-500 font-semibold pt-4">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Establishing secure statutory session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Portal Router based on role
  if (user && token) {
    if (user.role === "citizen") {
      return (
        <CitizenPortal 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
        />
      );
    } else if (user.role === "lawyer") {
      return (
        <LawyerWorkspace 
          user={user} 
          token={token} 
          onLogout={handleLogout} 
        />
      );
    }
  }

  // 3. Fallback Landing Auth
  return (
    <LandingPage onAuthSuccess={handleAuthSuccess} />
  );
}
