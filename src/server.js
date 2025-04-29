import express from "express";
import { posts } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";

const server = express();
const PORT = 1000;

server.use(cors());
server.use(express.json());

server.post("/", async (req, res) => {
  await db.insert(posts).values({ name: "post1", content: "hello world" });
  res.send("okay");
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
