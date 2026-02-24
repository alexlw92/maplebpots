import {
  ParsedPotential,
  CubeResult,
  CalculationContext,
  CubeProbabilityEntry,
  ComparisonItem,
  ItemCalculationResult,
} from './types';

export const LEVEL_BUCKETS = [140, 150, 160, 200, 250];

// Map UI item types to data item types
const ITEM_TYPE_MAP: Record<string, string> = {
  'Secondary': 'Secondary Weapon',
  'Top': 'Armor',
  'Bottom': 'Armor',
  'Shoulder': 'Armor',
  'Cape': 'Armor',
  'Shoes': 'Armor',
  'Ring': 'Accessory',
  'Belt': 'Accessory',
  'Face Accessory': 'Accessory',
  'Eye Accessory': 'Accessory',
  'Earring': 'Accessory',
  'Pendant': 'Accessory',
};

export function getDataItemType(uiItemType: string): string {
  return ITEM_TYPE_MAP[uiItemType] || uiItemType;
}

// Find the appropriate level bucket for a given item level
export function getLevelBucket(level: number): number {
  for (let i = LEVEL_BUCKETS.length - 1; i >= 0; i--) {
    if (level >= LEVEL_BUCKETS[i]) {
      return LEVEL_BUCKETS[i];
    }
  }
  return LEVEL_BUCKETS[0];
}

// Parse a potential string to extract stat type and value
export function parsePotential(potential: string): { statType: string | null; statValue: number | null } {
  // ATT +12% or Magic ATT +9%
  const attMatch = potential.match(/^(ATT|Magic ATT) \+(\d+)%$/);
  if (attMatch) {
    const statType = attMatch[1] === 'ATT' ? 'Weapon ATT%' : 'Magic ATT%';
    return { statType, statValue: parseInt(attMatch[2]) };
  }

  // STR +9% etc
  const statPctMatch = potential.match(/^(STR|DEX|INT|LUK) \+(\d+)%$/);
  if (statPctMatch) {
    return { statType: `${statPctMatch[1]}%`, statValue: parseInt(statPctMatch[2]) };
  }

  // All Stats +5%
  const allStatMatch = potential.match(/^All Stats \+(\d+)%$/);
  if (allStatMatch) {
    return { statType: 'All Stats%', statValue: parseInt(allStatMatch[1]) };
  }

  // Boss Damage +12%
  const bossMatch = potential.match(/^Boss Damage \+(\d+)%$/);
  if (bossMatch) {
    return { statType: 'Damage to Boss Monsters%', statValue: parseInt(bossMatch[1]) };
  }

  // Ignore DEF +5%
  const ignoreMatch = potential.match(/^Ignore DEF \+(\d+)%$/);
  if (ignoreMatch) {
    return { statType: 'Ignore Monster DEF%', statValue: parseInt(ignoreMatch[1]) };
  }

  // Critical Rate +8%
  const critRateMatch = potential.match(/^Critical Rate \+(\d+)%$/);
  if (critRateMatch) {
    return { statType: 'Critical Rate%', statValue: parseInt(critRateMatch[1]) };
  }

  // Critical Damage +8%
  const critDmgMatch = potential.match(/^Critical Damage \+(\d+)%$/);
  if (critDmgMatch) {
    return { statType: 'Critical Damage%', statValue: parseInt(critDmgMatch[1]) };
  }

  // Damage +8%
  const dmgMatch = potential.match(/^Damage \+(\d+)%$/);
  if (dmgMatch) {
    return { statType: 'Damage to Boss Monsters%', statValue: parseInt(dmgMatch[1]) };
  }

  // STR +30 per 9 character levels
  const per9Match = potential.match(/^(STR|DEX|INT|LUK) \+(\d+) per 9 character levels$/);
  if (per9Match) {
    return { statType: `${per9Match[1]} per 9 Levels`, statValue: parseInt(per9Match[2]) };
  }

  // Max HP +9% or Max MP +9%
  const maxHpMpMatch = potential.match(/^Max (HP|MP) \+(\d+)%$/);
  if (maxHpMpMatch) {
    if (maxHpMpMatch[1] === 'HP') {
      return { statType: 'MaxHP%', statValue: parseInt(maxHpMpMatch[2]) };
    }
    return { statType: null, statValue: null }; // MP not tracked
  }

  // Skill Cooldown: -2 sec
  const cdMatch = potential.match(/^Skill Cooldown: -(\d+) sec$/);
  if (cdMatch) {
    return { statType: 'Skill Cooldown', statValue: parseInt(cdMatch[1]) };
  }

  return { statType: null, statValue: null };
}

