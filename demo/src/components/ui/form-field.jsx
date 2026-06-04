import { cn } from "../../lib/utils";

const FormField = ({ label, error, required, children, className }) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-[0.8125rem] font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[0.75rem] text-red-500">{error}</p>
      )}
    </div>
  );
};

export { FormField };
