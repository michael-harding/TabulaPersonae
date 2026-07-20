import { createSignal, For, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import {
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  createSortable,
  closestCenter,
  maybeTransformStyle,
} from "@thisbeyond/solid-dnd"
import type { DragEvent } from "@thisbeyond/solid-dnd"
import { useTabConfig } from "@/lib/tab-config-context"
import { MODULE_REGISTRY, ALL_MODULE_IDS } from "@/lib/module-registry"
import type { TabConfig, ModuleId } from "@/lib/tab-config-types"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ChevronDown from "lucide-solid/icons/chevron-down"
import ChevronLeft from "lucide-solid/icons/chevron-left"
import GripVertical from "lucide-solid/icons/grip-vertical"
import Pencil from "lucide-solid/icons/pencil"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import X from "lucide-solid/icons/x"

// Tell TypeScript about the `use:sortable` directive
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortable: any
    }
  }
}

// --- Sortable module row ---

interface SortableModuleRowProps {
  moduleId: ModuleId
  onRemove: () => void
}

function SortableModuleRow(props: SortableModuleRowProps) {
  // eslint-disable-next-line solid/reactivity
  const sortable = createSortable(props.moduleId)
  return (
    <div
      ref={sortable.ref}
      style={maybeTransformStyle(sortable.transform)}
      class={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded transition-colors",
        sortable.isActiveDraggable ? "opacity-25" : "hover:bg-accent",
      )}
    >
      <button
        type="button"
        class="cursor-grab touch-none text-muted-foreground"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(sortable.dragActivators as any)}
        aria-label="Drag to reorder"
      >
        <GripVertical class="h-4 w-4" />
      </button>
      <span class="flex-1 text-sm">{MODULE_REGISTRY[props.moduleId].label}</span>
      <button
        type="button"
        onClick={props.onRemove}
        class="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove ${MODULE_REGISTRY[props.moduleId].label}`}
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  )
}

// --- Sortable tab row ---

interface SortableTabRowProps {
  tab: TabConfig
  expanded: boolean
  onToggle: (open: boolean) => void
  onRename: (label: string) => void
  onDelete: () => void
  onAddModule: (moduleId: ModuleId) => void
  onRemoveModule: (moduleId: ModuleId) => void
  onReorderModules: (fromIndex: number, toIndex: number) => void
}

