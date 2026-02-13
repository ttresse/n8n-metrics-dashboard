import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ExecutionLog } from "@shared/schema";
import type { DateRange } from "react-day-picker";

export interface ExecutionFilters {
  instanceFilter: string | null;
  statusFilter: string | null;
  workflowFilter: string | null;
  modeFilter: string | null;
  dateRange: DateRange | undefined;
}

interface ExecutionFiltersBarProps {
  data: ExecutionLog[];
  filters: ExecutionFilters;
  onFiltersChange: (filters: ExecutionFilters) => void;
}

const statusLabels: Record<string, string> = {
  success: "Success",
  error: "Error",
  running: "Running",
  waiting: "Waiting",
  canceled: "Canceled",
};

const instanceColors: Record<string, string> = {
  production: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  prod: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  staging: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  stage: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  development: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  dev: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  default: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

export function getInstanceColor(instance: string | null): string {
  if (!instance) return instanceColors.default;
  const normalized = instance.toLowerCase();
  return instanceColors[normalized] || "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
}

export function ExecutionFiltersBar({
  data,
  filters,
  onFiltersChange,
}: ExecutionFiltersBarProps) {
  const uniqueWorkflows = useMemo(() => {
    const workflows = new Set<string>();
    data.forEach((item) => {
      if (item.workflow_name) {
        workflows.add(item.workflow_name);
      }
    });
    return Array.from(workflows).sort();
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    data.forEach((item) => {
      if (item.status) {
        statuses.add(item.status);
      }
    });
    return Array.from(statuses).sort();
  }, [data]);

  const uniqueModes = useMemo(() => {
    const modes = new Set<string>();
    data.forEach((item) => {
      if (item.mode) {
        modes.add(item.mode);
      }
    });
    return Array.from(modes).sort();
  }, [data]);

  const hasActiveFilters =
    filters.instanceFilter ||
    filters.statusFilter ||
    filters.workflowFilter ||
    filters.modeFilter ||
    filters.dateRange?.from;

  const activeFilterCount = [
    filters.instanceFilter,
    filters.statusFilter,
    filters.workflowFilter,
    filters.modeFilter,
    filters.dateRange?.from,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      instanceFilter: null,
      statusFilter: null,
      workflowFilter: null,
      modeFilter: null,
      dateRange: undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.dateRange?.from ? "default" : "outline"}
            size="sm"
            className="h-8 gap-2"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {filters.dateRange?.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "MMM dd")} -{" "}
                  {format(filters.dateRange.to, "MMM dd")}
                </>
              ) : (
                format(filters.dateRange.from, "MMM dd, yyyy")
              )
            ) : (
              "Date range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.dateRange?.from}
            selected={filters.dateRange}
            onSelect={(range) =>
              onFiltersChange({ ...filters, dateRange: range })
            }
            numberOfMonths={2}
          />
          {filters.dateRange?.from && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() =>
                  onFiltersChange({ ...filters, dateRange: undefined })
                }
              >
                Clear range
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Workflow Filter */}
      <Select
        value={filters.workflowFilter || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            workflowFilter: value === "all" ? null : value,
          })
        }
      >
        <SelectTrigger
          className={`h-8 w-[180px] ${filters.workflowFilter ? "border-primary" : ""}`}
        >
          <SelectValue placeholder="Workflow" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Workflows</SelectItem>
          {uniqueWorkflows.map((workflow) => (
            <SelectItem key={workflow} value={workflow}>
              {workflow}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.statusFilter || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            statusFilter: value === "all" ? null : value,
          })
        }
      >
        <SelectTrigger
          className={`h-8 w-[140px] ${filters.statusFilter ? "border-primary" : ""}`}
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {uniqueStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status] || status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Mode Filter */}
      <Select
        value={filters.modeFilter || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            modeFilter: value === "all" ? null : value,
          })
        }
      >
        <SelectTrigger
          className={`h-8 w-[140px] ${filters.modeFilter ? "border-primary" : ""}`}
        >
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modes</SelectItem>
          {uniqueModes.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {mode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          onClick={resetFilters}
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
