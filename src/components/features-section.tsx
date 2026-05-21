import { createSignal, For, Show } from "solid-js"
import type { Character, Feature, FeatureKind, ActionKind, ActionType } from "@/lib/character-types"
import { safeFeatures } from "@/lib/character-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Tooltip } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PipTracker } from "@/components/ui/pip-tracker"
import { StepperInput } from "@/components/ui/stepper-input"
import BookOpen from "lucide-solid/icons/book-open"
import Leaf from "lucide-solid/icons/leaf"
import Star from "lucide-solid/icons/star"
import Plus from "lucide-solid/icons/plus"
import Trash2 from "lucide-solid/icons/trash-2"
import Pencil from "lucide-solid/icons/pencil"
import ChevronDown from "lucide-solid/icons/chevron-down"
import Zap from "lucide-solid/icons/zap"
import Layers from "lucide-solid/icons/layers"

interface FeaturesSectionProps {
  character: Character
  onUpdate: (character: Character) => void
}

type SectionField = 'classFeatures' | 'speciesTraits' | 'feats'

interface SectionConfig {
  kind: FeatureKind
  title: string
  singular: string
  field: SectionField
  icon: typeof BookOpen
}

const SECTION_CONFIG: SectionConfig[] = [
  { kind: 'class-feature', title: 'Class Features', singular: 'Class Feature', field: 'classFeatures', icon: BookOpen },
  { kind: 'species-trait', title: 'Species Traits',  singular: 'Species Trait',  field: 'speciesTraits', icon: Leaf    },
  { kind: 'feat',          title: 'Feats',           singular: 'Feat',           field: 'feats',         icon: Star   },
]

const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  'action': 'Action',
  'bonus-action': 'Bonus Action',
  'reaction': 'Reaction',
}

const ACTION_TYPE_LABELS = ['Attack', 'Ability', 'Other']

interface FeatureFormData {
  name: string
  description: string
  actionKind: ActionKind | ''
  type: string
  range: string
  uses: number
  maxUses: number
  rechargeOn: '' | 'short-rest' | 'long-rest'
}

interface FeatureFormProps {
  initialData?: FeatureFormData
  onSubmit: (data: FeatureFormData) => void
  onCancel: () => void
}

