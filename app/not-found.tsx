import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ghost } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <Ghost className="h-24 w-24 mb-6 text-muted-foreground" />
      <h1 className="text-4xl font-bold mb-2">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8">The character or page you are looking for has vanished into the Ethereal Plane.</p>
      <Link href="/">
        <Button variant="default">
          Back to Character List
        </Button>
      </Link>
    </div>
  )
}