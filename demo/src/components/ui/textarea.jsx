import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "w-full min-h-[80px] px-3 py-2 text-[0.875rem] bg-white border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 transition-colors duration-150 resize-none",
        "focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
