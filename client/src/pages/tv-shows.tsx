import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PosterCard } from "@/components/poster-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TvSeries } from "@shared/schema";
import { Tv } from "lucide-react";

export default function TvShows() {
  const { data: series, isLoading } = useQuery<TvSeries[]>({
    queryKey: ["/api/tv-series"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">TV Shows</h1>
        <p className="text-muted-foreground">Browse your TV series collection</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : series && series.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {series.map((show) => (
            <PosterCard
              key={show.id}
              name={show.name}
              posterPath={show.posterPath}
              episodeCount={show.episodeCount}
              type="tv_show"
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No TV shows found</p>
            <p className="text-sm text-muted-foreground">
              Scan your media library to discover TV series.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
