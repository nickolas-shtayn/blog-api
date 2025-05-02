import express from "express";
import { posts, users } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const server = express();
const PORT = 1000;

server.use(cors());
server.use(express.json());
server.use(cookieParser());

server.get("/", async (req, res) => {
  const allPosts = await db.select().from(posts);

  res.json(allPosts);
});

server.post("/", async (req, res) => {
  const post = await db.insert(posts).values(req.body);
  res.send("ok");
});

server.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.select().from(users).where(eq(users.email, email));

  if (result.length > 0) {
    const hashedPass = result[0].password;
    const isMatch = await bcrypt.compare(password, hashedPass);

    if (isMatch) {
      const payload = {
        sub: result[0].id,
        email: result[0].email,
      };
      const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("jwt", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 360000,
        path: "/",
      });
      res.send("authenticated");
    } else {
      res.send("wrong password");
    }
  } else {
    res.send("wrong email");
  }
});

server.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 13);
  const signUp = await db.insert(users).values({ email, password: hash });

  res.send("signed up");
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
