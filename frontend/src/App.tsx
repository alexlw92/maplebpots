import { useState, useEffect } from 'react';
import './App.css';
import bonusPotentialsData from '../../bonus_potentials.json';
import config from './config.json';

const cleanPotentialName = (name: string): string =>
  name.replace(/(\d+% chance to recover [HM]P when attacking\.)\s*\d+/, '$1');

const ITEM_TYPES = config.itemTypes;
const STAT_TYPES = config.statTypes;
const COMMON_STATS = config.commonStats;
const STAT_CLASS_STATS: Record<string, string[]> = config.statClassStats;
const STAT_CLASS_OPTIONS = config.statClassOptions;

interface BonusPotentialEntry {
  potential: string;
  itemType: string;
  tier: string;
  probability: number;
  levelRange?: { min?: number; max?: number };
  statType?: string;
  statValue?: number;
}

type StatValues = Record<string, { value: string; fd: string }>;

const STORAGE_KEY = 'maplebpots-state';

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (key in parsed) return parsed[key];
    }
  } catch { /* ignore */ }
  return fallback;
}

function App() {
  const defaults = config.defaults;
  const [itemType, setItemType] = useState(() => loadSaved('itemType', defaults.itemType));
  const [level, setLevel] = useState(() => loadSaved('level', defaults.level));
  const [charLevel, setCharLevel] = useState(() => loadSaved('charLevel', defaults.charLevel));
  const [statClass, setStatClass] = useState(() => loadSaved('statClass', defaults.statClass));
  const defaultLines = (config as Record<string, unknown>).defaultLines as Record<string, string> | undefined;
  const [line1, setLine1] = useState(() => loadSaved('line1', defaultLines?.line1 ?? ''));
  const [line2, setLine2] = useState(() => loadSaved('line2', defaultLines?.line2 ?? ''));
  const [line3, setLine3] = useState(() => loadSaved('line3', defaultLines?.line3 ?? ''));
  const [skillCooldown, setSkillCooldown] = useState(() => loadSaved('skillCooldown', defaults.skillCooldown));
  const [line1Options, setLine1Options] = useState<string[]>([]);
  const [line23Options, setLine23Options] = useState<string[]>([]);
  const [statValues, setStatValues] = useState<StatValues>(() => {
    const defaults = config.defaultStatValues as StatValues;
    const initial: StatValues = {};
    STAT_TYPES.forEach((s) => { initial[s] = defaults[s] ?? { value: '', fd: '' }; });
    const saved = loadSaved<StatValues | null>('statValues', null);
    if (saved) {
      for (const key of Object.keys(saved)) {
        if (key in initial) initial[key] = saved[key];
      }
    }
    return initial;
  });

  // Save all inputs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      itemType, level, charLevel, statClass,
      line1, line2, line3, skillCooldown, statValues,
    }));
  }, [itemType, level, charLevel, statClass, line1, line2, line3, skillCooldown, statValues]);

  useEffect(() => {
    if (!itemType || !level) {
      setLine1Options([]);
      setLine23Options([]);
      return;
    }

    const lvl = parseInt(level);
    const allPots = (bonusPotentialsData as BonusPotentialEntry[]);
    const inRange = (p: BonusPotentialEntry) => {
      const min = p.levelRange?.min ?? 0;
      const max = p.levelRange?.max ?? Infinity;
      return lvl >= min && lvl <= max;
    };

    const legendaryOptions = [
      ...new Set(
        allPots
          .filter((p) => p.itemType === itemType && p.tier === 'legendary' && inRange(p))
          .map((p) => cleanPotentialName(p.potential))
      ),
    ].sort();

    const uniqueAndLegendaryOptions = [
      ...new Set(
        allPots
          .filter((p) => p.itemType === itemType && (p.tier === 'unique' || p.tier === 'legendary') && inRange(p))
          .map((p) => cleanPotentialName(p.potential))
      ),
    ].sort();

    setLine1Options(legendaryOptions);
    setLine23Options(uniqueAndLegendaryOptions);
  }, [itemType, level]);

  const [prevItemType, setPrevItemType] = useState(itemType);
  const [prevLevel, setPrevLevel] = useState(level);
  if (itemType !== prevItemType || level !== prevLevel) {
    setPrevItemType(itemType);
    setPrevLevel(level);
    setLine1('');
    setLine2('');
    setLine3('');
  }

  interface CubeResult {
    probability: string;
    avgCubes: string;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  }
  const [brightResult, setBrightResult] = useState<CubeResult | null>(null);
  const [glowingResult, setGlowingResult] = useState<CubeResult | null>(null);

  const STAT_ALIASES: Record<string, string> = config.statAliases;
  const PER_9_STATS = new Set(config.per9Stats);

  const potentialToFd = (entry: BonusPotentialEntry): number => {
    const st = entry.statType;
    const sv = entry.statValue;
    if (!st || sv == null) return 0;
    const lookupStat = STAT_ALIASES[st] ?? st;
    if (st === 'Skill Cooldown') return 0;
    const userVal = parseFloat(statValues[lookupStat]?.value || '0');
    const userFd = parseFloat(statValues[lookupStat]?.fd || '0');
    if (userVal === 0) return 0;
    const effectiveValue = PER_9_STATS.has(st)
      ? sv * Math.floor(parseInt(charLevel) / 9)
      : sv;
    return effectiveValue * (userFd / userVal);
  };

  const computeMultiplicativeFd = (fds: number[]): number => {
    let product = 1;
    for (const fd of fds) product *= 1 + fd / 100;
    return (product - 1) * 100;
  };

  const handleCalculate = () => {
    const lvl = parseInt(level);
    if (!itemType || isNaN(lvl)) return;

    const allPots = (bonusPotentialsData as BonusPotentialEntry[]).filter((p) => {
      if (p.itemType !== itemType) return false;
      const min = p.levelRange?.min ?? 0;
      const max = p.levelRange?.max ?? Infinity;
      return lvl >= min && lvl <= max;
    });

    const legendaryPots = allPots.filter((p) => p.tier === 'legendary');
    const uniquePots = allPots.filter((p) => p.tier === 'unique');

    // Compute target from selected lines
    const findPot = (potName: string, tier: string): BonusPotentialEntry | undefined => {
      return allPots.find((p) => cleanPotentialName(p.potential) === potName && p.tier === tier)
        || allPots.find((p) => cleanPotentialName(p.potential) === potName);
    };

    const isCd = (p?: BonusPotentialEntry) => p?.statType === 'Skill Cooldown';

    const sel1 = findPot(line1, 'legendary');
    const sel2 = findPot(line2, 'legendary') || findPot(line2, 'unique');
    const sel3 = findPot(line3, 'legendary') || findPot(line3, 'unique');

    const targetCdCount = skillCooldown
      ? [sel1, sel2, sel3].filter((p) => isCd(p)).length
      : 0;
    const targetFds = [sel1, sel2, sel3].map((p) => p && !isCd(p) ? potentialToFd(p) : 0);
    const targetFd = computeMultiplicativeFd(targetFds);

    const tierWeights = config.tierWeights;

    type Cand = { fd: number; cd: number; prob: number };

    const toCand = (p: BonusPotentialEntry, weight: number): Cand => ({
      fd: isCd(p) ? 0 : potentialToFd(p),
      cd: (skillCooldown && isCd(p)) ? 1 : 0,
      prob: p.probability * weight,
    });

    const calcProb = (weights: typeof tierWeights.bright): number => {
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
      for (const c1 of line1Cands) {
        for (const c2 of line2Cands) {
          for (const c3 of line3Cands) {
            const comboCd = c1.cd + c2.cd + c3.cd;
            if (comboCd > targetCdCount) {
              totalProb += c1.prob * c2.prob * c3.prob;
            } else if (comboCd === targetCdCount) {
              const comboFd = computeMultiplicativeFd([c1.fd, c2.fd, c3.fd]);
              if (comboFd > targetFd) {
                totalProb += c1.prob * c2.prob * c3.prob;
              }
            }
          }
        }
      }
      return totalProb;
    };

    const geomPercentile = (p: number, q: number): number => {
      if (p <= 0) return Infinity;
      if (p >= 1) return 1;
      return Math.ceil(Math.log(1 - q) / Math.log(1 - p));
    };

    const buildResult = (prob: number): CubeResult => ({
      probability: (prob * 100).toFixed(6) + '%',
      avgCubes: prob > 0 ? (1 / prob).toFixed(1) : '∞',
      p25: geomPercentile(prob, 0.25),
      p50: geomPercentile(prob, 0.50),
      p75: geomPercentile(prob, 0.75),
      p90: geomPercentile(prob, 0.90),
    });

    setBrightResult(buildResult(calcProb(tierWeights.bright)));
    setGlowingResult(buildResult(calcProb(tierWeights.glowing)));
  };

  const filteredStatTypes = statClass
    ? [...COMMON_STATS, ...(STAT_CLASS_STATS[statClass] || [])]
    : STAT_TYPES;

  const updateStatValue = (stat: string, field: 'value' | 'fd', val: string) => {
    setStatValues((prev) => ({
      ...prev,
      [stat]: { ...prev[stat], [field]: val },
    }));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>icyloves' Bonus Potential Cubing Calculator</h1>
        <p>Look up bonus potential probabilities</p>
      </header>

      <main className="App-main">
        <div className="main-layout">
          <section className="form-section instructions-box">
            <h2>Instructions</h2>
            <ol>
              <li>Go to <a href="https://maplescouter.com/en/input" target="_blank" rel="noopener noreferrer">maplescouter.com/en/input</a>, enter your stats for your character, and click results.</li>
              <li>From the "Efficiency-Boss Cut" page, on the left, under "Stat Efficiency", click "Detailed Eff".</li>
              <li>Use the FD% values from MapleScouter to fill in your stat values.</li>
              <li>If your class uses cooldown reduction, check the "Skill Cooldown" checkbox.</li>
              <li>Select your item type and existing bonus potential lines</li>
              <li>Hit calculate to see on average, how many cubes it would take to roll a better bonus potential</li>
            </ol>
          </section>
          <section className="form-section stats-section">
            <h2>Stat Values</h2>
            <div className="stats-config">
              <div className="form-group">
                <label htmlFor="charLevel">Level</label>
                <input
                  id="charLevel"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="e.g. 260"
                  value={charLevel}
                  onChange={(e) => setCharLevel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="statClass">Stat Type</label>
                <select
                  id="statClass"
                  value={statClass}
                  onChange={(e) => setStatClass(e.target.value)}
                >
                  <option value="">Select stat type...</option>
                  {STAT_CLASS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={skillCooldown}
                onChange={(e) => setSkillCooldown(e.target.checked)}
              />
              Skill Cooldown
            </label>
            <div className="stats-table">
              <div className="stats-header">
                <span>Stat</span>
                <span>Value</span>
                <span>FD%</span>
              </div>
              {filteredStatTypes.map((stat) => (
                <div key={stat} className="stats-row">
                  <span className="stat-label">{stat}</span>
                  <input
                    type="number"
                    value={statValues[stat].value}
                    onChange={(e) => updateStatValue(stat, 'value', e.target.value)}
                    placeholder="0"
                  />
                  <div className="input-suffix">
                    <input
                      type="number"
                      step="0.01"
                      value={statValues[stat].fd}
                      onChange={(e) => updateStatValue(stat, 'fd', e.target.value)}
                      placeholder="0"
                    />
                    <span>%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="form-section inputs-section">
            <div className="form-group">
              <label htmlFor="itemType">Item Type</label>
              <select
                id="itemType"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              >
                <option value="">Select item type...</option>
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="level">Item Level</label>
              <input
                id="level"
                type="number"
                min="0"
                max="300"
                placeholder="e.g. 160"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="line1">Potential Line 1</label>
              <select
                id="line1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                disabled={line1Options.length === 0}
              >
                <option value="">Select potential...</option>
                {line1Options.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="line2">Potential Line 2</label>
              <select
                id="line2"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                disabled={line23Options.length === 0}
              >
                <option value="">Select potential...</option>
                {line23Options.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="line3">Potential Line 3</label>
              <select
                id="line3"
                value={line3}
                onChange={(e) => setLine3(e.target.value)}
                disabled={line23Options.length === 0}
              >
                <option value="">Select potential...</option>
                {line23Options.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button className="calculate-btn" type="button" onClick={handleCalculate}>
              Calculate
            </button>

            {(brightResult || glowingResult) && (
              <div className="results-section">
                <h3>Probability of Rolling Higher FD%</h3>
                {[
                  { label: 'Bonus Bright', data: brightResult },
                  { label: 'Bonus Glowing', data: glowingResult },
                ].map(({ label, data }) => data && (
                  <div key={label} className="cube-result-block">
                    <h4>{label}</h4>
                    <div className="result-row">
                      <span>Avg cubes needed:</span>
                      <span>{data.avgCubes}</span>
                    </div>
                    <div className="result-row">
                      <span>25th percentile:</span>
                      <span>{data.p25 === Infinity ? '∞' : data.p25} cubes</span>
                    </div>
                    <div className="result-row">
                      <span>50th percentile:</span>
                      <span>{data.p50 === Infinity ? '∞' : data.p50} cubes</span>
                    </div>
                    <div className="result-row">
                      <span>75th percentile:</span>
                      <span>{data.p75 === Infinity ? '∞' : data.p75} cubes</span>
                    </div>
                    <div className="result-row">
                      <span>90th percentile:</span>
                      <span>{data.p90 === Infinity ? '∞' : data.p90} cubes</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
