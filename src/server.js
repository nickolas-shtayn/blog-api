import express from "express";
import { posts, users, invites } from "./db/schema.js";
import { db } from "./db/index.js";
import cors from "cors";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import { htmlToText } from "html-to-text";

const server = express();
const PORT = 1000;

sgMail.setApiKey(process.env.SG_API_KEY);

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

server.post("/editpost", extractUserFromToken, async (req, res) => {
  const { id, name, content } = req.body;

  const user = req.user;

  const post = await db.select().from(posts).where(eq(posts.id, id));

  if (post[0].userId !== user.sub) {
    res.status(401).send("Unauthorized");
    return;
  }

  await db.update(posts).set({ name, content }).where(eq(posts.id, id));

  res.status(200).send("Post updated");
});

server.get("/fetchposts", async (req, res) => {
  const allPosts = await db.select().from(posts);
  const postsWithPlainText = allPosts.map((post) => ({
    ...post,
    content: htmlToText(post.content),
  }));

  res.status(200).json(postsWithPlainText);
});

server.get("/user", extractUserFromToken, async (req, res) => {
  const userId = req.user.sub;
  const user = await db.select().from(users).where(eq(users.id, userId));
  const admin = user[0].admin;

  const userEmail = user[0].email;
  if (!admin) {
    res.status(200).json({ userEmail });
    return;
  }
  res.status(200).json({ userEmail, admin: true });
});
server.get("/dashboard", extractUserFromToken, async (req, res) => {
  const userId = req.user.sub;

  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId));

  const user = await db.select().from(users).where(eq(users.id, userId));

  const postsWithPlainText = userPosts.map((post) => ({
    ...post,
    content: htmlToText(post.content),
  }));

  res.status(200).json(postsWithPlainText);
});

server.delete("/deletepost", extractUserFromToken, async (req, res) => {
  const postId = req.body.id;
  const user = req.user;

  const post = await db.select().from(posts).where(eq(posts.id, postId));

  if (post[0].userId !== user.sub) {
    res.status(401).send("Unauthorized");
    return;
  }

  await db.delete(posts).where(eq(posts.id, postId));

  res.status(200).send("Post deleted");
});

server.post("/createpost", extractUserFromToken, async (req, res) => {
  const { name, content: rawContent } = req.body;
  const userId = req.user.sub;
  const content = htmlToText(rawContent);
  const post = await db
    .insert(posts)
    .values({ name, content, userId })
    .returning();
  res.status(200).json({ id: post[0].id, name, content });
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
    res.send("no admin found");
    return;
  }
  res.send("admin exists");
});

server.post("/signup", async (req, res) => {
  const { email, password, inviteCode } = req.body;

  if (inviteCode) {
    const inviteCheck = await db
      .select()
      .from(invites)
      .where(eq(invites.code, inviteCode));

    if (inviteCheck.length === 0) {
      return res.status(401).send("Invalid invite code");
    }
  }

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
        .values({ email, password: hash, admin: false });
      res.status(200).send("signed up as user");
    }
  } else {
    res.status(409).send("This email address is already registered");
  }
});

// add authorization
server.post("/invite", extractUserFromToken, async (req, res) => {
  const { email, invite } = req.body;
  const user = await db.select().from(users).where(eq(users.id, req.user.sub));

  if (!user[0]?.admin) {
    return res.status(403).send("Only admin can send invites");
  }
  await db.insert(invites).values({ email, code: invite });

  const msg = {
    to: email,
    from: "nickolasshtayn@protonmail.com",
    subject: "Private link invite for blog",
    text: `Here is your invite code to sign up for the blog: ${invite}\nSign up here: http://127.0.0.1:5500/link-signup/index.html?email=${email}`,
    html: `<p>Here is your invite code to sign up for the blog:</p><p><strong>${invite}</strong></p><p>Sign up here: <a href="http://127.0.0.1:5500/link-signup/index.html?email=${email}">http://127.0.0.1:5500/link-signup/index.html?email=${email}</a></p>`,
  };

  try {
    await sgMail.send(msg);
    res.status(200).send("invite sent successfully");
  } catch (error) {
    res.status(500).send("Failed to send invite");
  }
});

server.listen(PORT, () => {
  console.log("listening on", PORT);
});
