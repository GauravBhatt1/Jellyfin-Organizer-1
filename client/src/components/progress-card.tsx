import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ProgressCardProps {
  title: string;
  status: string;
  processedFiles: number;
  totalFiles: number;
  currentItem?: string;
  successCount?: number;
  failedCount?: number;
  newItems?: number;
  errorsCount?: number;
}

export function ProgressCard({
  title,
  status,
  processedFiles,
  totalFiles,
  currentItem,
  successCount,
  failedCount,
  newItems,
  errorsCount,
}: ProgressCardProps) {
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
  const isRunning = status === "running";

  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-chart-2/20 text-chart-2">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className={isRunning ? "border-l-4 border-l-primary" : ""}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{processedFiles} / {totalFiles}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentItem && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Current:</span>
            <p className="text-xs font-mono truncate max-w-md bg-muted/50 px-2 py-1 rounded" data-testid="text-current-item">
              {currentItem}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          {typeof newItems === "number" && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">New:</span>
              <span className="font-medium text-chart-2" data-testid="stat-new-items">{newItems}</span>
            </div>
          )}
          {typeof successCount === "number" && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Success:</span>
              <span className="font-medium text-chart-2" data-testid="stat-success">{successCount}</span>
            </div>
          )}
          {(typeof errorsCount === "number" || typeof failedCount === "number") && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Errors:</span>
              <span className="font-medium text-destructive" data-testid="stat-errors">{errorsCount ?? failedCount}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
