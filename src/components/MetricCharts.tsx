/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AuditLog, User } from "../types";
import { Shield, Users, AlertTriangle, Activity } from "lucide-react";

interface MetricChartsProps {
  logs: AuditLog[];
  users: User[];
}

export default function MetricCharts({ logs, users }: MetricChartsProps) {
  // 1. Calculate KPI Metrics
  const totalUsers = users.length;
  const lockedUsers = users.filter((u) => u.isLocked).length;
  const loginFailures = logs.filter((l) => l.eventType === "LOGIN_FAILED").length;
  const loginSuccesses = logs.filter((l) => l.eventType === "LOGIN").length;

  const totalLogCount = logs.length;

  // 2. Roles break down
  const adminCount = users.filter((u) => u.role === "Admin").length;
  const auditorCount = users.filter((u) => u.role === "Auditor").length;
  const userCount = users.filter((u) => u.role === "User").length;

  // 3. Log events frequencies
  const eventFreq: Record<string, number> = {};
  logs.forEach((log) => {
    eventFreq[log.eventType] = (eventFreq[log.eventType] || 0) + 1;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="metric-dashboard-grid">
      {/* KPI Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex items-center gap-4" id="kpi-total-users">
        <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium tracking-wide font-mono">TOTAL SYSTEM USERS</p>
          <p className="text-2xl font-bold text-slate-100 font-sans mt-0.5">{totalUsers}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex items-center gap-4" id="kpi-locked-users">
        <div className={`p-3 rounded-lg ${lockedUsers > 0 ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-400"}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium tracking-wide font-mono">LOCKED ACCOUNTS</p>
          <p className="text-2xl font-bold font-sans mt-0.5 text-slate-100">{lockedUsers}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex items-center gap-4" id="kpi-login-failures">
        <div className={`p-3 rounded-lg ${loginFailures > 0 ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium tracking-wide font-mono">AUTH CONFLICTS</p>
          <p className="text-2xl font-bold text-slate-100 font-sans mt-0.5">{loginFailures}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex items-center gap-4" id="kpi-audit-logs">
        <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium tracking-wide font-mono">AUDIT TRAIL EVENTS</p>
          <p className="text-2xl font-bold text-slate-100 font-sans mt-0.5">{totalLogCount}</p>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm" id="chart-user-roles">
        <p className="text-sm font-semibold text-slate-100 mb-4 tracking-wide font-mono">ROLE DISTRIBUTION</p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Custom SVG Donut Chart */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#1e293b"
                strokeWidth="10"
              />
              {totalUsers > 0 && (
                <>
                  {/* Admin Slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#14b8a6"
                    strokeWidth="10"
                    strokeDasharray={`${(adminCount / totalUsers) * 251.2} 251.2`}
                    strokeDashoffset="0"
                  />
                  {/* Auditor Slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth="10"
                    strokeDasharray={`${(auditorCount / totalUsers) * 251.2} 251.2`}
                    strokeDashoffset={`-${(adminCount / totalUsers) * 251.2}`}
                  />
                  {/* User Slice */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#a855f7"
                    strokeWidth="10"
                    strokeDasharray={`${(userCount / totalUsers) * 251.2} 251.2`}
                    strokeDashoffset={`-${((adminCount + auditorCount) / totalUsers) * 251.2}`}
                  />
                </>
              )}
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-slate-100">{totalUsers}</span>
              <span className="text-[10px] text-slate-400 font-mono">USERS</span>
            </div>
          </div>

          {/* Chart Legends */}
          <div className="flex-1 w-full space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 font-mono text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block"></span>
                  Admins
                </span>
                <span className="font-semibold text-slate-200">{adminCount} ({totalUsers ? Math.round((adminCount / totalUsers) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-400 h-full rounded-full" style={{ width: `${totalUsers ? (adminCount / totalUsers) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 font-mono text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                  Auditors
                </span>
                <span className="font-semibold text-slate-200">{auditorCount} ({totalUsers ? Math.round((auditorCount / totalUsers) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${totalUsers ? (auditorCount / totalUsers) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="flex items-center gap-2 font-mono text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                  Standard Users
                </span>
                <span className="font-semibold text-slate-200">{userCount} ({totalUsers ? Math.round((userCount / totalUsers) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${totalUsers ? (userCount / totalUsers) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm" id="chart-auth-trends">
        <p className="text-sm font-semibold text-slate-100 mb-4 tracking-wide font-mono">LOGIN TELEMETRY RATIO</p>
        <div className="flex flex-col justify-between h-40">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800/80">
              <p className="text-xs font-mono text-emerald-400 mb-1">SUCCESSFUL SIGN-INS</p>
              <p className="text-3xl font-extrabold text-emerald-300">{loginSuccesses}</p>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800/80">
              <p className="text-xs font-mono text-rose-400 mb-1">FAILED REJECTIONS</p>
              <p className="text-3xl font-extrabold text-rose-300">{loginFailures}</p>
            </div>
          </div>

          <div className="space-y-2 mt-4" id="telemetry-bar-comparison">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Failure to Success Margin ratio</span>
              <span>
                {loginSuccesses + loginFailures > 0
                  ? Math.round((loginSuccesses / (loginSuccesses + loginFailures)) * 100)
                  : 100}
                % secure
              </span>
            </div>
            <div className="w-full bg-slate-850 h-3 rounded-full flex overflow-hidden">
              {loginSuccesses + loginFailures === 0 ? (
                <div className="w-full bg-slate-700 h-full"></div>
              ) : (
                <>
                  <div className="bg-emerald-400 h-full cursor-help" style={{ width: `${(loginSuccesses / (loginSuccesses + loginFailures)) * 100}%` }} title="Successful Logins" />
                  <div className="bg-rose-500 h-full cursor-help" style={{ width: `${(loginFailures / (loginSuccesses + loginFailures)) * 100}%` }} title="Failed Login Attempts" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
