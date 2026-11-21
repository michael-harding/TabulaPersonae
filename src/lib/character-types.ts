// D&D Character Data Types

import { createStartingFeatures } from "./required-features"

export interface CharacterEntry {
  id: string
  name: string
  description: string
  /** Markdown summary shown on the entry's action card; the full description is in its expanded view. */
  highlights?: string
}

/**
 * Damage an entry deals. `damageRecurring` marks damage that repeats, e.g. at the start of each of
 * the target's turns.
 */
export interface DamageFields {
  damage?: string
  damageType?: string
  damageRecurring?: boolean
}

/**
 * What an entry restores or grants, e.g. "2d4+2" with gainType "Healing" or "Temp HP".
 * `gainRecurring` marks a gain that repeats each turn.
 */
export interface GainFields {
  gain?: string
  gainType?: string
  gainRecurring?: boolean
}

export interface UseableEntry extends CharacterEntry {
  uses?: number
  maxUses?: number
  rechargeOn?: 'short-rest' | 'long-rest'
}

export interface AbilityScores {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export interface SavingThrows {
  strength: boolean
  dexterity: boolean
  constitution: boolean
  intelligence: boolean
  wisdom: boolean
  charisma: boolean
}

export interface Skills {
  acrobatics: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  animalHandling: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  arcana: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  athletics: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  deception: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  history: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  insight: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  intimidation: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  investigation: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  medicine: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  nature: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  perception: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  performance: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  persuasion: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  religion: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  sleightOfHand: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  stealth: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
  survival: { proficient: boolean; expertise: boolean; advantage?: boolean; disadvantage?: boolean }
}

export type ActionType = 'attack' | 'ability' | 'class-feature' | 'feat' | 'species-ability' | 'other' | string

export type ItemRarity = "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "artifact"

export type SenseType = "darkvision" | "blindsight" | "tremorsense" | "truesight"

export interface ItemModifiers {
  armorClass?: number
  initiative?: number
  // Flat bonus to a weapon's own attack and damage rolls, e.g. 1 for a +1 weapon. Weapons only.
  weaponBonus?: number
  savingThrows?: Partial<Record<keyof AbilityScores, number>>
  abilityScores?: Partial<Record<keyof AbilityScores, number>>
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  conditionImmunities?: string[]
  senses?: Partial<Record<SenseType, number>>
  speed?: number
  flySpeed?: number
  swimSpeed?: number
  climbSpeed?: number
  burrowSpeed?: number
  carryingCapacityBonus?: number
  carryingCapacityMultiplier?: number
  abilityScoreFloors?: Partial<Record<keyof AbilityScores, number>>
  abilityScoreMaxCaps?: Partial<Record<keyof AbilityScores, number>>
  languages?: string[]
  proficiencies?: string[]
  // Applies whenever the item is equipped, regardless of magic/attunement status — unlike every
  // other field above, which is gated to magic items only (see isItemModifierActive).
  skillAdvantage?: (keyof Skills)[]
  skillDisadvantage?: (keyof Skills)[]
  /** Spells the item gives while its modifiers apply (see isItemModifierActive). Magic items only. */
  grantedSpells?: ItemSpellGrant[]
}

/**
 * A spell a magic item gives. The spell itself is an ordinary entry of `character.spells`; this only
 * names it. Casting it with the character's own slots still depends on the spell being prepared:
 * the item adds only the casts paid for by the item.
 */
export interface ItemSpellGrant {
  spellId: string
  /**
   * How a cast from the item is paid for. Absent: it can't be cast from the item (the item is only
   * listed as a source). 0: cast from the item for free. N: spends N of the item's charges.
   */
  charges?: number
}

// Top-level damage and gain apply to a non-weapon item used as an action (e.g. Alchemist's Fire, a
// Potion of Healing). A weapon's damage lives in weaponStats instead.
export interface Equipment extends Omit<UseableEntry, "uses">, DamageFields, GainFields {
  // Charges spent on a rechargeable magic item, bounded by maxUses, reset by rechargeOn.
  // Kept distinct from consumedUses below since an item can need both independently (e.g. a
  // magic consumable that both recharges on a rest and is also consumed via an action).
  charges?: number
  // Quantity consumed via an action, bounded by quantity, decremented on any rest regardless
  // of rechargeOn.
  consumedUses?: number
  quantity: number
  weight: number
  equipped: boolean
  type: "weapon" | "armor" | "tool" | "consumable" | "treasure" | "other"
  weaponStats?: {
    damage: string
    damageType: string
    damageRecurring?: boolean
    weaponRange: string
    attackAbility: "str" | "dex" | "finesse"
    proficient: boolean
  }
  armorStats?: {
    baseAC: number
    armorType: "light" | "medium" | "heavy" | "shield"
  }
  magic?: boolean
  requiresAttunement?: boolean
  attuned?: boolean
  rarity?: ItemRarity
  modifiers?: ItemModifiers
  actionKind?: ActionKind
}

export interface Spell extends CharacterEntry, DamageFields, GainFields {
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  /** Whether casting it makes a spell attack roll. Independent of attackSave: a spell can call for both. */
  attackRoll?: boolean;
  /** A save ability abbreviation ("DEX"), whose DC is the character's; older or imported text is kept as written. */
  attackSave?: string;
  prepared: boolean;
  known: boolean;
  atHigherLevel?: string;
  /** Damage added per slot level above the spell's own, e.g. "1d6". */
  damagePerLevel?: string;
  /** Gain added per slot level above the spell's own, e.g. "1d8". */
  gainPerLevel?: string;
  concentration?: boolean;
  ritual?: boolean;
}

export type FeatureKind = 'class-feature' | 'species-trait' | 'feat' | 'background'
export type ActionKind = 'action' | 'bonus-action' | 'reaction' | 'other'

/** How a "Hit Points" feature's Max HP contribution is computed — see FeatureEffects.hitPointsMode. */
export type HitPointsMode = 'flat' | 'per-level' | 'rolled'

/** A spell slot's level, 1st to 9th. */
export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface FeatureEffects {
  /** 'Spellcasting': set once for the whole feature, so every row carries it (see the Spellcasting form). */
  spellcastingAbility?: keyof AbilityScores
  hitDiceSize?: number
  hitPointsMode?: HitPointsMode
  hitPointsFlatValue?: number
  hitPointsPerLevelAmount?: number
  /**
   * hitPointsMode 'rolled': one recorded value per level, indexed positionally (index 0 = level 1,
   * index 1 = level 2, ...) — there's exactly one roll per level, so level is never a separate
   * editable field. CON mod is added separately by calculateMaxHitPoints, not baked into the value.
   * 0 (or a missing index) means "not yet recorded" — a real die roll is always >= 1.
   */
  hitPointsRolledLevels?: number[]
  savingThrowProficiencies?: (keyof AbilityScores)[]
  skillProficiencies?: { skill: keyof Skills; expertise?: boolean }[]
  skillAdvantage?: (keyof Skills)[]
  skillDisadvantage?: (keyof Skills)[]
  otherProficiencies?: string[]
  size?: string
  /** e.g. "Humanoid" (see CREATURE_TYPES); a homebrew type is kept as written. */
  creatureType?: string
  speed?: number
  flySpeed?: number
  swimSpeed?: number
  climbSpeed?: number
  burrowSpeed?: number
  senses?: Partial<Record<SenseType, number>>
  resistances?: string[]
  immunities?: string[]
  vulnerabilities?: string[]
  conditionImmunities?: string[]
  languages?: string[]
  carryingCapacityBonus?: number
  carryingCapacityMultiplier?: number
  abilityScores?: Partial<Record<keyof AbilityScores, number>>
  abilityScoreFloors?: Partial<Record<keyof AbilityScores, number>>
  abilityScoreMaxCaps?: Partial<Record<keyof AbilityScores, number>>
  abilityScoreBaseMax?: Partial<Record<keyof AbilityScores, number>>
  hpBonusPerLevel?: number
  /**
   * 'Spellcasting': how many slots of each level the character has. Unlike every other effect, a
   * feature's tiers don't add up: each one is a row of the class's spell slot table, so the highest
   * tier the character has reached gives the totals, none when it has none (see getActiveFeatureEffects).
   */
  spellSlots?: Partial<Record<SpellSlotLevel, number>>
  /**
   * 'Prepared Spells': how many spells the character can prepare. Like spellSlots, each tier is a row
   * of the class's table, so only the highest tier reached counts; separate features add up.
   */
  preparedSpells?: number
  /**
   * 'Ability Score Improvement': the character levels at which it gains an Ability Score Improvement
   * or another feat, in ascending order. Set once for the whole feature, on its single tier.
   */
  abilityScoreImprovementLevels?: number[]
  /**
   * 'Spells': the ids of the spells (entries of `character.spells`) this tier gives. Tiers add up;
   * a spell named again in a later tier takes that tier's settings below (see getSpellGrantSources).
   */
  grantedSpells?: string[]
  /** 'Spells': this tier's spells can be cast with the character's spell slots, and are always prepared. */
  grantedSpellsSlots?: boolean
  /**
   * 'Spells': how many times each of this tier's spells can be cast without a slot, per the
   * feature's rechargeOn. Each spell has its own count (see Feature.spellCastsSpent).
   */
  grantedSpellsFreeCasts?: number
}

export interface FeatureLevelEffect {
  level: number
  effects: FeatureEffects
}

/** The types every character has exactly one feature of (see required-features.ts). */
export type RequiredFeatureType = 'Hit Points' | 'Ability Score Improvement' | 'Creature Type' | 'Size'

// Values double as their own display labels. They're persisted, so they stay human-readable
// strings rather than short codes like "skill-proficiency". A "<type> (legacy)" value is a feature
// of a required type other than the required one, from before that type was required; it works
// exactly like its required type but can't be picked for a new feature. 'Custom' has no mechanical
// effect: just a name, highlights and description.
export type FeatureTypeValue =
  | 'Custom' | 'Action' | 'Spellcasting' | 'Prepared Spells' | 'Hit Points' | 'Ability Score Improvement' | 'Size' | 'Creature Type'
  | 'Saving Throw Proficiency' | 'Skill Proficiency' | 'Other Proficiency'
  | 'Speed' | 'Senses' | 'Damage Resistance/Immunity/Vulnerability' | 'Condition Immunity' | 'Language' | 'Carrying Capacity'
  | 'Ability Scores' | 'Max HP Bonus' | 'Spells'
  | `${RequiredFeatureType} (legacy)`

/** How a feature's max uses are counted; absent means 'flat'. */
export type MaxUsesMode = 'flat' | 'per-level' | 'proficiency-bonus'

export interface Feature extends UseableEntry, DamageFields, GainFields {
  source: FeatureKind
  actionKind?: ActionKind
  type?: ActionType
  range?: string
  attackBonus?: number
  /** e.g. "DEX save DC 13", for a feature that calls for a save rather than an attack roll. */
  attackSave?: string
  level?: number
  // 'per-level' means maxUses is ignored and the effective cap is maxUsesPerLevel * character.level
  // — same "rate × current total level" math as FeatureEffects.hpBonusPerLevel, computed fresh at
  // read time rather than baked in, so leveling up never requires manually editing the feature.
  // 'proficiency-bonus' likewise ignores maxUses: the cap is the character's effective proficiency
  // bonus (getEffectiveProficiencyBonus), read fresh so it follows level-ups and a custom bonus.
  maxUsesMode?: MaxUsesMode
  maxUsesPerLevel?: number
  // Absent only on a feature from before the field existed, until migrateCharacter backfills it.
  // A feature with no mechanical type is 'Custom' (stored data from before Custom may still hold
  // '', which migrateCharacter retypes).
  featureType?: FeatureTypeValue
  // Every tier whose level threshold the character has reached contributes to the totals in
  // getActiveFeatureEffects — not just the highest one. A tier at level 1 and another at level 4
  // both apply once the character is level 4 or higher (see getQualifyingLevelEffects).
  levelEffects?: FeatureLevelEffect[]
  /**
   * 'Spells': free casts spent since the feature last recharged, by spell id. Reset by a rest
   * matching rechargeOn, like `uses`. Ids of spells the feature no longer gives are ignored.
   */
  spellCastsSpent?: Record<string, number>
}

interface ActionBase extends UseableEntry, DamageFields, GainFields {
  type: ActionType
  attackBonus?: number
  range?: string
  trigger?: string
}

export type Attack = ActionBase

export type BonusAction = ActionBase

export interface Reaction extends ActionBase {
  trigger: string
}

export type OtherAction = ActionBase

/** A section of the Actions module. */
export type ActionSectionKey = 'action' | 'bonus-action' | 'reaction' | 'other'

/**
 * The order of an Actions section's cards: those shown in the section (`main`), then those set
 * aside under its collapsed "More" list (`more`). Each card is named by its key, `<source>:<id>`
 * (see action-layout.ts). A card in neither list goes at the end of main.
 */
export interface ActionSectionLayout {
  main?: string[]
  more?: string[]
}

export interface Character {
  id: string
  name: string
  race: string
  class: string
  level: number
  background: string
  alignment: string
  experiencePoints: number

