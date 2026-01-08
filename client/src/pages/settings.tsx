import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FolderPickerDialog } from "@/components/folder-picker-dialog";
import type { Settings as SettingsType } from "@shared/schema";
import { 
  Plus, 
  X, 
  Loader2,
  FolderOpen,
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<SettingsType>>({
    tmdbApiKey: "",
    sourceFolders: [],
    moviesDestinations: [],
    tvShowsDestinations: [],
    copyMode: true,
    autoOrganize: false,
  });
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"source" | "movies" | "tvshows">("source");

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        tmdbApiKey: settings.tmdbApiKey || "",
        sourceFolders: settings.sourceFolders || [],
        moviesDestinations: settings.moviesDestinations || (settings.moviesDestination ? [settings.moviesDestination] : []),
        tvShowsDestinations: settings.tvShowsDestinations || (settings.tvShowsDestination ? [settings.tvShowsDestination] : []),
        copyMode: settings.copyMode ?? true,
        autoOrganize: settings.autoOrganize ?? false,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SettingsType>) => {
      return apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: "Your settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const openPicker = (target: "source" | "movies" | "tvshows") => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleFolderSelect = (path: string) => {
    if (pickerTarget === "source") {
      if (!formData.sourceFolders?.includes(path)) {
        setFormData({
          ...formData,
          sourceFolders: [...(formData.sourceFolders || []), path],
        });
      }
    } else if (pickerTarget === "movies") {
      if (!formData.moviesDestinations?.includes(path)) {
        setFormData({
          ...formData,
          moviesDestinations: [...(formData.moviesDestinations || []), path],
        });
      }
    } else if (pickerTarget === "tvshows") {
      if (!formData.tvShowsDestinations?.includes(path)) {
        setFormData({
          ...formData,
          tvShowsDestinations: [...(formData.tvShowsDestinations || []), path],
        });
      }
    }
  };

  const removeSourceFolder = (index: number) => {
    const updated = [...(formData.sourceFolders || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, sourceFolders: updated });
  };

  const removeMoviesDestination = (index: number) => {
    const updated = [...(formData.moviesDestinations || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, moviesDestinations: updated });
  };

  const removeTvShowsDestination = (index: number) => {
    const updated = [...(formData.tvShowsDestinations || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, tvShowsDestinations: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      moviesDestination: formData.moviesDestinations?.[0] || "",
      tvShowsDestination: formData.tvShowsDestinations?.[0] || "",
    };
    updateMutation.mutate(dataToSave);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const FolderItem = ({ path, onRemove }: { path: string; onRemove: () => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <FolderOpen className="h-5 w-5 text-primary shrink-0" />
        <span className="text-sm font-mono truncate">{path}</span>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* TMDB API Key */}
        <div className="space-y-3">
          <Label className="text-primary text-sm">TMDB API Key</Label>
          <Input
            type="password"
            value={formData.tmdbApiKey || ""}
            onChange={(e) => setFormData({ ...formData, tmdbApiKey: e.target.value })}
            placeholder="Enter your TMDB API key"
            className="bg-muted/30 border-primary/50 focus:border-primary"
            data-testid="input-tmdb-key"
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">TMDB</a>
          </p>
        </div>

        {/* Source Folders */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">Source Folders</span>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => openPicker("source")}
              className="rounded-full h-8 w-8"
              data-testid="button-add-source"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-muted/20 rounded-md">
            {formData.sourceFolders && formData.sourceFolders.length > 0 ? (
              <div className="px-4">
                {formData.sourceFolders.map((folder, index) => (
                  <FolderItem 
                    key={index} 
                    path={folder} 
                    onRemove={() => removeSourceFolder(index)} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No source folders added</p>
            )}
          </div>
        </div>

        {/* Movies Destination */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">Movies Destination</span>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => openPicker("movies")}
              className="rounded-full h-8 w-8"
              data-testid="button-add-movies"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-muted/20 rounded-md">
            {formData.moviesDestinations && formData.moviesDestinations.length > 0 ? (
              <div className="px-4">
                {formData.moviesDestinations.map((dest, index) => (
                  <FolderItem 
                    key={index} 
                    path={dest} 
                    onRemove={() => removeMoviesDestination(index)} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No movies destination set</p>
            )}
          </div>
        </div>

        {/* TV Shows Destination */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">TV Shows Destination</span>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => openPicker("tvshows")}
              className="rounded-full h-8 w-8"
              data-testid="button-add-tvshows"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-muted/20 rounded-md">
            {formData.tvShowsDestinations && formData.tvShowsDestinations.length > 0 ? (
              <div className="px-4">
                {formData.tvShowsDestinations.map((dest, index) => (
                  <FolderItem 
                    key={index} 
                    path={dest} 
                    onRemove={() => removeTvShowsDestination(index)} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No TV shows destination set</p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="copyMode" className="text-base">Copy Mode</Label>
              <p className="text-xs text-muted-foreground">Keep original files (recommended)</p>
            </div>
            <Switch
              id="copyMode"
              checked={formData.copyMode ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, copyMode: checked })}
              data-testid="switch-copy-mode"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoOrganize" className="text-base">Auto Organize</Label>
              <p className="text-xs text-muted-foreground">Automatically organize after scan</p>
            </div>
            <Switch
              id="autoOrganize"
              checked={formData.autoOrganize ?? false}
              onCheckedChange={(checked) => setFormData({ ...formData, autoOrganize: checked })}
              data-testid="switch-auto-organize"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full"
          size="lg"
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save Settings"
          )}
        </Button>
      </form>

      <FolderPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleFolderSelect}
        title={
          pickerTarget === "source" 
            ? "Select Source Folder" 
            : pickerTarget === "movies" 
            ? "Select Movies Destination" 
            : "Select TV Shows Destination"
        }
      />
    </div>
  );
}
