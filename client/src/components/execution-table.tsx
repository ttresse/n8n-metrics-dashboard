import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams, RowClickedEvent, themeQuartz } from "ag-grid-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme-provider";
import { buildN8nExecutionUrl, formatInstanceForDisplay } from "@/lib/instance-config";
import type { ExecutionLog } from "@shared/schema";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AlertCircle, ExternalLink, Loader2, Clock, Calendar, Hash, Workflow, Play, CheckCircle2, XCircle, Timer, Server } from "lucide-react";
import { ExecutionFiltersBar, type ExecutionFilters, getInstanceColor } from "./execution-filters";

interface ExecutionTableProps {
  data: ExecutionLog[];
  isLoading?: boolean;
  error?: string | null;
  filters: ExecutionFilters;
  onFiltersChange: (filters: ExecutionFilters) => void;
}

const statusLabels: Record<string, string> = {
  success: "success",
  error: "error",
  running: "running",
  waiting: "waiting",
  canceled: "canceled",
};

const StatusCellRenderer = (params: ICellRendererParams) => {
  const status = params.value as string;
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    success: "default",
    error: "destructive",
    running: "secondary",
    waiting: "outline",
    canceled: "secondary",
  };

  const colors: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    running: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    waiting: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    canceled: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  };

  return (
    <Badge
      variant={variants[status] || "secondary"}
      className={`${colors[status] || ""} font-medium capitalize`}
    >
      {statusLabels[status] || status}
    </Badge>
  );
};

const DateCellRenderer = (params: ICellRendererParams) => {
  if (!params.value) return <span className="text-muted-foreground">-</span>;
  try {
    return (
      <span className="text-sm">
        {format(new Date(params.value), "MMM dd, yyyy HH:mm:ss")}
      </span>
    );
  } catch {
    return <span className="text-muted-foreground">Invalid date</span>;
  }
};

const DurationCellRenderer = (params: ICellRendererParams) => {
  const ms = params.value as number | null;
  if (ms === null || ms === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  if (ms < 1000) {
    return <span>{Math.round(ms)}ms</span>;
  }
  if (ms < 60000) {
    return <span>{Math.round(ms / 1000)}s</span>;
  }
  return <span>{Math.round(ms / 60000)}m</span>;
};

const OpenCellRenderer = (params: ICellRendererParams<ExecutionLog>) => {
  const data = params.data;
  if (!data?.workflow_id || !data?.execution_id) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Use instance field directly as the base URL
  const url = buildN8nExecutionUrl(
    data.n8n_instance,
    data.workflow_id,
    data.execution_id
  );

  if (!url) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground text-xs cursor-help">
            No instance
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>No instance URL defined for this execution</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-primary hover:text-primary"
      onClick={() => window.open(url, "_blank")}
      data-testid={`button-open-execution-${data.execution_id}`}
    >
      <ExternalLink className="h-4 w-4 mr-1" />
      Open
    </Button>
  );
};

const ErrorCellRenderer = (params: ICellRendererParams) => {
  const errorMessage = params.value as string | null;

  if (!errorMessage) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span
      className="text-red-600 dark:text-red-400 truncate block cursor-help"
      title={errorMessage}
    >
      {errorMessage}
    </span>
  );
};

const InstanceCellRenderer = (params: ICellRendererParams) => {
  const instance = params.value as string | null;

  if (!instance) {
    return <span className="text-muted-foreground">-</span>;
  }

  const displayValue = formatInstanceForDisplay(instance);

  return (
    <Badge
      variant="outline"
      className={`${getInstanceColor(instance)} font-medium`}
    >
      {displayValue}
    </Badge>
  );
};

const lightTheme = themeQuartz.withParams({
  backgroundColor: "#ffffff",
  headerBackgroundColor: "#f4f4f5",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#f4f4f5",
  borderColor: "#e4e4e7",
  headerTextColor: "#09090b",
  textColor: "#09090b",
  fontSize: 14,
  headerHeight: 48,
  rowHeight: 48,
});

