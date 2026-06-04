import * as React from 'react'
import { cn } from '../../lib/utils'

function Card(props) {
  const { className, ...rest } = props
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...rest}
    />
  )
}

function CardHeader(props) {
  const { className, ...rest } = props
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...rest}
    />
  )
}

function CardTitle(props) {
  const { className, ...rest } = props
  return (
    <h3
      data-slot="card-title"
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...rest}
    />
  )
}

function CardDescription(props) {
  const { className, ...rest } = props
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...rest}
    />
  )
}

function CardContent(props) {
  const { className, ...rest } = props
  return (
    <div
      data-slot="card-content"
      className={cn('p-6 pt-0', className)}
      {...rest}
    />
  )
}

function CardFooter(props) {
  const { className, ...rest } = props
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-6 pt-0', className)}
      {...rest}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }