/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { UserWithHash, UserRole, User, AuditLog, Session } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent Data Storage Path
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Data Seeding
function seedData() {
  let users: Record<string, UserWithHash> = {};
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading users file, resetting", e);
    }
  }

  // Pre-seed three roles with strong secure passwords
  const defaultAccounts = [
    { email: "admin@auth.secure", name: "Security Administrator", role: "Admin" as UserRole, pass: "SecureAdmin123!" },
    { email: "auditor@auth.secure", name: "Compliance Auditor", role: "Auditor" as UserRole, pass: "SecureAuditor123!" },
    { email: "user@auth.secure", name: "Standard Client", role: "User" as UserRole, pass: "SecureUser123!" },
  ];

  let changed = false;
  for (const acct of defaultAccounts) {
    if (!users[acct.email]) {
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = crypto.scryptSync(acct.pass, salt, 64).toString("hex");
      users[acct.email] = {
        id: crypto.randomUUID(),
        email: acct.email,
        displayName: acct.name,
        role: acct.role,
        createdAt: new Date().toISOString(),
        isLocked: false,
        passwordHash,
        salt,
      };
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  }

  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), "utf-8");
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

seedData();

// IO Helpers
function getUsers(): Record<string, UserWithHash> {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserWithHash>) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function getLogs(): AuditLog[] {
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeLog(
  userId: string | undefined,
  userEmail: string | undefined,
  eventType: AuditLog["eventType"],
  details: string,
  req: express.Request
) {
  const logs = getLogs();
  const entry: AuditLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    eventType,
    details,
    ip: req.ip || req.headers["x-forwarded-for"]?.toString() || "127.0.0.1",
    ua: req.headers["user-agent"] || "Unknown",
  };
  logs.unshift(entry); // Prepend to show newest first
  // Keep logs bounded to 1000 items
  if (logs.length > 1000) {
    logs.length = 1000;
  }
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

function getSessions(): Record<string, Session> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, Session>) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

// Memory mapping for lockout tracking (reset on restart is safe)
const loginAttempts: Record<string, number> = {};
const MAX_LOGIN_ATTEMPTS = 5;

// User Auth Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access Denied: Missing authorization token" });
    return;
  }

  const sessions = getSessions();
  const session = sessions[token];

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete sessions[token];
    saveSessions(sessions);
    res.status(401).json({ error: "Session expired. Please log in again" });
    return;
  }

  const users = getUsers();
  const user = Object.values(users).find((u) => u.id === session.userId);

  if (!user) {
    res.status(404).json({ error: "User associated with this session was not found" });
    return;
  }

  if (user.isLocked) {
    res.status(403).json({ error: "Account has been locked. Please contact an admin" });
    return;
  }

  // Bind session and basic identity metadata
  (req as any).user = user;
  (req as any).sessionToken = token;
  next();
}

// Role authorization factory
function requireRole(roles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as User;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: `Unauthorized: Requires role [${roles.join(" or ")}]` });
      return;
    }
    next();
  };
}