  abilityScores: AbilityScores
  abilityScoreOverrides?: Partial<Record<keyof AbilityScores, number>>
  useCalculatedAbilityScores?: Partial<Record<keyof AbilityScores, boolean>>
  savingThrows: SavingThrows
  skills: Skills

  armorClass: number
  hitPoints: {
    current: number
    maximum: number
    temporary: number
    temporaryMaximum?: number
  }
  useCalculatedMaximumHp?: boolean
  deathSaves: {
    successes: number
    failures: number
  }
  hitDice: string
  speed: number
  flySpeed?: number
  swimSpeed?: number
  climbSpeed?: number
  burrowSpeed?: number
  useCalculatedSpeed?: boolean
  useCalculatedFlySpeed?: boolean
  useCalculatedSwimSpeed?: boolean
  useCalculatedClimbSpeed?: boolean
  useCalculatedBurrowSpeed?: boolean
  senses?: Partial<Record<SenseType, number>>
  useCalculatedSenses?: Partial<Record<SenseType, boolean>>
  initiative: number
  proficiencyBonus: number
  useCalculatedInitiative?: boolean
  useCalculatedProficiencyBonus?: boolean
  useCalculatedArmorClass?: boolean
  passivePerception?: number
  useCalculatedPassivePerception?: boolean
  passiveInsight?: number
  useCalculatedPassiveInsight?: boolean
  passiveInvestigation?: number
  useCalculatedPassiveInvestigation?: boolean

