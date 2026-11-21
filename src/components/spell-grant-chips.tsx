import { For, Show } from "solid-js"

import { Chip } from "@/components/ui/chip"
import { Tooltip } from "@/components/ui/tooltip"
import { inactiveGrantReason, type SpellGrantSource } from "@/lib/character-utils"

/**
 * The features and items that give a spell, one display chip each. They're set on the feature or
 * item, never here. A source that doesn't give the spell now (an item not equipped/attuned, a
 * feature tier not reached) is dimmed, with a tooltip saying why.
 */
export function SpellGrantChips(props: { "data-test": string; sources: readonly SpellGrantSource[] }) {
  return (
    <Show when={props.sources.length > 0}>
      <For each={props.sources}>
        {(source) => (
          <Show
            when={!source.active}
            fallback={<Chip data-test={`${props["data-test"]}-${source.key}`} variant="outline" class="text-xs">Granted: {source.name}</Chip>}
          >
            <Tooltip content={inactiveGrantReason(source)} triggerFocusable triggerLabel={`Granted: ${source.name}, ${inactiveGrantReason(source)}`}>
              <Chip data-test={`${props["data-test"]}-inactive-${source.key}`} variant="outline" class="text-xs text-muted-foreground italic">Granted: {source.name}</Chip>
            </Tooltip>
          </Show>
        )}
      </For>
    </Show>
  )
}

/** The tooltip of a spell an active feature makes always prepared, naming each feature. */
export function alwaysPreparedTooltip(sources: readonly SpellGrantSource[], cantrip: boolean): string {
  const names = sources.filter((source) => source.active && source.alwaysPrepared).map((source) => source.name)
  return `Always ${cantrip ? "known" : "prepared"} (${names.join(", ")})`
}
