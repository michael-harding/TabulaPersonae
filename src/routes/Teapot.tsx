import Coffee from "lucide-solid/icons/coffee"

export default function Teapot() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-background p-4 text-center">
      <div class="space-y-4">
        <Coffee class="h-24 w-24 mx-auto text-primary" />
        <h1 class="text-6xl font-bold">418</h1>
        <p class="text-2xl text-muted-foreground">I'm a Teapot</p>
      </div>
    </div>
  )
}