  equipment: Equipment[]
  attunementLimit?: number
  useCalculatedAttunementLimit?: boolean
  carryingCapacity?: number
  useCalculatedCarryingCapacity?: boolean
  spells: Spell[]
  spellcastingAbility: keyof AbilityScores | ""
  spellSaveDC: number
  useCalculatedSpellSaveDC?: boolean
  spellAttackBonus: number
  useCalculatedSpellAttackBonus?: boolean
  /**
   * Slots spent at each level since the last long rest. How many the character has comes from its
   * Spellcasting features, so a level it has no slots of has none spent (see getSpellSlots).
   */
  spentSpellSlots?: Partial<Record<SpellSlotLevel, number>>

  languages: string[]
  otherProficiencies: string[]
  damageResistances?: string[]
  damageImmunities?: string[]
  damageVulnerabilities?: string[]
  conditionImmunities?: string[]

  attacks: Attack[]
  bonusActions: BonusAction[]
  reactions: Reaction[]
  otherActions: OtherAction[]
  /** How the Actions module lays out each of its sections (see ActionSectionLayout). Missing: every card in main, in the default order. */
  actionLayout?: Partial<Record<ActionSectionKey, ActionSectionLayout>>

  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  notes: string

  heroicInspiration?: boolean

  sheetColor?: string

