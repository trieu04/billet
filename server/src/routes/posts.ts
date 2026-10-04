import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { uploadImage } from "../lib/upload";
import { toPublicUser } from "../lib/user-view";

const router = Router();
router.use(requireAuth);

const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:4000";
const toImageUrl = (filename: string) => `${BASE_URL}/uploads/${filename}`;

// Collect ids of the caller plus all accepted friends (feed audience).
async function feedAuthorIds(me: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: me }, { addresseeId: me }] },
    select: { requesterId: true, addresseeId: true },
  });
  const ids = new Set<string>([me]);
  for (const f of friendships) {
    ids.add(f.requesterId === me ? f.addresseeId : f.requesterId);
  }
  return [...ids];
}

// POST /posts (multipart: image + caption) -> create a photo post
router.post("/", uploadImage.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "image file is required" });

  const post = await prisma.post.create({
    data: {
      authorId: req.userId!,
      imageUrl: toImageUrl(req.file.filename),
      caption: (req.body?.caption as string) || null,
    },
    include: { author: true },
  });

  return res.status(201).json({
    post: {
      id: post.id,
      imageUrl: post.imageUrl,
      caption: post.caption,
      createdAt: post.createdAt,
      author: toPublicUser(post.author),
    },
  });
});

// GET /feed -> posts from the caller and accepted friends, newest first
router.get("/feed", async (req, res) => {
  const authorIds = await feedAuthorIds(req.userId!);
  const posts = await prisma.post.findMany({
    where: { authorId: { in: authorIds } },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json({
    posts: posts.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      author: toPublicUser(p.author),
    })),
  });
});

export default router;
