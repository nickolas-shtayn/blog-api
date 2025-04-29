import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  content: text().notNull(),
});
