import React, { useState, useEffect, useCallback, useRef } from 'react';

// Import icons and utilities from App.js (assuming they are passed as props or globally available)
// For this setup, we'll assume they are passed as props from App.js for clarity.
// In a real project, you might have a dedicated 'icons.js' and 'utils.js' if not all are used by App itself.

const CombatantDetails = ({ character, onUpdateHp, onToggleRemovedFromCombat, onUpdateStatus, onUpdateActionCheckbox, onUpdateCurrentMovement, onUpdateActions, addLogEntry, onUpdateCharacterName,
  newCustomWeaponName, setNewCustomWeaponName, newCustomWeaponNumDice, setNewCustomWeaponNumDice, newCustomWeaponDieType, setNewCustomWeaponDieType, newCustomWeaponModifier, setNewCustomWeaponModifier,
  selectedDamageTypeForNewWeapon, setSelectedDamageTypeForNewWeapon, customDamageTypeName, setCustomDamageTypeName, newCustomWeaponToHitModifier, setNewCustomWeaponToHitModifier,
  onTogglePanelLock, onUpdateAbilityRoll, onActivateTrait, STATUS_EFFECTS, // Props from App.js
  // Shared Components/Utilities
  NumberScroller, rollDiceDetailed, getDieTypeMax, parseDiceNotation, Skull, Heart, ShieldCheck, Footprints, Bolt, Dice, Plus, Minus, Lock, LockOpen, Scroll, Trash2
}) => {
  const [hpAdjustmentAmount, setHpAdjustmentAmount] = useState('');
  const [movementAdjustmentAmount, setMovementAdjustmentAmount] = useState('');
  const [lastRollMessage, setLastRollMessage] = useState(null);
  const [weaponDamageRolls, setWeaponDamageRolls] = useState({});
  const [weaponToHitRolls, setWeaponToHitRolls] = useState({});
  const [showStats, setShowStats] = useState(false);
  const [criticalHitFlags, setCriticalHitFlags] = useState({});
  const [showAddCustomWeaponForm, setShowAddCustomWeaponForm] = useState(false);
  const [showTraits, setShowTraits] = useState(false);

  const MAX_CUSTOM_WEAPONS = 8;

  if (!character) {
    return (
      <div className="p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600 text-center text-gray-400">
        Select a combatant from the list to view details.
      </div>
    );
  }

  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpColorClass = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

  const calculateModifier = (score) => Math.floor((score - 10) / 2);

  const handleStatRoll = (statName, modifier) => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const total = d20Roll + modifier;
    onUpdateAbilityRoll(character.id, { stat: statName, roll: d20Roll, total: total });
    addLogEntry({ type: 'skill', characterId: character.id, message: `rolled ${statName} check:`, value: total, details: `(${d20Roll} + ${modifier})` });
  };

  const handleHpAdjustment = (type) => {
    const amount = parseInt(hpAdjustmentAmount);
    if (isNaN(amount) || amount < 1 || amount > 200) {
      console.warn("Please enter a valid number between 1 and 200 for HP adjustment.");
      return;
    }
    let newHp = character.hp;
    if (type === 'add') {
      newHp = character.hp + amount;
      addLogEntry({ type: 'hp_change', characterId: character.id, message: `healed`, value: amount, hpChangeType: 'heal' });
    } else if (type === 'subtract') {
      newHp = character.hp - amount;
      addLogEntry({ type: 'hp_change', characterId: character.id, message: `took damage`, value: amount, hpChangeType: 'damage' });
    }
    onUpdateHp(character.id, newHp);
    setHpAdjustmentAmount('');
  };

  const handleMovementAdjustment = (type) => {
    const amount = parseInt(movementAdjustmentAmount);
    if (isNaN(amount) || amount < 1 || amount > 200) {
      console.warn("Please enter a valid number between 1 and 200 for movement adjustment.");
      return;
    }
    let newMovement = character.currentMovement;
    if (type === 'add') {
      newMovement = character.currentMovement + amount;
    } else if (type === 'subtract') {
      newMovement = character.currentMovement - amount;
    }
    onUpdateCurrentMovement(character.id, newMovement);
    setMovementAdjustmentAmount('');
  };

  const handleResetActions = () => {
    onUpdateActionCheckbox(character.id, 'actionUsed', false);
    onUpdateActionCheckbox(character.id, 'bonusActionUsed', false);
    onUpdateActionCheckbox(character.id, 'dashUsed', false);
    onUpdateActionCheckbox(character.id, 'reactionUsed', false);
    onUpdateActionCheckbox(character.id, 'turnCompleted', false);
  };

  const handleRollDamage = (actionId, weaponName, diceNotation, damageType) => {
    let rollResult;
    let logMessagePrefix;
    let displayMessage;

    if (criticalHitFlags[actionId]) {
      const maxDieValue = getDieTypeMax(diceNotation);
      const normalRoll = rollDiceDetailed(diceNotation);
      const criticalTotal = maxDieValue + normalRoll.sumOfDice + normalRoll.modifier;

      rollResult = { total: criticalTotal, rolls: [...normalRoll.rolls, maxDieValue], modifier: normalRoll.modifier, dicePart: normalRoll.dicePart };

      const mathString = `${maxDieValue} (max) + ${normalRoll.rolls.join(' + ')}` + (normalRoll.modifier !== 0 ? ` ${normalRoll.modifier > 0 ? '+' : ''}${normalRoll.modifier}` : '');
      logMessagePrefix = `rolled CRITICAL ${weaponName} damage:`;
      addLogEntry({ type: 'damage', characterId: character.id, message: logMessagePrefix, value: criticalTotal, details: `(${mathString}) ${damageType ? `[${damageType}]` : ''}`, isCrit: true });
      displayMessage = `${weaponName} CRIT Damage: ${criticalTotal} (${rollResult.dicePart} + ${maxDieValue}${rollResult.modifier !== 0 ? (rollResult.modifier > 0 ? `+${rollResult.modifier}` : `${rollResult.modifier}`) : ''})`;

    } else {
      rollResult = rollDiceDetailed(diceNotation);
      const mathString = rollResult.rolls.join(' + ') + (rollResult.modifier !== 0 ? ` ${rollResult.modifier > 0 ? '+' : ''}${rollResult.modifier}` : '');
      logMessagePrefix = `rolled ${weaponName} damage:`;
      addLogEntry({ type: 'damage', characterId: character.id, message: logMessagePrefix, value: rollResult.total, details: `(${mathString}) ${damageType ? `[${damageType}]` : ''}` });
      displayMessage = `${weaponName} Damage: ${rollResult.total} (${rollResult.dicePart}${rollResult.modifier !== 0 ? (rollResult.modifier > 0 ? `+${rollResult.modifier}` : `${rollResult.modifier}`) : ''})`;
    }

    setWeaponDamageRolls(prevRolls => ({
      ...prevRolls,
      [actionId]: rollResult.total
    }));

    setLastRollMessage(displayMessage);

    setCriticalHitFlags(prevFlags => ({
      ...prevFlags,
      [actionId]: false
    }));

    setTimeout(() => {
      setLastRollMessage(null);
    }, 5000);
  };

  const handleRollToHit = (actionId, weaponName, toHitModifier) => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalToHit = d20Roll + toHitModifier;

    setWeaponToHitRolls(prevRolls => ({
      ...prevRolls,
      [actionId]: totalToHit
    }));

    setCriticalHitFlags(prevFlags => ({
      ...prevFlags,
      [actionId]: d20Roll === 20
    }));

    const modifierString = toHitModifier !== 0 ? (toHitModifier > 0 ? `+${toHitModifier}` : `${toHitModifier}`) : '';
    addLogEntry({ type: 'to_hit', characterId: character.id, message: `rolled ${weaponName} to hit:`, value: totalToHit, details: `(${d20Roll}${modifierString})`, isCrit: d20Roll === 20 });

    setLastRollMessage(`${weaponName} To Hit: ${totalToHit} (${d20Roll}${modifierString}${d20Roll === 20 ? ' (CRITICAL!)' : ''})`);
    setTimeout(() => {
      setLastRollMessage(null);
    }, 5000);

    if (!character.actionUsed && !character.dashUsed && !(character.isDying || character.status === 'dead')) {
      onUpdateActionCheckbox(character.id, 'actionUsed', true);
    }
  };

  const handleAddCustomWeapon = () => {
    if (!newCustomWeaponName.trim()) {
      console.warn("Weapon name cannot be empty.");
      return;
    }
    if (character.actions.length >= MAX_CUSTOM_WEAPONS) {
      console.warn(`Cannot add more than ${MAX_CUSTOM_WEAPONS} custom weapons.`);
      return;
    }

    const modifierValue = parseInt(newCustomWeaponModifier);
    const modifierPart = !isNaN(modifierValue) && modifierValue !== 0 ?
                         (modifierValue > 0 ? `+${modifierValue}` : `${modifierValue}`) : '';
    const diceNotation = `${newCustomWeaponNumDice}${newCustomWeaponDieType}${modifierPart}`;

    const toHitModifierValue = parseInt(newCustomWeaponToHitModifier);
    const finalToHitModifier = !isNaN(toHitModifierValue) ? toHitModifierValue : 0;

    const finalDamageType = selectedDamageTypeForNewWeapon === 'Other'
      ? customDamageTypeName.trim() || undefined
      : selectedDamageTypeForNewWeapon;

    const newWeapon = {
      id: crypto.randomUUID(),
      name: newCustomWeaponName.trim(),
      dice: diceNotation,
      damageType: finalDamageType,
      toHitModifier: finalToHitModifier,
      isCustom: true,
    };

    onUpdateActions(character.id, [...character.actions, newWeapon]);
  };

  useEffect(() => {
    if (character) {
      const autoCheckCondition = (
        ((character.actionUsed && character.reactionUsed) || character.dashUsed) &&
        character.bonusActionUsed &&
        (character.currentMovement !== undefined && character.currentMovement <= 0)
      );

      if (autoCheckCondition && !character.turnCompleted && !(character.isDying || character.status === 'dead')) {
        onUpdateActionCheckbox(character.id, 'turnCompleted', true);
      }
      if ((character.isDying || character.status === 'dead') && !character.turnCompleted) {
        onUpdateActionCheckbox(character.id, 'turnCompleted', true);
      }
    }
  }, [
    character, character.actionUsed, character.bonusActionUsed, character.dashUsed,
    character.reactionUsed, character.currentMovement, character.turnCompleted,
    character.isDying, character.status, onUpdateActionCheckbox
  ]);

  return (
    <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 border mt-4
      ${character.status === 'dead' ? 'bg-gray-700 text-gray-400' :
        character.status === 'unconscious' ? 'bg-red-900 text-red-300' :
        'bg-gray-700 text-white'}`}>
      <h2 className="text-2xl font-bold mb-4 text-center">
        {character.isCustom && <span className="text-purple-300 mr-2">◇</span>}
        <input
          type="text"
          value={character.name}
          onChange={(e) => onUpdateCharacterName(character.id, e.target.value)}
          maxLength={30}
          className="bg-transparent border-b-2 border-gray-500 hover:border-purple-500 focus:border-purple-500 focus:outline-none text-white text-center text-2xl font-bold w-full"
          aria-label="Combatant Name"
        />
        {character.species && <span className="text-xl font-normal text-gray-400"> ({character.species})</span>}
      </h2>

      <div className="flex justify-center mb-4">
        <button
          onClick={() => onTogglePanelLock(character.id, !character.isLocked)}
          className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2
            ${character.isLocked ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          title={character.isLocked ? "Unlock details panel (will close on selecting other combatants)" : "Lock details panel (will stay open when selecting other combatants)"}
        >
          {character.isLocked ? <Lock className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
          <span>{character.isLocked ? 'Panel Locked' : 'Panel Unlocked'}</span>
        </button>
      </div>

      {lastRollMessage && (
        <div className="bg-blue-600 text-white p-3 rounded-lg mb-4 text-center font-semibold animate-bounce">
          {lastRollMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-gray-400" />
          <span className="font-semibold">AC: {character.ac || 'N/A'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Footprints className="w-6 h-6 text-gray-400" />
          <span className="font-semibold">Movement: {character.movement || 'N/A'}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Heart className={`w-6 h-6 ${character.status === 'dead' ? 'text-gray-500' : 'text-red-500'}`} />
          <span className="font-bold text-xl">HP: {character.hp} / {character.maxHp}</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 mb-2">
          <div className={`${hpColorClass} h-3 rounded-full`} style={{ width: `${hpPercentage}%` }}></div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleHpAdjustment('subtract')}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
            aria-label="Decrease HP by amount"
            disabled={character.isDying || character.status === 'dead'}
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            value={hpAdjustmentAmount}
            onChange={(e) => setHpAdjustmentAmount(e.target.value)}
            placeholder="Amount"
            min="1" max="200"
            className="w-24 p-2 rounded-lg text-center bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={character.isDying || character.status === 'dead'}
          />
          <button
            onClick={() => handleHpAdjustment('add')}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
            aria-label="Increase HP by amount"
            disabled={character.isDying || character.status === 'dead'}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {character.movement && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Footprints className="w-6 h-6 text-gray-400" />
            <span className={`font-bold text-xl ${character.isMovementDashed ? 'text-blue-400' : ''}`}>Current Movement: {character.currentMovement || 0}ft</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleMovementAdjustment('subtract')}
              className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
              aria-label="Decrease Movement by amount"
              disabled={character.isDying || character.status === 'dead'}
            >
              <Minus className="w-5 h-5" />
            </button>
          <input
            type="number"
            value={movementAdjustmentAmount}
            onChange={(e) => setMovementAdjustmentAmount(e.target.value)}
            placeholder="Amount"
            min="1" max="200"
            className="w-24 p-2 rounded-lg text-center bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={character.isDying || character.status === 'dead'}
          />
          <button
            onClick={() => handleMovementAdjustment('add')}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            aria-label="Increase Movement by amount"
            disabled={character.isDying || character.status === 'dead'}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}

      <div className="mb-4">
        <label htmlFor="status-select" className="block text-sm font-medium text-gray-400 mb-1">Status</label>
        <select
          id="status-select"
          value={character.status}
          onChange={(e) => onUpdateStatus(character.id, e.target.value)}
          className={`p-2 rounded-md text-sm font-medium focus:ring-2 focus:ring-offset-2 w-full
            ${STATUS_EFFECTS[character.status]?.colorClass || 'bg-gray-500'} text-white`}
          disabled={character.isDying || character.status === 'dead'}
        >
          {Object.keys(STATUS_EFFECTS).map(statusKey => (
            <option key={statusKey} value={statusKey} className={`${STATUS_EFFECTS[statusKey]?.colorClass || 'bg-gray-500'} text-white`}>
              {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
            </option>
          ))}
        </select>
        {character.status !== 'active' && (
          <p className="text-xs text-gray-400 mt-2 italic">
            **Effect:** {STATUS_EFFECTS[character.status]?.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>

        {showStats && (
          <div className="mt-3 p-4 bg-gray-600 rounded-lg border border-gray-500">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">Ability Scores</h4>
              {character.lastAbilityRoll && (
                <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full shadow-md">
                  <span className="text-xs text-gray-400 font-semibold">Skill Check:</span>
                  <span className="text-lg text-blue-300 font-bold animate-pulse">
                    {character.lastAbilityRoll.total}
                  </span>
                  <span className="text-xs text-gray-500">({character.lastAbilityRoll.stat})</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => {
                const score = character[stat.toLowerCase()] || 10;
                const modifier = calculateModifier(score);
                const modifierDisplay = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                return (
                  <div key={stat} className="flex flex-col items-center justify-center p-2 bg-gray-700 rounded-md">
                    <button
                      onClick={() => handleStatRoll(stat, modifier)}
                      className="flex items-center space-x-1 text-lg font-bold text-gray-200 hover:text-purple-300 transition-colors"
                      title={`Roll ${stat} Check`}
                      disabled={character.isDying || character.status === 'dead'}
                    >
                      <span>{stat}</span>
                      <Dice className="w-5 h-5 text-green-400" />
                    </button>
                    <span className="text-white text-xl font-bold">{score}</span>
                    <span className="text-sm text-gray-400">({modifierDisplay})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {character.traits && character.traits.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowTraits(!showTraits)}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            {showTraits ? 'Hide Traits' : 'Show Traits'}
          </button>

          {showTraits && (
            <div className="mt-3 p-4 bg-gray-600 rounded-lg border border-gray-500">
              <h4 className="text-md font-semibold mb-3 flex items-center space-x-2">
                <Scroll className="w-5 h-5 text-gray-400" />
                <span>Creature Traits</span>
              </h4>
              <ul className="space-y-3">
                {character.traits.map(trait => {
                  const isTraitActive = character.actions.some(a => a.id === trait.id);
                  const isActionUsed =
                    (trait.actionType === 'action' && character.actionUsed) ||
                    (trait.actionType === 'bonusAction' && character.bonusActionUsed) ||
                    (trait.actionType === 'reaction' && character.reactionUsed);
                  const isDisabledForActivation = character.isDying || character.status === 'dead' || isActionUsed;

                  return (
                    <li key={trait.id} className="flex flex-col p-2 bg-gray-700 rounded-md border border-gray-600">
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isTraitActive}
                            onChange={(e) => {
                              const newActions = e.target.checked
                                ? [...character.actions, { ...trait, isCustom: true, isTrait: true }]
                                : character.actions.filter(a => a.id !== trait.id);
                              onUpdateActions(character.id, newActions);
                            }}
                            disabled={character.isDying || character.status === 'dead'}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className={`ml-2 text-base font-semibold ${isTraitActive ? 'text-purple-300' : 'text-gray-200'}`}>
                            {trait.name}
                          </span>
                        </label>
                        {trait.actionType && trait.actionType !== 'passive' && trait.actionType !== 'free' && (
                          <button
                            onClick={() => onActivateTrait(character.id, trait, trait.actionType)}
                            className={`py-1 px-3 rounded-md text-xs font-medium transition-colors duration-200 flex items-center space-x-1
                              ${isDisabledForActivation ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            disabled={isDisabledForActivation}
                            title={`Activate ${trait.name} (${trait.actionType.replace('Action', ' Action')})`}
                          >
                            <Bolt className="w-4 h-4" />
                            <span>Activate</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 italic ml-6">
                        {trait.description}
                        {trait.actionType && trait.actionType !== 'passive' && trait.actionType !== 'free' && (
                          <span className="ml-1 font-bold text-gray-500">({trait.actionType.replace('Action', ' Action')})</span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 p-4 bg-gray-600 rounded-lg border border-gray-500">
        <h3 className="text-lg font-semibold flex items-center space-x-2 mb-3 text-gray-200">
            <Bolt className="w-5 h-5 text-gray-400" />
            <span>Actions Taken This Turn:</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <input
              id={`action-used-${character.id}`}
              type="checkbox"
              checked={character.actionUsed || false}
              onChange={(e) => onUpdateActionCheckbox(character.id, 'actionUsed', e.target.checked)}
              disabled={character.dashUsed || character.isDying || character.status === 'dead'}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${character.dashUsed || character.isDying || character.status === 'dead' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <label htmlFor={`action-used-${character.id}`} className={`ml-2 ${character.dashUsed || character.isDying || character.status === 'dead' ? 'text-gray-500' : 'text-gray-300'}`}>Action</label>
          </div>
          <div className="flex items-center">
            <input
              id={`bonus-action-used-${character.id}`}
              type="checkbox"
              checked={character.bonusActionUsed || false}
              onChange={(e) => onUpdateActionCheckbox(character.id, 'bonusActionUsed', e.target.checked)}
              disabled={character.isDying || character.status === 'dead'}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${character.isDying || character.status === 'dead' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <label htmlFor={`bonus-action-used-${character.id}`} className={`ml-2 ${character.isDying || character.status === 'dead' ? 'text-gray-500' : 'text-gray-300'}`}>Bonus Action</label>
          </div>
          <div className="flex items-center">
            <input
              id={`dash-used-${character.id}`}
              type="checkbox"
              checked={character.dashUsed || false}
              onChange={(e) => onUpdateActionCheckbox(character.id, 'dashUsed', e.target.checked)}
              disabled={character.actionUsed || character.isDying || character.status === 'dead'}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${character.actionUsed || character.isDying || character.status === 'dead' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <label htmlFor={`dash-used-${character.id}`} className={`ml-2 ${character.actionUsed || character.isDying || character.status === 'dead' ? 'text-gray-500' : 'text-gray-300'}`}>Dash</label>
          </div>
          <div className="flex items-center">
            <input
              id={`reaction-used-${character.id}`}
              type="checkbox"
              checked={character.reactionUsed || false}
              onChange={(e) => onUpdateActionCheckbox(character.id, 'reactionUsed', e.target.checked)}
              disabled={character.isDying || character.status === 'dead'}
              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${character.isDying || character.status === 'dead' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <label htmlFor={`reaction-used-${character.id}`} className={`ml-2 ${character.isDying || character.status === 'dead' ? 'text-gray-500' : 'text-gray-300'}`}>Reaction</label>
          </div>
        </div>
        <button
          onClick={handleResetActions}
          disabled={character.isDying || character.status === 'dead'}
          className={`w-full py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 mt-4 text-sm
            ${character.isDying || character.status === 'dead' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Reset Actions for Turn
        </button>
      </div>

      {character.actions && character.actions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2 mb-2 text-gray-200">
            <Sword className="w-5 h-5 text-gray-400" />
            <span>Available Attacks/Weapons:</span>
          </h3>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            {character.actions.map((action) => {
              const isTrait = action.isTrait;
              const toHitModifierString = action.toHitModifier !== undefined && action.toHitModifier !== 0 ?
                                          (action.toHitModifier > 0 ? `+${action.toHitModifier}` : `${action.toHitModifier}`) : '';
              const isCritical = criticalHitFlags[action.id];

              return (
                <li key={action.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-600 pb-2 last:border-b-0">
                  <div className="flex items-center flex-grow mb-2 sm:mb-0">
                    {action.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                    <span className="font-semibold text-gray-200">{action.name}</span>
                    {isTrait ? (
                      <span className="ml-2 text-xs text-gray-400">({action.description})</span>
                    ) : (
                      action.damageType && (
                        <span className="ml-2 text-xs text-gray-400">({action.damageType})</span>
                      )
                    )}
                  </div>

                  {!isTrait && (
                    <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
                      {(action.toHitModifier !== undefined) && (
                        <div className="flex items-center mr-2">
                          <span className="w-10 text-right mr-1 font-bold text-md text-green-300">
                            {weaponToHitRolls[action.id] !== undefined ? weaponToHitRolls[action.id] : ''}
                          </span>
                          <button
                            onClick={() => handleRollToHit(action.id, action.name, action.toHitModifier)}
                            className="p-1.5 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors duration-200 flex items-center text-sm"
                            title={`Roll To Hit (1d20${toHitModifierString})`}
                            disabled={character.isDying || character.status === 'dead' || character.actionUsed || character.dashUsed}
                          >
                            <Dice className="w-4 h-4 mr-1" /> To Hit
                          </button>
                          {toHitModifierString && (
                            <span className="ml-1 text-sm text-gray-400">
                              {toHitModifierString}
                            </span>
                          )}
                        </div>
                      )}

                      {action.dice && (
                        <div className="flex items-center">
                          <span className="w-10 text-right mr-1 font-bold text-md text-blue-300">
                            {weaponDamageRolls[action.id] !== undefined ? weaponDamageRolls[action.id] : ''}
                          </span>
                          <button
                            onClick={() => handleRollDamage(action.id, action.name, action.dice, action.damageType)}
                            className={`p-1.5 text-white rounded-md transition-colors duration-200 flex items-center text-sm
                              ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            title={`Roll Damage (${action.dice}) ${isCritical ? '(CRITICAL)' : ''}`}
                            disabled={character.isDying || character.status === 'dead'}
                          >
                            <Dice className="w-4 h-4 mr-1" /> {parseDiceNotation(action.dice).dicePart}
                          </button>
                          {parseDiceNotation(action.dice).modifierPart && (
                            <span className="ml-1 text-sm text-gray-400">
                              {parseDiceNotation(action.dice).modifierPart}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-4 p-4 bg-gray-600 rounded-lg border border-gray-500">
        <button
          onClick={() => setShowAddCustomWeaponForm(!showAddCustomWeaponForm)}
          className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm font-semibold"
          disabled={character.isDying || character.status === 'dead'}
        >
          {showAddCustomWeaponForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddCustomWeaponForm ? 'Hide Custom Weapon Form' : `Add Custom Weapon/Attack (${character.actions.length}/${MAX_CUSTOM_WEAPONS})`}</span>
        </button>

        {showAddCustomWeaponForm && (
          <div className="mt-3 space-y-3">
            <input
              type="text"
              placeholder="Attack/Weapon Name"
              value={newCustomWeaponName}
              onChange={(e) => setNewCustomWeaponName(e.target.value)}
              maxLength={40}
              className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1" max="100"
                value={newCustomWeaponNumDice}
                onChange={(e) => setNewCustomWeaponNumDice(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className={`w-16 p-2 rounded-lg text-center bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500
                  ${newCustomWeaponNumDice === 1 ? 'text-gray-400' : ''}`}
                placeholder="1"
              />
              <span className="text-lg font-bold text-gray-300">D</span>
              <select
                value={newCustomWeaponDieType}
                onChange={(e) => setNewCustomWeaponDieType(e.target.value)}
                className="p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex-grow"
              >
                <option value="d4">d4</option>
                <option value="d6">d6</option>
                <option value="d8">d8</option>
                <option value="d10">d10</option>
                <option value="d12">d12</option>
                <option value="d20">d20</option>
                <option value="d100">d100</option>
              </select>
              <NumberScroller
                value={newCustomWeaponModifier}
                onChange={setNewCustomWeaponModifier}
                min={-20} max={20}
                isDefaultValueDisplay={true}
              />
            </div>
            <div>
              <label htmlFor="damage-type-select" className="block text-sm font-medium text-gray-300 mb-1">Damage Type</label>
              <select
                id="damage-type-select"
                value={selectedDamageTypeForNewWeapon}
                onChange={(e) => {
                  setSelectedDamageTypeForNewWeapon(e.target.value);
                  if (e.target.value !== 'Other') {
                    setCustomDamageTypeName('');
                  }
                }}
                className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select Damage Type --</option>
                <option value="Acid">Acid</option>
                <option value="Bludgeoning">Bludgeoning</option>
                <option value="Cold">Cold</option>
                <option value="Fire">Fire</option>
                <option value="Force">Force</option>
                <option value="Lightning">Lightning</option>
                <option value="Necrotic">Necrotic</option>
                <option value="Piercing">Piercing</option>
                <option value="Poison">Poison</option>
                <option value="Psychic">Psychic</option>
                <option value="Radiant">Radiant</option>
                <option value="Slashing">Slashing</option>
                <option value="Thunder">Thunder</option>
                <option value="Other">Other (Type Below)</option>
              </select>
            </div>
            {selectedDamageTypeForNewWeapon === 'Other' && (
              <input
                type="text"
                placeholder="Custom Damage Type"
                value={customDamageTypeName}
                onChange={(e) => setCustomDamageTypeName(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mt-2"
              />
            )}
            <div className="flex items-center">
              <label htmlFor="to-hit-modifier-scroller" className="block text-sm font-medium text-gray-300 mr-2">To Hit Modifier:</label>
              <NumberScroller
                value={newCustomWeaponToHitModifier}
                onChange={setNewCustomWeaponToHitModifier}
                min={-20} max={20}
                isDefaultValueDisplay={true}
              />
            </div>
            <button
              onClick={handleAddCustomWeapon}
              disabled={character.actions.length >= MAX_CUSTOM_WEAPONS}
              className={`w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 mt-4
                ${character.actions.length >= MAX_CUSTOM_WEAPONS ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Add Weapon
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onToggleRemovedFromCombat(character.id, true)}
        className="w-full py-2 px-4 bg-gray-600 text-white rounded-xl hover:bg-gray-500 transition-colors duration-200 mt-4"
        aria-label="Remove character from combat"
      >
        <Trash2 className="inline-block mr-2 w-5 h-5" /> Remove from Combat
      </button>
    </div>
  );
};


const SummaryCharacterCard = ({ character, onDragStart, onDragOver, onDrop, isDraggingOver, onToggleRemovedFromCombat, onDeleteCombatant, onRemoveAndLoot, STATUS_EFFECTS,
  // Shared Icons
  ChevronDown, ChevronUp, Gem, Shirt, Sword, RotateCcw, Trash2
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showLootPanel, setShowLootPanel] = useState(false);
  const [showArmorPanel, setShowArmorPanel] = useState(false);
  const [showWeaponsPanel, setShowWeaponsPanel] = useState(false);

  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpColorClass = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

  const statusBarColorClass = STATUS_EFFECTS[character.status]?.colorClass || 'bg-gray-500';

  const lootItems = character.items?.filter(item => item.type === 'loot' || item.type === 'potion') || [];
  const armorItems = character.items?.filter(item => item.type === 'armor') || [];
  const weaponItems = character.items?.filter(item => item.type === 'weapon') || [];

  const statusClasses = character.status === 'dead'
    ? 'bg-gray-600 text-gray-400'
    : character.status === 'unconscious'
      ? 'bg-red-900 text-red-300'
      : 'bg-gray-700 text-white';

  const draggingClass = isDraggingOver ? 'border-2 border-blue-400' : '';
  const removedClass = character.removedFromCombat ? 'opacity-50' : '';

  const finalCardClasses = `p-2 mb-1 rounded-lg shadow-sm text-sm ${statusClasses} ${draggingClass} ${removedClass}`;

  const isRedSkull = character.isDying && (character.deathFailures >= 3 || (character.deathSaveOpportunities !== null && character.deathSaveOpportunities <= 0));
  const nameLineThroughClass = isRedSkull ? 'line-through' : '';

  return (
    <div
      onDragOver={(e) => onDragOver(e, character.id)}
      onDrop={(e) => onDrop(e, character.id)}
      onDragLeave={(e) => { e.currentTarget.classList.remove('border-2', 'border-blue-400'); }}
      className={finalCardClasses}
      style={{ opacity: isDraggingOver ? 0.5 : (character.removedFromCombat ? 0.7 : 1) }}
    >
      <div
        draggable="true"
        onDragStart={(e) => onDragStart(e, character.id)}
        className="p-2 rounded-md border border-gray-600 bg-gray-600 cursor-grab flex items-center justify-between"
      >
        <div className={`font-semibold text-base truncate ${nameLineThroughClass}`} style={{ color: character.color }}>
          {character.isCustom && <span className="text-purple-300 mr-2">◇</span>}
          {character.name}
          {character.species && ` (${character.species})`}
          {character.removedFromCombat && <span className="ml-2 text-xs text-gray-400">(Removed)</span>}
        </div>
        {character.status !== 'active' && (
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusBarColorClass} text-white`}>
            {character.status.charAt(0).toUpperCase() + character.status.slice(1)}
          </span>
        )}
        {character.type === 'monster' && (
          <div className="flex space-x-1 ml-auto flex-shrink-0">
            {lootItems.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLootPanel(!showLootPanel); }}
                className={`p-1 rounded-md text-xs font-medium transition-colors duration-200 flex items-center
                  ${showLootPanel ? 'bg-yellow-600 text-white' : 'bg-gray-500 text-gray-200 hover:bg-gray-400'}`}
                title="Toggle Loot"
              >
                <Gem className="w-4 h-4" />
              </button>
            )}
            {armorItems.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowArmorPanel(!showArmorPanel); }}
                className={`p-1 rounded-md text-xs font-medium transition-colors duration-200 flex items-center
                  ${showArmorPanel ? 'bg-blue-600 text-white' : 'bg-gray-500 text-gray-200 hover:bg-gray-400'}`}
                title="Toggle Armor"
              >
                <Shirt className="w-4 h-4" />
              </button>
            )}
            {weaponItems.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowWeaponsPanel(!showWeaponsPanel); }}
                className={`p-1 rounded-md text-xs font-medium transition-colors duration-200 flex items-center
                  ${showWeaponsPanel ? 'bg-red-600 text-white' : 'bg-gray-500 text-gray-200 hover:bg-gray-400'}`}
                title="Toggle Weapons"
              >
                <Sword className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
          className="p-1 rounded-full bg-gray-500 hover:bg-gray-400 transition-colors duration-200 ml-2 flex-shrink-0"
          title={isCollapsed ? "Expand Details" : "Collapse Details"}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap text-xs text-gray-300 mt-1">
        <span className="mr-2">AC: {character.ac || 'N/A'}</span>
        <span className="mr-2">HP: {character.hp}/{character.maxHp}</span>
        <span className="mr-2">Mvmt: {character.movement || 'N/A'}</span>
        {character.xp !== undefined && <span className="mr-2">XP: {character.xp}</span>}
      </div>
      <div className="w-full bg-gray-300 rounded-full h-1.5 mt-1">
        <div className={`${statusBarColorClass} h-1.5 rounded-full`} style={{ width: `${hpPercentage}%` }}></div>
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div className="mt-2">
          {character.type === 'monster' && (
            <div className="mt-2 p-2 bg-gray-800 rounded-md border border-gray-700 text-gray-200">
              <h4 className="font-semibold text-gray-300 mb-1">Details:</h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {character.proficiencyBonus !== undefined && (
                  <li>Proficiency Bonus: {character.proficiencyBonus >= 0 ? `+${character.proficiencyBonus}` : character.proficiencyBonus}</li>
                )}
                {character.skills && Object.keys(character.skills).length > 0 && (
                  <li>
                    Skills: {Object.entries(character.skills).map(([skill, bonus]) => `${skill} ${bonus}`).join(', ')}
                  </li>
                )}
                {character.senses && <li>Senses: {character.senses}</li>}
                {character.languages && <li>Languages: {character.languages}</li>}
              </ul>
            </div>
          )}

          {showLootPanel && lootItems.length > 0 && (
            <div className="mt-2 p-2 bg-gray-800 rounded-md border border-yellow-700 text-gray-200">
              <h4 className="font-semibold text-yellow-300 mb-1">Loot:</h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {lootItems.map((item, idx) => (
                  <li key={idx}>
                    {item.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                    {item.name} {item.quantity ? `(${item.quantity} ${item.unit})` : ''} {item.effect ? `(${item.effect})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showArmorPanel && armorItems.length > 0 && (
            <div className="mt-2 p-2 bg-gray-800 rounded-md border border-blue-700 text-gray-200">
              <h4 className="font-semibold text-blue-300 mb-1">Armor:</h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {armorItems.map((item, idx) => (
                  <li key={idx}>
                    {item.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                    {item.name} (AC: {item.ac}, Type: {item.armorType})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showWeaponsPanel && weaponItems.length > 0 && (
            <div className="mt-2 p-2 bg-gray-800 rounded-md border border-red-700 text-gray-200">
              <h4 className="font-semibold text-red-300 mb-1">Weapons:</h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {weaponItems.map((item, idx) => (
                  <li key={idx}>
                    {item.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                    {item.name} (Dmg: {item.damage} {item.damageType ? ` ${item.damageType}` : ''}{item.toHit ? `, To Hit: ${item.toHit}` : ''})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col space-y-2">
          {character.removedFromCombat && (
            <button
              onClick={() => onToggleRemovedFromCombat(character.id, false)}
              className="w-full py-1.5 px-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200 text-xs flex items-center justify-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore to Combat</span>
            </button>
          )}
          <button
            onClick={() => onRemoveAndLoot(character.id)}
            className="w-full py-1.5 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-xs flex items-center justify-center space-x-1"
          >
            <Gem className="w-3 h-3" />
            <span>Remove & Loot Items</span>
          </button>
          <button
            onClick={() => onDeleteCombatant(character.id)}
            className="w-full py-1.5 px-3 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 text-xs flex items-center justify-center space-x-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Combatant</span>
          </button>
        </div>
      </div>
    </div>
  );
};


const CombatantManagement = ({
  characters, setCharacters, loadedMonsters, loadedNamesData, loadedStatusEffects,
  MAX_TOTAL_COMBATANTS, MAX_ADD_QUANTITY, maxHpLimit, COLORS, addLogEntry,
  toggleRemovedFromCombat, handleRemoveAndLoot, handleDeleteCombatant, handleRestoreDeletedCharacter,
  deletedCharacters, setDeletedCharacters, MAX_UNDO_BUFFER, generateMonsterName, sortedCharactersForSummary,
  // Form states and setters
  newCharacterName, setNewCharacterName, newCharacterInitiative, setNewCharacterInitiative,
  monsterInitiativeMathDisplay, setMonsterInitiativeMathDisplay, newCharacterHp, setNewCharacterHp,
  newCharacterAc, setNewCharacterAc, newCharacterHpDice, setNewCharacterHpDice,
  newCharacterHpModifier, setNewCharacterHpModifier, newCharacterHpBaseRollDisplay, setNewCharacterHpBaseRollDisplay,
  newCharacterMovement, setNewCharacterMovement, newCharacterActions, setNewCharacterActions,
  newCharacterType, setNewCharacterType, showAddForm, setShowAddForm, selectedMonsterId, setSelectedMonsterId,
  monsterSortOption, setMonsterSortOption, newCharacterQuantity, setNewCharacterQuantity,
  randomizeAc, setRandomizeAc, randomizeWeapons, setRandomizeWeapons, createUniqueNames, setCreateUniqueNames,
  sharedInitiative, setSharedInitiative, rollHpOnAddBatch, setRollHpOnAddBatch,
  randomizeNewCombatantStats, setNewRandomizeNewCombatantStats, newCharacterStr, setNewCharacterStr,
  newCharacterDex, setNewCharacterDex, newCharacterCon, setNewCharacterCon, newCharacterInt, setNewCharacterInt,
  newCharacterWis, setNewCharacterWis, newCharacterCha, setNewCharacterCha,
  isOverviewCollapsed, setIsOverviewCollapsed, currentMonsterInitiativeBonus, setCurrentMonsterInitiativeBonus,
  draggedItemId, setDraggedItemId, dragOverItemId, setDragOverItemId,
  // Shared Components/Utilities
  NumberScroller, parseDiceNotationForParts, rollDiceDetailed, Dice, Plus, Minus, Trash2, Sword, Gem, Shirt, RotateCcw, ChevronDown, ChevronUp, crToNumber
}) => {

  // Handle selection of a monster from the dropdown (for adding new)
  useEffect(() => {
    if (selectedMonsterId && newCharacterType === 'monster' && loadedMonsters.length > 0) {
      const monster = loadedMonsters.find(m => m.id === selectedMonsterId);
      if (monster) {
        setNewCharacterName(monster.name);
        const { dicePart: hpDicePart, modifier: hpModifierPart } = parseDiceNotationForParts(monster.hpDice);
        setNewCharacterHpDice(hpDicePart);
        setNewCharacterHpModifier(hpModifierPart.toString());

        setNewCharacterHp(rollHpOnAddBatch ? '1' : monster.hp.toString());
        if (!rollHpOnAddBatch) {
            setNewCharacterHpBaseRollDisplay((monster.hp - hpModifierPart).toString());
        } else {
            setNewCharacterHpBaseRollDisplay('');
        }

        setNewCharacterAc(monster.ac.toString());
        setNewCharacterMovement(monster.movement ? parseInt(monster.movement).toString() : '0');

        setNewCharacterActions(monster.actions ? monster.actions.map(a => a.name).join(', ') : '');
        
        setCurrentMonsterInitiativeBonus(monster.initiativeBonus || 0);

        const d20Roll = Math.floor(Math.random() * 20) + 1;
        const totalInit = d20Roll + (monster.initiativeBonus || 0);
        setNewCharacterInitiative(totalInit.toString());
        setMonsterInitiativeMathDisplay(d20Roll.toString());

        if (!randomizeNewCombatantStats) {
          setNewCharacterStr(monster.str?.toString() || '10');
          setNewCharacterDex(monster.dex?.toString() || '10');
          setNewCharacterCon(monster.con?.toString() || '10');
          setNewCharacterInt(monster.int?.toString() || '10');
          setNewCharacterWis(monster.wis?.toString() || '10');
          setNewCharacterCha(monster.cha?.toString() || '10');
        } else {
          setNewCharacterStr('');
          setNewCharacterDex('');
          setNewCharacterCon('');
          setNewCharacterInt('');
          setNewCharacterWis('');
          setNewCharacterCha('');
        }
      }
    } else if (newCharacterType === 'player') {
      setNewCharacterName('');
      setNewCharacterInitiative('');
      setMonsterInitiativeMathDisplay('');
      setNewCharacterHp('1');
      setNewCharacterAc('0');
      setNewCharacterHpDice('');
      setNewCharacterHpModifier('');
      setNewCharacterHpBaseRollDisplay('');
      setNewCharacterMovement('0');
      setNewCharacterActions('');
      setCurrentMonsterInitiativeBonus(0);
      setNewCharacterStr('');
      setNewCharacterDex('');
      setNewCharacterCon('');
      setNewCharacterInt('');
      setNewCharacterWis('');
      setNewCharacterCha('');
    }
  }, [selectedMonsterId, newCharacterType, loadedMonsters, rollHpOnAddBatch, randomizeNewCombatantStats,
    setNewCharacterName, setNewCharacterInitiative, setMonsterInitiativeMathDisplay, setNewCharacterHp,
    setNewCharacterAc, setNewCharacterHpDice, setNewCharacterHpModifier, setNewCharacterHpBaseRollDisplay,
    setNewCharacterMovement, setNewCharacterActions, setCurrentMonsterInitiativeBonus,
    setNewCharacterStr, setNewCharacterDex, setNewCharacterCon, setNewCharacterInt, setNewCharacterWis, setNewCharacterCha,
    parseDiceNotationForParts
  ]);


  const handleRollMonsterInitiative = () => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalInit = d20Roll + currentMonsterInitiativeBonus;
    setNewCharacterInitiative(totalInit.toString());
    setMonsterInitiativeMathDisplay(d20Roll.toString());
  };

  const handleRandomizeStats = () => {
    const getRandomStat = () => Math.floor(Math.random() * (15 - 8 + 1)) + 8;
    setNewCharacterStr(getRandomStat().toString());
    setNewCharacterDex(getRandomStat().toString());
    setNewCharacterCon(getRandomStat().toString());
    setNewCharacterInt(getRandomStat().toString());
    setNewCharacterWis(getRandomStat().toString());
    setNewCharacterCha(getRandomStat().toString());
  };

  const addCharacter = () => {
    const getRandomAbilityScore = () => Math.floor(Math.random() * (15 - 8 + 1)) + 8;

    if (newCharacterType === 'player') {
      if (characters.length >= MAX_TOTAL_COMBATANTS) {
        console.warn(`Cannot add more combatants. Maximum total limit of ${MAX_TOTAL_COMBATANTS} reached.`);
        return;
      }
      if (newCharacterName && newCharacterInitiative !== '' && newCharacterHp !== '') {
        const id = Date.now() + Math.random();

        const finalStr = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterStr !== '' ? parseInt(newCharacterStr) : 10);
        const finalDex = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterDex !== '' ? parseInt(newCharacterDex) : 10);
        const finalCon = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterCon !== '' ? parseInt(newCharacterCon) : 10);
        const finalInt = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterInt !== '' ? parseInt(newCharacterInt) : 10);
        const finalWis = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterWis !== '' ? parseInt(newCharacterWis) : 10);
        const finalCha = randomizeNewCombatantStats ? getRandomAbilityScore() : (newCharacterCha !== '' ? parseInt(newCharacterCha) : 10);

        const newChar = {
          id,
          name: newCharacterName,
          initiative: parseInt(newCharacterInitiative),
          hp: parseInt(newCharacterHp),
          maxHp: parseInt(newCharacterHp),
          ac: newCharacterAc !== '' ? parseInt(newCharacterAc) : undefined,
          baseAc: newCharacterAc !== '' ? parseInt(newCharacterAc) : undefined,
          type: newCharacterType,
          status: 'active',
          movement: newCharacterMovement !== '' ? `${parseInt(newCharacterMovement)}ft` : undefined,
          currentMovement: newCharacterMovement !== '' ? parseInt(newCharacterMovement) : undefined,
          actions: newCharacterActions ? newCharacterActions.split(',').map(a => ({name: a.trim(), id: crypto.randomUUID(), isCustom: true})).filter(a => a.name) : [],
          color: COLORS[characters.length % COLORS.length],
          actionUsed: false, bonusActionUsed: false, dashUsed: false, reactionUsed: false, turnCompleted: false,
          species: 'Human', isLocked: false, removedFromCombat: false,
          str: finalStr, dex: finalDex, con: finalCon, int: finalInt, wis: finalWis, cha: finalCha,
          lastAbilityRoll: null, items: [], isDying: false, deathSuccesses: 0, deathFailures: 0,
          deathSaveOpportunities: null, hasMadeDeathSaveThisRound: false, isCustom: true, traits: [],
          isMovementDashed: false,
        };
        setCharacters(prev => [...prev, newChar]);
        addLogEntry({ type: 'info', characterId: newChar.id, message: `created. Init: ${newChar.initiative}, HP: ${newChar.hp}/${newChar.maxHp}, AC: ${newChar.ac || 'N/A'}, Movement: ${newChar.movement || 'N/A'}` });

        setNewCharacterName(''); setNewCharacterInitiative(''); setNewCharacterHp('1'); setNewCharacterAc('0');
        setNewCharacterHpDice(''); setNewCharacterHpModifier(''); setNewCharacterHpBaseRollDisplay('');
        setNewCharacterMovement('0'); setNewCharacterActions('');
        setNewCharacterStr(''); setNewCharacterDex(''); setNewCharacterCon('');
        setNewCharacterInt(''); setNewCharacterWis(''); setNewCharacterCha('');
        setShowAddForm(false);
      } else {
        console.warn('Please fill in all required player details (Name, Initiative, Max HP).');
      }
    } else if (newCharacterType === 'monster') {
      const quantityToAdd = parseInt(newCharacterQuantity) || 1;
      if (selectedMonsterId && quantityToAdd > 0) {
        if (characters.length + quantityToAdd > MAX_TOTAL_COMBATANTS) {
          console.warn(`Cannot add ${quantityToAdd} combatants. Adding them would exceed the maximum total limit of ${MAX_TOTAL_COMBATANTS}. Current: ${characters.length}, Attempted: ${quantityToAdd}`);
          return;
        }
        if (quantityToAdd > MAX_ADD_QUANTITY) {
            console.warn(`Cannot add more than ${MAX_ADD_QUANTITY} monsters at once.`);
            return;
        }

        const monsterTemplate = loadedMonsters.find(m => m.id === selectedMonsterId);
        if (!monsterTemplate) {
          console.error("Selected monster template not found for ID:", selectedMonsterId);
          return;
        }

        const newMonsters = [];
        const initiativeToAssign = parseInt(newCharacterInitiative);
        addLogEntry({ type: 'initiative_set', message: `Initiative for ${monsterTemplate.name}s set to:`, value: initiativeToAssign, details: '(From input field)' });

        const currentBatchUsedNames = new Set();
        const sharedInitiativeId = sharedInitiative ? crypto.randomUUID() : undefined;

        for (let i = 0; i < quantityToAdd; i++) {
          const id = Date.now() + Math.random();
          const fullHpDiceNotation = `${newCharacterHpDice}${newCharacterHpModifier !== '0' && newCharacterHpModifier !== '' ? (parseInt(newCharacterHpModifier) > 0 ? `+${newCharacterHpModifier}` : newCharacterHpModifier) : ''}`;
          
          let finalHp;
          if (rollHpOnAddBatch && fullHpDiceNotation) {
            finalHp = rollDiceDetailed(fullHpDiceNotation).total;
          } else {
            finalHp = monsterTemplate.hp;
          }

          const finalInitiative = sharedInitiative ? initiativeToAssign : (Math.floor(Math.random() * 20) + 1 + (currentMonsterInitiativeBonus || 0));

          let finalAc = monsterTemplate.ac;
          if (randomizeAc) {
            const acDeduction = Math.floor(Math.random() * 4);
            finalAc = Math.max(0, monsterTemplate.ac - acDeduction);
          }

          let finalActions = [...(monsterTemplate.actions || [])];
          if (randomizeWeapons) {
            if (finalActions.length > 0) {
              const selectedAction = finalActions[Math.floor(Math.random() * finalActions.length)];
              finalActions = [{
                name: selectedAction.name,
                dice: selectedAction.dice || '1d4',
                modifier: selectedAction.modifier || 0,
                damageType: selectedAction.damageType || 'Bludgeoning',
                toHitModifier: selectedAction.toHitModifier || 0,
                isCustom: true,
              }];
            } else {
              finalActions = [{name: 'Melee Attack', dice: '1d4', modifier: 0, damageType: 'Bludgeoning', toHitModifier: 0, isCustom: true}];
            }
          }
          finalActions = finalActions.map(action => ({ ...action, id: crypto.randomUUID() }));

          let finalName = monsterTemplate.name;
          const isMonsterCustom = false;
          if (createUniqueNames) {
            finalName = generateMonsterName(monsterTemplate, currentBatchUsedNames, loadedNamesData);
            currentBatchUsedNames.add(finalName);
          }

          const monsterStr = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.str || 10);
          const monsterDex = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.dex || 10);
          const monsterCon = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.con || 10);
          const monsterInt = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.int || 10);
          const monsterWis = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.wis || 10);
          const monsterCha = randomizeNewCombatantStats ? getRandomAbilityScore() : (monsterTemplate.cha || 10);

          const monsterItems = (monsterTemplate.items || []).map(item => ({ ...item, id: crypto.randomUUID(), isCustom: randomizeWeapons }));
          const monsterTraits = (monsterTemplate.traits || []).map(trait => ({ ...trait, id: crypto.randomUUID(), isCustom: false }));

          const newMonster = {
            id, name: finalName, initiative: finalInitiative, hp: finalHp, maxHp: finalHp, ac: finalAc,
            baseAc: monsterTemplate.ac, type: 'monster', status: 'active', movement: monsterTemplate.movement,
            currentMovement: monsterTemplate.movement ? parseInt(monsterTemplate.movement.replace('ft', '')) : undefined,
            actions: finalActions, hpDice: monsterTemplate.hpDice, color: COLORS[(characters.length + i) % COLORS.length],
            actionUsed: false, bonusActionUsed: false, dashUsed: false, reactionUsed: false, turnCompleted: false,
            species: monsterTemplate.species, isLocked: false, removedFromCombat: false,
            str: monsterStr, dex: monsterDex, con: monsterCon, int: monsterInt, wis: monsterWis, cha: monsterCha,
            lastAbilityRoll: null, items: monsterItems, cr: monsterTemplate.cr, xp: monsterTemplate.xp,
            isDying: false, deathSuccesses: 0, deathFailures: 0, deathSaveOpportunities: null,
            hasMadeDeathSaveThisRound: false, isCustom: isMonsterCustom, traits: monsterTraits,
            isMovementDashed: false, size: monsterTemplate.size, sharedInitiativeId: sharedInitiativeId,
            proficiencyBonus: monsterTemplate.proficiencyBonus, skills: monsterTemplate.skills,
            senses: monsterTemplate.senses, languages: monsterTemplate.languages,
          };
          newMonsters.push(newMonster);
          addLogEntry({ type: 'info', characterId: newMonster.id, message: `created. Init: ${newMonster.initiative}, HP: ${newMonster.hp}/${newMonster.maxHp}, AC: ${newMonster.ac || 'N/A'}, Movement: ${newMonster.movement || 'N/A'}` });
        }
        setCharacters(prevCharacters => [...prevCharacters, ...newMonsters]);
        setNewCharacterQuantity('1');
        setShowAddForm(true);

        const d20Roll = Math.floor(Math.random() * 20) + 1;
        const newTotalInit = d20Roll + currentMonsterInitiativeBonus;
        setNewCharacterInitiative(newTotalInit.toString());
        setMonsterInitiativeMathDisplay(d20Roll.toString());
      } else {
        console.warn('Please select a monster and specify a quantity greater than 0.');
      }
    }
  };

  const handleRollNewCharacterHpDice = () => {
    if (newCharacterHpDice) {
      const fullDiceNotation = `${newCharacterHpDice}${newCharacterHpModifier !== '0' && newCharacterHpModifier !== '' ? (parseInt(newCharacterHpModifier) > 0 ? `+${newCharacterHpModifier}` : newCharacterHpModifier) : ''}`;
      const rolledResult = rollDiceDetailed(fullDiceNotation);
      setNewCharacterHp(rolledResult.total.toString());
      setNewCharacterHpBaseRollDisplay(rolledResult.sumOfDice.toString());
    }
  };

  const handleDragStart = useCallback((e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, [setDraggedItemId]);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    setDragOverItemId(id);
  }, [setDragOverItemId]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    setDragOverItemId(null);

    if (draggedItemId === null || draggedItemId === targetId) {
      return;
    }

    setCharacters(prevCharacters => {
      const newCharacters = [...prevCharacters];
      const draggedIndex = newCharacters.findIndex(char => char.id === draggedItemId);
      const targetIndex = newCharacters.findIndex(char => char.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prevCharacters;
      }

      const [draggedItem] = newCharacters.splice(draggedIndex, 1);
      newCharacters.splice(targetIndex, 0, draggedItem);
      return newCharacters;
    });
    setDraggedItemId(null);
  }, [draggedItemId, setCharacters, setDraggedItemId]);


  const sortedMonsters = useMemo(() => {
    let sorted = [...loadedMonsters];
    switch (monsterSortOption) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'hp':
        sorted.sort((a, b) => a.hp - b.hp);
        break;
      case 'ac':
        sorted.sort((a, b) => a.ac - b.ac);
        break;
      case 'challenge':
        sorted.sort((a, b) => crToNumber(a.cr) - crToNumber(b.cr));
        break;
      default:
        break;
    }
    return sorted;
  }, [loadedMonsters, monsterSortOption, crToNumber]);


  return (
    <div className="p-2 bg-gray-700 rounded-xl shadow-inner border border-gray-600 space-y-8">
      <div className="p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
        >
          {showAddForm ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span>{showAddForm ? 'Hide Add Form' : 'Add New Combatant'}</span>
        </button>

        {showAddForm && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="combatant-type" className="block text-sm font-medium text-gray-300 mb-1">Combatant Type</label>
              <select
                id="combatant-type"
                value={newCharacterType}
                onChange={(e) => {
                  setNewCharacterType(e.target.value);
                  setSelectedMonsterId('');
                }}
                className="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              >
                <option value="player">Player</option>
                <option value="monster">Monster</option>
              </select>
            </div>

            {newCharacterType === 'monster' ? (
              <>
                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="monster-sort" className="block text-sm font-medium text-gray-300 mb-1">Sort Monster List By</label>
                  <select
                    id="monster-sort"
                    value={monsterSortOption}
                    onChange={(e) => setMonsterSortOption(e.target.value)}
                    className="p-3 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  >
                    <option value="name">Name</option>
                    <option value="hp">HP</option>
                    <option value="ac">AC</option>
                    <option value="challenge">Challenge</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="monster-select" className="block text-sm font-medium text-gray-300 mb-1">Select Monster</label>
                  <select
                    id="monster-select"
                    value={selectedMonsterId}
                    onChange={(e) => setSelectedMonsterId(e.target.value)}
                    className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  >
                    <option value="">-- Select a Monster --</option>
                    {sortedMonsters.map(monster => (
                      <option key={monster.id} value={monster.id}>
                        {monster.name} {monster.cr ? `(CR ${monster.cr})` : ''} (HP: {monster.hp}, AC: {monster.ac}, Size: {monster.size})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:space-x-4">
                  <div className="flex-1 mb-4 sm:mb-0">
                    <label htmlFor="monster-ac" className="block text-sm font-medium text-gray-300 mb-1">Armor Class (AC)</label>
                    <NumberScroller
                      value={newCharacterAc}
                      onChange={setNewCharacterAc}
                      min={0} max={40}
                      isDefaultValueDisplay={true}
                      inputWidthClass="w-12" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="monster-hp" className="block text-sm font-medium text-gray-300 mb-1">Max HP</label>
                    <div className="flex items-center space-x-1">
                        <NumberScroller
                            value={newCharacterHp}
                            onChange={setNewCharacterHp}
                            min={1} max={maxHpLimit}
                            textColorClass="text-blue-400"
                            inputWidthClass="w-12" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                        />
                        <span className="text-gray-300 text-sm">=</span>
                        <div className="p-1 rounded-lg bg-gray-600 text-white border border-gray-500 w-10 text-center text-gray-300 text-xs">
                            {newCharacterHpBaseRollDisplay || '0'}
                        </div>
                        <span className="text-gray-300 text-sm">+</span>
                        <NumberScroller
                            value={newCharacterHpModifier}
                            onChange={setNewCharacterHpModifier}
                            min={-50} max={50}
                            hideControls={true}
                            isDefaultValueDisplay={true}
                            inputWidthClass="w-8" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                        />
                        {newCharacterHpDice && (
                            <button
                              onClick={handleRollNewCharacterHpDice}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-300 flex items-center justify-center space-x-1 whitespace-nowrap text-sm"
                              title="Roll HP Dice"
                            >
                              <Dice className="w-4 h-4" />
                              <span>{newCharacterHpDice}</span>
                            </button>
                        )}
                    </div>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:space-x-4">
                  <div className="flex-1 mb-4 sm:mb-0">
                    <label htmlFor="monster-movement" className="block text-sm font-medium text-gray-300 mb-1">Movement</label>
                    <NumberScroller
                      value={newCharacterMovement}
                      onChange={setNewCharacterMovement}
                      min={0} max={200} step={5}
                      displayUnit="ft"
                      isDefaultValueDisplay={true}
                      inputWidthClass="w-12" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                    />
                  </div>
                  <div className="flex-1">
                      <label htmlFor="monster-initiative-display" className="block text-sm font-medium text-gray-300 mb-1">Initiative</label>
                      <div className="flex items-center space-x-1">
                          <NumberScroller
                              value={newCharacterInitiative}
                              onChange={setNewCharacterInitiative}
                              min={-10} max={30}
                              textColorClass="text-blue-400"
                              inputWidthClass="w-12" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                          />
                          <span className="text-gray-300 text-sm">=</span>
                          <div className="p-1 rounded-lg bg-gray-600 text-white border border-gray-500 w-10 text-center text-gray-300 text-xs">
                              {monsterInitiativeMathDisplay || '0'}
                          </div>
                          <span className="text-gray-300 text-sm">+</span>
                          <NumberScroller
                              value={currentMonsterInitiativeBonus.toString()}
                              onChange={setCurrentMonsterInitiativeBonus}
                              min={-10} max={10}
                              hideControls={true}
                              isDefaultValueDisplay={true}
                              inputWidthClass="w-8" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                          />
                          <button
                            onClick={handleRollMonsterInitiative}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-300 flex items-center justify-center whitespace-nowrap text-sm"
                            title="Roll Monster Initiative"
                          >
                            <Dice className="w-4 h-4 mr-1" />
                            <span>1d20</span>
                          </button>
                      </div>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2">
                    <label htmlFor="monster-quantity" className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                    <NumberScroller
                        value={newCharacterQuantity}
                        onChange={setNewCharacterQuantity}
                        min={1} max={MAX_ADD_QUANTITY}
                        isDefaultValueDisplay={true}
                        inputWidthClass="w-12" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
                    />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="monster-actions" className="block text-sm font-medium text-gray-300 mb-1">Actions (comma-separated)</label>
                  <textarea
                    id="monster-actions"
                    placeholder="e.g., Bite, Claw, Fire Breath"
                    value={newCharacterActions}
                    onChange={(e) => setNewCharacterActions(e.target.value)}
                    rows="2"
                    className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  ></textarea>
                </div>

                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center">
                    <input
                      id="randomize-ac"
                      type="checkbox"
                      checked={randomizeAc}
                      onChange={(e) => setRandomizeAc(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="randomize-ac" className="ml-2 block text-sm text-gray-300">Randomize AC (-0 to -3)</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="randomize-weapons"
                      type="checkbox"
                      checked={randomizeWeapons}
                      onChange={(e) => setRandomizeWeapons(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="randomize-weapons" className="ml-2 block text-sm text-gray-300">Randomize Actions</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="create-unique-names"
                      type="checkbox"
                      checked={createUniqueNames}
                      onChange={(e) => setCreateUniqueNames(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="create-unique-names" className="ml-2 block text-sm text-gray-300">Create Unique Names</label>
                  </div>
                  <div className="flex items-center col-span-1 sm:col-span-3">
                    <input
                      id="shared-initiative"
                      type="checkbox"
                      checked={sharedInitiative}
                      onChange={(e) => setSharedInitiative(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shared-initiative" className="ml-2 block text-sm text-gray-300">Shared Initiative (All added monsters get same initiative)</label>
                  </div>
                  <div className="flex items-center col-span-1 sm:col-span-3">
                    <input
                      id="roll-hp-on-add-batch"
                      type="checkbox"
                      checked={rollHpOnAddBatch}
                      onChange={(e) => setRollHpOnAddBatch(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="roll-hp-on-add-batch" className="ml-2 block text-sm text-gray-300">Roll HP for each monster when adding multiple</label>
                  </div>
                  <div className="col-span-1 sm:col-span-3 flex items-center">
                    <input
                      id="randomize-new-combatant-stats"
                      type="checkbox"
                      checked={randomizeNewCombatantStats}
                      onChange={(e) => {
                        setNewRandomizeNewCombatantStats(e.target.checked);
                        if (e.target.checked) {
                          setNewCharacterStr(''); setNewCharacterDex(''); setNewCharacterCon('');
                          setNewCharacterInt(''); setNewCharacterWis(''); setNewCharacterCha('');
                        } else {
                          if (newCharacterType === 'monster' && selectedMonsterId) {
                            const monster = loadedMonsters.find(m => m.id === selectedMonsterId);
                            if (monster) {
                              setNewCharacterStr(monster.str?.toString() || '10');
                              setNewCharacterDex(monster.dex?.toString() || '10');
                              setNewCharacterCon(monster.con?.toString() || '10');
                              setNewCharacterInt(monster.int?.toString() || '10');
                              setNewCharacterWis(monster.wis?.toString() || '10');
                              setNewCharacterCha(monster.cha?.toString() || '10');
                            }
                          }
                        }
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="randomize-new-combatant-stats" className="ml-2 block text-sm text-gray-300">Randomize All 6 Stats (8-15)</label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="player-name" className="block text-sm font-medium text-gray-300 mb-1">Player Name</label>
                  <input
                    id="player-name"
                    type="text"
                    placeholder="Player Name"
                    value={newCharacterName}
                    onChange={(e) => setNewCharacterName(e.target.value)}
                    maxLength={30}
                    className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="player-initiative" className="block text-sm font-medium text-gray-300 mb-1">Initiative</label>
                  <input
                    id="player-initiative"
                    type="number"
                    placeholder="Initiative"
                    value={newCharacterInitiative}
                    onChange={(e) => setNewCharacterInitiative(e.target.value)}
                    className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="player-hp" className="block text-sm font-medium text-gray-300 mb-1">Max HP</label>
                  <NumberScroller
                    value={newCharacterHp}
                    onChange={setNewCharacterHp}
                    min={1} max={maxHpLimit}
                  />
                </div>
                <div>
                  <label htmlFor="player-ac" className="block text-sm font-medium text-gray-300 mb-1">Armor Class (AC) (Optional)</label>
                  <NumberScroller
                    value={newCharacterAc}
                    onChange={setNewCharacterAc}
                    min={0} max={40}
                    isDefaultValueDisplay={true}
                  />
                </div>
                <div>
                  <label htmlFor="player-movement" className="block text-sm font-medium text-gray-300 mb-1">Movement (Optional)</label>
                  <NumberScroller
                    value={newCharacterMovement}
                    onChange={setNewCharacterMovement}
                    min={0} max={200} step={5}
                    displayUnit="ft"
                    isDefaultValueDisplay={true}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label htmlFor="player-actions" className="block text-sm font-medium text-gray-300 mb-1">Actions (comma-separated, Optional)</label>
                  <textarea
                    id="player-actions"
                    placeholder="e.g., Bite, Claw, Fire Breath"
                    value={newCharacterActions}
                    onChange={(e) => setNewCharacterActions(e.target.value)}
                    rows="2"
                    className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                  ></textarea>
                </div>
                <div className="col-span-1 sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label htmlFor="player-str" className="block text-sm font-medium text-gray-300 mb-1">STR</label>
                    <input type="number" id="player-str" value={newCharacterStr} onChange={(e) => setNewCharacterStr(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <div>
                    <label htmlFor="player-dex" className="block text-sm font-medium text-gray-300 mb-1">DEX</label>
                    <input type="number" id="player-dex" value={newCharacterDex} onChange={(e) => setNewCharacterDex(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <div>
                    <label htmlFor="player-con" className="block text-sm font-medium text-gray-300 mb-1">CON</label>
                    <input type="number" id="player-con" value={newCharacterCon} onChange={(e) => setNewCharacterCon(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <div>
                    <label htmlFor="player-int" className="block text-sm font-medium text-gray-300 mb-1">INT</label>
                    <input type="number" id="player-int" value={newCharacterInt} onChange={(e) => setNewCharacterInt(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <div>
                    <label htmlFor="player-wis" className="block text-sm font-medium text-gray-300 mb-1">WIS</label>
                    <input type="number" id="player-wis" value={newCharacterWis} onChange={(e) => setNewCharacterWis(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <div>
                    <label htmlFor="player-cha" className="block text-sm font-medium text-gray-300 mb-1">CHA</label>
                    <input type="number" id="player-cha" value={newCharacterCha} onChange={(e) => setNewCharacterCha(e.target.value)} className="p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full" placeholder="10" disabled={randomizeNewCombatantStats} />
                  </div>
                  <button
                    onClick={handleRandomizeStats}
                    className={`col-span-2 sm:col-span-3 py-2 px-4 bg-green-600 text-white font-bold rounded-lg shadow-md transition-all duration-300
                      ${randomizeNewCombatantStats ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                    disabled={randomizeNewCombatantStats}
                  >
                    Randomize Stats (Manual)
                  </button>
                </div>
              </>
            )}

            <button
              onClick={addCharacter}
              className="col-span-1 sm:col-span-2 py-3 px-6 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 transform hover:scale-105"
            >
              Add Combatant
            </button>
          </div>
        )}
      </div>

      <div className="p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
        <h2 className="text-xl font-bold text-center mb-4 text-gray-200 flex justify-between items-center">
          <span>All Combatants Overview</span>
          <button
            onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)}
            className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200"
            title={isOverviewCollapsed ? "Expand" : "Collapse"}
          >
            {isOverviewCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </h2>
        <div className={`space-y-2 transition-all duration-300 ease-in-out ${isOverviewCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[500px] overflow-y-auto'}`}>
          {sortedCharactersForSummary.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No combatants added yet.</p>
          ) : (
            sortedCharactersForSummary.map(char => (
              <SummaryCharacterCard
                key={char.id}
                character={char}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDraggingOver={dragOverItemId === char.id}
                onToggleRemovedFromCombat={toggleRemovedFromCombat}
                onRemoveAndLoot={handleRemoveAndLoot}
                onDeleteCombatant={handleDeleteCombatant}
                STATUS_EFFECTS={loadedStatusEffects}
                // Pass shared icons
                ChevronDown={ChevronDown} ChevronUp={ChevronUp} Gem={Gem} Shirt={Shirt} Sword={Sword} RotateCcw={RotateCcw} Trash2={Trash2}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => setDeletedCharacters(prev => !prev.showUndoList ? { ...prev, showUndoList: true } : { ...prev, showUndoList: false })}
          className="w-full py-3 px-6 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{deletedCharacters.showUndoList ? 'Hide Undo List' : `Undo Deleted Combatants (${deletedCharacters.length}/${MAX_UNDO_BUFFER})`}</span>
        </button>

        {deletedCharacters.showUndoList && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg shadow-inner border border-gray-700 max-h-60 overflow-y-auto text-sm text-gray-300">
            {deletedCharacters.length === 0 ? (
              <p className="text-center text-gray-500">No deleted combatants to restore.</p>
            ) : (
              <ul className="space-y-2">
                {deletedCharacters.map(char => (
                  <li key={char.id} className="flex justify-between items-center p-2 bg-gray-800 rounded-md border border-gray-700">
                    <span className="font-semibold" style={{ color: char.color }}>
                      {char.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                      {char.name}
                      {char.wasLooted && <span className="ml-2 text-xs text-yellow-300">(Looted)</span>}
                    </span>
                    <button
                      onClick={() => handleRestoreDeletedCharacter(char.id)}
                      className="py-1 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-xs"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CombatantManagement;
