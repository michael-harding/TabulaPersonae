import { ComponentProps, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export function Card(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div data-sem="card" class={cn("rounded-lg border border-primary bg-card text-card-foreground shadow-sm", local.class)} {...others} />
  )
}

// Narrower side padding on phones, where every pixel of width goes to the content
const CARD_PADDING_X = "px-3 sm:px-6"

export function CardHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex flex-col space-y-1.5 py-6", CARD_PADDING_X, local.class)} {...others} />
}

export function CardTitle(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div class={cn("text-2xl font-semibold leading-none tracking-tight text-primary", local.class)} {...others} />
  )
}

export function CardDescription(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("text-sm text-muted-foreground", local.class)} {...others} />
}

export function CardContent(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("pb-6", CARD_PADDING_X, local.class)} {...others} />
}

export function CardFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex items-center pb-6", CARD_PADDING_X, local.class)} {...others} />
}
