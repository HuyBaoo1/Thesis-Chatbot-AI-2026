import { cn } from "../../lib/utils";

function Spinner({ size = "md", className, ...props }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-[#7c3aed]",
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Spinner };
