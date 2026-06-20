/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Admin" | "User" | "Auditor";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  isLocked: boolean;
  mfaEnabled?: boolean;
}

export interface UserWithHash extends User {
  passwordHash: string;
  salt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  eventType: "LOGIN" | "LOGIN_FAILED" | "LOGOUT" | "REGISTER" | "ROLE_CHANGE" | "USER_DELETE" | "USER_LOCK" | "USER_UNLOCK" | "PASSWORD_CHANGE";
  details: string;
  ip: string;
  ua: string;
}

export interface Session {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}
