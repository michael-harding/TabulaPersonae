import { createSignal, createEffect, on, untrack, For, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import ChevronDown from "lucide-solid/icons/chevron-down"
import ChevronLeft from "lucide-solid/icons/chevron-left"
import Pencil from "lucide-solid/icons/pencil"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import X from "lucide-solid/icons/x"

import { useTabConfig } from "@/lib/tab-config-context"
import { MODULE_REGISTRY, ALL_MODULE_IDS } from "@/lib/module-registry"
import type { TabConfig, ModuleId } from "@/lib/tab-config-types"
import { cn, HOVER_ACCENT, TOUCH_TARGET_BOX } from "@/lib/utils"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/form-validation"
import { requiredText, useFormValidation } from "@/hooks/use-form-validation"
import { SortableGroup, SortableHandle, SortableList, SortableMoveButton, createSortableItem, moveItem, type SortableItem } from "@/components/ui/sortable"

/**
 * The controls that move a row of a vertical list: the drag handle, whose menu makes every move, and
 * up/down buttons. On phones there's no room for the buttons beside a tab's own controls, so they
 * show from sm up only, and the menu is how a row moves there.
 */
function RowMoveControls(props: {
  item: SortableItem
  name: string
  index: number
  count: number
  onMove: (to: number) => void
  /** Prefixes the hooks of the controls; the handle's is `${hookPrefix}drag-handle-${hookSuffix}`. */
  hookPrefix: string
  hookSuffix: string
}) {
  return (
    <>
      <SortableHandle
        item={props.item}
        name={props.name}
        data-test={`${props.hookPrefix}drag-handle-${props.hookSuffix}`}
        menuItems={[
          { label: "Move up", disabled: props.index === 0, onSelect: () => props.onMove(props.index - 1), "data-test": `${props.hookPrefix}move-up-${props.hookSuffix}` },
          { label: "Move down", disabled: props.index === props.count - 1, onSelect: () => props.onMove(props.index + 1), "data-test": `${props.hookPrefix}move-down-${props.hookSuffix}` },
          { label: "Move to start", disabled: props.index === 0, onSelect: () => props.onMove(0), "data-test": `${props.hookPrefix}move-start-${props.hookSuffix}` },
          { label: "Move to end", disabled: props.index === props.count - 1, onSelect: () => props.onMove(props.count - 1), "data-test": `${props.hookPrefix}move-end-${props.hookSuffix}` },
        ]}
      />
      <SortableMoveButton
        item={props.item}
        name={props.name}
        direction="earlier"
        orientation="vertical"
        onMove={props.index > 0 ? () => props.onMove(props.index - 1) : undefined}
        data-test={`${props.hookPrefix}move-earlier-${props.hookSuffix}`}
        class="hidden sm:inline-flex"
      />
      <SortableMoveButton
        item={props.item}
        name={props.name}
        direction="later"
        orientation="vertical"
        onMove={props.index < props.count - 1 ? () => props.onMove(props.index + 1) : undefined}
        data-test={`${props.hookPrefix}move-later-${props.hookSuffix}`}
        class="hidden sm:inline-flex"
      />
    </>
  )
}

// --- Sortable module row ---

interface SortableModuleRowProps {
  /** The tab the row is in: a module can be in more than one, and its hooks must stay unique. */
  tabId: string
  moduleId: ModuleId
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
}

function SortableModuleRow(props: SortableModuleRowProps) {
  const item = createSortableItem(untrack(() => props.moduleId))
  const label = () => MODULE_REGISTRY[props.moduleId]?.label ?? props.moduleId
  return (
    <div
      ref={item.ref}
      style={item.style()}
      class={cn(
        "flex items-center gap-2 rounded transition-colors",
        item.isDragging() ? "opacity-25" : HOVER_ACCENT,
      )}
      data-sem="draggable-module"
    >
      <RowMoveControls item={item} name={label()} index={props.index} count={props.count} onMove={props.onMove} hookPrefix="module-" hookSuffix={`${props.tabId}-${props.moduleId}`} />
      <span class="flex-1 text-sm">{label()}</span>
      <ConfirmButton
        data-test={`remove-module-${props.tabId}-${props.moduleId}`}
        verb="Remove"
        subject={MODULE_REGISTRY[props.moduleId]?.label ?? props.moduleId}
        variant="ghostDestructive"
        size="bareIcon"
        onConfirm={props.onRemove}
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </ConfirmButton>
    </div>
  )
}

// --- Sortable tab row ---

interface SortableTabRowProps {
  tab: TabConfig
  index: number
  count: number
  onMove: (to: number) => void
  expanded: boolean
  onToggle: (open: boolean) => void
  onRename: (label: string) => void
  onDelete: () => void
  onAddModule: (moduleId: ModuleId) => void
  onRemoveModule: (moduleId: ModuleId) => void
  onReorderModules: (fromIndex: number, toIndex: number) => void
  disableDelete: boolean
}

function SortableTabRow(props: SortableTabRowProps) {
  const item = createSortableItem(untrack(() => props.tab.id))
  const [renaming, setRenaming] = createSignal(false)
  const [renameValue, setRenameValue] = createSignal("")
  const renameId = () => `tab-rename-${props.tab.id}`
  const renameValidation = useFormValidation(() => [requiredText(renameId(), "Tab name", renameValue())])
  let renameInput: HTMLInputElement | undefined
  createEffect(() => {
    if (!renaming()) setRenameValue(props.tab.label)
  })
  // Each rename starts with no message showing
  createEffect(on(renaming, () => renameValidation.reset(), { defer: true }))

  const moduleIds = () => props.tab.modules

  const onModuleMove = (moduleId: string, to: { index: number }) => {
    const from = moduleIds().indexOf(moduleId as ModuleId)
    if (from >= 0 && from !== to.index) props.onReorderModules(from, to.index)
  }
  const describeModule = (moduleId: string) =>
    `${MODULE_REGISTRY[moduleId as ModuleId]?.label ?? moduleId} moved to position ${moduleIds().indexOf(moduleId as ModuleId) + 1} of ${moduleIds().length}`

  const availableModules = () => ALL_MODULE_IDS.filter((m) => !props.tab.modules.includes(m))

  const submitRename = () => {
    if (!renameValidation.validate()) {
      renameInput?.focus()
      return
    }
    props.onRename(renameValue().trim())
    setRenaming(false)
  }

  return (
    <div
      ref={item.ref}
      data-test={`tab-row-${props.tab.id}`}
      style={item.style()}
      class={cn("border rounded-md bg-card transition-opacity", item.isDragging() && "opacity-25")}
    >
      <Collapsible open={props.expanded} onOpenChange={props.onToggle}>
        <div class="flex items-center gap-2 px-3 py-1">
          <RowMoveControls item={item} name={props.tab.label} index={props.index} count={props.count} onMove={props.onMove} hookPrefix="tab-" hookSuffix={props.tab.id} />

          {/* Tab label or rename form */}
          <Show
            when={renaming()}
            fallback={
              <span class="flex-1 font-medium truncate">{props.tab.label}</span>
            }
          >
            {/* A single field: the lighter validation form (see FieldError). noValidate keeps the
                browser's own required-field popup out of the way. */}
            <form
              onSubmit={(e) => { e.preventDefault(); submitRename() }}
              noValidate
              class="flex-1"
            >
              <div class="flex gap-2">
                <Input
                  ref={renameInput}
                  id={renameId()}
                  value={renameValue()}
                  onInput={(e) => setRenameValue(e.currentTarget.value)}
                  autofocus
                  required
                  aria-label={`New name for ${props.tab.label}`}
                  {...renameValidation.controlProps(renameId())}
                  class="h-11 text-sm"
                  data-test={`tab-rename-input-${props.tab.id}`}
                />
                <Button type="submit" size="sm" class="h-11" data-test={`tab-rename-save-${props.tab.id}`}>Save</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-11"
                  onClick={() => { setRenaming(false); setRenameValue(props.tab.label) }}
                  data-test={`tab-rename-cancel-${props.tab.id}`}
                >
                  Cancel
                </Button>
              </div>
              <FieldError validation={renameValidation} fieldId={renameId()} announce />
            </form>
          </Show>

          {/* Action buttons — hidden while renaming */}
          <Show when={!renaming()}>
            <div class="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => { setRenameValue(props.tab.label); setRenaming(true) }}
                class={cn(TOUCH_TARGET_BOX, "text-muted-foreground hover:text-foreground transition-colors")}
                aria-label={`Rename ${props.tab.label}`}
                data-test={`tab-rename-${props.tab.id}`}
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </button>
              <ConfirmButton
                data-test={`tab-delete-${props.tab.id}`}
                verb="Delete"
                subject="tab"
                variant="ghostDestructive"
                size="bareIcon"
                onConfirm={props.onDelete}
                disabled={props.disableDelete}
                class="disabled:pointer-events-auto disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </ConfirmButton>
              <CollapsibleTrigger
                class={cn(TOUCH_TARGET_BOX, "text-muted-foreground hover:text-foreground transition-colors")}
                data-test={`tab-toggle-${props.tab.id}`}
                aria-label={`${props.expanded ? "Collapse" : "Expand"} ${props.tab.label}`}
              >
                <ChevronDown
                  class={cn("h-4 w-4 transition-transform duration-200", props.expanded && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
          </Show>
        </div>

        <CollapsibleContent>
          <div class="px-4 pb-4 space-y-4 border-t pt-3">
            {/* Module list */}
            <div>
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modules</p>
              <Show
                when={props.tab.modules.length > 0}
                fallback={
                  <p class="mt-1 text-sm text-muted-foreground py-2">No modules added yet.</p>
                }
              >
                <SortableGroup onMove={onModuleMove} describe={describeModule} data-test={`tab-modules-${props.tab.id}`}>
                  <SortableList id="modules" ids={moduleIds()}>
                    <For each={props.tab.modules}>
                      {(moduleId, index) => (
                        <SortableModuleRow
                          tabId={props.tab.id}
                          moduleId={moduleId}
                          index={index()}
                          count={props.tab.modules.length}
                          onMove={(to) => props.onReorderModules(index(), to)}
                          onRemove={() => props.onRemoveModule(moduleId)}
                        />
                      )}
                    </For>
                  </SortableList>
                </SortableGroup>
              </Show>
            </div>

            {/* Available modules to add */}
            <Show when={availableModules().length > 0}>
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Module</p>
                <div class="flex flex-wrap gap-x-2">
                  <For each={availableModules()}>
                    {(moduleId) => (
                      <ChipButton
                        data-test={`add-module-${props.tab.id}-${moduleId}`}
                        action="add"
                        variant="outline"
                        onClick={() => props.onAddModule(moduleId)}
                      >
                        {MODULE_REGISTRY[moduleId].label}
                      </ChipButton>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// --- Main TabSettings page ---

export default function TabSettings() {
  const navigate = useNavigate()
  const { tabConfig, saveTabConfig } = useTabConfig()

  const [expandedTabs, setExpandedTabs] = createSignal<Set<string>>(new Set())
  createEffect(() => {
    const tabs = tabConfig().tabs
    const validIds = new Set(tabs.map((t) => t.id))
    setExpandedTabs((prev) => {
      const filtered = new Set([...prev].filter((id) => validIds.has(id)))
      if (filtered.size === 0 && tabs.length > 0) filtered.add(tabs[0].id)
      return filtered
    })
  })
  const [addingTab, setAddingTab] = createSignal(false)
  const [newTabLabel, setNewTabLabel] = createSignal("")

  const tabs = () => tabConfig().tabs
  const tabIds = () => tabs().map((t) => t.id)

  const updateTabs = (updated: TabConfig[]) => saveTabConfig({ tabs: updated })

  const addTabValidation = useFormValidation(() => [requiredText("new-tab-name", "Tab name", newTabLabel())])
  let newTabInput: HTMLInputElement | undefined
  // Each time the form opens, it starts with no message showing
  createEffect(on(addingTab, () => addTabValidation.reset(), { defer: true }))

  const addTab = () => {
    if (!addTabValidation.validate()) {
      newTabInput?.focus()
      return
    }
    const label = newTabLabel().trim()
    const newTab: TabConfig = { id: crypto.randomUUID(), label, modules: [] }
    updateTabs([...tabs(), newTab])
    setExpandedTabs((prev) => new Set([...prev, newTab.id]))
    setNewTabLabel("")
    setAddingTab(false)
  }

  const deleteTab = (tabId: string) => {
    if (tabs().length <= 1) return
    updateTabs(tabs().filter((t) => t.id !== tabId))
    setExpandedTabs((prev) => { const next = new Set(prev); next.delete(tabId); return next })
  }

  const renameTab = (tabId: string, label: string) => {
    updateTabs(tabs().map((t) => (t.id === tabId ? { ...t, label } : t)))
  }

  const addModule = (tabId: string, moduleId: ModuleId) => {
    updateTabs(tabs().map((t) => (t.id === tabId ? { ...t, modules: [...t.modules, moduleId] } : t)))
  }

  const removeModule = (tabId: string, moduleId: ModuleId) => {
    updateTabs(tabs().map((t) => (t.id === tabId ? { ...t, modules: t.modules.filter((m) => m !== moduleId) } : t)))
  }

  const reorderModules = (tabId: string, fromIndex: number, toIndex: number) => {
    updateTabs(tabs().map((t) => (t.id === tabId ? { ...t, modules: moveItem(t.modules, fromIndex, toIndex) } : t)))
  }

  const moveTab = (fromIndex: number, toIndex: number) => updateTabs(moveItem(tabs(), fromIndex, toIndex))
  const onTabMove = (tabId: string, to: { index: number }) => {
    const from = tabIds().indexOf(tabId)
    if (from >= 0 && from !== to.index) moveTab(from, to.index)
  }
  const describeTab = (tabId: string) => {
    const index = tabIds().indexOf(tabId)
    return `${tabs()[index]?.label ?? tabId} moved to position ${index + 1} of ${tabs().length}`
  }

  const toggleExpanded = (tabId: string, open: boolean) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev)
      if (open) next.add(tabId)
      else next.delete(tabId)
      return next
    })
  }

  return (
    <div data-sem="tab-settings-route" class="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          // 44px tall; the negative margin offsets the padding so "‹ Back" stays where it was.
          class="-mx-2 -my-3 flex min-h-11 items-center gap-1 px-2 text-sm text-primary hover:underline"
          data-test="back-button"
        >
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <div>
        <h1 class="text-2xl font-bold">Tab Settings</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Configure the tabs on your character sheet. Reorder tabs, or modules within a tab, by dragging their handle or choosing a move from its menu.
        </p>
      </div>

      {/* Tab list — outer sortable */}
      <SortableGroup onMove={onTabMove} describe={describeTab} data-test="tabs">
        <SortableList id="tabs" ids={tabIds()} class="space-y-2">
          <For each={tabs()}>
            {(tab, index) => (
              <SortableTabRow
                tab={tab}
                index={index()}
                count={tabs().length}
                onMove={(to) => moveTab(index(), to)}
                expanded={expandedTabs().has(tab.id)}
                onToggle={(open) => toggleExpanded(tab.id, open)}
                onRename={(label) => renameTab(tab.id, label)}
                onDelete={() => deleteTab(tab.id)}
                onAddModule={(moduleId) => addModule(tab.id, moduleId)}
                onRemoveModule={(moduleId) => removeModule(tab.id, moduleId)}
                onReorderModules={(from, to) => reorderModules(tab.id, from, to)}
                disableDelete={tabs().length <= 1}
              />
            )}
          </For>
        </SortableList>
      </SortableGroup>

      {/* Add tab */}
      <Show
        when={addingTab()}
        fallback={
          <Button variant="outline" onClick={() => setAddingTab(true)} data-test="add-tab-button">
            <Plus class="h-4 w-4 mr-2" aria-hidden="true" />
            Add Tab
          </Button>
        }
      >
        {/* A single field: the lighter validation form (see FieldError). noValidate keeps the
            browser's own required-field popup out of the way. */}
        <form
          onSubmit={(e) => { e.preventDefault(); addTab() }}
          noValidate
        >
          <div class="flex gap-2">
            {/* aria-label: the row's design has no visible label (the placeholder says what it is),
                like the rename field (ACCESSIBILITY.md §11) */}
            <Input
              ref={newTabInput}
              id="new-tab-name"
              placeholder="Tab name"
              aria-label="New tab name"
              value={newTabLabel()}
              onInput={(e) => setNewTabLabel(e.currentTarget.value)}
              autofocus
              required
              {...addTabValidation.controlProps("new-tab-name")}
              data-test="new-tab-name-input"
            />
            <Button type="submit" data-test="add-tab-submit">Add</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setAddingTab(false); setNewTabLabel("") }}
              data-test="add-tab-cancel"
            >
              Cancel
            </Button>
          </div>
          <FieldError validation={addTabValidation} fieldId="new-tab-name" announce />
        </form>
      </Show>
    </div>
  )
}
