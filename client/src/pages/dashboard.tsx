import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  Timer,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/stat-card";
import { ExecutionChart } from "@/components/execution-chart";
import { StatusDistributionChart } from "@/components/status-distribution-chart";
import { ExecutionTable } from "@/components/execution-table";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExecutionLog, ExecutionStats, DailyStats } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { formatInstanceForDisplay } from "@/lib/instance-config";
import type { ExecutionFilters } from "@/components/execution-filters";

type RefreshInterval = "manual" | "10s" | "1m" | "5m";

const REFRESH_INTERVALS: Record<RefreshInterval, { label: string; ms: number | null }> = {
  manual: { label: "Manual", ms: null },
  "10s": { label: "10 seconds", ms: 10000 },
  "1m": { label: "1 minute", ms: 60000 },
  "5m": { label: "5 minutes", ms: 300000 },
};

export default function Dashboard() {
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>("manual");
  const [filters, setFilters] = useState<ExecutionFilters>({
    instanceFilter: null,
    statusFilter: null,
    workflowFilter: null,
    modeFilter: null,
    dateRange: undefined,
  });

  const handleStatusClick = (status: string) => {
    if (filters.statusFilter === status) {
      setFilters({ ...filters, statusFilter: null });
    } else {
      setFilters({ ...filters, statusFilter: status });
    }
  };

  const { data: instances = [] } = useQuery<string[]>({
    queryKey: ["/api/instances"],
    staleTime: 60000,
  });

  const instanceQueryParam = filters.instanceFilter ? `?instance=${encodeURIComponent(filters.instanceFilter)}` : "";

  const {
    data: executions,
    isLoading: executionsLoading,
    isFetching: executionsFetching,
    error: executionsError,
    refetch: refetchExecutions,
  } = useQuery<ExecutionLog[]>({
    queryKey: ["/api/executions", filters.instanceFilter],
    queryFn: async () => {
      const res = await fetch(`/api/executions${instanceQueryParam}`);
      if (!res.ok) throw new Error("Failed to fetch executions");
      return res.json();
    },
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
  } = useQuery<ExecutionStats>({
    queryKey: ["/api/executions/stats", filters.instanceFilter],
    queryFn: async () => {
      const res = await fetch(`/api/executions/stats${instanceQueryParam}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const {
    data: dailyStats,
    isLoading: dailyLoading,
    isFetching: dailyFetching,
    error: dailyError,
  } = useQuery<DailyStats[]>({
    queryKey: ["/api/executions/daily", filters.instanceFilter],
    queryFn: async () => {
      const res = await fetch(`/api/executions/daily${instanceQueryParam}`);
      if (!res.ok) throw new Error("Failed to fetch daily stats");
      return res.json();
    },
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/instances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/executions", filters.instanceFilter] });
    queryClient.invalidateQueries({ queryKey: ["/api/executions/stats", filters.instanceFilter] });
    queryClient.invalidateQueries({ queryKey: ["/api/executions/daily", filters.instanceFilter] });
    refetchExecutions();
  }, [refetchExecutions, filters.instanceFilter]);

  useEffect(() => {
    const intervalMs = REFRESH_INTERVALS[refreshInterval].ms;
    if (!intervalMs) return;

    const intervalId = setInterval(handleRefresh, intervalMs);
    return () => clearInterval(intervalId);
  }, [refreshInterval, handleRefresh]);

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return "0ms";
    return `${Math.round(ms)}ms`;
  };

  // Calculate filtered stats based on filters
  // Counts are filtered by workflow, mode, dateRange (NOT status)
  // avgDurationMs is filtered by ALL filters including status
  const filteredStats = useMemo<ExecutionStats | null>(() => {
    const hasCountFilters = filters.workflowFilter || filters.modeFilter || filters.dateRange;
    const hasAnyFilters = hasCountFilters || filters.statusFilter;

    if (!hasAnyFilters || !executions) {
      return stats ?? null;
    }

    // Filter for counts (excludes statusFilter)
    const filteredForCounts = executions.filter((item) => {
      // Workflow filter
      if (filters.workflowFilter && item.workflow_name !== filters.workflowFilter) {
        return false;
      }

      // Mode filter
      if (filters.modeFilter && item.mode !== filters.modeFilter) {
        return false;
      }

      // Date range filter
      if (filters.dateRange?.from && item.started_at) {
        const itemDate = new Date(item.started_at);
        const from = startOfDay(filters.dateRange.from);
        const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

        if (!isWithinInterval(itemDate, { start: from, end: to })) {
          return false;
        }
      }

      return true;
    });

    // Filter for duration (includes ALL filters)
    const filteredForDuration = filters.statusFilter
      ? filteredForCounts.filter((item) => item.status === filters.statusFilter)
      : filteredForCounts;

    // Calculate counts from filteredForCounts (without status filter)
    const successCount = filteredForCounts.filter((e) => e.status === "success").length;
    const errorCount = filteredForCounts.filter((e) => e.status === "error").length;
    const runningCount = filteredForCounts.filter((e) => e.status === "running").length;
    const waitingCount = filteredForCounts.filter((e) => e.status === "waiting").length;
    const canceledCount = filteredForCounts.filter((e) => e.status === "canceled").length;

    // Calculate avgDurationMs from filteredForDuration (with ALL filters)
    const durations = filteredForDuration
      .filter((e) => e.duration_ms !== null)
      .map((e) => e.duration_ms as number);
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const totalExecutions = filteredForCounts.length;

    return {
      totalExecutions,
      successCount,
      errorCount,
      runningCount,
      waitingCount,
      canceledCount,
      avgDurationMs,
      successRate: totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0,
    };
  }, [executions, filters, stats]);

  // Calculate filtered daily stats based on filters (workflow, mode, dateRange - NOT status)
  const filteredDailyStats = useMemo<DailyStats[]>(() => {
    const hasActiveFilters = filters.workflowFilter || filters.modeFilter || filters.dateRange;

    if (!hasActiveFilters || !executions) {
      return dailyStats ?? [];
    }

    const filtered = executions.filter((item) => {
      // Workflow filter
      if (filters.workflowFilter && item.workflow_name !== filters.workflowFilter) {
        return false;
      }

      // Mode filter
      if (filters.modeFilter && item.mode !== filters.modeFilter) {
        return false;
      }

      // Date range filter
      if (filters.dateRange?.from && item.started_at) {
        const itemDate = new Date(item.started_at);
        const from = startOfDay(filters.dateRange.from);
        const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

        if (!isWithinInterval(itemDate, { start: from, end: to })) {
          return false;
        }
      }

      return true;
    });

    // Group by date
    const byDate = new Map<string, { total: number; success: number; error: number }>();

    filtered.forEach((e) => {
      if (!e.started_at) return;
      const date = format(new Date(e.started_at), "yyyy-MM-dd");
      const existing = byDate.get(date) || { total: 0, success: 0, error: 0 };
      existing.total += 1;
      if (e.status === "success") existing.success += 1;
      if (e.status === "error") existing.error += 1;
      byDate.set(date, existing);
    });

    return Array.from(byDate.entries())
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        success: counts.success,
        error: counts.error,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [executions, filters, dailyStats]);

  const isLoading = executionsLoading || statsLoading || dailyLoading;
  const isFetching = executionsFetching || statsFetching || dailyFetching;
  const hasError = executionsError || statsError || dailyError;
  
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return "An error occurred while fetching data";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  n8n Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Workflow monitoring and analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Environment Selector */}
              {instances.length > 0 && (
                <Select
                  value={filters.instanceFilter || "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      instanceFilter: value === "all" ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-[200px]">
                    <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All environments">
                      {filters.instanceFilter
                        ? formatInstanceForDisplay(filters.instanceFilter)
                        : "All environments"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {instances.map((instance) => (
                      <SelectItem key={instance} value={instance}>
                        {formatInstanceForDisplay(instance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  data-testid="button-refresh"
                  className="rounded-r-none border-r-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                  />
                  {refreshInterval === "manual" ? "Refresh" : REFRESH_INTERVALS[refreshInterval].label}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none px-2"
                      disabled={isFetching}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Auto-refresh
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={refreshInterval}
                      onValueChange={(value) => setRefreshInterval(value as RefreshInterval)}
                    >
                      <DropdownMenuRadioItem value="manual">
                        Manual
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        Automatic
                      </DropdownMenuLabel>
                      <DropdownMenuRadioItem value="10s">
                        Every 10 seconds
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="1m">
                        Every 1 minute
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="5m">
                        Every 5 minutes
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {hasError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Activity className="h-5 w-5" />
                <span className="font-medium">Connection issue</span>
              </div>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Unable to connect to the data source. Please verify that Supabase credentials are configured.
              </p>
            </div>
          )}

          <section>
            {(filters.instanceFilter || filters.workflowFilter) && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>
                  Filtered statistics for:{" "}
                  {filters.instanceFilter && (
                    <span className="font-medium text-foreground mr-2">
                      Instance: {filters.instanceFilter}
                    </span>
                  )}
                  {filters.instanceFilter && filters.workflowFilter && <span className="mr-2">|</span>}
                  {filters.workflowFilter && (
                    <span className="font-medium text-foreground">
                      Workflow: {filters.workflowFilter}
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Executions"
                value={statsLoading ? "..." : filteredStats?.totalExecutions ?? 0}
                description={filters.workflowFilter ? "For this workflow" : "Total executions"}
                icon={Activity}
                variant="default"
              />
              <StatCard
                title="Successful"
                value={statsLoading ? "..." : filteredStats?.successCount ?? 0}
                description={statsLoading ? "Loading..." : `${Math.round(filteredStats?.successRate ?? 0)}% success rate`}
                icon={CheckCircle2}
                variant="success"
                onClick={() => handleStatusClick("success")}
                isActive={filters.statusFilter === "success"}
              />
              <StatCard
                title="Failed"
                value={statsLoading ? "..." : filteredStats?.errorCount ?? 0}
                description="Requires attention"
                icon={XCircle}
                variant="error"
                onClick={() => handleStatusClick("error")}
                isActive={filters.statusFilter === "error"}
              />
              <StatCard
                title="Avg Duration"
                value={statsLoading ? "..." : formatDuration(filteredStats?.avgDurationMs)}
                description="Average execution time"
                icon={Clock}
                variant="default"
              />
            </div>
          </section>

          <section>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ExecutionChart
                  data={filteredDailyStats}
                  isLoading={dailyLoading}
                  error={dailyError ? getErrorMessage(dailyError) : null}
                />
              </div>
              <div>
                <StatusDistributionChart
                  stats={filteredStats}
                  isLoading={statsLoading}
                  error={statsError ? getErrorMessage(statsError) : null}
                />
              </div>
            </div>
          </section>

          <section>
            <ExecutionTable
              data={executions ?? []}
              isLoading={executionsLoading}
              error={executionsError ? getErrorMessage(executionsError) : null}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