// -- API ENDPOINTS --

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Register
app.post("/api/auth/register", (req, res) => {
  const { email, displayName, password } = req.body;

  if (!email || !displayName || !password) {
    res.status(400).json({ error: "Email, display name, and password are required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long" });
    return;
  }

  // simple password strength check
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasDigit) {
    res.status(400).json({ error: "Password must contain uppercase, lowercase, and numeric characters" });
    return;
  }

  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users[normalizedEmail]) {
    res.status(400).json({ error: "An account has already been registered with this email" });
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");

  const newUser: UserWithHash = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    displayName: displayName.trim(),
    role: "User", // Defaults to Standard User
    createdAt: new Date().toISOString(),
    isLocked: false,
    passwordHash,
    salt,
  };

  users[normalizedEmail] = newUser;
  saveUsers(users);

  writeLog(newUser.id, newUser.email, "REGISTER", "User account registered successfully", req);

  // Generate initial session immediately
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessions = getSessions();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

  sessions[sessionToken] = {
    id: crypto.randomUUID(),
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  saveSessions(sessions);

  writeLog(newUser.id, newUser.email, "LOGIN", "Signed in automatically upon registration", req);

  const { passwordHash: _, salt: __, ...userResponse } = newUser;
  res.status(201).json({
    message: "Registration successful",
    token: sessionToken,
    user: userResponse,
  });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = getUsers();
  const user = users[normalizedEmail];

  if (!user) {
    writeLog(undefined, normalizedEmail, "LOGIN_FAILED", "Non-existent user email login attempts", req);
    res.status(401).json({ error: "Invalid email or password credentials" });
    return;
  }

  if (user.isLocked) {
    writeLog(user.id, user.email, "LOGIN_FAILED", "Attempted sign-in to locked user account", req);
    res.status(403).json({ error: "Account has been locked due to security protocols. Please contact an Administrator." });
    return;
  }

  // Check login attempts counter
  const attempts = loginAttempts[normalizedEmail] || 0;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    user.isLocked = true;
    users[normalizedEmail] = user;
    saveUsers(users);
    writeLog(user.id, user.email, "USER_LOCK", `Account locked automatically after ${MAX_LOGIN_ATTEMPTS} subsequent failed login attempts`, req);
    res.status(403).json({ error: "Account has been locked due to excessive failed attempts. Contact administrator." });
    return;
  }

  // Verify hash
  const checkHash = crypto.scryptSync(password, user.salt, 64).toString("hex");
  if (checkHash !== user.passwordHash) {
    loginAttempts[normalizedEmail] = attempts + 1;
    writeLog(user.id, user.email, "LOGIN_FAILED", `Incorrect password attempt (${attempts + 1}/${MAX_LOGIN_ATTEMPTS})`, req);

    if (attempts + 1 >= MAX_LOGIN_ATTEMPTS) {
      user.isLocked = true;
      users[normalizedEmail] = user;
      saveUsers(users);
      writeLog(user.id, user.email, "USER_LOCK", `Account locked automatically due to password failure limit`, req);
      res.status(403).json({ error: "Account locked due to consecutive authentication failures." });
      return;
    }

    res.status(401).json({ error: "Invalid email or password credentials" });
    return;
  }

  // Success
  delete loginAttempts[normalizedEmail]; // Reset attempts counter
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessions = getSessions();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

  sessions[sessionToken] = {
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  saveSessions(sessions);

  writeLog(user.id, user.email, "LOGIN", "Login authentication successful", req);

  const { passwordHash: _, salt: __, ...userResponse } = user;
  res.json({
    message: "Login successful",
    token: sessionToken,
    user: userResponse,
  });
});

// Logout
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  const token = (req as any).sessionToken;
  const user = (req as any).user as User;

  const sessions = getSessions();
  delete sessions[token];
  saveSessions(sessions);

  writeLog(user.id, user.email, "LOGOUT", "User session terminated", req);
  res.json({ message: "Successfully logged out" });
});

// Get Current User Info
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = (req as any).user as UserWithHash;
  const { passwordHash: _, salt: __, ...userResponse } = user;
  res.json({ user: userResponse });
});

