import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrganizationLog } from "@shared/schema";
import { 
  History as HistoryIcon,
  FolderOutput,
  Copy,
  ArrowRightLeft,
  AlertTriangle,
  Undo2,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const { data: logs, isLoading } = useQuery<OrganizationLog[]>({
    queryKey: ["/api/organization-logs"],
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "copy":
        return <Copy className="h-4 w-4 text-chart-1" />;
      case "move":
        return <ArrowRightLeft className="h-4 w-4 text-chart-2" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "undo":
        return <Undo2 className="h-4 w-4 text-chart-4" />;
      default:
        return <FolderOutput className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "copy":
        return <Badge variant="secondary" className="bg-chart-1/20 text-chart-1">Copy</Badge>;
      case "move":
        return <Badge variant="secondary" className="bg-chart-2/20 text-chart-2">Move</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "undo":
        return <Badge variant="secondary" className="bg-chart-4/20 text-chart-4">Undo</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatPath = (path: string | null) => {
    if (!path) return "—";
    const parts = path.split("/");
    if (parts.length > 4) {
      return `.../${parts.slice(-3).join("/")}`;
    }
    return path;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity History</h1>
        <p className="text-muted-foreground">View recent file organization operations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Recent Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover-elevate"
                  data-testid={`log-entry-${log.id}`}
                >
                  <div className="mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="text-xs text-muted-foreground">
                        {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm") : "—"}
                      </span>
                    </div>
                    
                    {log.error ? (
                      <p className="text-sm text-destructive">{log.error}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-muted-foreground truncate" title={log.sourcePath || undefined}>
                          {formatPath(log.sourcePath)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate" title={log.destinationPath || undefined}>
                          {formatPath(log.destinationPath)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HistoryIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Organization operations will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
