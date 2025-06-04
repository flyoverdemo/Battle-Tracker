import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Import shared icons (assuming these are in a separate file, e.g., './SharedIcons')
import { Plus, Minus, Trash2, Sword, User, Heart, Skull, ShieldCheck, Dice, Footprints, Bolt, Check, ScrollText, RotateCcw, Lock, LockOpen, ChevronDown, ChevronUp, Gem, Shirt, Scroll } from './SharedIcons';

// Import shared utility functions (assuming these are in a separate file, e.g., './SharedUtilities')
import { parseCSV, rollDiceDetailed, getDieTypeMax, parseDiceNotation, parseDiceNotationForParts, crToNumber } from './SharedUtilities';

// Import shared components (assuming these are in a separate file, e.g., './SharedComponents')
import { ColorPickerWheel, NumberScroller, DraggableWindow } from './SharedComponents';

// Import main feature components (assuming these are in separate files)
import CombatantManagement from './CombatantManagement';
import InitiativeOrder from './InitiativeOrder';
import UtilitiesDiceRoller from './UtilitiesDiceRoller';
import SimpleDiceRoller from './SimpleDiceRoller'; // Assuming this is also a separate component now


// Main App component
const App = () => {
  // --- Core State Management ---
  const [characters, setCharacters] = useState([]);
  const [loadedMonsters, setLoadedMonsters] = useState(() => {
    const defaultGoblin = {
      id: "goblin_default",
      name: "Goblin",
      species: "Goblin",
      hp: 7,
      hpDice: "2d6",
      ac: 15,
      movement: "30ft",
      initiativeBonus: 2,
      str: 8,
      dex: 14,
      con: 10,
      int: 10,
      wis: 8,
      cha: 8,
      proficiencyBonus: 2,
      skills: { stealth: "+6" },
      senses: "darkvision 60 ft.",
      languages: "Common, Goblin",
      cr: "1/4",
      xp: 50,
      size: "Small",
      actions: [
        { id: "goblin_scimitar", name: "Scimitar", dice: "1d6+2", damageType: "Slashing", toHitModifier: 4 },
        { id: "goblin_shortbow", name: "Shortbow", dice: "1d6+2", damageType: "Piercing", toHitModifier: 4 }
      ],
      items: [
        { id: "goblin_leather_armor", type: "armor", name: "Leather Armor", ac: 11, armorType: "Light", isCustom: false },
        { id: "goblin_shield", type: "armor", name: "Shield", ac: 2, armorType: "Shield", isCustom: false },
        { id: "goblin_potion_healing", type: "potion", name: "Potion of Healing", effect: "Heals 2d4+2 HP", quantity: 1, unit: "bottle", isCustom: false },
        { id: "goblin_gold", type: "loot", name: "Gold", quantity: 5, unit: "gp", isCustom: false }
      ],
      traits: [
        { id: "goblin_nimble_escape", name: "Nimble Escape", description: "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.", actionType: "bonusAction" }
      ],
      isCustom: false,
    };
    return [defaultGoblin];
  });
  const [loadedNamesData, setLoadedNamesData] = useState({});
  const [loadedStatusEffects, setLoadedStatusEffects] = useState({});
  const [loading, setLoading] = useState(true);

  // Global states for Custom Weapon inputs (lifted from CombatantDetails, managed here as they are passed down)
  const [newCustomWeaponName, setNewCustomWeaponName] = useState('');
  const [newCustomWeaponNumDice, setNewCustomWeaponNumDice] = useState(1);
  const [newCustomWeaponDieType, setNewCustomWeaponDieType] = useState('d4');
  const [newCustomWeaponModifier, setNewCustomWeaponModifier] = useState('0');
  const [selectedDamageTypeForNewWeapon, setSelectedDamageTypeForNewWeapon] = useState('');
  const [customDamageTypeName, setCustomDamageTypeName] = useState('');
  const [newCustomWeaponToHitModifier, setNewCustomWeaponToHitModifier] = useState('0');

  const [openCombatantIds, setOpenCombatantIds] = useState(new Set());
  const [nextColorIndex, setNextColorIndex] = useState(0);
  const [logEntries, setLogEntries] = useState([]);
  const logRef = useRef(null);
  const [round, setRound] = useState(1);
  const [deathSavesEnabled, setDeathSavesEnabled] = useState(false);
  const [lootPool, setLootPool] = useState([]);
  const [totalXpPool, setTotalXpPool] = useState(0);
  const [deletedCharacters, setDeletedCharacters] = useState([]);
  const [usedUniqueNames] = useState(new Set());

  const MAX_TOTAL_COMBATANTS = 40;
  const MAX_ADD_QUANTITY = 20;
  const maxHpLimit = 500;
  const MAX_UNDO_BUFFER = 20;

  const COLORS = useMemo(() => [
    '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FF7F',
    '#00FFFF', '#007FFF', '#0000FF', '#7F00FF', '#FF00FF', '#FF007F',
  ], []);

  const [windowPositions, setWindowPositions] = useState({
    initiative: { x: 50, y: 50 },
    combatantManagement: { x: 500, y: 50 },
    utilities: { x: 950, y: 50 },
  });

  const [windowZIndices, setWindowZIndices] = useState({
    initiative: 1,
    combatantManagement: 1,
    utilities: 1,
  });

  const bringWindowToFront = useCallback((windowId) => {
    setWindowZIndices(prevZIndices => {
      const maxZIndex = Math.max(...Object.values(prevZIndices));
      return {
        ...prevZIndices,
        [windowId]: maxZIndex + 1,
      };
    });
  }, []);

  // States for CombatantManagement form (lifted from CombatantManagement.js)
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterInitiative, setNewCharacterInitiative] = useState('');
  const [monsterInitiativeMathDisplay, setMonsterInitiativeMathDisplay] = useState('');
  const [newCharacterHp, setNewCharacterHp] = useState('1');
  const [newCharacterAc, setNewCharacterAc] = useState('0');
  const [newCharacterHpDice, setNewCharacterHpDice] = useState('');
  const [newCharacterHpModifier, setNewCharacterHpModifier] = useState('0');
  const [newCharacterHpBaseRollDisplay, setNewCharacterHpBaseRollDisplay] = useState('');
  const [newCharacterMovement, setNewCharacterMovement] = useState('0');
  const [newCharacterActions, setNewCharacterActions] = useState('');
  const [newCharacterType, setNewCharacterType] = useState('player');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonsterId, setSelectedMonsterId] = useState('');
  const [monsterSortOption, setMonsterSortOption] = useState('name');
  const [newCharacterQuantity, setNewCharacterQuantity] = useState('1');
  const [randomizeAc, setRandomizeAc] = useState(false);
  const [randomizeWeapons, setRandomizeWeapons] = useState(false);
  const [createUniqueNames, setCreateUniqueNames] = useState(false);
  const [sharedInitiative, setSharedInitiative] = useState(false);
  const [rollHpOnAddBatch, setRollHpOnAddBatch] = useState(false);
  const [randomizeNewCombatantStats, setNewRandomizeNewCombatantStats] = useState(false);
  const [newCharacterStr, setNewCharacterStr] = useState('');
  const [newCharacterDex, setNewCharacterDex] = useState('');
  const [newCharacterCon, setNewCharacterCon] = useState('');
  const [newCharacterInt, setNewCharacterInt] = useState('');
  const [newCharacterWis, setNewCharacterWis] = useState('');
  const [newCharacterCha, setNewCharacterCha] = useState('');
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);
  const [currentMonsterInitiativeBonus, setCurrentMonsterInitiativeBonus] = useState(0);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  // States for Utilities window
  const [showLog, setShowLog] = useState(true);
  const [showLootPool, setShowLootPool] = useState(true);


  // --- Data Loading from CSVs ---
  useEffect(() => {
    const loadData = async () => {
      const fetchFromContentFetcher = async (query, id, type) => {
        if (typeof window.content_fetcher !== 'undefined' && window.content_fetcher.fetch) {
          try {
            return await window.content_fetcher.fetch({ query, source_references: [{ id, type }] });
          } catch (e) {
            console.warn(`Content fetcher failed for ${query}, attempting GitHub fallback.`, e);
            return null; // Indicate failure
          }
        }
        return null; // Content fetcher not available
      };

      const fetchFromGitHub = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.text();
        } catch (e) {
          console.error(`Failed to fetch from GitHub URL: ${url}`, e);
          return null;
        }
      };

      const getCsvContent = async (filename, contentFetcherId) => {
        let content = await fetchFromContentFetcher(filename, contentFetcherId, 'text/csv');
        if (!content) {
          // Construct raw GitHub URL
          const githubUrl = `https://raw.githubusercontent.com/flyoverdemo/Battle-Tracker/main/${encodeURIComponent(filename)}`;
          content = await fetchFromGitHub(githubUrl);
        }
        return content;
      };

      try {
        const monstersCsv = await getCsvContent('monsters.csv', 'monsters_csv');
        const actionsCsv = await getCsvContent('monster_actions.csv', 'monster_actions_csv');
        const itemsCsv = await getCsvContent('monster_items.csv', 'monster_items_csv');
        const traitsCsv = await getCsvContent('monster_traits.csv', 'monster_traits_csv');
        const namesCsv = await getCsvContent('names.csv', 'names_csv');
        const statusEffectsCsv = await getCsvContent('status_effects.csv', 'status_effects_csv');

        if (monstersCsv) {
          const parsedMonsters = parseCSV(monstersCsv);
          const parsedActions = actionsCsv ? parseCSV(actionsCsv) : [];
          const parsedItems = itemsCsv ? parseCSV(itemsCsv) : [];
          const parsedTraits = traitsCsv ? parseCSV(traitsCsv) : [];

          const reconstructedMonstersFromCsv = parsedMonsters.map(monster => {
            const monsterActions = parsedActions.filter(action => action.monsterId === monster.id)
              .map(action => ({
                id: crypto.randomUUID(),
                name: action.actionName,
                dice: action.dice,
                damageType: action.damageType,
                toHitModifier: action.toHitModifier,
              }));

            const monsterItems = parsedItems.filter(item => item.monsterId === monster.id)
              .map(item => ({
                id: crypto.randomUUID(),
                type: item.itemType,
                name: item.itemName,
                damage: item.damage,
                damageType: item.damageType,
                toHit: item.toHit,
                ac: item.ac,
                armorType: item.armorType,
                quantity: item.quantity,
                unit: item.unit,
                value: item.value,
                effect: item.effect,
              }));

            const monsterTraits = parsedTraits.filter(trait => trait.monsterId === monster.id)
              .map(trait => ({
                id: crypto.randomUUID(),
                name: trait.traitName,
                description: trait.description,
                actionType: trait.actionType,
              }));

            let skillsObject = {};
            if (monster.skills_json) {
              try {
                skillsObject = JSON.parse(monster.skills_json);
              } catch (e) {
                console.error("Error parsing skills_json for monster:", monster.name, e);
              }
            }

            return {
              ...monster,
              hp: Number(monster.hp),
              ac: Number(monster.ac),
              xp: Number(monster.xp),
              initiativeBonus: Number(monster.initiativeBonus),
              str: Number(monster.str),
              dex: Number(monster.dex),
              con: Number(monster.con),
              int: Number(monster.int),
              wis: Number(monster.wis),
              cha: Number(monster.cha),
              proficiencyBonus: Number(monster.proficiencyBonus),
              actions: monsterActions,
              items: monsterItems,
              traits: monsterTraits,
              skills: skillsObject,
            };
          });

          setLoadedMonsters(prevMonsters => {
            const mergedMonsters = [...prevMonsters];
            reconstructedMonstersFromCsv.forEach(csvMonster => {
              if (!mergedMonsters.some(m => m.id === csvMonster.id)) {
                mergedMonsters.push(csvMonster);
              }
            });
            return mergedMonsters;
          });
        } else {
          console.error("Failed to load monsters.csv, cannot proceed with monster data.");
        }


        if (namesCsv) {
          const parsedNames = parseCSV(namesCsv);
          const namesMap = {};
          parsedNames.forEach(row => {
            if (!namesMap[row.species]) {
              namesMap[row.species] = { first: [], last: [] };
            }
            if (row.type === 'first') {
              namesMap[row.species].first.push(row.name);
            } else if (row.type === 'last') {
              namesMap[row.species].last.push(row.name);
            }
          });
          setLoadedNamesData(namesMap);
        } else {
          console.error("Failed to load names.csv.");
        }

        if (statusEffectsCsv) {
          const parsedStatusEffects = parseCSV(statusEffectsCsv);
          const statusEffectsMap = {};
          parsedStatusEffects.forEach(row => {
            statusEffectsMap[row.statusKey] = {
              description: row.description,
              colorClass: row.colorClass,
              movement: row.movement === '' ? undefined : Number(row.movement),
              movementMultiplier: row.movementMultiplier === '' ? undefined : Number(row.movementMultiplier),
            };
          });
          setLoadedStatusEffects(statusEffectsMap);
        } else {
          console.error("Failed to load status_effects.csv.");
        }

      } catch (error) {
        console.error("Failed to load CSV data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // --- Global Callback Functions ---
  const addLogEntry = useCallback(({ type, characterId, message, value, details, isCrit, hpChangeType }) => {
    setLogEntries(prevEntries => [
      ...prevEntries,
      { timestamp: new Date(), type, characterId, message, value, details, isCrit, hpChangeType }
    ]);
  }, []);

  const updateCharacterHp = useCallback((id, newHp) => {
    setCharacters(prevCharacters => prevCharacters.map(char => {
      if (char.id === id) {
        let updatedChar = { ...char, hp: newHp };

        if (!deathSavesEnabled && updatedChar.hp <= 0) {
            updatedChar.isDying = true;
            updatedChar.deathSuccesses = 0;
            updatedChar.deathFailures = 3;
            updatedChar.deathSaveOpportunities = 0;
            updatedChar.hasMadeDeathSaveThisRound = false;
            updatedChar.status = 'dead';
            addLogEntry({ type: 'info', characterId: updatedChar.id, message: `dropped to 0 HP and dies instantly (Death Saves disabled).` });
            updatedChar.lastAbilityRoll = null;
            updatedChar.turnCompleted = true;
            return updatedChar;
        }

        updatedChar.hp = Math.max(updatedChar.hp, -updatedChar.maxHp);

        if (deathSavesEnabled) {
            if (updatedChar.hp <= 0 && !updatedChar.isDying) {
                updatedChar.isDying = true;
                updatedChar.deathSuccesses = 0;
                updatedChar.deathFailures = 0;
                updatedChar.deathSaveOpportunities = 4;
                updatedChar.hasMadeDeathSaveThisRound = false;
                updatedChar.status = 'unconscious';
                updatedChar.turnCompleted = true;
                addLogEntry({ type: 'info', characterId: updatedChar.id, message: `dropped to 0 HP and is now unconscious/dying.` });
            } else if (updatedChar.hp > 0 && updatedChar.isDying) {
                updatedChar.isDying = false;
                updatedChar.deathSuccesses = 0;
                updatedChar.deathFailures = 0;
                updatedChar.deathSaveOpportunities = null;
                updatedChar.hasMadeDeathSaveThisRound = false;
                updatedChar.status = 'active';
                updatedChar.turnCompleted = false;
                addLogEntry({ type: 'info', characterId: updatedChar.id, message: `is no longer dying and is now active.` });
            }
        }

        if (updatedChar.hp > 0 && updatedChar.status === 'unconscious' && !updatedChar.isDying) {
            updatedChar.status = 'active';
            updatedChar.turnCompleted = false;
            addLogEntry({ type: 'info', characterId: updatedChar.id, message: `is no longer unconscious and is now active.` });
        }

        if (updatedChar.isDying && updatedChar.hp <= -updatedChar.maxHp) {
            updatedChar.deathFailures = 3;
            updatedChar.deathSaveOpportunities = 0;
            updatedChar.status = 'dead';
            updatedChar.turnCompleted = true;
            addLogEntry({ type: 'info', characterId: updatedChar.id, message: `suffered instant death!` });
        }

        if (updatedChar.status === 'dead') {
          updatedChar.lastAbilityRoll = null;
        }
        return updatedChar;
      }
      return char;
    }));
  }, [addLogEntry, deathSavesEnabled]);

  const updateCharacterStatus = useCallback((id, newStatus) => {
    setCharacters(prevCharacters => prevCharacters.map(char => {
      if (char.id === id) {
        const updatedChar = { ...char, status: newStatus };

        if (newStatus === 'dead') {
          updatedChar.isDying = true;
          updatedChar.deathFailures = 3;
          updatedChar.deathSaveOpportunities = 0;
          updatedChar.lastAbilityRoll = null;
          updatedChar.turnCompleted = true;
        } else if (newStatus === 'unconscious' && updatedChar.hp > 0) {
          updatedChar.isDying = false;
          updatedChar.deathSuccesses = 0;
          updatedChar.deathFailures = 0;
          updatedChar.deathSaveOpportunities = null;
          updatedChar.hasMadeDeathSaveThisRound = false;
          updatedChar.turnCompleted = true;
        } else if (newStatus === 'active' && updatedChar.hp <= 0) {
          console.warn("Cannot set status to 'active' if HP is 0 or less.");
          return char;
        } else if (newStatus === 'active' && updatedChar.hp > 0) {
          updatedChar.isDying = false;
          updatedChar.deathSuccesses = 0;
          updatedChar.deathFailures = 0;
          updatedChar.deathSaveOpportunities = null;
          updatedChar.hasMadeDeathSaveThisRound = false;
          updatedChar.turnCompleted = false;
        }

        const statusEffect = loadedStatusEffects[newStatus];
        if (statusEffect) {
          if (statusEffect.movement !== undefined) {
            updatedChar.currentMovement = statusEffect.movement;
          } else if (statusEffect.movementMultiplier !== undefined) {
            const baseMovementValue = char.movement ? parseInt(char.movement.replace('ft', '')) : 0;
            updatedChar.currentMovement = Math.floor(baseMovementValue * statusEffect.movementMultiplier);
          } else {
            updatedChar.currentMovement = char.movement ? parseInt(char.movement.replace('ft', '')) : 0;
          }
        }
        return updatedChar;
      }
      return char;
    }));
  }, [loadedStatusEffects]);

  const toggleRemovedFromCombat = useCallback((id, isRemoved) => {
    setCharacters(prevCharacters => prevCharacters.map(char => {
      if (char.id === id) {
        const updatedChar = { ...char, removedFromCombat: isRemoved };
        if (isRemoved) {
          updatedChar.actionUsed = true;
          updatedChar.bonusActionUsed = true;
          updatedChar.dashUsed = true;
          updatedChar.reactionUsed = true;
          updatedChar.turnCompleted = true;
        } else {
          updatedChar.turnCompleted = false;
        }
        addLogEntry({ type: 'info', characterId: char.id, message: isRemoved ? `removed from combat.` : `restored to combat.` });
        return updatedChar;
      }
      return char;
    }));
    if (isRemoved) {
      setOpenCombatantIds(prevOpenIds => {
        const newOpenIds = new Set(prevOpenIds);
        newOpenIds.delete(id);
        return newOpenIds;
      });
    }
  }, [addLogEntry]);

  const updateCharacterColor = useCallback((id, newColor) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, color: newColor } : char
      )
    );
  }, []);

  const handleSelectCombatant = useCallback((id) => {
    setOpenCombatantIds(prevOpenIds => {
      const newOpenIds = new Set(prevOpenIds);
      const clickedCharacter = characters.find(char => char.id === id);

      if (!clickedCharacter) return newOpenIds;

      if (newOpenIds.has(id)) {
        newOpenIds.delete(id);
      } else {
        if (!clickedCharacter.isLocked) {
          prevOpenIds.forEach(openId => {
            const openChar = characters.find(char => char.id === openId);
            if (openChar && !openChar.isLocked) {
              newOpenIds.delete(openId);
            }
          });
        }
        newOpenIds.add(id);
      }
      return newOpenIds;
    });
  }, [characters]);

  const onTogglePanelLock = useCallback((id, isLocked) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, isLocked: isLocked } : char
      )
    );
  }, []);

  const updateActionCheckbox = useCallback((id, checkboxType, value) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char => {
        if (char.id === id) {
          const newChar = { ...char, [checkboxType]: value };

          if (checkboxType === 'actionUsed' && value === true) {
            newChar.dashUsed = false;
          } else if (checkboxType === 'dashUsed' && value === true) {
            newChar.actionUsed = false;
          }

          if (checkboxType === 'dashUsed') {
            const baseMovementValue = char.movement ? parseInt(char.movement.replace('ft', '')) : 0;
            if (value === true) {
              newChar.currentMovement = baseMovementValue * 2;
              newChar.isMovementDashed = true;
              addLogEntry({ type: 'movement_change', characterId: char.id, message: `used Dash, movement doubled to:`, value: newChar.currentMovement, details: `(${baseMovementValue}ft x 2)` });
            } else {
              newChar.currentMovement = baseMovementValue;
              newChar.isMovementDashed = false;
              addLogEntry({ type: 'movement_change', characterId: char.id, message: `Dash ended, movement reset to:`, value: newChar.currentMovement, details: `(${baseMovementValue}ft)` });
            }
          }
          return newChar;
        }
        return char;
      })
    );
  }, [addLogEntry]);

  const updateCharacterActions = useCallback((id, newActions) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, actions: newActions } : char
      )
    );
  }, []);

  const updateCharacterName = useCallback((id, newName) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, name: newName, isCustom: true } : char
      )
    );
  }, []);

  const updateAbilityRoll = useCallback((id, rollData) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, lastAbilityRoll: rollData } : char
      )
    );
  }, []);

  const updateCurrentMovement = useCallback((id, newMovement) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char => {
        if (char.id === id) {
          const updatedMovement = Math.max(0, newMovement);
          return { ...char, currentMovement: updatedMovement };
        }
        return char;
      })
    );
  }, []);

  const handleRollDeathSave = useCallback((id) => {
    setCharacters(prevCharacters => {
        return prevCharacters.map(combatant => {
            if (combatant.id === id && combatant.isDying && !combatant.hasMadeDeathSaveThisRound && deathSavesEnabled) {
                const roll = Math.floor(Math.random() * 20) + 1;
                let updatedCombatant = { ...combatant, hasMadeDeathSaveThisRound: true };

                if (updatedCombatant.deathSaveOpportunities !== null && updatedCombatant.deathSaveOpportunities > 0) {
                     updatedCombatant.deathSaveOpportunities--;
                }

                if (roll >= 10) {
                    updatedCombatant.deathSuccesses++;
                    addLogEntry({ type: 'death_save', characterId: combatant.id, message: `rolled a death save:`, value: roll, details: `Success! (${updatedCombatant.deathSuccesses} successes)` });

                    if (updatedCombatant.deathSuccesses >= 3) {
                        updatedCombatant.hp = 1;
                        updatedCombatant.isDying = false;
                        updatedCombatant.deathSuccesses = 0;
                        updatedCombatant.deathFailures = 0;
                        updatedCombatant.deathSaveOpportunities = null;
                        updatedCombatant.hasMadeDeathSaveThisRound = false;
                        updatedCombatant.status = 'active';
                        updatedCombatant.turnCompleted = false;
                        addLogEntry({ type: 'info', characterId: combatant.id, message: `is stable and conscious at 1 HP!` });
                    }
                } else {
                    updatedCombatant.deathFailures++;
                    if (roll === 1) {
                        updatedCombatant.deathFailures++;
                        addLogEntry({ type: 'death_save', characterId: combatant.id, message: `rolled a death save:`, value: roll, details: `Critical Failure! (${updatedCombatant.deathFailures} failures)` });
                    } else {
                        addLogEntry({ type: 'death_save', characterId: combatant.id, message: `rolled a death save:`, value: roll, details: `Failure! (${updatedCombatant.deathFailures} failures)` });
                    }

                    if (updatedCombatant.deathFailures >= 3) {
                        updatedCombatant.status = 'dead';
                        updatedCombatant.deathSaveOpportunities = 0;
                        updatedCombatant.turnCompleted = true;
                        addLogEntry({ type: 'info', characterId: combatant.id, message: `suffered 3 death saving throw failures and dies!` });
                    }
                }
                return updatedCombatant;
            }
            return combatant;
        });
    });
  }, [addLogEntry, deathSavesEnabled]);

  const handleActivateTrait = useCallback((characterId, trait, actionType) => {
    if (actionType && (actionType === 'action' || actionType === 'bonusAction' || actionType === 'reaction')) {
      updateActionCheckbox(characterId, `${actionType}Used`, true);
      addLogEntry({ type: 'trait_activation', characterId: characterId, message: `activated trait:`, value: trait.name, details: `(${actionType.replace('Action', ' Action')})` });
    } else {
      addLogEntry({ type: 'trait_activation', characterId: characterId, message: `activated trait:`, value: trait.name, details: `(Free Action/Passive)` });
    }
  }, [updateActionCheckbox, addLogEntry]);

  const handleNextRound = useCallback(() => {
    setRound(prevRound => prevRound + 1);

    setCharacters(prevCharacters =>
      prevCharacters.map(char => {
        let updatedChar = {
          ...char,
          actionUsed: false,
          bonusActionUsed: false,
          dashUsed: false,
          reactionUsed: false,
          hasMadeDeathSaveThisRound: false,
          isMovementDashed: false,
        };

        if (deathSavesEnabled) {
            if (updatedChar.isDying) {
                if (updatedChar.deathSaveOpportunities !== null && updatedChar.deathSaveOpportunities > 0 && char.hasMadeDeathSaveThisRound === false) {
                    updatedChar.deathSaveOpportunities--;
                    addLogEntry({ type: 'info', characterId: updatedChar.id, message: `missed a death save opportunity. Opportunities left: ${updatedChar.deathSaveOpportunities}` });
                }

                if (updatedChar.isDying && updatedChar.deathSaveOpportunities !== null && updatedChar.deathSaveOpportunities <= 0 && updatedChar.deathFailures < 3) {
                    updatedChar.deathFailures = 3;
                    updatedChar.status = 'dead';
                    addLogEntry({ type: 'info', characterId: updatedChar.id, message: `ran out of death save opportunities and dies!` });
                }

                if (updatedChar.isDying && updatedChar.status !== 'dead') {
                    updatedChar.turnCompleted = true;
                } else {
                    updatedChar.turnCompleted = false;
                }
            } else {
                updatedChar.turnCompleted = false;
            }
        } else {
            updatedChar.turnCompleted = false;
        }

        const statusEffect = loadedStatusEffects[updatedChar.status];
        if (statusEffect) {
          if (statusEffect.movement !== undefined) {
            updatedChar.currentMovement = statusEffect.movement;
          } else if (statusEffect.movementMultiplier !== undefined) {
            const baseMovementValue = char.movement ? parseInt(char.movement.replace('ft', '')) : 0;
            updatedChar.currentMovement = Math.floor(baseMovementValue * statusEffect.movementMultiplier);
          } else {
            updatedChar.currentMovement = char.movement ? parseInt(char.movement.replace('ft', '')) : undefined;
          }
        } else {
          updatedChar.currentMovement = char.movement ? parseInt(char.movement.replace('ft', '')) : undefined;
        }
        return updatedChar;
      })
    );
    addLogEntry({ type: 'info', message: `Round ${round} ended. Round ${round + 1} initiated! All actions reset, movement restored.` });

  }, [round, addLogEntry, deathSavesEnabled, loadedStatusEffects]);

  const handleRerollAllInitiatives = useCallback(() => {
    setCharacters(prevCharacters => {
      const updatedCharacters = [...prevCharacters];
      const sharedInitiativeRolls = new Map();

      updatedCharacters.forEach(char => {
        if (char.removedFromCombat || char.status === 'dead') {
          return;
        }

        let initiativeModifier = 0;
        if (char.type === 'player') {
          initiativeModifier = Math.floor(((char.dex || 10) - 10) / 2);
        } else if (char.type === 'monster') {
          const monsterTemplate = loadedMonsters.find(m => m.id === char.id);
          initiativeModifier = monsterTemplate ? (monsterTemplate.initiativeBonus || 0) : 0;
        }

        let newInitiative;
        if (char.sharedInitiativeId) {
          if (!sharedInitiativeRolls.has(char.sharedInitiativeId)) {
            const d20Roll = Math.floor(Math.random() * 20) + 1;
            newInitiative = d20Roll + initiativeModifier;
            sharedInitiativeRolls.set(char.sharedInitiativeId, newInitiative);
            addLogEntry({ type: 'initiative_roll', characterId: char.id, message: `(Group) rerolled initiative:`, value: newInitiative, details: `(${d20Roll} + ${initiativeModifier})` });
          } else {
            newInitiative = sharedInitiativeRolls.get(char.sharedInitiativeId);
          }
        } else {
          const d20Roll = Math.floor(Math.random() * 20) + 1;
          newInitiative = d20Roll + initiativeModifier;
          addLogEntry({ type: 'initiative_roll', characterId: char.id, message: `rerolled initiative:`, value: newInitiative, details: `(${d20Roll} + ${initiativeModifier})` });
        }
        char.initiative = newInitiative;
      });
      return updatedCharacters;
    });
    addLogEntry({ type: 'info', message: `All active combatants' initiatives rerolled.` });
  }, [addLogEntry, loadedMonsters]);

  const handleRemoveAndLoot = useCallback((id) => {
    setCharacters(prevCharacters => {
      const characterToRemove = prevCharacters.find(char => char.id === id);
      if (characterToRemove) {
        setDeletedCharacters(prevDeleted => {
          const newDeleted = [...prevDeleted, { ...characterToRemove, wasLooted: true }];
          if (newDeleted.length > MAX_UNDO_BUFFER) {
            return newDeleted.slice(newDeleted.length - MAX_UNDO_BUFFER);
          }
          return newDeleted;
        });

        if (characterToRemove.xp !== undefined) {
          setTotalXpPool(prevXp => prevXp + characterToRemove.xp);
        }

        if (characterToRemove.items && characterToRemove.items.length > 0) {
          setLootPool(prevLoot => {
            const updatedLoot = [...prevLoot];
            characterToRemove.items.forEach(item => {
              const existingItemIndex = updatedLoot.findIndex(
                lootItem => lootItem.name === item.name && lootItem.unit === item.unit && lootItem.isCustom === item.isCustom
              );

              if (existingItemIndex > -1 && item.quantity) {
                const existingQty = parseInt(updatedLoot[existingItemIndex].quantity) || 0; // Fixed typo: updatedLoded to updatedLoot
                const newItemQty = parseInt(item.quantity) || 0;
                if (!isNaN(existingQty) && !isNaN(newItemQty)) {
                  updatedLoot[existingItemIndex].quantity = (existingQty + newItemQty).toString();
                } else {
                  updatedLoot.push({ ...item, id: crypto.randomUUID() });
                }
              } else {
                updatedLoot.push({ ...item, id: crypto.randomUUID() });
              }
            });
            return updatedLoot;
          });
          addLogEntry({ type: 'loot', message: `Items from ${characterToRemove.name} added to loot pool.` });
        }
        addLogEntry({ type: 'info', characterId: id, message: `removed from combat and items moved to loot.` });
      }
      return prevCharacters.filter(char => char.id !== id);
    });
    setOpenCombatantIds(prevOpenIds => {
      const newOpenIds = new Set(prevOpenIds);
      newOpenIds.delete(id);
      return newOpenIds;
    });
  }, [addLogEntry]);

  const handleDeleteCombatant = useCallback((id) => {
    setCharacters(prevCharacters => {
      const charToDelete = prevCharacters.find(char => char.id === id);
      if (charToDelete) {
        setDeletedCharacters(prevDeleted => {
          const newDeleted = [...prevDeleted, { ...charToDelete, wasLooted: false }];
          if (newDeleted.length > MAX_UNDO_BUFFER) {
            return newDeleted.slice(newDeleted.length - MAX_UNDO_BUFFER);
          }
          return newDeleted;
        });
        addLogEntry({ type: 'info', characterId: id, message: `deleted from combat.` });
      }
      return prevCharacters.filter(char => char.id !== id);
    });
    setOpenCombatantIds(prevOpenIds => {
      const newOpenIds = new Set(prevOpenIds);
      newOpenIds.delete(id);
      return newOpenIds;
    });
  }, [addLogEntry]);

  const handleRestoreDeletedCharacter = useCallback((id) => {
    setDeletedCharacters(prevDeleted => {
      const charToRestore = prevDeleted.find(char => char.id === id);
      if (charToRestore) {
        if (charToRestore.wasLooted) {
          if (charToRestore.xp !== undefined) {
            setTotalXpPool(prevXp => Math.max(0, prevXp - charToRestore.xp));
          }
          if (charToRestore.items && charToRestore.items.length > 0) {
            setLootPool(prevLoot => {
              const updatedLoot = [...prevLoot];
              charToRestore.items.forEach(itemToRestore => {
                const existingItemIndex = updatedLoot.findIndex(
                  lootItem => lootItem.name === itemToRestore.name && lootItem.unit === itemToRestore.unit && lootItem.isCustom === itemToRestore.isCustom
                );

                if (existingItemIndex > -1 && itemToRestore.quantity) {
                  const existingQty = parseInt(updatedLoot[existingItemIndex].quantity) || 0;
                  const restoreQty = parseInt(itemToRestore.quantity) || 0;
                  const newQty = existingQty - restoreQty;
                  if (newQty <= 0) {
                    updatedLoot.splice(existingItemIndex, 1);
                  } else {
                    updatedLoot[existingItemIndex].quantity = newQty.toString();
                  }
                } else {
                  const singleItemIndex = updatedLoot.findIndex(
                    lootItem => lootItem.name === itemToRestore.name && lootItem.unit === itemToRestore.unit && lootItem.isCustom === itemToRestore.isCustom
                  );
                  if (singleItemIndex > -1) {
                    updatedLoot.splice(singleItemIndex, 1);
                  }
                }
              });
              return updatedLoot;
            });
            addLogEntry({ type: 'loot_restore', message: `Items from ${charToRestore.name} removed from loot pool.` });
          }
        }

        setCharacters(prevChars => {
          if (!prevChars.some(char => char.id === id)) {
            addLogEntry({ type: 'info', characterId: id, message: `restored from undo list.` });
            return [...prevChars, { ...charToRestore, removedFromCombat: false, status: 'active', turnCompleted: false }];
          }
          return prevChars;
        });
        return prevDeleted.filter(char => char.id !== id);
      }
      return prevDeleted;
    });
  }, [addLogEntry]);

  const generateMonsterName = useCallback((monsterTemplate, currentBatchUsedNames, namesDataToUse) => {
    const speciesNames = namesDataToUse[monsterTemplate.species];
    if (!speciesNames || speciesNames.first.length === 0) {
      return monsterTemplate.name;
    }

    let uniqueName = '';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const firstName = speciesNames.first[Math.floor(Math.random() * speciesNames.first.length)];
      const lastName = speciesNames.last[Math.floor(Math.random() * speciesNames.last.length)];
      const potentialName = `${firstName} ${lastName}`;

      if (!usedUniqueNames.has(potentialName) && !currentBatchUsedNames.has(potentialName)) {
        uniqueName = potentialName;
        usedUniqueNames.add(uniqueName);
        break;
      }
      attempts++;
    }

    if (uniqueName === '') {
      let counter = 1;
      while (true) {
        const fallbackName = `${monsterTemplate.name} ${counter}`;
        if (!usedUniqueNames.has(fallbackName) && !currentBatchUsedNames.has(fallbackName)) {
          uniqueName = fallbackName;
          usedUniqueNames.add(uniqueName);
          break;
        }
        counter++;
      }
    }
    return uniqueName;
  }, [usedUniqueNames]);

  const sortedCharactersForInitiative = useMemo(() => {
    const activeCharacters = [];
    const removedOrDeadCharacters = [];

    characters.forEach(char => {
      const isRedSkull = char.isDying && (char.deathFailures >= 3 || (char.deathSaveOpportunities !== null && char.deathSaveOpportunities <= 0));

      if (isRedSkull || char.removedFromCombat) {
        removedOrDeadCharacters.push(char);
      } else {
        activeCharacters.push(char);
      }
    });

    activeCharacters.sort((a, b) => b.initiative - a.initiative);
    removedOrDeadCharacters.sort((a, b) => b.initiative - a.initiative);

    return [...activeCharacters, ...removedOrDeadCharacters];
  }, [characters]);

  const sortedCharactersForSummary = useMemo(() => {
    return [...characters];
  }, [characters]);

  const groupedLootPool = useMemo(() => {
    const grouped = {};
    lootPool.forEach(item => {
      const key = `${item.name}-${item.unit || ''}-${item.isCustom || false}`;
      if (!grouped[key]) {
        grouped[key] = { ...item, quantity: 0 };
      }
      const itemQuantity = parseInt(item.quantity) || 1;
      grouped[key].quantity += itemQuantity;
    });
    return Object.values(grouped);
  }, [lootPool]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white font-inter flex items-center justify-center">
        <div className="text-2xl font-bold">Loading D&D Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white font-inter p-4 sm:p-8 relative overflow-hidden">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
        Battle Tracker
      </h1>

      {/* Initiative Order Window */}
      <DraggableWindow
        id="initiative"
        title="Initiative Order"
        initialPosition={windowPositions.initiative}
        onFocus={bringWindowToFront}
        currentZIndex={windowZIndices.initiative}
      >
        <InitiativeOrder
          characters={characters}
          sortedCharactersForInitiative={sortedCharactersForInitiative}
          round={round}
          setDeathSavesEnabled={setDeathSavesEnabled}
          deathSavesEnabled={deathSavesEnabled}
          handleNextRound={handleNextRound}
          handleRerollAllInitiatives={handleRerollAllInitiatives}
          handleSelectCombatant={handleSelectCombatant}
          openCombatantIds={openCombatantIds}
          updateCharacterColor={updateCharacterColor}
          COLORS={COLORS}
          updateCharacterHp={updateCharacterHp}
          toggleRemovedFromCombat={toggleRemovedFromCombat}
          updateCharacterStatus={updateCharacterStatus}
          updateActionCheckbox={updateActionCheckbox}
          updateCurrentMovement={updateCurrentMovement}
          updateCharacterActions={updateCharacterActions}
          addLogEntry={addLogEntry}
          updateCharacterName={updateCharacterName}
          newCustomWeaponName={newCustomWeaponName}
          setNewCustomWeaponName={setNewCustomWeaponName}
          newCustomWeaponNumDice={newCustomWeaponNumDice}
          setNewCustomWeaponNumDice={setNewCustomWeaponNumDice}
          newCustomWeaponDieType={newCustomWeaponDieType}
          setNewCustomWeaponDieType={setNewCustomWeaponDieType}
          newCustomWeaponModifier={newCustomWeaponModifier}
          setNewCustomWeaponModifier={setNewCustomWeaponModifier}
          selectedDamageTypeForNewWeapon={selectedDamageTypeForNewWeapon}
          setSelectedDamageTypeForNewWeapon={setSelectedDamageTypeForNewWeapon}
          customDamageTypeName={customDamageTypeName}
          setCustomDamageTypeName={setCustomDamageTypeName}
          newCustomWeaponToHitModifier={newCustomWeaponToHitModifier}
          setNewCustomWeaponToHitModifier={setNewCustomWeaponToHitModifier}
          onTogglePanelLock={onTogglePanelLock}
          updateAbilityRoll={updateAbilityRoll}
          handleRollDeathSave={handleRollDeathSave}
          handleActivateTrait={handleActivateTrait}
          STATUS_EFFECTS={loadedStatusEffects}
          // Pass shared components and utilities
          ColorPickerWheel={ColorPickerWheel}
          NumberScroller={NumberScroller}
          parseDiceNotation={parseDiceNotation}
          rollDiceDetailed={rollDiceDetailed}
          getDieTypeMax={getDieTypeMax}
          Skull={Skull}
          Check={Check}
          Dice={Dice}
          Plus={Plus}
          Minus={Minus}
          Heart={Heart}
          ShieldCheck={ShieldCheck}
          Footprints={Footprints}
          Bolt={Bolt}
          Sword={Sword}
          Lock={Lock}
          LockOpen={LockOpen}
          Scroll={Scroll}
          Trash2={Trash2}
        />
      </DraggableWindow>

      {/* Combatant Management Window */}
      <DraggableWindow
        id="combatantManagement"
        title="Combatant Management"
        initialPosition={windowPositions.combatantManagement}
        onFocus={bringWindowToFront}
        currentZIndex={windowZIndices.combatantManagement}
      >
        <CombatantManagement
          characters={characters}
          setCharacters={setCharacters}
          loadedMonsters={loadedMonsters}
          loadedNamesData={loadedNamesData}
          loadedStatusEffects={loadedStatusEffects}
          MAX_TOTAL_COMBATANTS={MAX_TOTAL_COMBATANTS}
          MAX_ADD_QUANTITY={MAX_ADD_QUANTITY}
          maxHpLimit={maxHpLimit}
          COLORS={COLORS}
          addLogEntry={addLogEntry}
          toggleRemovedFromCombat={toggleRemovedFromCombat}
          handleRemoveAndLoot={handleRemoveAndLoot}
          handleDeleteCombatant={handleDeleteCombatant}
          handleRestoreDeletedCharacter={handleRestoreDeletedCharacter}
          deletedCharacters={deletedCharacters}
          setDeletedCharacters={setDeletedCharacters}
          MAX_UNDO_BUFFER={MAX_UNDO_BUFFER}
          generateMonsterName={generateMonsterName}
          sortedCharactersForSummary={sortedCharactersForSummary}
          // Pass form states and setters
          newCharacterName={newCharacterName}
          setNewCharacterName={setNewCharacterName}
          newCharacterInitiative={newCharacterInitiative}
          setNewCharacterInitiative={setNewCharacterInitiative}
          monsterInitiativeMathDisplay={monsterInitiativeMathDisplay}
          setMonsterInitiativeMathDisplay={setMonsterInitiativeMathDisplay}
          newCharacterHp={newCharacterHp}
          setNewCharacterHp={setNewCharacterHp}
          newCharacterAc={newCharacterAc}
          setNewCharacterAc={setNewCharacterAc}
          newCharacterHpDice={newCharacterHpDice}
          setNewCharacterHpDice={setNewCharacterHpDice}
          newCharacterHpModifier={newCharacterHpModifier}
          setNewCharacterHpModifier={setNewCharacterHpModifier}
          newCharacterHpBaseRollDisplay={newCharacterHpBaseRollDisplay}
          setNewCharacterHpBaseRollDisplay={setNewCharacterHpBaseRollDisplay}
          newCharacterMovement={newCharacterMovement}
          setNewCharacterMovement={setNewCharacterMovement}
          newCharacterActions={newCharacterActions}
          setNewCharacterActions={setNewCharacterActions}
          newCharacterType={newCharacterType}
          setNewCharacterType={setNewCharacterType}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          selectedMonsterId={selectedMonsterId}
          setSelectedMonsterId={setSelectedMonsterId}
          monsterSortOption={monsterSortOption}
          setMonsterSortOption={setMonsterSortOption}
          newCharacterQuantity={newCharacterQuantity}
          setNewCharacterQuantity={setNewCharacterQuantity}
          randomizeAc={randomizeAc}
          setRandomizeAc={setRandomizeAc}
          randomizeWeapons={randomizeWeapons}
          setRandomizeWeapons={setRandomizeWeapons}
          createUniqueNames={createUniqueNames}
          setCreateUniqueNames={setCreateUniqueNames}
          sharedInitiative={sharedInitiative}
          setSharedInitiative={setSharedInitiative}
          rollHpOnAddBatch={rollHpOnAddBatch}
          setRollHpOnAddBatch={setRollHpOnAddBatch}
          randomizeNewCombatantStats={randomizeNewCombatantStats}
          setNewRandomizeNewCombatantStats={setNewRandomizeNewCombatantStats}
          newCharacterStr={newCharacterStr}
          setNewCharacterStr={setNewCharacterStr}
          newCharacterDex={newCharacterDex}
          setNewCharacterDex={setNewCharacterDex}
          newCharacterCon={newCharacterCon}
          setNewCharacterCon={setNewCharacterCon}
          newCharacterInt={newCharacterInt}
          setNewCharacterInt={newCharacterInt}
          newCharacterWis={newCharacterWis}
          setNewCharacterWis={setNewCharacterWis}
          newCharacterCha={newCharacterCha}
          setNewCharacterCha={setNewCharacterCha}
          isOverviewCollapsed={isOverviewCollapsed}
          setIsOverviewCollapsed={setIsOverviewCollapsed}
          currentMonsterInitiativeBonus={currentMonsterInitiativeBonus}
          setCurrentMonsterInitiativeBonus={setCurrentMonsterInitiativeBonus}
          draggedItemId={draggedItemId}
          setDraggedItemId={setDraggedItemId}
          dragOverItemId={dragOverItemId}
          setDragOverItemId={setDragOverItemId}
          // Pass shared components and utilities
          NumberScroller={NumberScroller}
          parseDiceNotationForParts={parseDiceNotationForParts}
          rollDiceDetailed={rollDiceDetailed}
          Dice={Dice}
          Plus={Plus}
          Minus={Minus}
          Trash2={Trash2}
          Sword={Sword}
          Gem={Gem}
          Shirt={Shirt}
          RotateCcw={RotateCcw}
          ChevronDown={ChevronDown}
          ChevronUp={ChevronUp}
          crToNumber={crToNumber}
        />
      </DraggableWindow>

      {/* Utilities Window */}
      <DraggableWindow
        id="utilities"
        title="Utilities & Dice Roller"
        initialPosition={windowPositions.utilities}
        onFocus={bringWindowToFront}
        currentZIndex={windowZIndices.utilities}
      >
        <UtilitiesDiceRoller
          logEntries={logEntries}
          showLog={showLog}
          setShowLog={setShowLog}
          logRef={logRef}
          characters={characters}
          groupedLootPool={groupedLootPool}
          totalXpPool={totalXpPool}
          showLootPool={showLootPool}
          setShowLootPool={setShowLootPool}
          // Pass shared components and utilities
          SimpleDiceRoller={SimpleDiceRoller}
          rollDiceDetailed={rollDiceDetailed}
          Dice={Dice}
          NumberScroller={NumberScroller}
          Gem={Gem}
          ScrollText={ScrollText}
          STATUS_EFFECTS={loadedStatusEffects} // Pass STATUS_EFFECTS
        />
      </DraggableWindow>
    </div>
  );
};

export default App;
