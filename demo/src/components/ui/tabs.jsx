import * as React from "react";
import { cn } from "../../lib/utils";

const Tabs = ({ value, onValueChange, defaultValue, children, className }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = value ?? internalValue;
  const onTabChange = onValueChange ?? setInternalValue;

  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeValue, onTabChange });
        }
        return child;
      })}
    </div>
  );
};

const TabsList = React.forwardRef(({ className, activeValue, onTabChange, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg",
      className
    )}
    {...props}
  >
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { isActive: child.props.value === activeValue, onTabChange });
      }
      return child;
    })}
  </div>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value, isActive, onTabChange, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-[0.8125rem] font-medium rounded-md transition-colors duration-150",
      isActive
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900",
      className
    )}
    onClick={() => onTabChange?.(value)}
    {...props}
  >
    {children}
  </button>
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value, activeValue, isActive, children, ...props }, ref) => {
  const visible = isActive ?? (value === activeValue);
  if (!visible) return null;
  return (
    <div
      ref={ref}
      className={cn("mt-4 animate-fade-in", className)}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
