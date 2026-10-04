import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/user-view";

const router = Router();

// POST /auth/register -> create account, return user + token
router.post("/register", async (req, res) => {
  const { username, email, password, displayName } = req.body ?? {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, displayName: displayName || username },
  });

  return res.status(201).json({ user: toPublicUser(user), token: signToken(user.id) });
});

// POST /auth/login -> verify credentials, return user + token
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  return res.json({ user: toPublicUser(user), token: signToken(user.id) });
});

// GET /me -> current authenticated user
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: toPublicUser(user) });
});

export default router;
