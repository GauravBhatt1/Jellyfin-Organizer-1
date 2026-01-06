import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressCard } from "@/components/progress-card";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScanJob, Settings } from "@shared/schema";
import { Search, FolderOpen, Play, AlertCircle, Loader2 } from "lucide-react";

export default function Scanner() {
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();
  const [activeScan, setActiveScan] = useState<ScanJob | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: recentScans, isLoading: scansLoading } = useQuery<ScanJob[]>({
    queryKey: ["/api/scan/recent"],
  });

  const startScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scan");
      return res.json();
    },
    onSuccess: (data) => {
      setActiveScan({ ...data, status: "running" });
      queryClient.invalidateQueries({ queryKey: ["/api/scan/recent"] });
      toast({ title: "Scan started", description: "Media library scan has begun." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Scan failed", 
        description: error.message || "Failed to start scan.", 
        variant: "destructive" 
      });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/scan/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      toast({ 
        title: "Scan completed", 
        description: `Scan finished with status: ${lastMessage.data.status}` 
      });
    }
  }, [lastMessage, toast]);

  const hasSourceFolders = settings?.sourceFolders && settings.sourceFolders.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Scanner</h1>
        <p className="text-muted-foreground">Scan your media library for new files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Start Scan
          </CardTitle>
          <CardDescription>
            Scan configured source folders for media files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : !hasSourceFolders ? (
            <div className="flex items-start gap-3 p-4 rounded-md bg-chart-4/10 border border-chart-4/30">
              <AlertCircle className="h-5 w-5 text-chart-4 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-chart-4">No source folders configured</p>
                <p className="text-sm text-muted-foreground">
                  Go to Settings to add source folders before scanning.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Source Folders</p>
                <div className="flex flex-wrap gap-2">
                  {settings?.sourceFolders?.map((folder, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="font-mono text-xs"
                      data-testid={`badge-folder-${index}`}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {folder}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => startScanMutation.mutate()}
                disabled={startScanMutation.isPending || activeScan !== null}
                className="gap-2"
                data-testid="button-start-scan"
              >
                {startScanMutation.isPending || activeScan ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {activeScan ? "Scan in progress..." : "Start Scan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {activeScan && (
        <ProgressCard
          title="Current Scan"
          status={activeScan.status}
          processedFiles={activeScan.processedFiles}
          totalFiles={activeScan.totalFiles}
          currentItem={activeScan.currentFolder || undefined}
          newItems={activeScan.newItems}
          errorsCount={activeScan.errorsCount}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Scan History</CardTitle>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : recentScans && recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 rounded-md border"
                  data-testid={`row-scan-${scan.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${
                      scan.status === "completed" ? "bg-chart-2" : 
                      scan.status === "failed" ? "bg-destructive" : 
                      scan.status === "running" ? "bg-chart-4 animate-pulse" :
                      "bg-muted-foreground"
                    }`} />
                    <div>
                      <p className="font-medium">
                        {scan.status === "completed" ? "Completed" : 
                         scan.status === "failed" ? "Failed" : 
                         scan.status === "running" ? "Running" : "Pending"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scan.processedFiles} / {scan.totalFiles} files processed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-chart-2">{scan.newItems}</p>
                      <p className="text-xs text-muted-foreground">New</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-destructive">{scan.errorsCount}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(scan.startedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scans yet. Start your first scan above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
