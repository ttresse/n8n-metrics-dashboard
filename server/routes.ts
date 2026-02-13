import type { Express } from "express";
import { createServer, type Server } from "http";
import { getSupabase, supabase } from "./supabase";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get distinct n8n instances
  app.get("/api/instances", async (req, res) => {
    try {
      const client = getSupabase();

      const { data, error } = await client
        .from("n8n_execution_logs")
        .select("n8n_instance")
        .not("n8n_instance", "is", null);

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Extract unique instances
      const instanceSet = new Set<string>();
      (data || []).forEach(d => {
        if (d.n8n_instance) {
          instanceSet.add(d.n8n_instance);
        }
      });
      const instances = Array.from(instanceSet).sort();
      res.json(instances);
    } catch (error) {
      console.error("Error fetching instances:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch instances"
      });
    }
  });

  // Get all executions
  app.get("/api/executions", async (req, res) => {
    try {
      const client = getSupabase();
      const limit = parseInt(req.query.limit as string) || 100;
      const instance = req.query.instance as string | undefined;

      // Select only needed columns - exclude bulky execution_data and workflow_data
      let query = client
        .from("n8n_execution_logs")
        .select("id, execution_id, workflow_id, workflow_name, status, finished, started_at, finished_at, duration_ms, mode, node_count, error_message, created_at, n8n_instance")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (instance) {
        query = query.eq("n8n_instance", instance);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data || []);
    } catch (error) {
      console.error("Error fetching executions:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch executions"
      });
    }
  });

  // Get execution statistics
  app.get("/api/executions/stats", async (req, res) => {
    try {
      const client = getSupabase();
      const instance = req.query.instance as string | undefined;

      let query = client
        .from("n8n_execution_logs")
        .select("status, duration_ms");

      if (instance) {
        query = query.eq("n8n_instance", instance);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      const executions = data || [];
      const totalExecutions = executions.length;
      const successCount = executions.filter(e => e.status === "success").length;
      const errorCount = executions.filter(e => e.status === "error").length;
      const runningCount = executions.filter(e => e.status === "running").length;
      const waitingCount = executions.filter(e => e.status === "waiting").length;
      const canceledCount = executions.filter(e => e.status === "canceled").length;

      const durationsWithValues = executions
        .filter(e => e.duration_ms !== null)
        .map(e => e.duration_ms as number);

      const avgDurationMs = durationsWithValues.length > 0
        ? Math.round(durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length)
        : 0;

      const successRate = totalExecutions > 0
        ? (successCount / totalExecutions) * 100
        : 0;

      res.json({
        totalExecutions,
        successCount,
        errorCount,
        runningCount,
        waitingCount,
        canceledCount,
        avgDurationMs,
        successRate,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch statistics"
      });
    }
  });

  // Get daily execution statistics for chart
  app.get("/api/executions/daily", async (req, res) => {
    try {
      const client = getSupabase();
      const days = parseInt(req.query.days as string) || 14;
      const instance = req.query.instance as string | undefined;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = client
        .from("n8n_execution_logs")
        .select("created_at, status")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (instance) {
        query = query.eq("n8n_instance", instance);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Group by date
      const dailyMap = new Map<string, { total: number; success: number; error: number }>();

      // Initialize all dates in range
      for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const dateStr = date.toISOString().split("T")[0];
        dailyMap.set(dateStr, { total: 0, success: 0, error: 0 });
      }

      // Aggregate data
      (data || []).forEach(execution => {
        const dateStr = new Date(execution.created_at).toISOString().split("T")[0];
        const existing = dailyMap.get(dateStr) || { total: 0, success: 0, error: 0 };
        existing.total++;
        if (execution.status === "success") {
          existing.success++;
        } else if (execution.status === "error") {
          existing.error++;
        }
        dailyMap.set(dateStr, existing);
      });

      const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: stats.total,
        success: stats.success,
        error: stats.error,
      }));

      res.json(dailyStats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch daily statistics"
      });
    }
  });

  // Get workflow statistics
  app.get("/api/executions/workflows", async (req, res) => {
    try {
      const client = getSupabase();
      const instance = req.query.instance as string | undefined;

      let query = client
        .from("n8n_execution_logs")
        .select("workflow_name, status, duration_ms");

      if (instance) {
        query = query.eq("n8n_instance", instance);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Group by workflow
      const workflowMap = new Map<string, {
        total_executions: number;
        successful: number;
        failed: number;
        durations: number[];
      }>();

      (data || []).forEach(execution => {
        const name = execution.workflow_name;
        const existing = workflowMap.get(name) || {
          total_executions: 0,
          successful: 0,
          failed: 0,
          durations: [],
        };

        existing.total_executions++;
        if (execution.status === "success") existing.successful++;
        if (execution.status === "error") existing.failed++;
        if (execution.duration_ms !== null) {
          existing.durations.push(execution.duration_ms);
        }

        workflowMap.set(name, existing);
      });

      const workflowStats = Array.from(workflowMap.entries()).map(([name, stats]) => ({
        workflow_name: name,
        total_executions: stats.total_executions,
        successful: stats.successful,
        failed: stats.failed,
        avg_duration_ms: stats.durations.length > 0
          ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
          : 0,
      }));

      res.json(workflowStats);
    } catch (error) {
      console.error("Error fetching workflow stats:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch workflow statistics"
      });
    }
  });

  return httpServer;
}