const darkTheme = themeQuartz.withParams({
  backgroundColor: "#18181b",
  headerBackgroundColor: "#27272a",
  oddRowBackgroundColor: "#18181b",
  rowHoverColor: "#27272a",
  borderColor: "#3f3f46",
  headerTextColor: "#fafafa",
  textColor: "#fafafa",
  fontSize: 14,
  headerHeight: 48,
  rowHeight: 48,
});

const formatDuration = (ms: number | null) => {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM dd, yyyy 'at' HH:mm:ss");
  } catch {
    return "Invalid date";
  }
};

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const DetailRow = ({ icon, label, value }: DetailRowProps) => (
  <div className="flex items-start gap-3 py-2">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
      <div className="text-sm mt-0.5 break-words">{value}</div>
    </div>
  </div>
);

export function ExecutionTable({ data, isLoading, error, filters, onFiltersChange }: ExecutionTableProps) {
  const { resolvedTheme } = useTheme();
  const [selectedExecution, setSelectedExecution] = useState<ExecutionLog | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Status filter
      if (filters.statusFilter && item.status !== filters.statusFilter) {
        return false;
      }

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
  }, [data, filters]);

  const handleRowClicked = useCallback((event: RowClickedEvent<ExecutionLog>) => {
    if (event.data) {
      setSelectedExecution(event.data);
      setIsSheetOpen(true);
    }
  }, []);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Open",
        field: "execution_id",
        cellRenderer: OpenCellRenderer,
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        field: "n8n_instance",
        headerName: "Instance",
        flex: 1,
        minWidth: 120,
        cellRenderer: InstanceCellRenderer,
        filter: true,
        sortable: true,
      },
      {
        field: "workflow_name",
        headerName: "Workflow",
        flex: 2,
        minWidth: 200,
        filter: true,
        sortable: true,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 120,
        cellRenderer: StatusCellRenderer,
        filter: true,
        sortable: true,
      },
      {
        field: "started_at",
        headerName: "Started",
        flex: 1.5,
        minWidth: 180,
        cellRenderer: DateCellRenderer,
        sortable: true,
      },
      {
        field: "finished_at",
        headerName: "Finished",
        flex: 1.5,
        minWidth: 180,
        cellRenderer: DateCellRenderer,
        sortable: true,
      },
      {
        field: "duration_ms",
        headerName: "Duration",
        flex: 1,
        minWidth: 100,
        cellRenderer: DurationCellRenderer,
        sortable: true,
      },
      {
        field: "mode",
        headerName: "Mode",
        flex: 1,
        minWidth: 100,
        filter: true,
        sortable: true,
        valueFormatter: (params) => params.value || "-",
      },
      {
        field: "node_count",
        headerName: "Nodes",
        flex: 0.7,
        minWidth: 80,
        sortable: true,
        valueFormatter: (params) =>
          params.value !== null ? params.value : "-",
      },
      {
        field: "error_message",
        headerName: "Error",
        flex: 2,
        minWidth: 200,
        cellRenderer: ErrorCellRenderer,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
    }),
    []
  );

  const getRowClass = useCallback((params: { data: ExecutionLog | undefined }) => {
    const classes = ["cursor-pointer"];
    if (params.data?.status === "error") {
      classes.push("bg-red-500/5");
    }
    return classes.join(" ");
  }, []);

  const gridTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <span className="text-sm font-medium">Unable to load execution logs</span>
            <span className="text-xs max-w-md text-center">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    success: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600 dark:text-emerald-400" },
    error: { icon: <XCircle className="h-4 w-4" />, color: "text-red-600 dark:text-red-400" },
    running: { icon: <Play className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400" },
    waiting: { icon: <Clock className="h-4 w-4" />, color: "text-amber-600 dark:text-amber-400" },
    canceled: { icon: <XCircle className="h-4 w-4" />, color: "text-gray-600 dark:text-gray-400" },
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Execution Log
            {filteredData.length !== data.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredData.length} of {data.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionFiltersBar
            data={data}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          <div className="h-[500px] w-full" data-testid="execution-table">
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowClass={getRowClass}
              onRowClicked={handleRowClicked}
              animateRows={true}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50, 100]}
              domLayout="normal"
              suppressMovableColumns={true}
              theme={gridTheme}
              localeText={{
                page: "Page",
                of: "of",
                to: "to",
                pageSizeSelectorLabel: "Rows per page:",
                ariaPageSizeSelectorLabel: "Rows per page",
                firstPage: "First page",
                previousPage: "Previous page",
                nextPage: "Next page",
                lastPage: "Last page",
                noRowsToShow: "No data to display",
                loading: "Loading...",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Execution Details
            </SheetTitle>
            <SheetDescription>
              {selectedExecution?.workflow_name || "Unknown workflow"}
            </SheetDescription>
          </SheetHeader>

          {selectedExecution && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-6">
                {/* Status Section */}
                <div className="flex items-center gap-2 py-3">
                  <Badge
                    className={`${
                      selectedExecution.status === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : selectedExecution.status === "error"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : selectedExecution.status === "running"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : selectedExecution.status === "waiting"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                    } font-medium capitalize text-sm px-3 py-1`}
                  >
                    {statusConfig[selectedExecution.status]?.icon}
                    <span className="ml-1.5">{statusLabels[selectedExecution.status] || selectedExecution.status}</span>
                  </Badge>
                </div>

                <Separator />

                {/* Execution Info */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">General Information</h4>

                  <DetailRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Execution ID"
                    value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedExecution.execution_id}</code>}
                  />

                  <DetailRow
                    icon={<Server className="h-4 w-4" />}
                    label="Instance"
                    value={
                      selectedExecution.n8n_instance ? (
                        <Badge variant="outline" className={`${getInstanceColor(selectedExecution.n8n_instance)} font-medium`}>
                          {formatInstanceForDisplay(selectedExecution.n8n_instance)}
                        </Badge>
                      ) : "-"
                    }
                  />

                  <DetailRow
                    icon={<Workflow className="h-4 w-4" />}
                    label="Workflow"
                    value={
                      <div>
                        <div>{selectedExecution.workflow_name}</div>
                        <code className="text-xs text-muted-foreground">{selectedExecution.workflow_id}</code>
                      </div>
                    }
                  />

                  <DetailRow
                    icon={<Play className="h-4 w-4" />}
                    label="Mode"
                    value={selectedExecution.mode || "-"}
                  />

                  <DetailRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Node count"
                    value={selectedExecution.node_count !== null ? selectedExecution.node_count : "-"}
                  />
                </div>

                <Separator />

                {/* Timing Info */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">Timing</h4>

                  <DetailRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Started"
                    value={formatDate(selectedExecution.started_at)}
                  />

                  <DetailRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Finished"
                    value={formatDate(selectedExecution.finished_at)}
                  />

                  <DetailRow
                    icon={<Timer className="h-4 w-4" />}
                    label="Duration"
                    value={formatDuration(selectedExecution.duration_ms)}
                  />
                </div>

                {/* Error Message */}
                {selectedExecution.error_message && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Error Message
                      </h4>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mt-2">
                        <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words font-mono">
                          {selectedExecution.error_message}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* Execution Data */}
                {selectedExecution.execution_data && Object.keys(selectedExecution.execution_data).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">Execution Data</h4>
                      <div className="bg-muted rounded-md p-3 mt-2">
                        <pre className="text-xs whitespace-pre-wrap break-words font-mono overflow-x-auto">
                          {JSON.stringify(selectedExecution.execution_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* Workflow Data */}
                {selectedExecution.workflow_data && Object.keys(selectedExecution.workflow_data).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">Workflow Data</h4>
                      <div className="bg-muted rounded-md p-3 mt-2">
                        <pre className="text-xs whitespace-pre-wrap break-words font-mono overflow-x-auto">
                          {JSON.stringify(selectedExecution.workflow_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* Open in n8n Button */}
                {selectedExecution.workflow_id && selectedExecution.execution_id && (() => {
                  const executionUrl = buildN8nExecutionUrl(
                    selectedExecution.n8n_instance,
                    selectedExecution.workflow_id,
                    selectedExecution.execution_id
                  );

                  if (!executionUrl) return null;

                  return (
                    <>
                      <Separator />
                      <Button
                        className="w-full"
                        onClick={() => window.open(executionUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in n8n
                      </Button>
                    </>
                  );
                })()}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
