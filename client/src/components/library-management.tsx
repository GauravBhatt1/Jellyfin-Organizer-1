import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FolderPickerDialog } from "./folder-picker-dialog";
import { 
  Film, 
  Tv, 
  FolderPlus, 
  X, 
  Settings2, 
  ChevronRight, 
  ChevronLeft,
  Folder,
  Check,
  Plus
} from "lucide-react";
import type { Library } from "@shared/library-utils";

interface LibraryCardProps {
  library: Library;
  onAddFolder: () => void;
  onRemoveFolder: (index: number) => void;
  onChangeDestination: () => void;
}

export function LibraryCard({ 
  library, 
  onAddFolder, 
  onRemoveFolder, 
  onChangeDestination 
}: LibraryCardProps) {
  const Icon = library.type === "movies" ? Film : Tv;
  const title = library.type === "movies" ? "Movies" : "TV Shows";
  
  return (
    <Card data-testid={`card-library-${library.type}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onAddFolder}
            data-testid={`button-add-folder-${library.type}`}
          >
            <FolderPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Folders</p>
          {library.folders.length > 0 ? (
            <div className="space-y-1">
              {library.folders.map((folder, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                >
                  <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono truncate flex-1" title={folder}>
                    {folder}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveFolder(index)}
                    data-testid={`button-remove-folder-${library.type}-${index}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No folders configured</p>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Destination</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {library.destination}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onChangeDestination}
              data-testid={`button-change-destination-${library.type}`}
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Change
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type WizardStep = "type" | "folders" | "destination" | "confirm";

interface LibraryWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (library: Library) => void;
  initialLibrary?: Library;
  existingTypes?: ("movies" | "tv")[];
}

export function LibraryWizardModal({
  open,
  onOpenChange,
  onSave,
  initialLibrary,
  existingTypes = [],
}: LibraryWizardModalProps) {
  const isEdit = !!initialLibrary;
  const [step, setStep] = useState<WizardStep>(isEdit ? "folders" : "type");
  const [libraryType, setLibraryType] = useState<"movies" | "tv">(
    initialLibrary?.type || "movies"
  );
  const [folders, setFolders] = useState<string[]>(initialLibrary?.folders || []);
  const [destination, setDestination] = useState<string>(
    initialLibrary?.destination || 
    (libraryType === "movies" ? "/organized/movies" : "/organized/tvshows")
  );
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);

  const resetState = () => {
    setStep(isEdit ? "folders" : "type");
    setLibraryType(initialLibrary?.type || "movies");
    setFolders(initialLibrary?.folders || []);
    setDestination(
      initialLibrary?.destination || 
      (libraryType === "movies" ? "/organized/movies" : "/organized/tvshows")
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  };

  const handleTypeSelect = (type: "movies" | "tv") => {
    setLibraryType(type);
    setDestination(type === "movies" ? "/organized/movies" : "/organized/tvshows");
    setStep("folders");
  };

  const handleAddFolder = (path: string) => {
    if (!folders.includes(path)) {
      setFolders([...folders, path]);
    }
  };

  const handleRemoveFolder = (index: number) => {
    setFolders(folders.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      type: libraryType,
      folders,
      destination,
    });
    handleClose();
  };

  const canProceed = () => {
    switch (step) {
      case "type":
        return true;
      case "folders":
        return folders.length > 0;
      case "destination":
        return !!destination;
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const getNextStep = (): WizardStep | null => {
    switch (step) {
      case "type":
        return "folders";
      case "folders":
        return "destination";
      case "destination":
        return "confirm";
      case "confirm":
        return null;
      default:
        return null;
    }
  };

  const getPrevStep = (): WizardStep | null => {
    switch (step) {
      case "type":
        return null;
      case "folders":
        return isEdit ? null : "type";
      case "destination":
        return "folders";
      case "confirm":
        return "destination";
      default:
        return null;
    }
  };

  const stepLabels: Record<WizardStep, string> = {
    type: "Library Type",
    folders: "Folders",
    destination: "Destination",
    confirm: "Review",
  };

  const Icon = libraryType === "movies" ? Film : Tv;
  const typeName = libraryType === "movies" ? "Movies" : "TV Shows";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? (
                <>
                  <Icon className="h-5 w-5" />
                  Edit {typeName} Library
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add Library
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-1 mb-4">
            {(["type", "folders", "destination", "confirm"] as WizardStep[])
              .filter(s => !isEdit || s !== "type")
              .map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1">
                  <Badge 
                    variant={step === s ? "default" : "outline"}
                    className="text-xs"
                  >
                    {stepLabels[s]}
                  </Badge>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
          </div>

          <div className="min-h-48">
            {step === "type" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  What type of content will this library contain?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2"
                    onClick={() => handleTypeSelect("movies")}
                    disabled={existingTypes.includes("movies")}
                    data-testid="button-select-movies"
                  >
                    <Film className="h-8 w-8" />
                    <span>Movies</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2"
                    onClick={() => handleTypeSelect("tv")}
                    disabled={existingTypes.includes("tv")}
                    data-testid="button-select-tv"
                  >
                    <Tv className="h-8 w-8" />
                    <span>TV Shows</span>
                  </Button>
                </div>
                {existingTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Disabled options already have a library configured.
                  </p>
                )}
              </div>
            )}

            {step === "folders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add folders containing your {typeName.toLowerCase()}:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFolderPicker(true)}
                    data-testid="button-add-folder-wizard"
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    Add Folder
                  </Button>
                </div>
                
                {folders.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {folders.map((folder, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-mono truncate flex-1" title={folder}>
                          {folder}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveFolder(index)}
                          data-testid={`button-remove-folder-wizard-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border border-dashed rounded-md text-muted-foreground">
                    <p className="text-sm">No folders added yet</p>
                  </div>
                )}
              </div>
            )}

            {step === "destination" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Where should organized {typeName.toLowerCase()} be saved?
                </p>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-mono truncate" title={destination}>
                        {destination}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDestPicker(true)}
                      data-testid="button-change-destination-wizard"
                    >
                      Change
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Files will be organized into subdirectories based on title and year.
                </p>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Review your library configuration:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{typeName} Library</span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Source folders:</p>
                    {folders.map((folder, i) => (
                      <div key={i} className="flex items-center gap-2 ml-4">
                        <Folder className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-mono">{folder}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Destination:</p>
                    <div className="flex items-center gap-2 ml-4">
                      <Folder className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-mono">{destination}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {getPrevStep() && (
              <Button
                variant="outline"
                onClick={() => setStep(getPrevStep()!)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {step !== "type" && getNextStep() && (
              <Button
                onClick={() => setStep(getNextStep()!)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "confirm" && (
              <Button onClick={handleSave} data-testid="button-save-library">
                <Check className="h-4 w-4 mr-1" />
                Save Library
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FolderPickerDialog
        open={showFolderPicker}
        onOpenChange={setShowFolderPicker}
        onSelect={handleAddFolder}
        title="Add Folder to Library"
      />

      <FolderPickerDialog
        open={showDestPicker}
        onOpenChange={setShowDestPicker}
        onSelect={(path) => setDestination(path)}
        title="Select Destination Folder"
      />
    </>
  );
}
