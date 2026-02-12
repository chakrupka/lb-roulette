export interface Film {
  id: number;
  title: string;
  year: string;
  directors: { name: string; id: string }[];
  actors: { name: string; id: string }[];
  studios: { name: string; id: string }[];
  genres: string[];
  countries: string[];
  rating: number;
  rating_count: number;
  review_count: number;
  description: string;
  url: string;
  image: string;
}

export interface Filters {
  min_rating: string;
  max_rating: string;
  min_ratings: string;
  year_min: string;
  year_max: string;
  genres: string[];
  countries: string[];
}
