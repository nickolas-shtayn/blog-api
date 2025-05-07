import { integer, boolean, pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull(),
  password: text().notNull(),
  admin: boolean("admin").default(false),
});

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  content: text().notNull(),
  userId: integer("user_id").references(() => users.id),
});

export const invites = pgTable("invites", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull(),
  code: text().notNull(),
});
