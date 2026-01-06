import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DuplicateGroup, MediaItem } from "@shared/schema";
import { Copy, Film, Tv, Trash2, Check, HelpCircle, Loader2 } from "lucide-react";

export default function Duplicates() {
  const { toast } = useToast();

  const { data: groups, isLoading } = useQuery<DuplicateGroup[]>({
    queryKey: ["/api/duplicates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/media-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Item deleted", description: "Duplicate item has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "movie":
        return <Film className="h-4 w-4 text-chart-4" />;
      case "tv_show":
        return <Tv className="h-4 w-4 text-chart-1" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Duplicates</h1>
        <p className="text-muted-foreground">Manage duplicate media files</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <Accordion type="multiple" className="space-y-4">
          {groups.map((group) => {
            const primary = group.items.find((item) => item.id === group.primaryId);
            const duplicates = group.items.filter((item) => item.id !== group.primaryId);
            
            return (
              <AccordionItem 
                key={group.primaryId} 
                value={group.primaryId}
                className="border rounded-lg"
                data-testid={`group-${group.primaryId}`}
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(primary?.detectedType || "unknown")}
                      <span className="font-medium">
                        {primary?.tmdbName || primary?.cleanedName || primary?.originalFilename}
                      </span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      <Copy className="h-3 w-3 mr-1" />
                      {group.items.length} copies
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((item) => {
                      const isPrimary = item.id === group.primaryId;
                      return (
                        <Card 
                          key={item.id}
                          className={isPrimary ? "border-chart-2" : ""}
                          data-testid={`card-duplicate-${item.id}`}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {item.posterPath ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                                    alt=""
                                    className="w-10 h-14 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                    {getTypeIcon(item.detectedType)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  {isPrimary && (
                                    <Badge variant="secondary" className="bg-chart-2/20 text-chart-2 mb-1">
                                      <Check className="h-3 w-3 mr-1" />
                                      Primary
                                    </Badge>
                                  )}
                                  <p className="font-medium text-sm truncate">
                                    {item.originalFilename}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(item.fileSize)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-xs font-mono text-muted-foreground truncate" title={item.originalPath}>
                              {item.originalPath}
                            </p>

                            {!isPrimary && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-destructive"
                                onClick={() => deleteMutation.mutate(item.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-duplicate-${item.id}`}
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete Duplicate
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Copy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No duplicates found</p>
            <p className="text-sm text-muted-foreground">
              Duplicates are detected during scanning based on TMDB matches and file similarity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
