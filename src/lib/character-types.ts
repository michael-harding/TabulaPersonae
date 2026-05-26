// D&D Character Data Types

export interface CharacterEntry {
  id: string
  name: string
  description: string
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
  acrobatics: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  animalHandling: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  arcana: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  athletics: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  deception: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  history: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  insight: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  intimidation: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  investigation: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  medicine: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  nature: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  perception: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  performance: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  persuasion: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  religion: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  sleightOfHand: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  stealth: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
  survival: { proficient: boolean; expertise: boolean; disadvantage?: boolean }
}

export type ActionType = 'attack' | 'ability' | 'class-feature' | 'feat' | 'species-ability' | 'other' | string

export interface Equipment extends CharacterEntry {
  quantity: number
  weight: number
  equipped: boolean
  type: "weapon" | "armor" | "tool" | "consumable" | "treasure" | "other"
  weaponStats?: {
    damage: string
    damageType: string
    weaponRange: string
    attackAbility: "str" | "dex" | "finesse"
    proficient: boolean
  }
  armorStats?: {
    baseAC: number
    armorType: "light" | "medium" | "heavy" | "shield"
  }
}

export interface MagicItem extends CharacterEntry {
  attuned: boolean
}

export interface Spell extends CharacterEntry {
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  damage?: string;
  attackSave?: string;
  prepared: boolean;
  known: boolean;
  gain?: string;
  atHigherLevel?: string;
  concentration?: boolean;
  ritual?: boolean;
}

export type FeatureKind = 'class-feature' | 'species-trait' | 'feat'
export type ActionKind = 'action' | 'bonus-action' | 'reaction' | 'other'

export interface Feature extends UseableEntry {
  source: FeatureKind
  actionKind?: ActionKind
  type?: ActionType
  range?: string
}

interface ActionBase extends UseableEntry {
  type: ActionType
  attackBonus?: number
  damage?: string
  damageType?: string
  range?: string
  trigger?: string
}

export interface Attack extends ActionBase {}

export interface BonusAction extends ActionBase {}

export interface Reaction extends ActionBase {
  trigger: string
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
  savingThrows: SavingThrows
  skills: Skills

  armorClass: number
  hitPoints: {
    current: number
    maximum: number
    temporary: number
  }
  deathSaves: {
    successes: number
    failures: number
  }
  hitDice: string
  speed: number
  initiative: number
  proficiencyBonus: number

  equipment: Equipment[]
  spells: Spell[]
  spellcastingAbility: keyof AbilityScores | ""
  spellSaveDC: number
  spellAttackBonus: number
  spellSlots: {
    1: { total: number; used: number }
    2: { total: number; used: number }
    3: { total: number; used: number }
    4: { total: number; used: number }
    5: { total: number; used: number }
    6: { total: number; used: number }
    7: { total: number; used: number }
    8: { total: number; used: number }
    9: { total: number; used: number }
  }

  languages: string[]
  otherProficiencies: string[]

  attacks: Attack[]
  bonusActions: BonusAction[]
  reactions: Reaction[]

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

  // 2024-only
  subclass?: string
  size?: string
  magicItems?: MagicItem[]
  classFeatures?: Feature[]
  speciesTraits?: Feature[]
  feats?: Feature[]

  // 2014-only
  spellcastingClass?: string
  alliesAndOrganizations?: string
  treasure?: string
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
      acrobatics: { proficient: false, expertise: false, disadvantage: false },
      animalHandling: { proficient: false, expertise: false, disadvantage: false },
      arcana: { proficient: false, expertise: false, disadvantage: false },
      athletics: { proficient: false, expertise: false, disadvantage: false },
      deception: { proficient: false, expertise: false, disadvantage: false },
      history: { proficient: false, expertise: false, disadvantage: false },
      insight: { proficient: false, expertise: false, disadvantage: false },
      intimidation: { proficient: false, expertise: false, disadvantage: false },
      investigation: { proficient: false, expertise: false, disadvantage: false },
      medicine: { proficient: false, expertise: false, disadvantage: false },
      nature: { proficient: false, expertise: false, disadvantage: false },
      perception: { proficient: false, expertise: false, disadvantage: false },
      performance: { proficient: false, expertise: false, disadvantage: false },
      persuasion: { proficient: false, expertise: false, disadvantage: false },
      religion: { proficient: false, expertise: false, disadvantage: false },
      sleightOfHand: { proficient: false, expertise: false, disadvantage: false },
      stealth: { proficient: false, expertise: false, disadvantage: false },
      survival: { proficient: false, expertise: false, disadvantage: false },
    },

    armorClass: 10,
    hitPoints: {
      current: 8,
      maximum: 8,
      temporary: 0,
    },
    deathSaves: {
      successes: 0,
      failures: 0,
    },
    hitDice: "1d8",
    speed: 30,
    initiative: 0,
    proficiencyBonus: 2,

    equipment: [],
    spells: [],
    spellcastingAbility: "",
    spellSaveDC: 8,
    spellAttackBonus: 0,
    spellSlots: {
      1: { total: 0, used: 0 },
      2: { total: 0, used: 0 },
      3: { total: 0, used: 0 },
      4: { total: 0, used: 0 },
      5: { total: 0, used: 0 },
      6: { total: 0, used: 0 },
      7: { total: 0, used: 0 },
      8: { total: 0, used: 0 },
      9: { total: 0, used: 0 },
    },

    languages: [],
    otherProficiencies: [],

    attacks: [],
    bonusActions: [],
    reactions: [],

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
    size: "Medium",
    magicItemAttunement: [],
    classFeatures: [],
    speciesTraits: [],
    feats: [],

    spellcastingClass: "",
    alliesAndOrganizations: "",
    treasure: "",
  }
}
