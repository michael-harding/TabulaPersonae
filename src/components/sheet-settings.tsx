import { For, Show, createResource, createSignal, createUniqueId } from "solid-js"
import QRCode from "qrcode"
import Settings2 from "lucide-solid/icons/settings-2"
import Pipette from "lucide-solid/icons/pipette"
import Share2 from "lucide-solid/icons/share-2"

import type { Character } from "@/lib/character-types"
import { Label } from "@/components/ui/label"
import { SwitchButton } from "@/components/ui/switch-button"
import { useAuth } from "@/lib/auth-context"
import { oklchToHex, parseHex, readableOn, SHEET_COLOR_PRESETS } from "@/lib/sheet-color"
import { cn, HOVER_ACCENT, TOUCH_TARGET, TOUCH_TARGET_BOX } from "@/lib/utils"

// The open character's own settings, shown in the sidebar menu (src/components/sidebar-menu.tsx).
// Each section has its own heading, so a section that is not offered takes its heading with it.

interface SettingsSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}

const UNSET_CUSTOM_SWATCH = oklchToHex({ l: 0.75, c: 0, h: 0 })
// A swatch can be any colour, so what marks it out comes from the theme: its border and this ring.
// The ring's gap takes the colour of the surface the swatches sit on, the sidebar's background.
const SELECTED_SWATCH_RING = "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)"

const SECTION = "flex flex-col gap-3 border-t px-4 py-4"
const HEADING = "flex items-center gap-2 text-sm font-semibold"

/** Edition and sheet colour. */
export function SheetSettingsSection(props: SettingsSectionProps) {
  const headingId = createUniqueId()
  const edition = () => props.character.edition ?? "2024"
  const sheetColor = () => props.character.sheetColor

  const isPresetSelected = (hex: string) => sheetColor() === hex
  const isCustomColor = () => !!sheetColor() && !SHEET_COLOR_PRESETS.some((p) => p.hex === sheetColor())
  const pipetteColor = () => readableOn(isCustomColor() && parseHex(sheetColor()!) != null ? sheetColor()! : UNSET_CUSTOM_SWATCH)

  return (
    <section data-sem="sheet-settings-section" aria-labelledby={headingId} class={SECTION}>
      <h3 id={headingId} class={HEADING}>
        <Settings2 class="h-4 w-4 text-primary" aria-hidden="true" />
        Sheet Settings
      </h3>

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

      <div class="flex flex-col gap-1">
        <Label class="text-sm font-medium">Sheet Color</Label>
        {/* Seven 44px swatches are wider than the sidebar, so they wrap */}
        <div data-test="sheet-color-swatches" class="flex flex-wrap items-center">
          <For each={SHEET_COLOR_PRESETS}>
            {(preset) => (
              <button
                type="button"
                data-test={`sheet-color-preset-${preset.name.toLowerCase()}`}
                aria-label={`${preset.name} theme color`}
                aria-pressed={isPresetSelected(preset.hex)}
                class="w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => props.onUpdate({ ...props.character, sheetColor: preset.hex })}
              >
                <span
                  class="w-6 h-6 rounded-full border border-input transition-all"
                  style={{ "background-color": preset.hex, "box-shadow": isPresetSelected(preset.hex) ? SELECTED_SWATCH_RING : "none" }}
                />
              </button>
            )}
          </For>

          <label
            class="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
          >
            <span
              class="relative w-6 h-6 rounded-full border border-input transition-all flex items-center justify-center overflow-hidden"
              style={{
                "background-color": isCustomColor() ? sheetColor()! : UNSET_CUSTOM_SWATCH,
                "box-shadow": isCustomColor() ? SELECTED_SWATCH_RING : "none",
              }}
            >
              <input
                type="color"
                data-test="sheet-color-custom-input"
                aria-label={isCustomColor() ? "Custom theme color, selected" : "Custom theme color"}
                value={isCustomColor() ? sheetColor()! : "#6366f1"}
                onInput={(e) => props.onUpdate({ ...props.character, sheetColor: e.currentTarget.value })}
                class="absolute inset-0 w-full h-full cursor-pointer border-none p-0 opacity-0"
              />
              <Pipette class="h-3 w-3 pointer-events-none" style={{ color: pipetteColor() }} aria-hidden="true" />
            </span>
          </label>

          <Show when={sheetColor()}>
            <button
              type="button"
              data-test="sheet-color-reset-button"
              aria-label="Reset sheet color"
              class={cn(TOUCH_TARGET_BOX, "px-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline")}
              onClick={() => props.onUpdate({ ...props.character, sheetColor: undefined })}
            >
              Reset
            </button>
          </Show>
        </div>
      </div>
    </section>
  )
}

/**
 * Public sharing. A shared sheet is read from the account's database, so without a signed-in user
 * there is nothing to share and no link to give out: the section is not shown at all.
 */
export function SharingSection(props: SettingsSectionProps) {
  const { user } = useAuth()
  return (
    <Show when={user() != null}>
      <SharingContent {...props} />
    </Show>
  )
}

// Split out so the share-link QR resource is only set up for a signed-in user
function SharingContent(props: SettingsSectionProps) {
  const headingId = createUniqueId()
  const shareUrl = () => (props.character.isPublic ? `${window.location.origin}/share/${props.character.id}` : null)
  const [qrDataUrl] = createResource(shareUrl, (url) =>
    QRCode.toDataURL(url, { width: 160, margin: 1 })
  )
  const [copied, setCopied] = createSignal(false)

  return (
    <section data-sem="sharing-section" aria-labelledby={headingId} class={SECTION}>
      <h3 id={headingId} class={HEADING}>
        <Share2 class="h-4 w-4 text-primary" aria-hidden="true" />
        Public Sharing
      </h3>
      <div class="flex items-center gap-3">
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
                data-test="share-url-input"
                readOnly
                value={getUrl()}
                aria-label="Share URL"
                class="min-w-0 flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground select-all"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                data-test="share-url-copy-button"
                aria-label="Copy share link"
                class={cn(TOUCH_TARGET, HOVER_ACCENT, "h-9 px-3 rounded-md border text-xs transition-colors whitespace-nowrap")}
                onClick={() => {
                  navigator.clipboard.writeText(getUrl())
                    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
                    .catch(() => {})
                }}
              >
                {copied() ? "Copied!" : "Copy link"}
              </button>
            </div>
            <Show when={qrDataUrl.error}>
              <p role="alert" class="text-xs text-destructive-text">Failed to generate QR code.</p>
            </Show>
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
    </section>
  )
}