export function potentialToFd(
  parsed: ParsedPotential,
  ctx: CalculationContext
): number {
  const st = parsed.statType;
  const sv = parsed.statValue;
  if (!st || sv == null) return 0;
  const lookupStat = ctx.statAliases[st] ?? st;
  if (st === 'Skill Cooldown') return 0;
  const userVal = parseFloat(ctx.statValues[lookupStat]?.value || '0');
  const userFd = parseFloat(ctx.statValues[lookupStat]?.fd || '0');
  if (userVal === 0) return 0;
  const effectiveValue = ctx.per9Stats.has(st)
    ? sv * Math.floor(parseInt(ctx.charLevel) / 9)
    : sv;
  return effectiveValue * (userFd / userVal);
}

export function computeMultiplicativeFd(fds: number[]): number {
  let product = 1;
  for (const fd of fds) product *= 1 + fd / 100;
  return (product - 1) * 100;
}

function geomPercentile(p: number, q: number): number {
  if (p <= 0) return Infinity;
  if (p >= 1) return 1;
  return Math.ceil(Math.log(1 - q) / Math.log(1 - p));
}

function buildResult(prob: number): CubeResult {
  return {
    probability: (prob * 100).toFixed(6) + '%',
    avgCubes: prob > 0 ? (1 / prob).toFixed(1) : '∞',
    p25: geomPercentile(prob, 0.25),
    p50: geomPercentile(prob, 0.50),
    p75: geomPercentile(prob, 0.75),
    p90: geomPercentile(prob, 0.90),
  };
}

// Calculate the FD from a set of potential lines
export function calculateCurrentFd(
  line1: string,
  line2: string,
  line3: string,
  itemType: string,
  level: string,
  ctx: CalculationContext
): number {
  const lvl = parseInt(level);
  if (!itemType || isNaN(lvl)) return 0;

  const levelBucket = getLevelBucket(lvl);
  const dataItemType = getDataItemType(itemType);

  const legendaryEntry = ctx.allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Legendary' && e.level === levelBucket
  );
  const uniqueEntry = ctx.allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Unique' && e.level === levelBucket
  );

  if (!legendaryEntry) return 0;

  const legendaryPots: ParsedPotential[] = legendaryEntry.potentials.map((p) => ({
    ...p,
    ...parsePotential(p.potential),
  }));

  const uniquePots: ParsedPotential[] = uniqueEntry
    ? uniqueEntry.potentials.map((p) => ({
        ...p,
        ...parsePotential(p.potential),
      }))
    : [];

  const findPot = (potName: string, tier: 'Legendary' | 'Unique'): ParsedPotential | undefined => {
    const pots = tier === 'Legendary' ? legendaryPots : uniquePots;
    return pots.find((p) => p.potential === potName);
  };

  const isCd = (p?: ParsedPotential) => p?.statType === 'Skill Cooldown';

  const sel1 = findPot(line1, 'Legendary');
  const sel2 = findPot(line2, 'Legendary') || findPot(line2, 'Unique');
  const sel3 = findPot(line3, 'Legendary') || findPot(line3, 'Unique');

  const targetFds = [sel1, sel2, sel3].map((p) => p && !isCd(p) ? potentialToFd(p, ctx) : 0);
  return computeMultiplicativeFd(targetFds);
}

interface CalcProbResult {
  probability: number;
  expectedFdGain: number;
}

