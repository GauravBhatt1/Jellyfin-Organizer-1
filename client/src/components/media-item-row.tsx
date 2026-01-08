import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Film, Tv, HelpCircle, Edit, Trash2, AlertTriangle, CheckCircle, Clock, XCircle, RotateCcw, Undo2, Lock } from "lucide-react";
import type { MediaItem } from "@shared/schema";

interface MediaItemRowProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
  onRescan?: (id: string) => void;
  onUndo?: (id: string) => void;
}

export function MediaItemRow({ item, isSelected, onSelect, onEdit, onDelete, onRescan, onUndo }: MediaItemRowProps) {
  const getTypeIcon = () => {
    switch (item.detectedType) {
      case "movie":
        return <Film className="h-4 w-4 text-chart-4" />;
      case "tv_show":
        return <Tv className="h-4 w-4 text-chart-1" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case "organized":
        return <Badge variant="secondary" className="bg-chart-2/20 text-chart-2 gap-1"><CheckCircle className="h-3 w-3" /> Organized</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "skipped":
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Skipped</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="secondary">{item.status}</Badge>;
    }
  };

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

  const getDisplayName = () => {
    if (item.tmdbName) return item.tmdbName;
    if (item.cleanedName) return item.cleanedName;
    if (item.detectedName) return item.detectedName;
    return item.originalFilename;
  };

  const getSeasonEpisode = () => {
    if (item.detectedType !== "tv_show") return null;
    if (item.season === null || item.episode === null) return null;
    const ep = item.episodeEnd ? `E${String(item.episode).padStart(2, "0")}-E${String(item.episodeEnd).padStart(2, "0")}` : `E${String(item.episode).padStart(2, "0")}`;
    return `S${String(item.season).padStart(2, "0")}${ep}`;
  };

  const getEpisodeTitle = () => {
    return item.episodeTitle || null;
  };

  return (
    <tr className="border-b border-border hover-elevate" data-testid={`row-media-item-${item.id}`}>
      <td className="w-10 p-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(item.id, !!checked)}
          data-testid={`checkbox-item-${item.id}`}
        />
      </td>
      <td className="w-16 p-3">
        {item.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
            alt=""
            className="w-10 h-14 object-cover rounded"
          />
        ) : (
          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
            {getTypeIcon()}
          </div>
        )}
      </td>
      <td className="p-3 max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <span className="font-medium truncate" title={getDisplayName()}>
              {getDisplayName()}
            </span>
            {item.year && <span className="text-muted-foreground">({item.year})</span>}
            {getSeasonEpisode() && (
              <Badge variant="outline" className="text-xs">{getSeasonEpisode()}</Badge>
            )}
            {getEpisodeTitle() && (
              <span className="text-muted-foreground text-xs">- {getEpisodeTitle()}</span>
            )}
          </div>
          <p className="text-xs font-mono text-muted-foreground truncate" title={item.originalPath}>
            {item.originalFilename}
          </p>
        </div>
      </td>
      <td className="w-24 p-3 text-sm text-muted-foreground">
        {formatFileSize(item.fileSize)}
      </td>
      <td className="w-24 p-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-12 bg-muted rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${item.confidence >= 80 ? "bg-chart-2" : item.confidence >= 60 ? "bg-chart-4" : "bg-destructive"}`}
              style={{ width: `${item.confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{item.confidence}%</span>
        </div>
        {item.confidence < 60 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3 text-chart-4" />
            <span className="text-xs text-chart-4">Review</span>
          </div>
        )}
      </td>
      <td className="w-28 p-3">
        {getStatusBadge()}
      </td>
      <td className="w-16 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid={`button-actions-${item.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(item)} data-testid={`button-edit-${item.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {item.status === "organized" && (
              <DropdownMenuItem onClick={() => onUndo?.(item.id)} data-testid={`button-undo-${item.id}`}>
                <Undo2 className="h-4 w-4 mr-2" />
                Undo Organize
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRescan?.(item.id)} data-testid={`button-rescan-${item.id}`}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Mark for Rescan
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(item.id)} 
              className="text-destructive"
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