function SortableTabRow(props: SortableTabRowProps) {
  // eslint-disable-next-line solid/reactivity
  const sortable = createSortable(props.tab.id)
  const [renaming, setRenaming] = createSignal(false)
  const [renameValue, setRenameValue] = createSignal(props.tab.label)

  const moduleIds = () => props.tab.modules

  const onModuleDragEnd = ({ draggable, droppable }: DragEvent) => {
    if (!droppable) return
    const from = moduleIds().indexOf(draggable.id as ModuleId)
    const to = moduleIds().indexOf(droppable.id as ModuleId)
    if (from !== to) props.onReorderModules(from, to)
  }

  const availableModules = () => ALL_MODULE_IDS.filter((m) => !props.tab.modules.includes(m))

  const submitRename = () => {
    const label = renameValue().trim()
    if (label) props.onRename(label)
    setRenaming(false)
  }

  return (
    <div
      ref={sortable.ref}
      style={maybeTransformStyle(sortable.transform)}
      class={cn("border rounded-md bg-card transition-opacity", sortable.isActiveDraggable && "opacity-25")}
    >
      <Collapsible open={props.expanded} onOpenChange={props.onToggle}>
        <div class="flex items-center gap-2 p-3">
          {/* Drag handle for tab reordering */}
          <button
            type="button"
            class="cursor-grab touch-none text-muted-foreground shrink-0"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...(sortable.dragActivators as any)}
            aria-label="Drag to reorder tab"
          >
            <GripVertical class="h-4 w-4" />
          </button>

          {/* Tab label or rename form */}
          <Show
            when={renaming()}
            fallback={
              <span class="flex-1 font-medium truncate">{props.tab.label}</span>
            }
          >
            <form
              onSubmit={(e) => { e.preventDefault(); submitRename() }}
              class="flex-1 flex gap-2"
            >
              <Input
                value={renameValue()}
                onInput={(e) => setRenameValue(e.currentTarget.value)}
                autofocus
                class="h-7 text-sm"
              />
              <Button type="submit" size="sm" class="h-7">Save</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-7"
                onClick={() => { setRenaming(false); setRenameValue(props.tab.label) }}
              >
                Cancel
              </Button>
            </form>
          </Show>

          {/* Action buttons — hidden while renaming */}
          <Show when={!renaming()}>
            <button
              type="button"
              onClick={() => { setRenameValue(props.tab.label); setRenaming(true) }}
              class="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Rename tab"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={props.onDelete}
              class="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              aria-label="Delete tab"
            >
              <Trash2 class="h-4 w-4" />
            </button>
            <CollapsibleTrigger class="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ChevronDown
                class={cn("h-4 w-4 transition-transform duration-200", props.expanded && "rotate-180")}
              />
            </CollapsibleTrigger>
          </Show>
        </div>

        <CollapsibleContent>
          <div class="px-4 pb-4 space-y-4 border-t pt-3">
            {/* Module list */}
            <div class="space-y-1">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modules</p>
              <Show
                when={props.tab.modules.length > 0}
                fallback={
                  <p class="text-sm text-muted-foreground py-2">No modules added yet.</p>
                }
              >
                <DragDropProvider onDragEnd={onModuleDragEnd} collisionDetector={closestCenter}>
                  <DragDropSensors />
                  <SortableProvider ids={moduleIds()}>
                    <For each={props.tab.modules}>
                      {(moduleId) => (
                        <SortableModuleRow
                          moduleId={moduleId}
                          onRemove={() => props.onRemoveModule(moduleId)}
                        />
                      )}
                    </For>
                  </SortableProvider>
                </DragDropProvider>
              </Show>
            </div>

            {/* Available modules to add */}
            <Show when={availableModules().length > 0}>
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Module</p>
                <div class="flex flex-wrap gap-2">
                  <For each={availableModules()}>
                    {(moduleId) => (
                      <button
                        type="button"
                        onClick={() => props.onAddModule(moduleId)}
                        class="flex items-center gap-1 px-2.5 py-1 text-xs border rounded hover:bg-accent transition-colors"
                      >
                        <Plus class="h-3 w-3" />
                        {MODULE_REGISTRY[moduleId].label}
                      </button>
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

  const [expandedTabs, setExpandedTabs] = createSignal<Set<string>>(
    new Set(tabConfig().tabs.slice(0, 1).map((t) => t.id)),
  )
  const [addingTab, setAddingTab] = createSignal(false)
  const [newTabLabel, setNewTabLabel] = createSignal("")

  const tabs = () => tabConfig().tabs
  const tabIds = () => tabs().map((t) => t.id)

  const updateTabs = (updated: TabConfig[]) => saveTabConfig({ tabs: updated })

  const addTab = () => {
    const label = newTabLabel().trim()
    if (!label) return
    const newTab: TabConfig = { id: crypto.randomUUID(), label, modules: [] }
    updateTabs([...tabs(), newTab])
    setExpandedTabs((prev) => new Set([...prev, newTab.id]))
    setNewTabLabel("")
    setAddingTab(false)
  }

  const deleteTab = (tabId: string) => {
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
    updateTabs(
      tabs().map((t) => {
        if (t.id !== tabId) return t
        const mods = [...t.modules]
        mods.splice(toIndex, 0, mods.splice(fromIndex, 1)[0])
        return { ...t, modules: mods }
      }),
    )
  }

  const onTabDragEnd = ({ draggable, droppable }: DragEvent) => {
    if (!droppable) return
    const fromIndex = tabIds().indexOf(draggable.id as string)
    const toIndex = tabIds().indexOf(droppable.id as string)
    if (fromIndex !== toIndex) {
      const reordered = [...tabs()]
      reordered.splice(toIndex, 0, reordered.splice(fromIndex, 1)[0])
      updateTabs(reordered)
    }
  }

  const toggleExpanded = (tabId: string, open: boolean) => {
    setExpandedTabs((prev) => {
      const next = new Set(prev)
      open ? next.add(tabId) : next.delete(tabId)
      return next
    })
  }

  return (
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          class="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft class="h-4 w-4" />
          Back
        </button>
      </div>

      <div>
        <h1 class="text-2xl font-bold">Tab Settings</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Configure the tabs on your character sheet. Drag to reorder tabs or modules within a tab.
        </p>
      </div>

      {/* Tab list — outer sortable */}
      <DragDropProvider onDragEnd={onTabDragEnd} collisionDetector={closestCenter}>
        <DragDropSensors />
        <SortableProvider ids={tabIds()}>
          <div class="space-y-2">
            <For each={tabs()}>
              {(tab) => (
                <SortableTabRow
                  tab={tab}
                  expanded={expandedTabs().has(tab.id)}
                  onToggle={(open) => toggleExpanded(tab.id, open)}
                  onRename={(label) => renameTab(tab.id, label)}
                  onDelete={() => deleteTab(tab.id)}
                  onAddModule={(moduleId) => addModule(tab.id, moduleId)}
                  onRemoveModule={(moduleId) => removeModule(tab.id, moduleId)}
                  onReorderModules={(from, to) => reorderModules(tab.id, from, to)}
                />
              )}
            </For>
          </div>
        </SortableProvider>
      </DragDropProvider>

      {/* Add tab */}
      <Show
        when={addingTab()}
        fallback={
          <Button variant="outline" onClick={() => setAddingTab(true)}>
            <Plus class="h-4 w-4 mr-2" />
            Add Tab
          </Button>
        }
      >
        <form
          onSubmit={(e) => { e.preventDefault(); addTab() }}
          class="flex gap-2"
        >
          <Input
            placeholder="Tab name"
            value={newTabLabel()}
            onInput={(e) => setNewTabLabel(e.currentTarget.value)}
            autofocus
          />
          <Button type="submit">Add</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setAddingTab(false); setNewTabLabel("") }}
          >
            Cancel
          </Button>
        </form>
      </Show>
    </div>
  )
}
