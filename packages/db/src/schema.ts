import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text("email").notNull().unique(),
  id: uuid("id").defaultRandom().primaryKey(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

const insertUserSchema = createInsertSchema(users);
const selectUserSchema = createSelectSchema(users);

type NewUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

export { insertUserSchema, selectUserSchema, users };
export type { NewUser, User };
