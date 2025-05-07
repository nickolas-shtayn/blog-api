import express from "express";
import { posts, users } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const server = express();
const PORT = 1000;

server.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true,
  })
);
server.use(express.json());

const extractUserFromToken = function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).send("Expired");
    } else {
      return res.status(401).send("Invalid token");
    }
  }
};

server.get("/post/:id", async (req, res) => {
  const postId = req.params.id;

  const postData = await db.select().from(posts).where(eq(posts.id, postId));

  res.status(200).json(postData);
});

server.post("/editpost", async (req, res) => {
  const { id, name, content } = req.body;
  await db.update(posts).set({ name, content }).where(eq(posts.id, id));

  res.status(200).send("Post updated");
});

server.get("/", async (req, res) => {
  const allPosts = await db.select().from(posts);

  res.status(200).json(allPosts);
});

server.get("/user", extractUserFromToken, async (req, res) => {
  const userId = req.user.sub;
  const user = await db.select().from(users).where(eq(users.id, userId));

  const userEmail = user[0].email;

  res.status(200).json(userEmail);
});
server.get("/dashboard", extractUserFromToken, async (req, res) => {
  const userId = req.user.sub;

  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId));

  const user = await db.select().from(users).where(eq(users.id, userId));

  res.status(200).json(userPosts);
});

server.delete("/deletepost", async (req, res) => {
  const postId = req.body.id;

  await db.delete(posts).where(eq(posts.id, postId));

  res.status(200).send("Post deleted");
});

server.post("/", extractUserFromToken, async (req, res) => {
  const { name, content } = req.body;
  const userId = req.user.sub;
  const post = await db.insert(posts).values({ name, content, userId });
  res.status(200).send("post added to user");
});

server.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.select().from(users).where(eq(users.email, email));

  if (user.length > 0) {
    const hashedPass = user[0].password;
    const isMatch = await bcrypt.compare(password, hashedPass);

    if (isMatch) {
      const payload = {
        sub: user[0].id,
        email: user[0].email,
      };
      const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send(token).status(200);
    } else {
      res.status(401).send("wrong password");
    }
  } else {
    res.status(401).send("wrong email");
  }
});

server.get("/admin", async (req, res) => {
  const admin = await db.select().from(users).where(eq(users.admin, true));

  if (admin.length === 0) {
    res.status(404).send("No admin found");
    return;
  }
  res.json(admin);
});

server.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.select().from(users).where(eq(users.email, email));
  const admin = await db.select().from(users).where(eq(users.admin, true));

  if (user.length === 0) {
    if (admin.length === 0) {
      const hash = await bcrypt.hash(password, 13);
      const signUp = await db
        .insert(users)
        .values({ email, password: hash, admin: true });
      res.status(200).send("signed up as admin");
    } else {
      const hash = await bcrypt.hash(password, 13);
      const signUp = await db
        .insert(users)
        .values({ email, password: hash, admin: true });
      res.status(200).send("signed up as user");
    }
  } else {
    res.status(409).send("This email address is already registered");
  }
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
