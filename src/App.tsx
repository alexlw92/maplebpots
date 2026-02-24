import { useState, useEffect, useMemo } from 'react';
import './App.css';
import cubeProbabilitiesData from '../cube_probabilities.json';
import config from './config.json';
import {
  CubeProbabilityEntry,
  StatValues,
  ComparisonItem,
  ItemCalculationResult,
  CalculationContext,
  SPECIFIC_ITEMS,
  DEFAULT_LOADOUT,
} from './types';
import {
  calculateItemResults,
  getPotentialOptions,
} from './calculations';

const ITEM_TYPES = config.itemTypes;
const STAT_TYPES = config.statTypes;
const COMMON_STATS = config.commonStats;
const STAT_CLASS_STATS: Record<string, string[]> = config.statClassStats;
const STAT_CLASS_OPTIONS = config.statClassOptions;

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

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

type SortKey = 'efficiency' | 'avgCubes' | 'probability' | 'expectedFdGain';
type CubeType = 'bright' | 'glowing';

function App() {
  const defaults = config.defaults;
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [charLevel, setCharLevel] = useState(() => loadSaved('charLevel', defaults.charLevel));
  const [statClass, setStatClass] = useState(() => loadSaved('statClass', defaults.statClass));
  const [skillCooldown, setSkillCooldown] = useState(() => loadSaved('skillCooldown', defaults.skillCooldown));
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

  // Comparison items state
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>(() => {
    const saved = loadSaved<ComparisonItem[] | null>('comparisonItems', null);
    if (saved && saved.length > 0) {
      // Migrate old items without specificItem
      return saved.map(item => ({
        ...item,
        specificItem: item.specificItem ?? '',
      }));
    }
    // Default: full loadout from DEFAULT_LOADOUT
    return DEFAULT_LOADOUT.map(item => {
      // For items with specific item options, set the specificItem field
      const specificItems = SPECIFIC_ITEMS[item.itemType];
      const matchingSpecific = specificItems?.find(s => s.name === item.name);
      return {
        id: generateId(),
        name: item.name,
        itemType: item.itemType,
        specificItem: matchingSpecific ? item.name : '',
        level: item.level,
        line1: '',
        line2: '',
        line3: '',
        collapsed: true,
      };
    });
  });

  const [comparisonResults, setComparisonResults] = useState<ItemCalculationResult[]>([]);
  const [cubeType, setCubeType] = useState<CubeType>(() => loadSaved('cubeType', 'bright'));
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const saved = loadSaved<SortKey | null>('sortKey', null);
    if (saved) return saved;
    return cubeType === 'bright' ? 'efficiency' : 'avgCubes';
  });

  const allData = cubeProbabilitiesData as CubeProbabilityEntry[];

  const STAT_ALIASES: Record<string, string> = config.statAliases;
  const PER_9_STATS = useMemo(() => new Set(config.per9Stats), []);

  // Save all inputs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      charLevel, statClass, skillCooldown, statValues,
      comparisonItems, cubeType, sortKey,
    }));
  }, [charLevel, statClass, skillCooldown, statValues, comparisonItems, cubeType, sortKey]);

  // Update default sort when cube type changes
  useEffect(() => {
    setSortKey(cubeType === 'bright' ? 'efficiency' : 'avgCubes');
  }, [cubeType]);

  // Default levels for each item type
  const defaultLevels: Record<string, string> = {
    'Weapon': '200',
    'Secondary': '140',
    'Emblem': '200',
    'Hat': '250',
    'Top': '250',
    'Bottom': '250',
    'Shoulder': '250',
    'Cape': '200',
    'Gloves': '200',
    'Shoes': '200',
    'Heart': '200',
    'Ring': '200',
    'Belt': '200',
    'Face Accessory': '160',
    'Eye Accessory': '160',
    'Earring': '200',
    'Pendant': '160',
  };

  // CRUD operations for comparison items
  const addItem = (itemType?: string) => {
    const type = itemType ?? '';
    const level = itemType ? (defaultLevels[itemType] || '200') : '200';
    const name = itemType || `Item ${comparisonItems.length + 1}`;
    const newItem: ComparisonItem = {
      id: generateId(),
      name,
      itemType: type,
      specificItem: '',
      level,
      line1: '',
      line2: '',
      line3: '',
      collapsed: false,
    };
    setComparisonItems([...comparisonItems, newItem]);
  };

  const updateItem = (id: string, updates: Partial<ComparisonItem>) => {
    setComparisonItems(items =>
      items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // When item type changes, reset specificItem and clear lines
        if (updates.itemType !== undefined && updates.itemType !== item.itemType) {
          updated.specificItem = '';
          updated.line1 = '';
          updated.line2 = '';
          updated.line3 = '';
        }

        // When specificItem changes, auto-set the level and name
        if (updates.specificItem !== undefined) {
          const specificItems = SPECIFIC_ITEMS[updated.itemType];
          const selected = specificItems?.find(s => s.name === updates.specificItem);
          if (selected) {
            // Auto-set name to the specific item name
            if (updates.specificItem !== 'Other') {
              updated.name = updates.specificItem;
            }
            if (selected.level) {
              updated.level = selected.level;
              // Clear lines when level changes
              if (updated.level !== item.level) {
                updated.line1 = '';
                updated.line2 = '';
                updated.line3 = '';
              }
            }
          }
        }

        // Clear lines if level changed directly
        if (updates.level !== undefined && updates.level !== item.level) {
          updated.line1 = '';
          updated.line2 = '';
          updated.line3 = '';
        }

        return updated;
      })
    );
  };

  const deleteItem = (id: string) => {
    setComparisonItems(items => items.filter(item => item.id !== id));
  };

  const resetItems = () => {
    const defaultItems = DEFAULT_LOADOUT.map(item => {
      const specificItems = SPECIFIC_ITEMS[item.itemType];
      const matchingSpecific = specificItems?.find(s => s.name === item.name);
      return {
        id: generateId(),
        name: item.name,
        itemType: item.itemType,
        specificItem: matchingSpecific ? item.name : '',
        level: item.level,
        line1: '',
        line2: '',
        line3: '',
        collapsed: true,
      };
    });
    setComparisonItems(defaultItems);
    setComparisonResults([]);
  };

  const toggleCollapse = (id: string) => {
    setComparisonItems(items => {
      const targetItem = items.find(item => item.id === id);
      const isOpening = targetItem?.collapsed;
      return items.map(item => {
        if (item.id === id) {
          return { ...item, collapsed: !item.collapsed };
        }
        // Collapse all other items when opening one
        if (isOpening) {
          return { ...item, collapsed: true };
        }
        return item;
      });
    });
  };

  const handleCalculateAll = () => {
    const ctx: CalculationContext = {
      charLevel,
      statClass,
      skillCooldown,
      statValues,
      allData,
      tierWeights: config.tierWeights,
      statAliases: STAT_ALIASES,
      per9Stats: PER_9_STATS,
    };

    const results = comparisonItems
      .filter(item => item.itemType && item.level)
      .map(item => calculateItemResults(item, ctx));

    setComparisonResults(results);
  };

  // Sort results
  const sortedResults = useMemo(() => {
    if (comparisonResults.length === 0) return [];

    const sorted = [...comparisonResults].sort((a, b) => {
      const aVal = cubeType === 'bright'
        ? (sortKey === 'efficiency' ? a.brightEfficiency :
           sortKey === 'avgCubes' ? (a.brightResult ? parseFloat(a.brightResult.avgCubes) : Infinity) :
           sortKey === 'probability' ? a.brightProbability :
           a.brightExpectedFdGain)
        : (sortKey === 'efficiency' ? a.glowingEfficiency :
           sortKey === 'avgCubes' ? (a.glowingResult ? parseFloat(a.glowingResult.avgCubes) : Infinity) :
           sortKey === 'probability' ? a.glowingProbability :
           a.glowingExpectedFdGain);

      const bVal = cubeType === 'bright'
        ? (sortKey === 'efficiency' ? b.brightEfficiency :
           sortKey === 'avgCubes' ? (b.brightResult ? parseFloat(b.brightResult.avgCubes) : Infinity) :
           sortKey === 'probability' ? b.brightProbability :
           b.brightExpectedFdGain)
        : (sortKey === 'efficiency' ? b.glowingEfficiency :
           sortKey === 'avgCubes' ? (b.glowingResult ? parseFloat(b.glowingResult.avgCubes) : Infinity) :
           sortKey === 'probability' ? b.glowingProbability :
           b.glowingExpectedFdGain);

      // For avgCubes, lower is better; for others, higher is better
      if (sortKey === 'avgCubes') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });

    return sorted;
  }, [comparisonResults, cubeType, sortKey]);

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
        <p>R{">"}Potatoe (Scania)</p>
      </header>

      <main className="App-main">
        <div className="main-layout">
          <section className="form-section instructions-box">
            <h2 className="instructions-toggle" onClick={() => setInstructionsOpen(!instructionsOpen)}>
              <span className={`toggle-arrow ${instructionsOpen ? 'open' : ''}`}>&#9654;</span>
              Instructions
            </h2>
            {instructionsOpen && (
              <ol>
                <li>Go to <a href="https://maplescouter.com/en/input" target="_blank" rel="noopener noreferrer">maplescouter.com/en/input</a>, enter your stats for your character, and click results.</li>
                <li>From the "Efficiency-Boss Cut" page, on the left, under "Stat Efficiency", click "Detailed Eff".</li>
                <li>Use the FD% values from MapleScouter to fill in your stat values.</li>
                <li>If your class uses cooldown reduction, check the "Skill Cooldown" checkbox.</li>
                <li>Add items you want to compare with their current bonus potential lines.</li>
                <li>Hit "Calculate All" to see which item offers the best value to cube next!</li>
              </ol>
            )}
          </section>

          <section className="form-section stats-section">
            <h2>Stat Values</h2>
            <div className="stats-config">
              <div className="form-group">
                <label htmlFor="charLevel">Character Level</label>
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

          <section className="form-section items-section">
            <h2>Items to Compare</h2>

            <div className="items-list">
              {comparisonItems.map((item) => {
                const { line1Options, line23Options } = getPotentialOptions(
                  item.itemType,
                  item.level,
                  allData
                );

                return (
                  <div key={item.id} className="item-card">
                    <div
                      className="item-card-header"
                      onClick={() => toggleCollapse(item.id)}
                    >
                      <span className={`toggle-arrow ${!item.collapsed ? 'open' : ''}`}>&#9654;</span>
                      <input
                        type="text"
                        className="item-name-input"
                        value={item.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="Item name"
                      />
                      <span className="item-summary">
                        {item.itemType && `(${item.itemType}, Lv. ${item.level})`}
                      </span>
                      <button
                        className="delete-item-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                        title="Delete item"
                      >
                        ×
                      </button>
                    </div>

                    {!item.collapsed && (
                      <div className="item-card-body">
                        <div className="item-config-row">
                          {SPECIFIC_ITEMS[item.itemType] && (
                            <div className="form-group">
                              <label>Item</label>
                              <select
                                value={item.specificItem}
                                onChange={(e) => updateItem(item.id, { specificItem: e.target.value })}
                              >
                                <option value="">Select item...</option>
                                {SPECIFIC_ITEMS[item.itemType].map((s) => (
                                  <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="form-group">
                            <label>Item Level</label>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              placeholder="e.g. 160"
                              value={item.level}
                              onChange={(e) => updateItem(item.id, { level: e.target.value })}
                              disabled={SPECIFIC_ITEMS[item.itemType] && item.specificItem !== 'Other' && item.specificItem !== ''}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Line 1 (Legendary)</label>
                          <select
                            value={item.line1}
                            onChange={(e) => updateItem(item.id, { line1: e.target.value })}
                            disabled={line1Options.length === 0}
                          >
                            <option value="">Select potential...</option>
                            {line1Options.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Line 2</label>
                          <select
                            value={item.line2}
                            onChange={(e) => updateItem(item.id, { line2: e.target.value })}
                            disabled={line23Options.length === 0}
                          >
                            <option value="">Select potential...</option>
                            {line23Options.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Line 3</label>
                          <select
                            value={item.line3}
                            onChange={(e) => updateItem(item.id, { line3: e.target.value })}
                            disabled={line23Options.length === 0}
                          >
                            <option value="">Select potential...</option>
                            {line23Options.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="quick-add-buttons">
              {ITEM_TYPES.map((type) => (
                <button
                  key={type}
                  className="quick-add-btn"
                  type="button"
                  onClick={() => addItem(type)}
                >
                  +{type}
                </button>
              ))}
            </div>

            <button className="reset-items-btn" type="button" onClick={resetItems}>
              Reset All Items
            </button>

            <button className="calculate-btn" type="button" onClick={handleCalculateAll}>
              Calculate All
            </button>

            {sortedResults.length > 0 && (
              <div className="comparison-results">
                <h3>Comparison Results</h3>

                <div className="results-controls">
                  <div className="form-group">
                    <label>Cube Type</label>
                    <select
                      value={cubeType}
                      onChange={(e) => setCubeType(e.target.value as CubeType)}
                    >
                      <option value="bright">Bonus Bright</option>
                      <option value="glowing">Bonus Glowing</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sort By</label>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                    >
                      <option value="efficiency">Efficiency (FD/cube)</option>
                      <option value="avgCubes">Avg Cubes (fewest)</option>
                      <option value="probability">Probability (highest)</option>
                      <option value="expectedFdGain">Expected FD Gain</option>
                    </select>
                  </div>
                </div>

                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Item</th>
                        <th>Current FD</th>
                        <th>Avg Cubes</th>
                        <th>Probability</th>
                        <th>Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((result, index) => {
                        const cubeResult = cubeType === 'bright' ? result.brightResult : result.glowingResult;
                        const efficiency = cubeType === 'bright' ? result.brightEfficiency : result.glowingEfficiency;
                        const probability = cubeType === 'bright' ? result.brightProbability : result.glowingProbability;

                        return (
                          <tr key={result.itemId} className={index === 0 ? 'best-result' : ''}>
                            <td>
                              <span className={`rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : ''}`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td>{result.itemName}</td>
                            <td>{result.currentFd.toFixed(3)}%</td>
                            <td>{cubeResult?.avgCubes ?? '∞'}</td>
                            <td>{(probability * 100).toFixed(4)}%</td>
                            <td>
                              {efficiency > 0 ? efficiency.toFixed(6) : '0'}
                              {index === 0 && <span className="best-tag">Best</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="results-legend">
                  <p><strong>Efficiency:</strong> Expected FD% gain per cube spent</p>
                  <p><strong>Avg Cubes:</strong> Average cubes needed for any improvement</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
