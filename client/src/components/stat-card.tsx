import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "success" | "warning" | "error";
}

export function StatCard({ title, value, icon: Icon, description, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "text-muted-foreground",
    success: "text-chart-2",
    warning: "text-chart-4",
    error: "text-destructive",
  };

  return (
    <Card className="relative overflow-visible">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`${variantStyles[variant]} opacity-60`}>
            <Icon className="h-12 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