// Calculate probability of improvement and expected FD gain
function calcProbAndExpectedGain(
  itemType: string,
  level: string,
  line1: string,
  line2: string,
  line3: string,
  weights: { line2UniqueW: number; line2LegW: number; line3UniqueW: number; line3LegW: number },
  ctx: CalculationContext
): CalcProbResult {
  const lvl = parseInt(level);
  if (!itemType || isNaN(lvl)) return { probability: 0, expectedFdGain: 0 };

  const levelBucket = getLevelBucket(lvl);
  const dataItemType = getDataItemType(itemType);

  const legendaryEntry = ctx.allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Legendary' && e.level === levelBucket
  );
  const uniqueEntry = ctx.allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Unique' && e.level === levelBucket
  );

  if (!legendaryEntry) return { probability: 0, expectedFdGain: 0 };

  const legendaryPots: ParsedPotential[] = legendaryEntry.potentials.map((p) => ({
    ...p,
    ...parsePotential(p.potential),
  }));

  const uniquePots: ParsedPotential[] = uniqueEntry
    ? uniqueEntry.potentials.map((p) => ({
        ...p,
        ...parsePotential(p.potential),
      }))
    : [];

  const findPot = (potName: string, tier: 'Legendary' | 'Unique'): ParsedPotential | undefined => {
    const pots = tier === 'Legendary' ? legendaryPots : uniquePots;
    return pots.find((p) => p.potential === potName);
  };

  const isCd = (p?: ParsedPotential) => p?.statType === 'Skill Cooldown';

  const sel1 = findPot(line1, 'Legendary');
  const sel2 = findPot(line2, 'Legendary') || findPot(line2, 'Unique');
  const sel3 = findPot(line3, 'Legendary') || findPot(line3, 'Unique');

  const targetCdCount = ctx.skillCooldown
    ? [sel1, sel2, sel3].filter((p) => isCd(p)).length
    : 0;
  const targetFds = [sel1, sel2, sel3].map((p) => p && !isCd(p) ? potentialToFd(p, ctx) : 0);
  const targetFd = computeMultiplicativeFd(targetFds);

  type Cand = { fd: number; cd: number; prob: number };

  const toCand = (p: ParsedPotential, weight: number): Cand => ({
    fd: isCd(p) ? 0 : potentialToFd(p, ctx),
    cd: (ctx.skillCooldown && isCd(p)) ? 1 : 0,
    prob: p.probability * weight,
  });

  const line1Cands: Cand[] = legendaryPots.map((p) => toCand(p, 1));

  const line2Cands: Cand[] = [
    ...uniquePots.map((p) => toCand(p, weights.line2UniqueW)),
    ...legendaryPots.map((p) => toCand(p, weights.line2LegW)),
  ];

  const line3Cands: Cand[] = [
    ...uniquePots.map((p) => toCand(p, weights.line3UniqueW)),
    ...legendaryPots.map((p) => toCand(p, weights.line3LegW)),
  ];

  let totalProb = 0;
  let weightedFdGain = 0;

  for (const c1 of line1Cands) {
    for (const c2 of line2Cands) {
      for (const c3 of line3Cands) {
        const comboCd = c1.cd + c2.cd + c3.cd;
        const comboProb = c1.prob * c2.prob * c3.prob;

        if (comboCd > targetCdCount) {
          totalProb += comboProb;
          const comboFd = computeMultiplicativeFd([c1.fd, c2.fd, c3.fd]);
          weightedFdGain += comboProb * (comboFd - targetFd);
        } else if (comboCd === targetCdCount) {
          const comboFd = computeMultiplicativeFd([c1.fd, c2.fd, c3.fd]);
          if (comboFd > targetFd) {
            totalProb += comboProb;
            weightedFdGain += comboProb * (comboFd - targetFd);
          }
        }
      }
    }
  }

  return { probability: totalProb, expectedFdGain: weightedFdGain };
}

// Calculate results for a single item
export function calculateItemResults(
  item: ComparisonItem,
  ctx: CalculationContext
): ItemCalculationResult {
  const currentFd = calculateCurrentFd(
    item.line1,
    item.line2,
    item.line3,
    item.itemType,
    item.level,
    ctx
  );

  const brightCalc = calcProbAndExpectedGain(
    item.itemType,
    item.level,
    item.line1,
    item.line2,
    item.line3,
    ctx.tierWeights.bright,
    ctx
  );

  const glowingCalc = calcProbAndExpectedGain(
    item.itemType,
    item.level,
    item.line1,
    item.line2,
    item.line3,
    ctx.tierWeights.glowing,
    ctx
  );

  // Efficiency = expected FD gain per cube = expectedFdGain (which is already weighted by prob)
  // Since expectedFdGain = sum(prob * gain), and we want gain per cube on average,
  // we need expectedFdGain (total expected gain per roll) which is already what we have
  const brightEfficiency = brightCalc.expectedFdGain;
  const glowingEfficiency = glowingCalc.expectedFdGain;

  return {
    itemId: item.id,
    itemName: item.name,
    currentFd,
    brightResult: buildResult(brightCalc.probability),
    glowingResult: buildResult(glowingCalc.probability),
    brightEfficiency,
    glowingEfficiency,
    brightExpectedFdGain: brightCalc.expectedFdGain,
    glowingExpectedFdGain: glowingCalc.expectedFdGain,
    brightProbability: brightCalc.probability,
    glowingProbability: glowingCalc.probability,
  };
}

// Get potential options for an item (only potentials that give FD)
export function getPotentialOptions(
  itemType: string,
  level: string,
  allData: CubeProbabilityEntry[]
): { line1Options: string[]; line23Options: string[] } {
  if (!itemType || !level) {
    return { line1Options: [], line23Options: [] };
  }

  const lvl = parseInt(level);
  const levelBucket = getLevelBucket(lvl);
  const dataItemType = getDataItemType(itemType);

  // Filter to only include potentials that can give FD (have a valid statType)
  const givesFd = (potential: string): boolean => {
    const parsed = parsePotential(potential);
    return parsed.statType !== null;
  };

  const legendaryEntry = allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Legendary' && e.level === levelBucket
  );
  const legendaryOptions = legendaryEntry
    ? [...new Set(legendaryEntry.potentials.map((p) => p.potential))].filter(givesFd).sort()
    : [];

  const uniqueEntry = allData.find(
    (e) => e.itemType === dataItemType && e.tier === 'Unique' && e.level === levelBucket
  );
  const uniqueAndLegendaryOptions = [
    ...new Set([
      ...(uniqueEntry?.potentials.map((p) => p.potential) || []),
      ...(legendaryEntry?.potentials.map((p) => p.potential) || []),
    ]),
  ].filter(givesFd).sort();

  return { line1Options: legendaryOptions, line23Options: uniqueAndLegendaryOptions };
}
