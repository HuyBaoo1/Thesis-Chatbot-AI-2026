import { cn } from "../../lib/utils";

const Progress = ({ value, className, indicatorClassName }) => {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-gray-100",
        className
      )}
    >
      <div
        className={cn(
          "h-full bg-[#7c3aed] transition-all duration-300 ease-out rounded-full",
          indicatorClassName
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

export { Progress };
