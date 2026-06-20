/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Key, Mail, User as UserIcon, Eye, EyeOff, AlertTriangle, Info, CheckCircle } from "lucide-react";

interface AuthScreensProps {
  onLoginSuccess: (token: string, user: any) => void;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
}

export default function AuthScreens({ onLoginSuccess, errorMsg, setErrorMsg }: AuthScreensProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password rules validation client-side
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const isLengthOk = password.length >= 8;
  const isPasswordValid = hasUpper && hasLower && hasDigit && isLengthOk;

  const handlePreload = (roleType: "admin" | "auditor" | "user") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (roleType === "admin") {
      setEmail("admin@auth.secure");
      setPassword("SecureAdmin123!");
    } else if (roleType === "auditor") {
      setEmail("auditor@auth.secure");
      setPassword("SecureAuditor123!");
    } else {
      setEmail("user@auth.secure");
      setPassword("SecureUser123!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const checkUrl = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { email, displayName, password };

    try {
      const res = await fetch(checkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (isLogin) {
        setSuccessMsg("Successfully authenticated! Handshaking session...");
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 800);
      } else {
        setSuccessMsg("Registration complete! Setting up auto-session flow...");
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans items-center" id="auth-main-container">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center" id="auth-header-wrapper">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-2xl shadow-lg ring-1 ring-slate-800" id="auth-lock-shield">
          <Shield className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white font-sans" id="auth-main-title">
          Guarded Gate
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-mono tracking-wide" id="auth-sub-desc">
          PRODUCTION GRADE ROLE-BASED ACCESS CONTROL
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10" id="auth-form-card">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 sm:px-10 border border-slate-800 rounded-2xl shadow-2xl" id="auth-card-inner">
          
          {/* Validation Banner or Errors */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/20 border border-red-800/40 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn" id="auth-error-banner">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold font-sans">Security rejection</p>
                <p className="mt-0.5 text-red-300 font-mono leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn" id="auth-success-banner">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold font-sans">Operation verified</p>
                <p className="mt-0.5 text-emerald-300 font-mono leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60 mb-6" id="auth-tab-row">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-mono tracking-wider font-medium rounded-lg transition-all duration-150 ${
                isLogin
                  ? "bg-slate-850 text-teal-400 border border-slate-800/80 shadow-md"
                  : "text-slate-450 hover:text-slate-200"
              }`}
              id="auth-login-tab"
            >
              AUTHENTICATE
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-mono tracking-wider font-medium rounded-lg transition-all duration-150 ${
                !isLogin
                  ? "bg-slate-850 text-indigo-400 border border-slate-800/80 shadow-md"
                  : "text-slate-450 hover:text-slate-200"
              }`}
              id="auth-register-tab"
            >
              ENROLL SECURE
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} id="auth-active-form">
            <div>
              <label htmlFor="email-input" className="block text-xs font-mono font-medium text-slate-300 tracking-wide mb-1.5">
                IDENTITY EMAIL
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60 text-slate-100 placeholder-slate-600 transition-all font-mono"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="animate-fadeIn">
                <label htmlFor="name-input" className="block text-xs font-mono font-medium text-slate-300 tracking-wide mb-1.5">
                  DISPLAY NAME
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="name-input"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/60 text-slate-100 placeholder-slate-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password-input" className="block text-xs font-mono font-medium text-slate-300 tracking-wide">
                  COMPLEX PASSWORD
                </label>
                {isLogin && (
                  <span className="text-[10px] text-slate-500 font-mono cursor-help hover:text-slate-400 flex items-center gap-1">
                    <Info className="w-3 w-3" /> Lock threshold: 5 attempts
                  </span>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60 text-slate-100 placeholder-slate-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  id="password-visibility-toggle"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checker (Registration Mode Only) */}
            {!isLogin && password.length > 0 && (
              <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5 text-[11px] animate-fadeIn" id="password-requirements-card">
                <p className="font-medium text-slate-400 font-mono tracking-wide">PASSWORD STRENGTH TELEMETRY:</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLengthOk ? "bg-emerald-400" : "bg-slate-700"}`}></span>
                    <span className={isLengthOk ? "text-emerald-400 font-mono" : "font-mono"}>At least 8 chars</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? "bg-emerald-400" : "bg-slate-700"}`}></span>
                    <span className={hasUpper ? "text-emerald-400 font-mono" : "font-mono"}>Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLower ? "bg-emerald-400" : "bg-slate-700"}`}></span>
                    <span className={hasLower ? "text-emerald-400 font-mono" : "font-mono"}>Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasDigit ? "bg-emerald-400" : "bg-slate-700"}`}></span>
                    <span className={hasDigit ? "text-emerald-400 font-mono" : "font-mono"}>Numeric digit</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || (!isLogin && !isPasswordValid)}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-xs font-mono font-bold tracking-wider text-white bg-gradient-to-r ${
                  isLogin
                    ? "from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 shadow-teal-500/10"
                    : "from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-indigo-500/10"
                } shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer`}
                id="auth-submit-btn"
              >
                {isLoading ? "EXECUTING CRYPTO HANDSHAKE..." : isLogin ? "AUTHORIZE ENTRY" : "REGISTER CREDENTIALS"}
              </button>
            </div>
          </form>

          {/* Secure Admin Bypass & Seeding Dashboard (Saves typing passwords during reviews) */}
          <div className="mt-8 pt-6 border-t border-slate-800/80" id="auth-fast-seeding-bypass">
            <p className="text-[10px] text-center font-mono text-slate-500 tracking-wider mb-3">
              PRE-CONFIGURED SYSTEM ROLES FOR SECURITY AUDIT
            </p>
            <div className="grid grid-cols-3 gap-2" id="preload-roles-row">
              <button
                onClick={() => handlePreload("admin")}
                className="py-1.5 px-1 bg-slate-950 hover:bg-slate-850 text-[10px] rounded-lg border border-slate-850 hover:border-slate-700/80 transition-colors cursor-pointer text-center text-teal-400 font-mono"
                id="preload-admin-btn"
                title="Loads seeded admin with all capabilities"
              >
                Admin Role
              </button>
              <button
                onClick={() => handlePreload("auditor")}
                className="py-1.5 px-1 bg-slate-950 hover:bg-slate-850 text-[10px] rounded-lg border border-slate-850 hover:border-slate-700/80 transition-colors cursor-pointer text-center text-indigo-400 font-mono"
                id="preload-auditor-btn"
                title="Loads seeded read-only logs auditor"
              >
                Auditor Role
              </button>
              <button
                onClick={() => handlePreload("user")}
                className="py-1.5 px-1 bg-slate-950 hover:bg-slate-850 text-[10px] rounded-lg border border-slate-850 hover:border-slate-700/80 transition-colors cursor-pointer text-center text-purple-400 font-mono"
                id="preload-user-btn"
                title="Loads seeded standard user access"
              >
                Standard User
              </button>
            </div>
            
            <div className="mt-4 p-2.5 bg-slate-950/40 rounded-xl border border-slate-850 flex items-start gap-2 text-[10px] text-slate-400 font-mono leading-relaxed" id="credential-leak-warning">
              <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span>
                These roles preloaded on the server represent different clearance tiers to verify robust **Role-Based Access Control (RBAC)** filters dynamically.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
