import { Coffee } from "lucide-react"

export default function TeapotPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4">
        <Coffee className="h-24 w-24 mx-auto text-primary" />
        <h1 className="text-6xl font-bold">418</h1>
        <p className="text-2xl text-muted-foreground">I'm a Teapot</p>
      </div>
    </div>
  )
}
