// Types for the comparison feature

export interface PotentialLine {
  potential: string;
  probability: number;
}

export interface CubeProbabilityEntry {
  tier: string;
  itemType: string;
  level: number;
  potentials: PotentialLine[];
}

export interface ParsedPotential {
  potential: string;
  probability: number;
  statType: string | null;
  statValue: number | null;
}

export type StatValues = Record<string, { value: string; fd: string }>;

export interface CubeResult {
  probability: string;
  avgCubes: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

// Helper to generate armor options with item type in name
const makeArmorOptions = (itemType: string): { name: string; level: string }[] => [
  { name: `Eternal ${itemType}`, level: '250' },
  { name: `Arcane ${itemType}`, level: '200' },
  { name: `Absolab ${itemType}`, level: '160' },
  { name: 'Other', level: '' },
];

// Specific item options for each item type
export const SPECIFIC_ITEMS: Record<string, { name: string; level: string }[]> = {
  Weapon: [
    { name: 'Destiny Weapon', level: '250' },
    { name: 'Genesis Weapon', level: '200' },
    { name: 'Arcane Weapon', level: '200' },
    { name: 'Absolab Weapon', level: '160' },
    { name: 'Other', level: '' },
  ],
  Emblem: [
    { name: "Mitra's Rage", level: '200' },
    { name: 'Gold Emblem', level: '100' },
    { name: 'Other', level: '' },
  ],
  Hat: makeArmorOptions('Hat'),
  Top: makeArmorOptions('Top'),
  Bottom: makeArmorOptions('Bottom'),
  Shoulder: makeArmorOptions('Shoulder'),
  Cape: makeArmorOptions('Cape'),
  Gloves: makeArmorOptions('Gloves'),
  Shoes: makeArmorOptions('Shoes'),
  Ring: [
    { name: 'Whisper of the Source', level: '250' },
    { name: 'Endless Terror', level: '200' },
    { name: 'Dawn Guardian Angel Ring', level: '160' },
    { name: 'Superior Gollux Ring', level: '150' },
    { name: 'Reinforced Gollux Ring', level: '140' },
    { name: 'Meister Ring', level: '140' },
    { name: 'Breath of Divinity', level: '150' },
    { name: 'Other', level: '' },
  ],
};

// Default full equipment loadout (21 items)
export const DEFAULT_LOADOUT: { itemType: string; level: string; name: string }[] = [
  { itemType: 'Weapon', level: '200', name: 'Genesis Weapon' },
  { itemType: 'Secondary', level: '140', name: 'Secondary' },
  { itemType: 'Emblem', level: '200', name: "Mitra's Rage" },
  { itemType: 'Hat', level: '250', name: 'Eternal Hat' },
  { itemType: 'Top', level: '250', name: 'Eternal Top' },
  { itemType: 'Bottom', level: '250', name: 'Eternal Bottom' },
  { itemType: 'Shoulder', level: '250', name: 'Eternal Shoulder' },
  { itemType: 'Cape', level: '200', name: 'Arcane Cape' },
  { itemType: 'Gloves', level: '200', name: 'Arcane Gloves' },
  { itemType: 'Shoes', level: '200', name: 'Arcane Shoes' },
  { itemType: 'Heart', level: '200', name: 'Heart' },
  { itemType: 'Ring', level: '200', name: 'Endless Terror' },
  { itemType: 'Ring', level: '160', name: 'Dawn Guardian Angel Ring' },
  { itemType: 'Ring', level: '150', name: 'Superior Gollux Ring' },
  { itemType: 'Belt', level: '200', name: 'Belt' },
  { itemType: 'Face Accessory', level: '160', name: 'Face Accessory' },
  { itemType: 'Eye Accessory', level: '160', name: 'Eye Accessory' },
  { itemType: 'Earring', level: '200', name: 'Earring' },
  { itemType: 'Pendant', level: '160', name: 'Pendant 1' },
  { itemType: 'Pendant', level: '140', name: 'Pendant 2' },
];

// Comparison feature types
export interface ComparisonItem {
  id: string;
  name: string;
  itemType: string;
  specificItem: string;
  level: string;
  line1: string;
  line2: string;
  line3: string;
  collapsed: boolean;
}

export interface ItemCalculationResult {
  itemId: string;
  itemName: string;
  currentFd: number;
  brightResult: CubeResult | null;
  glowingResult: CubeResult | null;
  brightEfficiency: number; // Expected FD gain per cube
  glowingEfficiency: number;
  brightExpectedFdGain: number;
  glowingExpectedFdGain: number;
  brightProbability: number;
  glowingProbability: number;
}

export interface CalculationContext {
  charLevel: string;
  statClass: string;
  skillCooldown: boolean;
  statValues: StatValues;
  allData: CubeProbabilityEntry[];
  tierWeights: {
    bright: { line2UniqueW: number; line2LegW: number; line3UniqueW: number; line3LegW: number };
    glowing: { line2UniqueW: number; line2LegW: number; line3UniqueW: number; line3LegW: number };
  };
  statAliases: Record<string, string>;
  per9Stats: Set<string>;
}
