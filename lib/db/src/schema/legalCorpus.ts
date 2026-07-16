import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Shared, read-only reference law. Written only by the ingestion job
// (service role); readable by any authenticated user. See migration
// artifacts/pro-se-navigator/supabase/migrations/002_legal_corpus.sql.

export const legalSourcesTable = pgTable("legal_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  citation: text("citation").notNull().unique(),
  url: text("url").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  sourceType: text("source_type").notNull(), // 'rule' | 'statute'
  caseTypes: text("case_types").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const legalChunksTable = pgTable("legal_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => legalSourcesTable.id, { onDelete: "cascade" }),
  heading: text("heading").notNull(),
  content: text("content").notNull(),
  // content_fts is a generated column, managed by Postgres — not modeled here.
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLegalSourceSchema = createInsertSchema(
  legalSourcesTable,
).omit({ id: true, createdAt: true });
export const insertLegalChunkSchema = createInsertSchema(legalChunksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertLegalSource = z.infer<typeof insertLegalSourceSchema>;
export type InsertLegalChunk = z.infer<typeof insertLegalChunkSchema>;
export type LegalSource = typeof legalSourcesTable.$inferSelect;
export type LegalChunk = typeof legalChunksTable.$inferSelect;
