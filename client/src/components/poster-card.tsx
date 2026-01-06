import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Tv } from "lucide-react";

interface PosterCardProps {
  name: string;
  posterPath?: string | null;
  year?: number | null;
  episodeCount?: number;
  type: "movie" | "tv_show";
  onClick?: () => void;
}

export function PosterCard({ name, posterPath, year, episodeCount, type, onClick }: PosterCardProps) {
  return (
    <Card 
      className="group overflow-hidden cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={`card-${type}-${name.replace(/\s/g, "-").toLowerCase()}`}
    >
      <div className="relative aspect-[2/3]">
        {posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${posterPath}`}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {type === "movie" ? (
              <Film className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Tv className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
          <p className="text-white font-medium text-sm line-clamp-2">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            {year && <span className="text-white/70 text-xs">{year}</span>}
            {typeof episodeCount === "number" && (
              <Badge variant="secondary" size="sm" className="bg-white/20 text-white border-0">
                {episodeCount} eps
              </Badge>
            )}
          </div>
        </div>

        {typeof episodeCount === "number" && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-black/60 text-white border-0"
            size="sm"
          >
            {episodeCount} eps
          </Badge>
        )}
      </div>
    </Card>
  );
}
