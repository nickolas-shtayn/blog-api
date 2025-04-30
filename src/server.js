import express from "express";
import { posts, users } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";
import bcrypt from "bcrypt";

const server = express();
const PORT = 1000;

server.use(cors());
server.use(express.json());

server.get("/", async (req, res) => {
  const allPosts = await db.select().from(posts);

  res.json(allPosts);
});

server.post("/", async (req, res) => {
  const post = await db.insert(posts).values(req.body);
  console.log("ok");
});

server.post("/login", async (req, res) => {
  const test = await db
    .insert(users)
    .values({ email: "test@test.com", password: "test" });
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
