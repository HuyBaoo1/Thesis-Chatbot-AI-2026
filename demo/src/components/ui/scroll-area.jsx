import { cn } from "../../lib/utils";

const ScrollArea = ({ className, children }) => {
  return (
    <div
      className={cn(
        "overflow-y-auto overflow-x-hidden",
        "[&::-webkit-scrollbar]:w-[6px]",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-gray-300",
        "[&::-webkit-scrollbar-thumb:hover]:bg-gray-400",
        className
      )}
    >
      {children}
    </div>
  );
};

export { ScrollArea };
