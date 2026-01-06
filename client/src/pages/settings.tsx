import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings as SettingsType } from "@shared/schema";
import { 
  Settings as SettingsIcon, 
  FolderOpen, 
  Plus, 
  X, 
  Loader2,
  Save,
  Key,
  HardDrive,
  Cog
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<SettingsType>>({
    tmdbApiKey: "",
    sourceFolders: [],
    moviesDestination: "",
    tvShowsDestination: "",
    copyMode: true,
    autoOrganize: false,
  });
  const [newFolder, setNewFolder] = useState("");

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        tmdbApiKey: settings.tmdbApiKey || "",
        sourceFolders: settings.sourceFolders || [],
        moviesDestination: settings.moviesDestination || "",
        tvShowsDestination: settings.tvShowsDestination || "",
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
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const handleAddFolder = () => {
    if (newFolder.trim() && !formData.sourceFolders?.includes(newFolder.trim())) {
      setFormData({
        ...formData,
        sourceFolders: [...(formData.sourceFolders || []), newFolder.trim()],
      });
      setNewFolder("");
    }
  };

  const handleRemoveFolder = (index: number) => {
    const updated = [...(formData.sourceFolders || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, sourceFolders: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Configure your media organizer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  TMDB API Key
                </CardTitle>
                <CardDescription>
                  Required for fetching movie and TV show metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tmdbApiKey">API Key</Label>
                  <Input
                    id="tmdbApiKey"
                    type="password"
                    value={formData.tmdbApiKey || ""}
                    onChange={(e) => setFormData({ ...formData, tmdbApiKey: e.target.value })}
                    placeholder="Enter your TMDB API key"
                    data-testid="input-tmdb-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">TMDB</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Source Folders
                </CardTitle>
                <CardDescription>
                  Directories to scan for media files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    placeholder="/path/to/media"
                    className="font-mono text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFolder())}
                    data-testid="input-new-folder"
                  />
                  <Button
                    type="button"
                    onClick={handleAddFolder}
                    variant="outline"
                    data-testid="button-add-folder"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.sourceFolders && formData.sourceFolders.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.sourceFolders.map((folder, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="font-mono text-xs pr-1 gap-1"
                        data-testid={`badge-source-folder-${index}`}
                      >
                        <FolderOpen className="h-3 w-3" />
                        {folder}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 ml-1"
                          onClick={() => handleRemoveFolder(index)}
                          data-testid={`button-remove-folder-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No source folders configured</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Destinations
                </CardTitle>
                <CardDescription>
                  Where to organize your media files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="moviesDestination">Movies Destination</Label>
                  <Input
                    id="moviesDestination"
                    value={formData.moviesDestination || ""}
                    onChange={(e) => setFormData({ ...formData, moviesDestination: e.target.value })}
                    placeholder="/path/to/movies"
                    className="font-mono text-sm"
                    data-testid="input-movies-dest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tvShowsDestination">TV Shows Destination</Label>
                  <Input
                    id="tvShowsDestination"
                    value={formData.tvShowsDestination || ""}
                    onChange={(e) => setFormData({ ...formData, tvShowsDestination: e.target.value })}
                    placeholder="/path/to/tv-shows"
                    className="font-mono text-sm"
                    data-testid="input-tv-dest"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Organization Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="copyMode">Copy Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Copy files instead of moving them (safer)
                    </p>
                  </div>
                  <Switch
                    id="copyMode"
                    checked={formData.copyMode ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, copyMode: checked })}
                    data-testid="switch-copy-mode"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoOrganize">Auto Organize</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically organize high-confidence items after scan
                    </p>
                  </div>
                  <Switch
                    id="autoOrganize"
                    checked={formData.autoOrganize ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoOrganize: checked })}
                    data-testid="switch-auto-organize"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">Supported Extensions</p>
                  <p className="text-muted-foreground">
                    mkv, mp4, avi, mov, wmv, flv, webm, m4v, ts, m2ts
                  </p>
                </div>
                <div>
                  <p className="font-medium">Movie Naming</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    Movie Name (Year)/Movie Name (Year).ext
                  </p>
                </div>
                <div>
                  <p className="font-medium">TV Show Naming</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    Series Name/Season 01/Series Name - S01E01.ext
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="gap-2"
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
