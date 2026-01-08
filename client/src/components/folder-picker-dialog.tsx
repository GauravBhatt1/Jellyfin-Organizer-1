import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Folder, FolderOpen, ChevronUp, Check, HardDrive } from "lucide-react";

type FolderItem = {
  name: string;
  path: string;
  type: "directory";
};

type FilesystemResponse = {
  currentPath: string;
  parentPath: string | null;
  canGoUp: boolean;
  items: FolderItem[];
};

type RootItem = {
  name: string;
  path: string;
  exists: boolean;
};

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  title?: string;
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select Folder",
}: FolderPickerDialogProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const { data: roots, isLoading: rootsLoading } = useQuery<RootItem[]>({
    queryKey: ["/api/filesystem/roots"],
    enabled: open,
  });

  const { data: files, isLoading: filesLoading, error } = useQuery<FilesystemResponse>({
    queryKey: ["/api/filesystem", currentPath],
    queryFn: async () => {
      const res = await fetch(`/api/filesystem?path=${encodeURIComponent(currentPath!)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: open && currentPath !== null,
  });

  useEffect(() => {
    if (!open) {
      setCurrentPath(null);
      setSelectedPath(null);
    }
  }, [open]);

  const handleRootSelect = (rootPath: string) => {
    setCurrentPath(rootPath);
    setSelectedPath(rootPath);
  };

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedPath(folderPath);
  };

  const handleGoUp = () => {
    if (files?.canGoUp && files?.parentPath) {
      setCurrentPath(files.parentPath);
      setSelectedPath(files.parentPath);
    }
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
      onOpenChange(false);
    }
  };

  const isLoading = rootsLoading || filesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedPath && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Selected:</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {selectedPath}
              </Badge>
            </div>
          )}

          {currentPath === null ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Choose a root directory:</p>
              {rootsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : roots && roots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {roots.map((root) => (
                    <Button
                      key={root.path}
                      variant="outline"
                      className="justify-start gap-2 h-auto py-3"
                      onClick={() => handleRootSelect(root.path)}
                      data-testid={`button-root-${root.name.replace("/", "")}`}
                    >
                      <HardDrive className="h-4 w-4" />
                      <span className="font-mono text-sm">{root.name}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No accessible directories found</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoUp}
                  disabled={!files?.canGoUp}
                  data-testid="button-go-up"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Up
                </Button>
                <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                  {currentPath}
                </span>
              </div>

              <ScrollArea className="h-64 border rounded-md">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-sm text-destructive">
                    Failed to load directory
                  </div>
                ) : files?.items && files.items.length > 0 ? (
                  <div className="p-1">
                    {files.items.map((item) => (
                      <Button
                        key={item.path}
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto py-2 px-3"
                        onClick={() => handleFolderClick(item.path)}
                        data-testid={`button-folder-${item.name}`}
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{item.name}</span>
                        {selectedPath === item.path && (
                          <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No subfolders found
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedPath}>
            <Check className="h-4 w-4 mr-2" />
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
