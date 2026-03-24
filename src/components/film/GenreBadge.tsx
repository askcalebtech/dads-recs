import { cn, genreStyle } from "@/lib/utils";

interface GenreBadgeProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export function GenreBadge({ name, className, onClick }: GenreBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-block rounded border px-1.5 py-0.5 text-xs font-medium leading-none",
        genreStyle(name),
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
    >
      {name}
    </span>
  );
}
