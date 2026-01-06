import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PosterCard } from "@/components/poster-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Movie } from "@shared/schema";
import { Film } from "lucide-react";

export default function MoviesPage() {
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Movies</h1>
        <p className="text-muted-foreground">Browse your movie collection</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : movies && movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <PosterCard
              key={movie.id}
              name={movie.name}
              posterPath={movie.posterPath}
              year={movie.year}
              type="movie"
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No movies found</p>
            <p className="text-sm text-muted-foreground">
              Scan your media library to discover movies.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
