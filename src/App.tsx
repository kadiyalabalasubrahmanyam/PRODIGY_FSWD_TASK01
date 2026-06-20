/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import AuthScreens from "./components/AuthScreens";
import DashboardLayout from "./components/DashboardLayout";
import { User } from "./types";
import { Shield, Loader } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Revalidate session token on launch
  useEffect(() => {
    const launchSessionToken = localStorage.getItem("secure_auth_token");
    if (!launchSessionToken) {
      setIsInitializing(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${launchSessionToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setToken(launchSessionToken);
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem("secure_auth_token");
          setErrorMsg("Prior session expired. Please authenticate again.");
        }
      } catch (err) {
        console.error("Connectivity issue during startup profile handshakes", err);
      } finally {
        setIsInitializing(false);
      }
    };

    verifyToken();
  }, []);

  const handleLoginSuccess = (validatedToken: string, activeUser: User) => {
    localStorage.setItem("secure_auth_token", validatedToken);
    setToken(validatedToken);
    setUser(activeUser);
    setErrorMsg(null);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        // Notify backend of session deletion
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Error signing out user", err);
      }
    }

    localStorage.removeItem("secure_auth_token");
    setToken(null);
    setUser(null);
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Loading Splash Screen
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono gap-4" id="app-loader-splash">
        <Shield className="w-10 h-10 text-teal-400 animate-pulse" />
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Loader className="w-4 h-4 text-teal-500 animate-spin" />
          <span>Verifying security clearance zones...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="guarded-gate-root">
      {token && user ? (
        <DashboardLayout
          user={user}
          token={token}
          onLogout={handleLogout}
          onProfileUpdate={handleProfileUpdate}
        />
      ) : (
        <AuthScreens
          onLoginSuccess={handleLoginSuccess}
          errorMsg={errorMsg}
          setErrorMsg={setErrorMsg}
        />
      )}
    </div>
  );
}
