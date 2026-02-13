import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "error" | "warning";
  onClick?: () => void;
  isActive?: boolean;
}

const variantStyles = {
  default: "text-primary",
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
};

const variantBgStyles = {
  default: "bg-primary/10",
  success: "bg-emerald-500/10",
  error: "bg-red-500/10",
  warning: "bg-amber-500/10",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  onClick,
  isActive,
}: StatCardProps) {
  return (
    <Card
      className={`shadow-sm ${onClick ? "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" : ""} ${isActive ? "ring-2 ring-primary ring-offset-2" : ""}`}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${variantBgStyles[variant]} ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              vs previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
