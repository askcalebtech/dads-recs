export interface Film {
  film_id: number;
  title: string;
  year: number | null;
  tmdb_id: number | null;
  imdb_id: string | null;
  runtime_minutes: number | null;
  poster_path: string | null;
  overview: string | null;
  letterboxd_uri: string | null;
}

export interface WatchEntry {
  watch_id: number;
  film_id: number;
  rating: number | null;
  watch_date: string | null;
  rewatch: number | null;
  review_text: string | null;
  logged_date: string | null;
}

export interface Director {
  director_id: number;
  name: string;
  tmdb_id: number | null;
}

export interface Actor {
  actor_id: number;
  name: string;
  tmdb_id: number | null;
  profile_path: string | null;
}

export interface Genre {
  genre_id: number;
  name: string;
  tmdb_id: number | null;
}

export interface FilmWithWatch extends Film {
  rating: number | null;
  watch_date: string | null;
  rewatch: number | null;
  review_text: string | null;
  genres: Genre[];
  directors: Director[];
}

export interface FilmDetail extends FilmWithWatch {
  actors: (Actor & { billing_order: number | null })[];
  letterboxd_uri: string | null;
}

export interface SearchFilters {
  query?: string;
  genres?: string[];
  yearMin?: number;
  yearMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  director?: string;
  decade?: number;
  sortBy?: "rating_desc" | "rating_asc" | "year_desc" | "year_asc" | "watch_date_desc" | "watch_date_asc" | "title_asc";
}

export interface AnalyticsData {
  totalFilms: number;
  averageRating: number;
  totalDirectors: number;
  totalGenres: number;
}
