import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FolderPickerDialog } from "@/components/folder-picker-dialog";
import { LibraryCard } from "@/components/library-management";
import { 
  extractLibrariesFromSettings, 
  buildSourceFoldersFromLibraries,
  type Library,
  type MixedFolderEntry 
} from "@shared/library-utils";
import type { Settings as SettingsType } from "@shared/schema";
import { 
  Loader2,
  AlertTriangle,
  Film,
  Tv,
  Plus,
  Folder,
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [autoOrganize, setAutoOrganize] = useState(false);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [mixedFolders, setMixedFolders] = useState<MixedFolderEntry[]>([]);
  
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderPickerTarget, setFolderPickerTarget] = useState<{ type: "movies" | "tv"; mode: "add" | "dest" } | null>(null);

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setTmdbApiKey(settings.tmdbApiKey || "");
      setAutoOrganize(settings.autoOrganize ?? false);
      
      const { libraries: extractedLibraries, mixedFolders: extractedMixed } = extractLibrariesFromSettings(
        settings.sourceFolders || [],
        settings.moviesDestination || null,
        settings.tvShowsDestination || null
      );
      
      setLibraries(extractedLibraries);
      setMixedFolders(extractedMixed);
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

  const getLibrary = (type: "movies" | "tv"): Library => {
    return libraries.find(l => l.type === type) || {
      type,
      folders: [],
      destination: type === "movies" ? "/organized/movies" : "/organized/tvshows"
    };
  };

  const updateLibrary = (updatedLibrary: Library) => {
    setLibraries(libs => {
      const existing = libs.findIndex(l => l.type === updatedLibrary.type);
      if (existing >= 0) {
        const newLibs = [...libs];
        newLibs[existing] = updatedLibrary;
        return newLibs;
      }
      return [...libs, updatedLibrary];
    });
  };

  const handleAddFolder = (type: "movies" | "tv") => {
    setFolderPickerTarget({ type, mode: "add" });
    setFolderPickerOpen(true);
  };

  const handleChangeDestination = (type: "movies" | "tv") => {
    setFolderPickerTarget({ type, mode: "dest" });
    setFolderPickerOpen(true);
  };

  const handleFolderSelected = (path: string) => {
    if (!folderPickerTarget) return;
    
    const lib = getLibrary(folderPickerTarget.type);
    
    if (folderPickerTarget.mode === "add") {
      if (!lib.folders.includes(path)) {
        updateLibrary({ ...lib, folders: [...lib.folders, path] });
      }
    } else {
      updateLibrary({ ...lib, destination: path });
    }
  };

  const handleRemoveFolder = (type: "movies" | "tv", index: number) => {
    const lib = getLibrary(type);
    const newFolders = lib.folders.filter((_, i) => i !== index);
    updateLibrary({ ...lib, folders: newFolders });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sourceFolders = buildSourceFoldersFromLibraries(libraries, mixedFolders);
    const moviesLib = libraries.find(l => l.type === "movies");
    const tvLib = libraries.find(l => l.type === "tv");
    
    const dataToSave: Partial<SettingsType> = {
      tmdbApiKey,
      sourceFolders,
      autoOrganize,
    };
    
    if (moviesLib) {
      dataToSave.moviesDestination = moviesLib.destination;
    }
    if (tvLib) {
      dataToSave.tvShowsDestination = tvLib.destination;
    }
    
    updateMutation.mutate(dataToSave);
  };
  
  const handleRemoveMixedFolder = (index: number) => {
    setMixedFolders(mixed => mixed.filter((_, i) => i !== index));
  };
  
  const handleAssignMixedFolder = (index: number, toType: "movies" | "tv") => {
    const mixed = mixedFolders[index];
    const lib = getLibrary(toType);
    if (!lib.folders.includes(mixed.path)) {
      updateLibrary({ ...lib, folders: [...lib.folders, mixed.path] });
    }
    setMixedFolders(m => m.filter((_, i) => i !== index));
  };
  
  const handleCreateLibrary = (type: "movies" | "tv") => {
    const newLib: Library = {
      type,
      folders: [],
      destination: type === "movies" ? "/organized/movies" : "/organized/tvshows"
    };
    setLibraries(libs => [...libs, newLib]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const moviesLibrary = libraries.find(l => l.type === "movies");
  const tvLibrary = libraries.find(l => l.type === "tv");

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="space-y-3">
          <Label className="text-primary text-sm">TMDB API Key</Label>
          <Input
            type="password"
            value={tmdbApiKey}
            onChange={(e) => setTmdbApiKey(e.target.value)}
            placeholder="Enter your TMDB API key"
            className="bg-muted/30 border-primary/50 focus:border-primary"
            data-testid="input-tmdb-key"
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">TMDB</a>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Libraries</h2>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Configure your media libraries. Add folders containing your movies and TV shows, 
            and set where organized files should be saved.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {moviesLibrary ? (
              <LibraryCard
                library={moviesLibrary}
                onAddFolder={() => handleAddFolder("movies")}
                onRemoveFolder={(index) => handleRemoveFolder("movies", index)}
                onChangeDestination={() => handleChangeDestination("movies")}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-32 flex-col gap-2 border-dashed"
                onClick={() => handleCreateLibrary("movies")}
                data-testid="button-create-movies-library"
              >
                <Film className="h-8 w-8 text-muted-foreground" />
                <span>Add Movies Library</span>
              </Button>
            )}
            
            {tvLibrary ? (
              <LibraryCard
                library={tvLibrary}
                onAddFolder={() => handleAddFolder("tv")}
                onRemoveFolder={(index) => handleRemoveFolder("tv", index)}
                onChangeDestination={() => handleChangeDestination("tv")}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-32 flex-col gap-2 border-dashed"
                onClick={() => handleCreateLibrary("tv")}
                data-testid="button-create-tv-library"
              >
                <Tv className="h-8 w-8 text-muted-foreground" />
                <span>Add TV Shows Library</span>
              </Button>
            )}
          </div>
          
          {mixedFolders.length > 0 && (
            <div className="p-4 rounded-md bg-chart-4/10 border border-chart-4/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-4" />
                <span className="font-medium text-chart-4">Legacy Folders</span>
              </div>
              <p className="text-sm text-muted-foreground">
                These folders were added before library types were introduced. 
                Assign them to a library or they will be scanned as mixed content.
              </p>
              <div className="space-y-2">
                {mixedFolders.map((mixed, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-md bg-background"
                  >
                    <span className="text-sm font-mono truncate flex-1" title={mixed.path}>
                      {mixed.path}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignMixedFolder(index, "movies")}
                      data-testid={`button-assign-movies-${index}`}
                    >
                      Movies
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignMixedFolder(index, "tv")}
                      data-testid={`button-assign-tv-${index}`}
                    >
                      TV Shows
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMixedFolder(index)}
                      className="text-destructive"
                      data-testid={`button-remove-mixed-${index}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoOrganize" className="text-base">Auto Organize</Label>
              <p className="text-xs text-muted-foreground">Automatically organize after scan</p>
            </div>
            <Switch
              id="autoOrganize"
              checked={autoOrganize}
              onCheckedChange={setAutoOrganize}
              data-testid="switch-auto-organize"
            />
          </div>
        </div>

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
        open={folderPickerOpen}
        onOpenChange={setFolderPickerOpen}
        onSelect={handleFolderSelected}
        title={
          folderPickerTarget?.mode === "add"
            ? `Add Folder to ${folderPickerTarget.type === "movies" ? "Movies" : "TV Shows"} Library`
            : `Select ${folderPickerTarget?.type === "movies" ? "Movies" : "TV Shows"} Destination`
        }
      />
    </div>
  );
}
