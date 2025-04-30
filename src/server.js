import express from "express";
import { posts } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";

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

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
