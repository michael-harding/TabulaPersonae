// D&D Character Data Types

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
  acrobatics: { proficient: boolean; expertise: boolean }
  animalHandling: { proficient: boolean; expertise: boolean }
  arcana: { proficient: boolean; expertise: boolean }
  athletics: { proficient: boolean; expertise: boolean }
  deception: { proficient: boolean; expertise: boolean }
  history: { proficient: boolean; expertise: boolean }
  insight: { proficient: boolean; expertise: boolean }
  intimidation: { proficient: boolean; expertise: boolean }
  investigation: { proficient: boolean; expertise: boolean }
  medicine: { proficient: boolean; expertise: boolean }
  nature: { proficient: boolean; expertise: boolean }
  perception: { proficient: boolean; expertise: boolean }
  performance: { proficient: boolean; expertise: boolean }
  persuasion: { proficient: boolean; expertise: boolean }
  religion: { proficient: boolean; expertise: boolean }
  sleightOfHand: { proficient: boolean; expertise: boolean }
  stealth: { proficient: boolean; expertise: boolean }
  survival: { proficient: boolean; expertise: boolean }
}

export type ActionType = 'attack' | 'ability' | 'class-feature' | 'feat' | 'species-ability' | 'other'

export interface Equipment {
  id: string
  name: string
  quantity: number
  weight: number
  description: string
  equipped: boolean
  type: "weapon" | "armor" | "tool" | "consumable" | "treasure" | "other"
}

// 'regain' is for spells that can be regained on short/long rest, etc.
export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  damage?: string;
  attackSave?: string;
  description: string;
  prepared: boolean;
  known: boolean;
  regain?: string;
  atHigherLevel?: string;
  concentration?: boolean;
  ritual?: boolean;
}

interface ActionBase {
  id: string
  name: string
  type: ActionType
  description: string
  attackBonus?: number
  damage?: string
  damageType?: string
  range?: string
  trigger?: string
  uses?: number
  maxUses?: number
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
  shield?: boolean
  magicItemAttunement?: string[]
  classFeatures?: string
  speciesTraits?: string
  feats?: string

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
      acrobatics: { proficient: false, expertise: false },
      animalHandling: { proficient: false, expertise: false },
      arcana: { proficient: false, expertise: false },
      athletics: { proficient: false, expertise: false },
      deception: { proficient: false, expertise: false },
      history: { proficient: false, expertise: false },
      insight: { proficient: false, expertise: false },
      intimidation: { proficient: false, expertise: false },
      investigation: { proficient: false, expertise: false },
      medicine: { proficient: false, expertise: false },
      nature: { proficient: false, expertise: false },
      perception: { proficient: false, expertise: false },
      performance: { proficient: false, expertise: false },
      persuasion: { proficient: false, expertise: false },
      religion: { proficient: false, expertise: false },
      sleightOfHand: { proficient: false, expertise: false },
      stealth: { proficient: false, expertise: false },
      survival: { proficient: false, expertise: false },
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
    shield: false,
    magicItemAttunement: [],
    classFeatures: "",
    speciesTraits: "",
    feats: "",

    spellcastingClass: "",
    alliesAndOrganizations: "",
    treasure: "",
  }
}
