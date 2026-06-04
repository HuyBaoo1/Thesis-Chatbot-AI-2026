import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '../../lib/utils'

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
}

function Avatar(props) {
  const { className, size = 'md', ...rest } = props
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...rest}
    />
  )
}

function AvatarImage(props) {
  const { className, ...rest } = props
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...rest}
    />
  )
}

function AvatarFallback(props) {
  const { className, ...rest } = props
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full font-medium',
        className
      )}
      {...rest}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }