import { ComponentProps, splitProps } from "solid-js"
import { cn } from "@/lib/utils"

export function Card(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <div class={cn("rounded-lg border border-primary bg-card text-card-foreground shadow-sm", local.class)} {...others} />
  )
}

export function CardHeader(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex flex-col space-y-1.5 p-6", local.class)} {...others} />
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
  return <div class={cn("p-6 pt-0", local.class)} {...others} />
}

export function CardFooter(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"])
  return <div class={cn("flex items-center p-6 pt-0", local.class)} {...others} />
}
