import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/user-view";

const router = Router();

router.use(requireAuth);

// POST /friends/request { addresseeId } -> send a friend request
router.post("/request", async (req, res) => {
  const me = req.userId!;
  const { addresseeId } = req.body ?? {};
  if (!addresseeId) return res.status(400).json({ error: "addresseeId is required" });
  if (addresseeId === me) return res.status(400).json({ error: "Cannot friend yourself" });

  const target = await prisma.user.findUnique({ where: { id: addresseeId } });
  if (!target) return res.status(404).json({ error: "User not found" });

  // Reject if any friendship already exists in either direction.
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId },
        { requesterId: addresseeId, addresseeId: me },
      ],
    },
  });
  if (existing) {
    return res.status(409).json({ error: `Friendship already ${existing.status}` });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: me, addresseeId },
  });
  return res.status(201).json({ friendship });
});

// GET /friends/requests -> incoming pending requests (with requester info)
router.get("/requests", async (req, res) => {
  const requests = await prisma.friendship.findMany({
    where: { addresseeId: req.userId, status: "pending" },
    include: { requester: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({
    requests: requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      requester: toPublicUser(r.requester),
    })),
  });
});

// POST /friends/respond { friendshipId, accept } -> accept or decline a request
router.post("/respond", async (req, res) => {
  const me = req.userId!;
  const { friendshipId, accept } = req.body ?? {};
  if (!friendshipId || typeof accept !== "boolean") {
    return res.status(400).json({ error: "friendshipId and boolean accept are required" });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== me || friendship.status !== "pending") {
    return res.status(404).json({ error: "Pending request not found" });
  }

  if (accept) {
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted" },
    });
    return res.json({ friendship: updated });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  return res.json({ ok: true });
});

// GET /friends -> accepted friends (the "other" user in each friendship)
router.get("/", async (req, res) => {
  const me = req.userId!;
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    include: { requester: true, addressee: true },
    orderBy: { createdAt: "desc" },
  });

  const friends = friendships.map((f) =>
    toPublicUser(f.requesterId === me ? f.addressee : f.requester)
  );
  return res.json({ friends });
});

export default router;
