import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaItemRow } from "@/components/media-item-row";
import { EditMediaDialog } from "@/components/edit-media-dialog";
import { ProgressCard } from "@/components/progress-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MediaItem, OrganizeJob } from "@shared/schema";
import { 
  FolderOutput, 
  Search, 
  Filter, 
  Play, 
  Loader2,
  AlertTriangle 
} from "lucide-react";

export default function Organizer() {
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<MediaItem | null>(null);
  const [activeOrganize, setActiveOrganize] = useState<OrganizeJob | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (searchQuery) queryParams.set("search", searchQuery);
  if (confidenceFilter !== "all") queryParams.set("confidenceBelow", confidenceFilter);

  const { data: items, isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media-items", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/media-items?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const organizeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/organize", { ids });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveOrganize({ ...data, status: "running" });
      setSelectedIds(new Set());
      toast({ title: "Organization started", description: "Files are being organized." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Organization failed", 
        description: error.message || "Failed to start organization.", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/media-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Item deleted", description: "Media item has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const rescanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/media-items/${id}/rescan`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      toast({ title: "Marked for rescan", description: "Item will be rescanned on next scan." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark item for rescan.", variant: "destructive" });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/media-items/${id}/undo`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Undo successful", description: "File has been moved back to original location." });
    },
    onError: (error: Error) => {
      toast({ title: "Undo failed", description: error.message || "Failed to undo organize.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "organize:progress") {
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
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ 
        title: "Organization completed", 
        description: `Organization finished with status: ${lastMessage.data.status}` 
      });
    }
  }, [lastMessage, toast]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && items) {
      setSelectedIds(new Set(items.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const pendingItems = items?.filter(
    (item) => item.status === "pending" && selectedIds.has(item.id)
  );
  const canOrganize = pendingItems && pendingItems.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organizer</h1>
          <p className="text-muted-foreground">Preview and organize your media files</p>
        </div>
        <Button
          onClick={() => organizeMutation.mutate(Array.from(selectedIds))}
          disabled={!canOrganize || organizeMutation.isPending || activeOrganize !== null}
          className="gap-2"
          data-testid="button-organize-selected"
        >
          {organizeMutation.isPending || activeOrganize ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Organize {selectedIds.size > 0 ? `(${selectedIds.size})` : "Selected"}
        </Button>
      </div>

      {activeOrganize && (
        <ProgressCard
          title="Organizing Files"
          status={activeOrganize.status}
          processedFiles={activeOrganize.processedFiles}
          totalFiles={activeOrganize.totalFiles}
          currentItem={activeOrganize.currentFile || undefined}
          successCount={activeOrganize.successCount}
          failedCount={activeOrganize.failedCount}
        />
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="movie">Movies</SelectItem>
                  <SelectItem value="tv_show">TV Shows</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="organized">Organized</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="w-40" data-testid="select-confidence-filter">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="60">Needs Review (&lt;60%)</SelectItem>
                  <SelectItem value="80">Low (&lt;80%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b">
                    <th className="w-10 p-3">
                      <Checkbox
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="w-16 p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Poster
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Title / File
                    </th>
                    <th className="w-24 p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Size
                    </th>
                    <th className="w-24 p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Confidence
                    </th>
                    <th className="w-28 p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="w-16 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <MediaItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onSelect={handleSelectItem}
                      onEdit={setEditItem}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onRescan={(id) => rescanMutation.mutate(id)}
                      onUndo={(id) => undoMutation.mutate(id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FolderOutput className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No media items found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter === "pending" 
                  ? "Run a scan to discover media files, or adjust your filters."
                  : "Try adjusting your filters to see more items."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditMediaDialog
        item={editItem}
        open={editItem !== null}
        onOpenChange={(open) => !open && setEditItem(null)}
      />
    </div>
  );
}
