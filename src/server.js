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
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  req.user = decoded;

  next();
};

server.get("/", async (req, res) => {
  const allPosts = await db.select().from(posts);

  res.status(200).json(allPosts);
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
      res.send(token);
    } else {
      res.status(401).send("wrong password");
    }
  } else {
    res.status(401).send("wrong email");
  }
});

server.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.select().from(users).where(eq(users.email, email));

  if (user.length === 0) {
    const hash = await bcrypt.hash(password, 13);
    const signUp = await db.insert(users).values({ email, password: hash });

    res.send("signed up");
  } else {
    res.status(409).send("This email address is already registered");
  }
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