function FeatureForm(props: FeatureFormProps) {
  const [formData, setFormData] = createSignal<FeatureFormData>(
    props.initialData ?? { name: '', description: '', actionKind: '', type: '', range: '', uses: 0, maxUses: 0, rechargeOn: '' }
  )

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const data = formData()
    if (!data.name.trim()) return
    props.onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4 p-4">
      <div class="space-y-1">
        <Label for="feature-name">Name</Label>
        <Input
          id="feature-name"
          value={formData().name}
          onInput={(e) => setFormData((d) => ({ ...d, name: e.currentTarget.value }))}
          placeholder="Feature name"
          required
        />
      </div>
      <div class="space-y-1">
        <Label for="feature-description">Description</Label>
        <Textarea
          id="feature-description"
          value={formData().description}
          onInput={(e) => setFormData((d) => ({ ...d, description: e.currentTarget.value }))}
          placeholder="Describe the feature..."
          rows={4}
        />
      </div>
      <div class="space-y-1">
        <Label for="feature-action-kind">Used as Action</Label>
        <Select value={formData().actionKind || ''} onValueChange={(v) => setFormData((d) => ({ ...d, actionKind: v as ActionKind | '' }))}>
          <SelectTrigger id="feature-action-kind" aria-label="Used as Action">
            <SelectValue placeholder="Not an action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Not an action</SelectItem>
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="bonus-action">Bonus Action</SelectItem>
            <SelectItem value="reaction">Reaction</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Show when={formData().actionKind !== ''}>
        <div class="space-y-1">
          <Label for="feature-type">Type</Label>
          <Combobox
            value={formData().type}
            onValueChange={(v) => setFormData((d) => ({ ...d, type: v }))}
            options={ACTION_TYPE_LABELS}
          />
        </div>
        <div class="space-y-1">
          <Label for="feature-range">Range</Label>
          <Input
            id="feature-range"
            value={formData().range}
            onInput={(e) => setFormData((d) => ({ ...d, range: e.currentTarget.value }))}
            placeholder="5 ft, 30 ft, Touch, Self"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1">
            <Label for="feature-uses">Current Uses</Label>
            <NumericInput id="feature-uses" min={0} value={formData().uses}
              onChange={(v) => setFormData((d) => ({ ...d, uses: v }))} />
          </div>
          <div class="space-y-1">
            <Label for="feature-max-uses">Max Uses (0 = unlimited)</Label>
            <NumericInput id="feature-max-uses" min={0} value={formData().maxUses}
              onChange={(v) => setFormData((d) => ({ ...d, maxUses: v, uses: 0 }))} />
          </div>
        </div>
        <div class="space-y-1">
          <Label for="feature-recharge">Recharge On</Label>
          <Select value={formData().rechargeOn} onValueChange={(v) => setFormData((d) => ({ ...d, rechargeOn: v as '' | 'short-rest' | 'long-rest' }))}>
            <SelectTrigger id="feature-recharge"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              <SelectItem value="short-rest">Short Rest</SelectItem>
              <SelectItem value="long-rest">Long Rest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Show>
      <div class="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}

export function FeaturesSection(props: FeaturesSectionProps) {
  const [isAddOpen, setIsAddOpen] = createSignal<FeatureKind | null>(null)
  const [editingFeature, setEditingFeature] = createSignal<Feature | null>(null)
  const [expandedSections, setExpandedSections] = createSignal<Set<FeatureKind>>(
    new Set(['class-feature', 'species-trait', 'feat'])
  )

  const toggleExpanded = (kind: FeatureKind, open: boolean) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      open ? next.add(kind) : next.delete(kind)
      return next
    })
  }

  const handleAdd = (kind: FeatureKind, field: SectionField, data: FeatureFormData) => {
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      description: data.description,
      source: kind,
      actionKind: data.actionKind || undefined,
      type: (data.actionKind && data.type) ? data.type as ActionType : undefined,
      range: (data.actionKind && data.range) ? data.range : undefined,
      uses: (data.actionKind && data.uses) ? data.uses : undefined,
      maxUses: (data.actionKind && data.maxUses) ? data.maxUses : undefined,
      rechargeOn: (data.actionKind && data.rechargeOn) ? data.rechargeOn : undefined,
    }
    props.onUpdate({
      ...props.character,
      [field]: [...safeFeatures(props.character[field]), newFeature],
    })
    setIsAddOpen(null)
  }

  const handleUpdate = (field: SectionField, data: FeatureFormData) => {
    const editing = editingFeature()
    if (!editing) return
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).map((f) =>
        f.id === editing.id
          ? {
              ...f,
              name: data.name.trim(),
              description: data.description,
              actionKind: data.actionKind || undefined,
              type: (data.actionKind && data.type) ? data.type as ActionType : undefined,
              range: (data.actionKind && data.range) ? data.range : undefined,
              uses: (data.actionKind && data.uses) ? data.uses : undefined,
              maxUses: (data.actionKind && data.maxUses) ? data.maxUses : undefined,
              rechargeOn: (data.actionKind && data.rechargeOn) ? data.rechargeOn : undefined,
            }
          : f
      ),
    })
    setEditingFeature(null)
  }

  const handleFeatureUsesChange = (field: SectionField, id: string, v: number) => {
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).map((f) => f.id === id ? { ...f, uses: v } : f),
    })
  }

  const handleDelete = (field: SectionField, id: string) => {
    props.onUpdate({
      ...props.character,
      [field]: safeFeatures(props.character[field]).filter((f) => f.id !== id),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Layers class="h-5 w-5 text-primary" />
          Class Features, Species Traits &amp; Feats
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <For each={SECTION_CONFIG}>
          {(section) => {
            const features = () => safeFeatures(props.character[section.field])
            return (
              <Collapsible
                open={expandedSections().has(section.kind)}
                onOpenChange={(open: boolean) => toggleExpanded(section.kind, open)}
              >
                <div class="flex items-center justify-between pr-1">
                  <CollapsibleTrigger class="flex flex-1 items-center gap-2 p-3 rounded-md hover:bg-accent transition-colors text-left">
                    <section.icon class="h-4 w-4 text-primary" />
                    <span class="font-semibold">{section.title}</span>
                    <Badge variant="secondary">{features().length}</Badge>
                    <ChevronDown class="h-4 w-4 transition-transform ui-expanded:rotate-180 ml-auto" />
                  </CollapsibleTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-1 h-7 ml-2"
                    onClick={() => setIsAddOpen(section.kind)}
                  >
                    <Plus class="h-3 w-3" />
                    Add {section.singular}
                  </Button>
                </div>
                <CollapsibleContent class="space-y-2 mt-1 px-1">
                  <Show
                    when={features().length > 0}
                    fallback={
                      <div class="text-center py-4 text-muted-foreground text-sm">
                        No {section.title.toLowerCase()} added yet.
                      </div>
                    }
                  >
                    <For each={features()}>
                      {(feature) => (
                        <div class="border rounded-lg p-3 space-y-1">
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-medium">{feature.name}</span>
                              <Show when={feature.actionKind}>
                                <Badge variant="outline" class="text-xs flex items-center gap-1">
                                  <Zap class="h-3 w-3" />
                                  {ACTION_KIND_LABELS[feature.actionKind!]}
                                </Badge>
                              </Show>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                              <Tooltip content={`Edit ${section.singular}`}>
                                <button
                                  type="button"
                                  aria-label={`Edit ${feature.name}`}
                                  onClick={() => setEditingFeature(feature)}
                                  class="text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil class="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content={`Delete ${section.singular}`}>
                                <button
                                  type="button"
                                  aria-label={`Delete ${feature.name}`}
                                  onClick={() => handleDelete(section.field, feature.id)}
                                  class="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 class="h-4 w-4" />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                          <Show when={feature.description}>
                            <p class="text-sm text-muted-foreground">{feature.description}</p>
                          </Show>
                          <Show when={(feature.maxUses ?? 0) > 0}>
                            <Show
                              when={(feature.maxUses ?? 0) <= 5}
                              fallback={
                                <StepperInput
                                  value={feature.uses ?? 0}
                                  min={0}
                                  max={feature.maxUses!}
                                  onChange={(v) => handleFeatureUsesChange(section.field, feature.id, v)}
                                />
                              }
                            >
                              <PipTracker
                                total={feature.maxUses!}
                                used={feature.uses ?? 0}
                                onToggle={(v) => handleFeatureUsesChange(section.field, feature.id, v)}
                                usedTitle="Charge spent (click to restore)"
                                availableTitle="Charge available (click to use)"
                              />
                            </Show>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </CollapsibleContent>
              </Collapsible>
            )
          }}
        </For>
      </CardContent>

      {/* Add modals — always in DOM, open prop controls visibility */}
      <For each={SECTION_CONFIG}>
        {(section) => (
          <Modal
            open={isAddOpen() === section.kind}
            onOpenChange={(open) => { if (!open) setIsAddOpen(null) }}
          >
            <ModalContent class="max-w-md">
              <Show when={isAddOpen() === section.kind}>
                <ModalHeader>
                  <ModalTitle>Add {section.singular}</ModalTitle>
                </ModalHeader>
                <FeatureForm
                  onSubmit={(data) => handleAdd(section.kind, section.field, data)}
                  onCancel={() => setIsAddOpen(null)}
                />
              </Show>
            </ModalContent>
          </Modal>
        )}
      </For>

      {/* Edit modal — always in DOM, open prop controls visibility */}
      <Modal
        open={editingFeature() !== null}
        onOpenChange={(open) => { if (!open) setEditingFeature(null) }}
      >
        <ModalContent class="max-w-md">
          <Show when={editingFeature()}>
            {(feature) => {
              const section = SECTION_CONFIG.find((s) => s.kind === feature().source)!
              return (
                <>
                  <ModalHeader>
                    <ModalTitle>Edit {section.singular}</ModalTitle>
                  </ModalHeader>
                  <FeatureForm
                    initialData={{
                      name: feature().name,
                      description: feature().description,
                      actionKind: feature().actionKind ?? '',
                      type: feature().type ?? '',
                      range: feature().range ?? '',
                      uses: feature().uses ?? 0,
                      maxUses: feature().maxUses ?? 0,
                      rechargeOn: feature().rechargeOn ?? '',
                    }}
                    onSubmit={(data) => handleUpdate(section.field, data)}
                    onCancel={() => setEditingFeature(null)}
                  />
                </>
              )
            }}
          </Show>
        </ModalContent>
      </Modal>
    </Card>
  )
}
