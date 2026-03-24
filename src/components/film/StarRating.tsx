import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ rating, size = "md", className }: StarRatingProps) {
  if (rating === null || rating === undefined) return null;

  const sizeClasses = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };
  const iconSize = sizeClasses[size];
  const totalStars = 5;
  const filled = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: totalStars }).map((_, i) => {
        const isFilled = i < filled;
        const isHalf = !isFilled && i === filled && hasHalf;

        return (
          <span key={i} className="relative inline-block">
            {/* Empty star base */}
            <Star className={cn(iconSize, "text-zinc-700")} fill="currentColor" />
            {/* Filled overlay */}
            {(isFilled || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? "50%" : "100%" }}
              >
                <Star className={cn(iconSize, "text-primary")} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
      <span className="ml-1 text-primary font-medium tabular-nums" style={{ fontSize: size === "sm" ? "0.7rem" : size === "md" ? "0.8rem" : "0.95rem" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}
