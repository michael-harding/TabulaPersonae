import { toast } from "@/hooks/use-toast"

interface FailureMessage {
  title: string
  description: string
}

/**
 * Tells the user when a storage write did not succeed. Storage functions resolve `false` on
 * failure instead of throwing, and log the cause themselves (see storage-manager.ts and
 * firebase-storage.ts), so each caller has to check the result for the user to hear about it.
 *
 * Do not await this before updating the screen or navigating. While a signed-in user is offline
 * Firestore keeps the write pending, and the promise settles only once the server has answered.
 */
export async function notifyIfFailed(result: Promise<boolean>, message: FailureMessage): Promise<boolean> {
  // unknown: a rejected promise can carry any value
  const succeeded = await result.catch((error: unknown) => {
    console.error(`${message.title}:`, error)
    return false
  })
  if (!succeeded) toast({ ...message, variant: "destructive" })
  return succeeded
}
