import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import friendRoutes from "./routes/friends";
import postRoutes from "./routes/posts";

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images statically at /uploads/*
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/friends", friendRoutes);
app.use("/posts", postRoutes);

// Central error handler (e.g. multer file-type/size errors).
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(400).json({ error: err.message || "Unexpected error" });
  }
);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
