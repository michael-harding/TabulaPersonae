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

export interface Equipment {
  id: string
  name: string
  quantity: number
  weight: number
  description: string
  equipped: boolean
  type: "weapon" | "armor" | "tool" | "consumable" | "treasure" | "other"
}

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  damage?: string
  description: string
  prepared: boolean
}

export interface Attack {
  id: string
  name: string
  type: 'weapon' | 'spell'
  attackBonus: number
  damage: string
  damageType: string
  range: string
  description: string
}

export interface BonusAction {
  id: string
  name: string
  type: 'spell' | 'ability' | 'other'
  description: string
  damage?: string
  damageType?: string
  uses?: number
  maxUses?: number
}

export interface Reaction {
  id: string
  name: string
  type: 'spell' | 'ability' | 'other'
  description: string
  damage?: string
  damageType?: string
  trigger: string
  uses?: number
  maxUses?: number
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
  }
}
