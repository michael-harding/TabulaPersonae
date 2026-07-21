import { For, Show, createResource } from "solid-js"
import QRCode from "qrcode"
import type { Character } from "@/lib/character-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { SwitchButton } from "@/components/ui/switch-button"
import { useReadOnly } from "@/lib/read-only-context"
import Settings2 from "lucide-solid/icons/settings-2"
import Pipette from "lucide-solid/icons/pipette"
import Share2 from "lucide-solid/icons/share-2"

interface SheetSettingsProps {
  character: Character
  onUpdate: (character: Character) => void
}

const PRESET_COLORS = [
  { name: "Green", hex: "#22c55e" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Gold", hex: "#eab308" },
]

export function SheetSettings(props: SheetSettingsProps) {
  const isReadOnly = useReadOnly()
  if (isReadOnly) return null
  const edition = () => props.character.edition ?? "2024"
  const sheetColor = () => props.character.sheetColor
  const shareUrl = () =>
    props.character.isPublic ? `${window.location.origin}/share/${props.character.id}` : null
  const [qrDataUrl] = createResource(shareUrl, (url) =>
    QRCode.toDataURL(url, { width: 160, margin: 1 })
  )

  const isPresetSelected = (hex: string) => sheetColor() === hex
  const isCustomColor = () => !!sheetColor() && !PRESET_COLORS.some((p) => p.hex === sheetColor())

  return (
    <Card data-sem="sheet-settings">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Settings2 class="h-5 w-5 text-primary" />
          Sheet Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
          <div class="flex items-center gap-3">
            <Label class="text-sm font-medium whitespace-nowrap">Edition</Label>
            <SwitchButton
              optionA="2014"
              optionB="2024"
              value={edition()}
              onChange={(v) => props.onUpdate({ ...props.character, edition: v as "2014" | "2024" })}
              id="sheet-settings-edition-switch"
            />
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <Label class="text-sm font-medium whitespace-nowrap">Sheet Color</Label>
            <div class="flex items-center gap-1">
              <For each={PRESET_COLORS}>
                {(preset) => (
                  <button
                    type="button"
                    aria-label={`${preset.name} theme color`}
                    class="w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => props.onUpdate({ ...props.character, sheetColor: preset.hex })}
                  >
                    <span
                      class="w-6 h-6 rounded-full transition-all"
                      style={{ "background-color": preset.hex, "box-shadow": isPresetSelected(preset.hex) ? `0 0 0 2px white, 0 0 0 4px ${preset.hex}` : "none" }}
                    />
                  </button>
                )}
              </For>

              <label
                class="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
              >
                <span
                  class="relative w-6 h-6 rounded-full transition-all flex items-center justify-center overflow-hidden"
                  style={{
                    "background-color": isCustomColor() ? sheetColor()! : "oklch(0.75 0 0)",
                    "box-shadow": isCustomColor() ? `0 0 0 2px white, 0 0 0 4px ${sheetColor()}` : "none",
                  }}
                >
                  <input
                    type="color"
                    aria-label="Custom theme color"
                    value={isCustomColor() ? sheetColor()! : "#6366f1"}
                    onInput={(e) => props.onUpdate({ ...props.character, sheetColor: e.currentTarget.value })}
                    class="absolute inset-0 w-full h-full cursor-pointer border-none p-0 opacity-0"
                  />
                  <Pipette class="h-3 w-3 text-white drop-shadow pointer-events-none" />
                </span>
              </label>
            </div>

            <Show when={sheetColor()}>
              <button
                type="button"
                aria-label="Reset sheet color"
                class="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                onClick={() => props.onUpdate({ ...props.character, sheetColor: undefined })}
              >
                Reset
              </button>
            </Show>
          </div>
        </div>

        <div class="border-t pt-4 mt-1">
          <div class="flex items-center gap-2 mb-3">
            <Share2 class="h-4 w-4 text-primary" />
            <Label class="text-sm font-medium">Public Sharing</Label>
          </div>
          <div class="flex items-center gap-3 mb-3">
            <Label class="text-sm whitespace-nowrap">Share publicly</Label>
            <SwitchButton
              optionA="Off"
              optionB="On"
              value={props.character.isPublic ? "On" : "Off"}
              onChange={(v) => props.onUpdate({ ...props.character, isPublic: v === "On" })}
              id="sheet-settings-share-switch"
            />
          </div>
          <Show when={shareUrl()}>
            {(getUrl) => (
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getUrl()}
                    aria-label="Share URL"
                    class="flex-1 h-9 rounded-md border bg-muted px-3 text-xs text-muted-foreground select-all"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    aria-label="Copy share link"
                    class="h-9 px-3 rounded-md border text-xs hover:bg-accent transition-colors whitespace-nowrap"
                    onClick={() => navigator.clipboard.writeText(getUrl())}
                  >
                    Copy link
                  </button>
                </div>
                <Show when={qrDataUrl()}>
                  <img
                    src={qrDataUrl()!}
                    alt="QR code for share link"
                    width={160}
                    height={160}
                    class="rounded-md border"
                  />
                </Show>
              </div>
            )}
          </Show>
        </div>
      </CardContent>
    </Card>
  )
}