  // Both editions
  edition?: "2014" | "2024"
  spentHitDice?: number
  hitDiceSize?: number
  appearance?: string
  coins?: { cp: number; sp: number; ep: number; gp: number; pp: number }
  age?: string
  height?: string
  weight?: string
  eyes?: string
  skin?: string
  hair?: string

  // Active conditions (both editions)
  conditions?: string[]
  /** Levels of Exhaustion, 0–6 (absent means 0). Not one of `conditions`, which have no levels. */
  exhaustionLevel?: number
  /**
   * Ids of the spells in effect: concentration or duration spells that were cast and haven't ended.
   * At most one is a concentration spell. Ids of deleted spells are ignored (see activeSpells).
   */
  activeSpellIds?: string[]

  // 2024-only
  subclass?: string
  classFeatures?: Feature[]
  speciesTraits?: Feature[]
  feats?: Feature[]
  backgroundFeatures?: Feature[]

  // 2014-only
  spellcastingClass?: string
  alliesAndOrganizations?: string
  treasure?: string

  isPublic?: boolean
}

export function createDefaultCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: "",
    race: "",
    class: "",
    level: 1,
    background: "",
    alignment: "",
    experiencePoints: 0,

    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },

    savingThrows: {
      strength: false,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false,
    },

    skills: {
      acrobatics: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      animalHandling: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      arcana: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      athletics: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      deception: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      history: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      insight: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      intimidation: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      investigation: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      medicine: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      nature: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      perception: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      performance: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      persuasion: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      religion: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      sleightOfHand: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      stealth: { proficient: false, expertise: false, advantage: false, disadvantage: false },
      survival: { proficient: false, expertise: false, advantage: false, disadvantage: false },
    },

    armorClass: 10,
    useCalculatedArmorClass: true,
    hitPoints: {
      current: 8,
      maximum: 8,
      temporary: 0,
    },
    useCalculatedMaximumHp: true,
    deathSaves: {
      successes: 0,
      failures: 0,
    },
    hitDice: "1d8",
    speed: 30,
    useCalculatedSpeed: true,
    useCalculatedFlySpeed: true,
    useCalculatedSwimSpeed: true,
    useCalculatedClimbSpeed: true,
    useCalculatedBurrowSpeed: true,
    initiative: 0,
    proficiencyBonus: 2,
    useCalculatedProficiencyBonus: true,

    equipment: [],
    useCalculatedCarryingCapacity: true,
    spells: [],
    spellcastingAbility: "",
    spellSaveDC: 8,
    spellAttackBonus: 0,
    spentSpellSlots: {},

    languages: [],
    otherProficiencies: [],
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    conditionImmunities: [],

    attacks: [],
    bonusActions: [],
    reactions: [],
    otherActions: [],

    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    notes: "",
    heroicInspiration: false,

    edition: "2024",
    spentHitDice: 0,
    appearance: "",
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    age: "",
    height: "",
    weight: "",
    eyes: "",
    skin: "",
    hair: "",

    conditions: [],

    subclass: "",
    useCalculatedSenses: { darkvision: true, blindsight: true, tremorsense: true, truesight: true },
    // The required Hit Points, Creature Type and Size, and a starter Speed and Languages
    ...createStartingFeatures(),
    feats: [],
    backgroundFeatures: [],

    spellcastingClass: "",
    alliesAndOrganizations: "",
    treasure: "",
  }
}
