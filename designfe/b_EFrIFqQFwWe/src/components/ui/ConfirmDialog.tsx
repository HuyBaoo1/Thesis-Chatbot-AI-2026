import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'
import { buttonVariants } from './Button'

const ConfirmDialog = AlertDialogPrimitive.Root

const ConfirmDialogTrigger = AlertDialogPrimitive.Trigger

const ConfirmDialogPortal = AlertDialogPrimitive.Portal

function ConfirmDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="confirm-dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
}

function ConfirmDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <ConfirmDialogPortal>
      <ConfirmDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="confirm-dialog-content"
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl',
          className
        )}
        {...props}
      />
    </ConfirmDialogPortal>
  )
}

function ConfirmDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="confirm-dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function ConfirmDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="confirm-dialog-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  )
}

function ConfirmDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="confirm-dialog-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

function ConfirmDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="confirm-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function ConfirmDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="confirm-dialog-action"
      className={cn(buttonVariants({ variant: 'destructive' }), className)}
      {...props}
    />
  )
}

function ConfirmDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="confirm-dialog-cancel"
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      {...props}
    />
  )
}

export {
  ConfirmDialog,
  ConfirmDialogPortal,
  ConfirmDialogOverlay,
  ConfirmDialogTrigger,
  ConfirmDialogContent,
  ConfirmDialogHeader,
  ConfirmDialogFooter,
  ConfirmDialogTitle,
  ConfirmDialogDescription,
  ConfirmDialogAction,
  ConfirmDialogCancel,
}