// Update Profile
app.post("/api/auth/profile", authenticateToken, (req, res) => {
  const { displayName, oldPassword, newPassword } = req.body;
  const user = (req as any).user as UserWithHash;
  const users = getUsers();

  let details = [];

  const currentUser = users[user.email];
  if (!currentUser) {
    res.status(404).json({ error: "User entry not found" });
    return;
  }

  if (displayName && displayName.trim().length > 0) {
    currentUser.displayName = displayName.trim();
    details.push("Display name adjusted");
  }

  if (newPassword) {
    if (!oldPassword) {
      res.status(400).json({ error: "Current password is required to set a new password" });
      return;
    }

    const checkHash = crypto.scryptSync(oldPassword, currentUser.salt, 64).toString("hex");
    if (checkHash !== currentUser.passwordHash) {
      writeLog(currentUser.id, currentUser.email, "PASSWORD_CHANGE", "Failed attempt to change password (invalid old password)", req);
      res.status(400).json({ error: "Incorrect current password" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters long" });
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasDigit) {
      res.status(400).json({ error: "New password must contain uppercase, lowercase, and numeric characters" });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    currentUser.passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
    currentUser.salt = salt;
    details.push("Password updated successfully");
  }

  if (details.length === 0) {
    res.status(400).json({ error: "No changes requested" });
    return;
  }

  users[user.email] = currentUser;
  saveUsers(users);

  const eventType = newPassword ? "PASSWORD_CHANGE" : "ROLE_CHANGE" as any; // Using custom or generic action
  writeLog(currentUser.id, currentUser.email, newPassword ? "PASSWORD_CHANGE" : "REGISTER", `Profile settings updated: ${details.join(", ")}`, req);

  const { passwordHash: _, salt: __, ...userResponse } = currentUser;
  res.json({ message: "Profile updated successfully", user: userResponse });
});

// Admin API: List Users
app.get("/api/admin/users", authenticateToken, requireRole(["Admin"]), (req, res) => {
  const users = getUsers();
  const userList = Object.values(users).map(({ passwordHash: _, salt: __, ...u }) => u);
  res.json({ users: userList });
});

// Admin API: Change user role
app.patch("/api/admin/users/:userId/role", authenticateToken, requireRole(["Admin"]), (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const requester = (req as any).user as User;

  if (!["Admin", "User", "Auditor"].includes(role)) {
    res.status(400).json({ error: "Invalid role specified" });
    return;
  }

  const users = getUsers();
  const userToChange = Object.values(users).find((u) => u.id === userId);

  if (!userToChange) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (userToChange.id === requester.id && role !== "Admin") {
    res.status(400).json({ error: "You cannot demote yourself from Admin status" });
    return;
  }

  const oldRole = userToChange.role;
  userToChange.role = role as UserRole;
  users[userToChange.email] = userToChange;
  saveUsers(users);

  // Expire sessions of that user so their new role takes full effect
  const sessions = getSessions();
  for (const [token, s] of Object.entries(sessions)) {
    if (s.userId === userId) {
      delete sessions[token];
    }
  }
  saveSessions(sessions);

  writeLog(
    userToChange.id,
    userToChange.email,
    "ROLE_CHANGE",
    `Role changed from ${oldRole} to ${role} by Admin (${requester.email})`,
    req
  );

  res.json({ message: "User role updated successfully", user: { id: userToChange.id, role: userToChange.role } });
});

// Admin API: Toggle User Lock status
app.post("/api/admin/users/:userId/unlock", authenticateToken, requireRole(["Admin"]), (req, res) => {
  const { userId } = req.params;
  const requester = (req as any).user as User;

  const users = getUsers();
  const userToUnlock = Object.values(users).find((u) => u.id === userId);

  if (!userToUnlock) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  userToUnlock.isLocked = false;
  users[userToUnlock.email] = userToUnlock;
  saveUsers(users);

  // Reset attempt count
  delete loginAttempts[userToUnlock.email];

  writeLog(
    userToUnlock.id,
    userToUnlock.email,
    "USER_UNLOCK",
    `Account unlocked manually by Admin (${requester.email})`,
    req
  );

  res.json({ message: "Account unlocked successfully" });
});

app.post("/api/admin/users/:userId/lock", authenticateToken, requireRole(["Admin"]), (req, res) => {
  const { userId } = req.params;
  const requester = (req as any).user as User;

  const users = getUsers();
  const userToLock = Object.values(users).find((u) => u.id === userId);

  if (!userToLock) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (userToLock.id === requester.id) {
    res.status(400).json({ error: "You cannot lock your own administrator account" });
    return;
  }

  userToLock.isLocked = true;
  users[userToLock.email] = userToLock;
  saveUsers(users);

  // Expire active sessions
  const sessions = getSessions();
  for (const [token, s] of Object.entries(sessions)) {
    if (s.userId === userId) {
      delete sessions[token];
    }
  }
  saveSessions(sessions);

  writeLog(
    userToLock.id,
    userToLock.email,
    "USER_LOCK",
    `Account locked manually by Admin (${requester.email})`,
    req
  );

  res.json({ message: "Account locked successfully" });
});

// Admin API: Remove User account
app.delete("/api/admin/users/:userId", authenticateToken, requireRole(["Admin"]), (req, res) => {
  const { userId } = req.params;
  const requester = (req as any).user as User;

  const users = getUsers();
  const userToDelete = Object.values(users).find((u) => u.id === userId);

  if (!userToDelete) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (userToDelete.id === requester.id) {
    res.status(400).json({ error: "You are not permitted to delete your own administrator account" });
    return;
  }

  delete users[userToDelete.email];
  saveUsers(users);

  // Expire active sessions
  const sessions = getSessions();
  for (const [token, s] of Object.entries(sessions)) {
    if (s.userId === userId) {
      delete sessions[token];
    }
  }
  saveSessions(sessions);

  writeLog(
    userId,
    userToDelete.email,
    "USER_DELETE",
    `User account deleted permanently by Admin (${requester.email})`,
    req
  );

  res.json({ message: "User deleted successfully" });
});

// Admin and Auditor API: Compliance Logs
app.get("/api/admin/logs", authenticateToken, requireRole(["Admin", "Auditor"]), (req, res) => {
  const logs = getLogs();
  res.json({ logs });
});

// -- INTEGRATE VITE --
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Single port bind as required by runtime configuration (port 3000)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
