import { A } from "@solidjs/router"
import { Button } from "@/components/ui/button"
import Ghost from "lucide-solid/icons/ghost"

export default function NotFound() {
  return (
    <div class="flex flex-1 flex-col items-center justify-center bg-background p-4 text-center">
      <Ghost class="h-24 w-24 mb-6 text-muted-foreground" />
      <h1 class="text-4xl font-bold mb-2">404 - Not Found</h1>
      <p class="text-muted-foreground mb-8">The character or page you are looking for has vanished into the Ethereal Plane.</p>
      <A href="/">
        <Button variant="default">Back to Character List</Button>
      </A>
    </div>
  )
}
