import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  htmlFor?: string
  error?: string
  description?: string
  required?: boolean
}

function FormField({
  className,
  label,
  htmlFor,
  error,
  description,
  required,
  children,
  ...props
}: FormFieldProps) {
  return (
    <div data-slot="form-field" className={cn('space-y-2', className)} {...props}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}
      {children}
      {description && !error && (
        <FormDescription>{description}</FormDescription>
      )}
      {error && <FormError>{error}</FormError>}
    </div>
  )
}

interface FormLabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
}

function FormLabel({ className, required, children, ...props }: FormLabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="form-label"
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </LabelPrimitive.Root>
  )
}

function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="form-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function FormError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="form-error"
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    />
  )
}

export { FormField, FormLabel, FormDescription, FormError }
