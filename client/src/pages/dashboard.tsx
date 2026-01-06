import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { ProgressCard } from "@/components/progress-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/lib/websocket";
import { useEffect, useState } from "react";
import type { Stats, ScanJob, OrganizeJob } from "@shared/schema";
import { 
  Film, 
  Tv, 
  Clock, 
  CheckCircle, 
  Copy, 
  AlertTriangle,
  FolderOpen,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { lastMessage } = useWebSocket();
  const [activeScan, setActiveScan] = useState<ScanJob | null>(null);
  const [activeOrganize, setActiveOrganize] = useState<OrganizeJob | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentScans } = useQuery<ScanJob[]>({
    queryKey: ["/api/scan/recent"],
  });

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "scan:progress") {
      setActiveScan((prev) => ({
        ...prev,
        id: lastMessage.data.jobId,
        status: "running",
        totalFiles: lastMessage.data.totalFiles,
        processedFiles: lastMessage.data.processedFiles,
        currentFolder: lastMessage.data.currentFolder,
        newItems: lastMessage.data.newItems,
        errorsCount: lastMessage.data.errorsCount,
      } as ScanJob));
    } else if (lastMessage.type === "scan:done") {
      setActiveScan(null);
    } else if (lastMessage.type === "organize:progress") {
      setActiveOrganize((prev) => ({
        ...prev,
        id: lastMessage.data.jobId,
        status: "running",
        totalFiles: lastMessage.data.totalFiles,
        processedFiles: lastMessage.data.processedFiles,
        currentFile: lastMessage.data.currentFile,
        successCount: lastMessage.data.successCount,
        failedCount: lastMessage.data.failedCount,
      } as OrganizeJob));
    } else if (lastMessage.type === "organize:done") {
      setActiveOrganize(null);
    }
  }, [lastMessage]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your media library</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Total Items"
              value={stats.total}
              icon={FolderOpen}
              description="Media files discovered"
            />
            <StatCard
              title="Organized"
              value={stats.organized}
              icon={CheckCircle}
              variant="success"
              description="Successfully organized"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={Clock}
              variant="warning"
              description="Awaiting organization"
            />
            <StatCard
              title="Duplicates"
              value={stats.duplicates}
              icon={Copy}
              description="Duplicate files found"
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              title="TV Shows"
              value={stats.tvShows}
              icon={Tv}
              description="Series detected"
            />
            <StatCard
              title="Movies"
              value={stats.movies}
              icon={Film}
              description="Films detected"
            />
            <StatCard
              title="Errors"
              value={stats.errors}
              icon={AlertTriangle}
              variant="error"
              description="Files with errors"
            />
          </>
        ) : null}
      </div>

      {(activeScan || activeOrganize) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Active Jobs
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeScan && (
              <ProgressCard
                title="Scanning"
                status={activeScan.status}
                processedFiles={activeScan.processedFiles}
                totalFiles={activeScan.totalFiles}
                currentItem={activeScan.currentFolder || undefined}
                newItems={activeScan.newItems}
                errorsCount={activeScan.errorsCount}
              />
            )}
            {activeOrganize && (
              <ProgressCard
                title="Organizing"
                status={activeOrganize.status}
                processedFiles={activeOrganize.processedFiles}
                totalFiles={activeOrganize.totalFiles}
                currentItem={activeOrganize.currentFile || undefined}
                successCount={activeOrganize.successCount}
                failedCount={activeOrganize.failedCount}
              />
            )}
          </div>
        </div>
      )}

      {recentScans && recentScans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.slice(0, 5).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`scan-history-${scan.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      scan.status === "completed" ? "bg-chart-2" : 
                      scan.status === "failed" ? "bg-destructive" : 
                      "bg-chart-4"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {scan.totalFiles} files scanned
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scan.newItems} new items, {scan.errorsCount} errors
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(scan.startedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
