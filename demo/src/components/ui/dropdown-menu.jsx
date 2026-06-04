import * as React from "react";
import { cn } from "../../lib/utils";

const DropdownMenu = ({ children, trigger, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  const handleOpenChange = (val) => {
    setIsOpen(val);
    onOpenChange?.(val);
  };

  return (
    <div className="relative inline-block">
      <div onClick={() => handleOpenChange(!isOpen)}>{trigger}</div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => handleOpenChange(false)} />
          <div className="absolute right-0 z-50 mt-2 min-w-[12rem] bg-white rounded-lg border border-gray-200 shadow-lg p-1 animate-fade-in-up">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, { onClose: () => handleOpenChange(false) });
              }
              return child;
            })}
          </div>
        </>
      )}
    </div>
  );
};

const DropdownMenuItem = ({ className, onClick, onClose, children, ...props }) => {
  return (
    <button
      className={cn(
        "relative flex w-full items-center gap-2 px-3 py-2 text-[0.8125rem] text-gray-600 rounded-md transition-colors duration-100",
        "hover:bg-gray-100 hover:text-gray-900",
        "focus:bg-gray-100 focus:text-gray-900 focus:outline-none",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        onClose?.();
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const DropdownMenuSeparator = ({ className }) => (
  <div className={cn("my-1 h-px bg-gray-200", className)} />
);

const DropdownMenuLabel = ({ className, children }) => (
  <div className={cn("px-3 py-1.5 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wide", className)}>
    {children}
  </div>
);

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel };
