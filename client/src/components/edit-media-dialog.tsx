import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MediaItem } from "@shared/schema";
import { Film, Tv, HelpCircle, Loader2 } from "lucide-react";

interface EditMediaDialogProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMediaDialog({ item, open, onOpenChange }: EditMediaDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    detectedType: "unknown",
    cleanedName: "",
    year: "",
    season: "",
    episode: "",
    episodeEnd: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        detectedType: item.detectedType || "unknown",
        cleanedName: item.cleanedName || item.detectedName || "",
        year: item.year?.toString() || "",
        season: item.season?.toString() || "",
        episode: item.episode?.toString() || "",
        episodeEnd: item.episodeEnd?.toString() || "",
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<MediaItem>) => {
      return apiRequest("PATCH", `/api/media-items/${item?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Item updated", description: "Media item has been updated successfully." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update media item.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      detectedType: formData.detectedType,
      cleanedName: formData.cleanedName || null,
      year: formData.year ? parseInt(formData.year) : null,
      season: formData.season ? parseInt(formData.season) : null,
      episode: formData.episode ? parseInt(formData.episode) : null,
      episodeEnd: formData.episodeEnd ? parseInt(formData.episodeEnd) : null,
      manualOverride: true,
      confidence: 100,
    });
  };

  if (!item) return null;

  const getDestinationPreview = () => {
    if (formData.detectedType === "movie") {
      const name = formData.cleanedName || "Movie Name";
      const year = formData.year || "Year";
      return `Movies/${name} (${year})/${name} (${year}).${item.extension || "mkv"}`;
    } else if (formData.detectedType === "tv_show") {
      const name = formData.cleanedName || "Series Name";
      const season = formData.season ? String(formData.season).padStart(2, "0") : "01";
      const episode = formData.episode ? String(formData.episode).padStart(2, "0") : "01";
      const epEnd = formData.episodeEnd ? `-E${String(formData.episodeEnd).padStart(2, "0")}` : "";
      return `TV Shows/${name}/Season ${season}/${name} - S${season}E${episode}${epEnd}.${item.extension || "mkv"}`;
    }
    return "Select a type to preview destination";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Media Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Original File
            </Label>
            <p className="text-sm font-mono bg-muted/50 px-3 py-2 rounded truncate">
              {item.originalFilename}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.detectedType}
                onValueChange={(value) => setFormData({ ...formData, detectedType: value })}
              >
                <SelectTrigger id="type" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Movie
                    </div>
                  </SelectItem>
                  <SelectItem value="tv_show">
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4" />
                      TV Show
                    </div>
                  </SelectItem>
                  <SelectItem value="unknown">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Unknown
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max="2099"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2024"
                data-testid="input-year"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.cleanedName}
              onChange={(e) => setFormData({ ...formData, cleanedName: e.target.value })}
              placeholder="Movie or Series Name"
              data-testid="input-name"
            />
          </div>

          {formData.detectedType === "tv_show" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input
                  id="season"
                  type="number"
                  min="0"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  placeholder="1"
                  data-testid="input-season"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="episode">Episode</Label>
                <Input
                  id="episode"
                  type="number"
                  min="0"
                  value={formData.episode}
                  onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
                  placeholder="1"
                  data-testid="input-episode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="episodeEnd">Episode End</Label>
                <Input
                  id="episodeEnd"
                  type="number"
                  min="0"
                  value={formData.episodeEnd}
                  onChange={(e) => setFormData({ ...formData, episodeEnd: e.target.value })}
                  placeholder="Optional"
                  data-testid="input-episode-end"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Destination Preview
            </Label>
            <p className="text-sm font-mono bg-muted/50 px-3 py-2 rounded">
              {getDestinationPreview()}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
