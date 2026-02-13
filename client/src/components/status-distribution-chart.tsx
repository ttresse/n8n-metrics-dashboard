import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { ExecutionStats } from "@shared/schema";
import { AlertCircle, Loader2 } from "lucide-react";

interface StatusDistributionChartProps {
  stats: ExecutionStats | null;
  isLoading?: boolean;
  error?: string | null;
}

const COLORS = {
  success: "hsl(142, 71%, 45%)",
  error: "hsl(0, 84%, 60%)",
  running: "hsl(217, 91%, 60%)",
  waiting: "hsl(38, 92%, 50%)",
  canceled: "hsl(220, 9%, 46%)",
};

export function StatusDistributionChart({
  stats,
  isLoading,
  error,
}: StatusDistributionChartProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
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
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <span className="text-sm">Unable to load data</span>
            <span className="text-xs max-w-xs text-center">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = stats
    ? [
        { name: "Success", value: stats.successCount, color: COLORS.success },
        { name: "Error", value: stats.errorCount, color: COLORS.error },
        { name: "Running", value: stats.runningCount, color: COLORS.running },
        { name: "Waiting", value: stats.waitingCount, color: COLORS.waiting },
        { name: "Canceled", value: stats.canceledCount, color: COLORS.canceled },
      ].filter((item) => item.value > 0)
    : [];

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <span className="text-muted-foreground">No execution data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-lg)",
                }}
                formatter={(value: number) => [value, "Executions"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
