import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/user-view";

const router = Router();

// GET /users/search?q= -> find users by username/displayName (excluding self)
router.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { username: "asc" },
  });

  return res.json({ users: users.map(toPublicUser) });
});

export default router;
