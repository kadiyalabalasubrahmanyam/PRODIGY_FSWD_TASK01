/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, AuditLog, UserRole } from "../types";
import MetricCharts from "./MetricCharts";
import {
  Shield,
  Key,
  User as UserIcon,
  LogOut,
  Settings,
  Lock,
  Unlock,
  Trash2,
  Search,
  FileText,
  Layers,
  Activity,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Sliders,
  ChevronRight
} from "lucide-react";

interface DashboardLayoutProps {
  user: User;
  token: string;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: User) => void;
}

export default function DashboardLayout({ user, token, onLogout, onProfileUpdate }: DashboardLayoutProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile" | "admin" | "audit">("dashboard");

  // Admin and Auditor States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>("all");

  // Log Viewer States
  const [logSearch, setLogSearch] = useState<string>("");
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all");

  // Profile Editor States
  const [displayNameInput, setDisplayNameInput] = useState<string>(user.displayName);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  // General Status Alerts
  const [sysAlert, setSysAlert] = useState<string | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Preloaded static data stats
  const canAccessLogs = user.role === "Admin" || user.role === "Auditor";
  const canAccessAdmin = user.role === "Admin";

  // Fetch telemetry / administrative data
  const fetchTelemetry = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setSysError(null);

    try {
      // 1. Fetch Users List (Admin Only)
      if (canAccessAdmin) {
        const usersRes = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsersList(uData.users);
        } else {
          const err = await usersRes.json();
          throw new Error(err.error || "Failed to load user directories");
        }
      }

      // 2. Fetch Compliance Audit Logs (Admin and Auditor)
      if (canAccessLogs) {
        const logsRes = await fetch("/api/admin/logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setAuditLogs(lData.logs);
        } else {
          const err = await logsRes.json();
          throw new Error(err.error || "Failed to load compliance audit logs");
        }
      }
    } catch (err: any) {
      setSysError(err.message || "Failed to synchronize remote telemetries");
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Sync on mount and periodically
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(true), 15000); // Silent sync every 15s
    return () => clearInterval(interval);
  }, [user.role, token]);

  // Handle Profile Update submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayNameInput,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile configurations");
      }

      setProfileSuccess(data.message || "Profile configurations refreshed successfully!");
      onProfileUpdate(data.user);
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setProfileError(err.message || "Encryption error updating profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // -- ADMIN CONTROL MUTATIONS --

  // Modify user role
  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setSysError(null);
    setSysAlert(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to elevate role");
      }

      setSysAlert(`Security policy updated: Account role modified.`);
      fetchTelemetry(true);
    } catch (err: any) {
      setSysError(err.message || "Unauthorized operation");
    }
  };

  // Lock account
  const handleLockAccount = async (targetUserId: string) => {
    setSysError(null);
    setSysAlert(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Emergency lock failed");
      }

      setSysAlert("Emergency protocol: User clearance lock complete.");
      fetchTelemetry(true);
    } catch (err: any) {
      setSysError(err.message || "Could not lock account");
    }
  };

  // Unlock account
  const handleUnlockAccount = async (targetUserId: string) => {
    setSysError(null);
    setSysAlert(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unlock failed");
      }

      setSysAlert("Security protocol override: Account re-authorized.");
      fetchTelemetry(true);
    } catch (err: any) {
      setSysError(err.message || "Could not unlock account");
    }
  };

  // Prune User Account
  const handleDeleteUser = async (targetUserId: string) => {
    if (!window.confirm("CRITICAL: Are you absolutely sure you want to permanently erase this user account? This operation cannot be rolled back.")) {
      return;
    }

    setSysError(null);
    setSysAlert(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Prune operation failed");
      }

      setSysAlert("Database sweep: Verified user purged from record registry.");
      fetchTelemetry(true);
    } catch (err: any) {
      setSysError(err.message || "Failed to prune credentials");
    }
  };

  // Expiration / UI Clock values
  const dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };

  // Filter logs logic
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.userEmail?.toLowerCase() || "").includes(logSearch.toLowerCase()) ||
      log.eventType.includes(logSearch.toUpperCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase());
    const matchesType = logTypeFilter === "all" || log.eventType === logTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filter users logic
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
      u.displayName.toLowerCase().includes(adminSearch.toLowerCase());
    const matchesRole = adminRoleFilter === "all" || u.role === adminRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="dashboard-wrapper">
      {/* Upper Navigation Rail */}
      <header className="bg-slate-900 border-b border-slate-800" id="dashboard-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo/Branding */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl shadow-md border border-slate-700/50">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-wide text-white">GUARDED GATE</h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">SECURE ACCOUNT REGISTRY</p>
              </div>
            </div>

            {/* Sync Telemetry / Alert Center indicators */}
            <div className="flex items-center gap-4">
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-850 border border-slate-800 text-[10px] font-mono font-medium text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                STATION ID: {user.id.slice(0, 8)}
              </span>

              <button
                onClick={() => fetchTelemetry()}
                disabled={isRefreshing}
                className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5 border border-slate-800 text-xs font-mono cursor-pointer disabled:opacity-50"
                id="telemetry-refresh-btn"
                title="Force refresh database telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                SYNC
              </button>

              <button
                onClick={onLogout}
                className="py-1.5 px-3 bg-red-950/25 hover:bg-red-900/30 text-rose-300 hover:text-rose-100 rounded-xl transition-all font-mono text-xs font-bold border border-rose-900/30 flex items-center gap-1.5 cursor-pointer"
                id="logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                TERMINATE
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* User Identity Highlight Cards */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm overflow-hidden relative" id="identity-banner">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/[0.03] rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-100 font-bold text-lg select-none">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : "??"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{user.displayName}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider ${
                    user.role === "Admin"
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      : user.role === "Auditor"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  }`}>
                    {user.role} Clearances
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">{user.email}</p>
              </div>
            </div>

            {/* Session Expiry metadata */}
            <div className="flex flex-col items-start md:items-end text-xs text-slate-400 font-mono gap-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Active Credentials Handshake Verified</span>
              </div>
              <span className="text-[10px] text-slate-500">Security Ticket: {token.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* Global Security Notification Center */}
        {(sysAlert || sysError) && (
          <div className="space-y-3" id="global-system-alerts">
            {sysAlert && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono tracking-wide">{sysAlert}</span>
              </div>
            )}
            {sysError && (
              <div className="p-3.5 bg-red-950/20 border border-red-800/40 text-red-200 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-mono tracking-wide">{sysError}</span>
              </div>
            )}
          </div>
        )}

        {/* View Selection Row */}
        <div className="flex border-b border-slate-800/80 gap-6" id="dashboard-tab-navigation">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-3 text-xs font-mono font-medium tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            id="tab-dashboard-btn"
          >
            INTELLIGENCE OVERVIEW
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-xs font-mono font-medium tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            id="tab-profile-btn"
          >
            CREDENTIAL PARAMS
          </button>

          {canAccessAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`pb-3 text-xs font-mono font-medium tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "border-teal-400 text-teal-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              id="tab-admin-btn"
            >
              DIRECTORY OVERSEE
            </button>
          )}

          {canAccessLogs && (
            <button
              onClick={() => setActiveTab("audit")}
              className={`pb-3 text-xs font-mono font-medium tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === "audit"
                  ? "border-indigo-450 text-indigo-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              id="tab-audit-btn"
            >
              AUDIT TRAILS ({auditLogs.length})
            </button>
          )}
        </div>

        {/* Tab Content Router */}
        <div className="space-y-6" id="tab-content-panel">

          {/* TAB 1: INTELLIGENCE OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fadeIn" id="overview-content">
              
              {/* Telemetry charts row */}
              {canAccessLogs ? (
                <MetricCharts logs={auditLogs} users={usersList.length > 0 ? usersList : [user]} />
              ) : (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center max-w-lg mx-auto" id="no-charts-warning">
                  <Shield className="w-12 h-12 text-slate-600 mb-4" />
                  <h3 className="text-sm font-semibold text-slate-100 font-mono tracking-wide uppercase">RESTRICTED METRICS OUTLINE</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-2 font-mono leading-relaxed">
                    Standard clients lack clearances to inspect systemwide log aggregations or user distributions automatically. Upgrade to an Admin role to see dynamic metrics dashboards.
                  </p>
                </div>
              )}

              {/* Security Level Policy Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="clearance-level-grid">
                
                {/* Admin Clearance description */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between" id="policy-card-admin">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-400"></div>
                      <h4 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">TIER 1 clearance: ADMIN</h4>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      Complete administrative power. Permitted to adjust client permissions, toggle locks, delete accounts, inspect all security logs, and download compliance audits.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Write capabilities: Full</span>
                    <span className="text-teal-400">ACTIVE OVERRIDE</span>
                  </div>
                </div>

                {/* Auditor Clearance description */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between" id="policy-card-auditor">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                      <h4 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">TIER 2 clearance: AUDITOR</h4>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      High clearance read-only observer. Authorized to view security system telemetry and audit-trail logging, but strictly forbidden from making database mutation modifications.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Read capability: Unified</span>
                    <span className="text-indigo-400">READ TELESCOPE</span>
                  </div>
                </div>

                {/* Normal User Clearance description */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between" id="policy-card-user">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                      <h4 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">TIER 3 clearance: USER</h4>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      Standard sandbox environment. Authorized to edit personal settings and display properties. Blocked from seeing other user configurations or historical logs.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Data containment: Local</span>
                    <span className="text-purple-400">CONTAINED ZONE</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CREDENTIAL PARAMS (PROFILE EDITOR) */}
          {activeTab === "profile" && (
            <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm animate-fadeIn" id="profile-content">
              <h3 className="text-sm font-semibold font-mono tracking-wide text-slate-100 uppercase mb-2">REFRESH USER PROFILES</h3>
              <p className="text-xs text-slate-400 font-mono mb-6 pb-4 border-b border-slate-800">AMEND SIGNATURE IDENTITY AND SIGN-IN CREDENTIALS</p>

              {profileSuccess && (
                <div className="mb-5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-850 text-emerald-200 text-xs font-mono flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="mb-5 p-3 rounded-lg bg-red-950/25 border border-red-900/40 text-red-200 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5" id="profile-edit-form">
                <div>
                  <label htmlFor="displayName-profile-input" className="block text-xs font-mono font-medium text-slate-300 tracking-wide mb-1.5">
                    DISPLAY FULL NAME
                  </label>
                  <input
                    id="displayName-profile-input"
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    required
                    className="block w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60 text-slate-100 placeholder-slate-600 transition-all font-sans"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-widest">Update Complex Password</h4>
                  
                  <div>
                    <label htmlFor="oldPassword-profile-input" className="block text-xs font-mono font-medium text-slate-400 tracking-wide mb-1.5">
                      CURRENT VERIFICATION PASSWORD
                    </label>
                    <input
                      id="oldPassword-profile-input"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60 text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword-profile-input" className="block text-xs font-mono font-medium text-slate-400 tracking-wide mb-1.5">
                      NEW COMPLEX PASSWORD
                    </label>
                    <input
                      id="newPassword-profile-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60 text-slate-100 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                      Must conform to security protocols: Min 8 chars, 1 uppercase, 1 lowercase, 1 number.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition-all shadow-md shadow-teal-500/5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    id="save-profile-btn"
                  >
                    {profileLoading ? "ENCRYPTING SECURITY PARAMETERS..." : "COMMIT CREDENTIAL CHANGES"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DIRECTORY OVERSEE (ADMIN USER CONTROL) */}
          {activeTab === "admin" && canAccessAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm animate-fadeIn" id="admin-content">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold font-mono tracking-wide text-slate-100 uppercase">CLIENT ACCOUNT DIRECTORY</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">MANAGE SECURITY TIERS AND ACCESS LOCKOUTS</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  {/* Search bar */}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search email/name..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none text-slate-250 font-mono"
                    />
                  </div>

                  {/* Role filter */}
                  <select
                    value={adminRoleFilter}
                    onChange={(e) => setAdminRoleFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-950 border border-slate-800 text-xs font-mono rounded-lg focus:outline-none text-slate-300"
                  >
                    <option value="all">Roles (All)</option>
                    <option value="Admin">Admin</option>
                    <option value="Auditor">Auditor</option>
                    <option value="User">Standard User</option>
                  </select>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950" id="users-directory-table">
                <table className="min-w-full divide-y divide-slate-800 font-sans text-left">
                  <thead className="bg-slate-900 text-slate-400 text-xs font-mono uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Security User</th>
                      <th className="px-6 py-4">Email ID</th>
                      <th className="px-6 py-4">Clearance Role</th>
                      <th className="px-6 py-4">Enrollment Date</th>
                      <th className="px-6 py-4 text-right">Protection Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-xs text-slate-300" id="users-directory-body">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 font-mono text-slate-500">
                          No registered account profiles found matching active filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40 transition-colors" id={`user-row-${item.id}`}>
                          <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 font-mono text-center shrink-0" />
                            {item.displayName}
                            {item.id === user.id && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[9px] font-medium border border-amber-500/20">YOU</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-400">{item.email}</td>
                          <td className="px-6 py-4">
                            <select
                              value={item.role}
                              disabled={item.id === user.id}
                              onChange={(e) => handleRoleChange(item.id, e.target.value as UserRole)}
                              className="py-1 px-1.5 bg-slate-900 border border-slate-800 text-xs font-mono rounded cursor-pointer text-slate-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Auditor">Auditor</option>
                              <option value="User">User</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {/* Account Lock Toggle */}
                            {item.isLocked ? (
                              <button
                                onClick={() => handleUnlockAccount(item.id)}
                                className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-mono rounded-lg transition-colors cursor-pointer"
                                id={`unlock-btn-${item.id}`}
                                title="Authorize and restore account access"
                              >
                                <Unlock className="w-3 h-3" /> UNLOCK
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLockAccount(item.id)}
                                disabled={item.id === user.id}
                                className="inline-flex items-center gap-1 py-1 px-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                id={`lock-btn-${item.id}`}
                                title="Emergency lock account access"
                              >
                                <Lock className="w-3 h-3" /> LOCK OUT
                              </button>
                            )}

                            {/* Purge user button */}
                            <button
                              onClick={() => handleDeleteUser(item.id)}
                              disabled={item.id === user.id}
                              className="inline-flex items-center gap-1 py-1 px-2 bg-slate-900 text-slate-500 hover:bg-red-500/10 hover:text-red-400 border border-slate-800 hover:border-red-500/20 text-[10px] font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              id={`delete-btn-${item.id}`}
                              title="Erase credentials completely"
                            >
                              <Trash2 className="w-3 h-3" /> PRUNE
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLIANCE AUDIT LOGS TRAIL */}
          {activeTab === "audit" && canAccessLogs && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm animate-fadeIn" id="audit-content">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold font-mono tracking-wide text-slate-100 uppercase">SYSTEM COMPLIANCE TRAIL</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">UNALTERABLE AUDIT-LEVEL EVENT TELEMETRIES</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  {/* Search query logs */}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search audit trail..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none text-slate-250 font-mono"
                    />
                  </div>

                  {/* Filter log category */}
                  <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-950 border border-slate-800 text-xs font-mono rounded-lg focus:outline-none text-slate-300"
                  >
                    <option value="all">Events (All)</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                    <option value="LOGOUT">LOGOUT</option>
                    <option value="REGISTER">REGISTER</option>
                    <option value="ROLE_CHANGE">ROLE_CHANGE</option>
                    <option value="USER_LOCK">USER_LOCK</option>
                    <option value="USER_UNLOCK">USER_UNLOCK</option>
                    <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
                    <option value="USER_DELETE">USER_DELETE</option>
                  </select>
                </div>
              </div>

              {/* Audit Terminal Printout */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 overflow-hidden" id="audit-terminal-wrapper">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3 text-[10px] font-mono text-slate-500">
                  <span>UNIFIED LOGGER ACTIVE</span>
                  <span>PREPENDING NEWEST ENTRIES</span>
                </div>
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 font-mono text-xs text-slate-350 leading-relaxed" id="audit-terminal-content">
                  {filteredLogs.length === 0 ? (
                    <p className="text-center py-10 text-slate-600">
                      No matching audit logs indexed in files records.
                    </p>
                  ) : (
                    filteredLogs.map((log) => {
                      const dateStr = new Date(log.timestamp).toLocaleTimeString(undefined, dateOptions);
                      return (
                        <div key={log.id} className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg hover:border-slate-850 transition-colors" id={`log-item-${log.id}`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] text-slate-500 select-all font-bold">[{dateStr}]</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                log.eventType === "LOGIN_FAILED" || log.eventType === "USER_LOCK"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : log.eventType === "LOGIN" || log.eventType === "USER_UNLOCK"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              } border uppercase tracking-wider`}>
                                {log.eventType}
                              </span>
                              <span className="text-slate-300 font-bold">{log.userEmail || "Anonymous"}</span>
                            </div>
                            <span className="text-[9px] text-slate-550 font-mono select-none">Client: {log.ip}</span>
                          </div>
                          
                          <p className="mt-1.5 text-slate-400 text-xs pl-3 border-l border-slate-850">{log.details}</p>
                          <p className="text-[9px] text-slate-600 pl-3 mt-1 select-all font-mono">Agent-Specs: {log.ua.slice(0, 75)}...</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Humble status bar */}
      <footer className="bg-slate-950 border-t border-slate-900 text-center py-4 mt-12 text-[10px] text-slate-500 font-mono" id="dashboard-footer">
        <span>Guarded Gate security sandbox interface — local node operational — 2026 UTC</span>
      </footer>
    </div>
  );
}
