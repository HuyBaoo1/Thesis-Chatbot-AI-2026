import * as React from "react";
import { cn } from "../../lib/utils";

const Sheet = ({ open, onOpenChange, children }) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={() => onOpenChange(false)}
        />
      )}
      <div
        className={cn(
          "fixed z-50 bg-white border-l border-gray-200 shadow-lg transition-transform duration-200",
          "inset-y-0 right-0 w-full max-w-md",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {children}
      </div>
    </>
  );
};

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("px-6 py-4 border-b border-gray-200", className)} {...props} />
);

const SheetTitle = ({ className, ...props }) => (
  <h2 className={cn("text-[1rem] font-semibold text-gray-900", className)} {...props} />
);

const SheetDescription = ({ className, ...props }) => (
  <p className={cn("text-[0.8125rem] text-gray-500 mt-1", className)} {...props} />
);

const SheetContent = ({ className, ...props }) => (
  <div className={cn("p-6", className)} {...props} />
);

const SheetFooter = ({ className, ...props }) => (
  <div className={cn("flex justify-end gap-3 px-6 py-4 border-t border-gray-200", className)} {...props} />
);

export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetFooter };
