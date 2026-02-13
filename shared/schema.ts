import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// n8n Execution Logs Types (matching Supabase schema)
export type ExecutionStatus = 'success' | 'error' | 'running' | 'waiting' | 'canceled';

export interface ExecutionLog {
  id: string;
  execution_id: string;
  workflow_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  finished: boolean;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  mode: string | null;
  node_count: number | null;
  error_message: string | null;
  execution_data: Record<string, unknown> | null;
  workflow_data: Record<string, unknown> | null;
  created_at: string;
  n8n_instance: string | null;
}

export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  runningCount: number;
  waitingCount: number;
  canceledCount: number;
  avgDurationMs: number;
  successRate: number;
}

export interface WorkflowStats {
  workflow_name: string;
  total_executions: number;
  successful: number;
  failed: number;
  avg_duration_ms: number;
}

export interface DailyStats {
  date: string;
  total: number;
  success: number;
  error: number;
}
