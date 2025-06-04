import React, { useState, useEffect, useCallback, useRef } from 'react';

// Import icons and utilities from App.js (assuming they are passed as props or globally available)

const MiniCharacterCard = ({ character, onSelectCharacter, isSelected, onUpdateColor, allColors, onUpdateHp, onToggleRemovedFromCombat, onUpdateStatus, onUpdateActionCheckbox, onUpdateCurrentMovement, onUpdateActions, addLogEntry, onUpdateCharacterName,
  newCustomWeaponName, setNewCustomWeaponName, newCustomWeaponNumDice, setNewCustomWeaponNumDice, newCustomWeaponDieType, setNewCustomWeaponDieType, newCustomWeaponModifier, setNewCustomWeaponModifier,
  selectedDamageTypeForNewWeapon, setSelectedDamageTypeForNewWeapon, customDamageTypeName, setCustomDamageTypeName, newCustomWeaponToHitModifier, setNewCustomWeaponToHitModifier,
  onTogglePanelLock, onUpdateAbilityRoll, onRollDeathSave, deathSavesEnabled, onActivateTrait, STATUS_EFFECTS, // Props from App.js
  // Shared Components/Utilities
  ColorPickerWheel, NumberScroller, parseDiceNotation, rollDiceDetailed, getDieTypeMax, Skull, Check, Dice, Plus, Minus, Heart, ShieldCheck, Footprints, Bolt, Sword, Lock, LockOpen, Scroll, Trash2
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const cardRef = useRef(null);

  const handleColorCircleClick = (e) => {
    e.stopPropagation();
    setShowColorPicker(!showColorPicker);
  };

  const handleColorSelected = (color) => {
    onUpdateColor(character.id, color);
    setShowColorPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isRedSkull = character.isDying && (character.deathFailures >= 3 || (character.deathSaveOpportunities !== null && character.deathSaveOpportunities <= 0));
  const isWhiteSkull = character.isDying && !isRedSkull;

  const turnCompletedColorClass = (character.isDying || character.status === 'dead') ? 'text-red-500' : 'text-green-500';

  const isRemovedOrDead = isRedSkull || character.removedFromCombat;
  const cardOpacityClass = isRemovedOrDead ? 'opacity-50' : '';
  const nameLineThroughClass = isRedSkull ? 'line-through' : '';

  return (
    <div className="relative">
      <div className="relative flex items-center mb-2">
        <div
          onClick={() => onSelectCharacter(character.id)}
          className={`flex-grow flex items-center p-3 rounded-lg shadow-md cursor-pointer transition-all duration-200
            ${isSelected ? 'bg-purple-500 text-white border-2 border-purple-300 transform scale-105' :
              'bg-gray-700 text-white hover:bg-gray-600'}
            ${cardOpacityClass}`}
        >
          <div className="flex items-center">
            <div
              className="w-6 h-6 rounded-full border-2 border-white mr-3 cursor-pointer"
              style={{ backgroundColor: character.color }}
              onClick={handleColorCircleClick}
              title="Change color"
            ></div>
            <span className={`font-semibold text-lg truncate ${nameLineThroughClass}`}>
              {character.isCustom && <span className="text-purple-300 mr-2">◇</span>}
              {character.species && <span className="text-sm text-gray-300 mr-1">({character.species})</span>}
              {character.name}
              {isRedSkull && (
                <Skull color="red" className="inline-block ml-2 w-5 h-5" title="Dead / Incapacitated" />
              )}
              {isWhiteSkull && deathSavesEnabled && (
                <Skull color="white" className="inline-block ml-2 w-5 h-5" title={`Dying: Successes: ${character.deathSuccesses} / Failures: ${character.deathFailures} (Rolls Left: ${character.deathSaveOpportunities !== null ? character.deathSaveOpportunities : 'N/A'})`} />
              )}
            </span>
          </div>
          <div className="flex items-center ml-auto">
            <span className="text-xl font-bold mr-3">{character.initiative}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (!(character.isDying || character.status === 'dead')) {
                  onUpdateActionCheckbox(character.id, 'turnCompleted', !character.turnCompleted);
                }
              }}
              className={`ml-3 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0
                ${character.turnCompleted ? turnCompletedColorClass : 'border-2 border-gray-400 text-transparent'}`}
              title={character.turnCompleted ? "Turn Completed" : "Mark Turn Completed"}
            >
              {character.turnCompleted && <Check className="w-5 h-5" />}
            </div>
            {isWhiteSkull && !character.hasMadeDeathSaveThisRound && deathSavesEnabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRollDeathSave(character.id);
                }}
                className="ml-3 py-1.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-semibold whitespace-nowrap"
                title="Roll Death Saving Throw (1 per turn)"
              >
                Roll Death Save
              </button>
            )}
          </div>
        </div>

        {showColorPicker && (
          <ColorPickerWheel
            currentColor={character.color}
            allColors={allColors}
            onSelect={handleColorSelected}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
      {isSelected && (
        <CombatantDetails
          character={character}
          onUpdateHp={onUpdateHp}
          onToggleRemovedFromCombat={onToggleRemovedFromCombat}
          onUpdateStatus={onUpdateStatus}
          onUpdateActionCheckbox={onUpdateActionCheckbox}
          onUpdateCurrentMovement={onUpdateCurrentMovement}
          onUpdateActions={onUpdateActions}
          addLogEntry={addLogEntry}
          onUpdateCharacterName={onUpdateCharacterName}
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
          onUpdateAbilityRoll={onUpdateAbilityRoll}
          onRollDeathSave={onRollDeathSave}
          deathSavesEnabled={deathSavesEnabled}
          onActivateTrait={onActivateTrait}
          STATUS_EFFECTS={STATUS_EFFECTS}
          // Pass shared components/utilities to CombatantDetails
          NumberScroller={NumberScroller}
          rollDiceDetailed={rollDiceDetailed}
          getDieTypeMax={getDieTypeMax}
          parseDiceNotation={parseDiceNotation}
          Skull={Skull}
          Heart={Heart}
          ShieldCheck={ShieldCheck}
          Footprints={Footprints}
          Bolt={Bolt}
          Dice={Dice}
          Plus={Plus}
          Minus={Minus}
          Lock={Lock}
          LockOpen={LockOpen}
          Scroll={Scroll}
          Trash2={Trash2}
        />
      )}
    </div>
  );
};


const InitiativeOrder = ({
  characters, sortedCharactersForInitiative, round, setDeathSavesEnabled, deathSavesEnabled,
  handleNextRound, handleRerollAllInitiatives, handleSelectCombatant, openCombatantIds,
  updateCharacterColor, COLORS, updateCharacterHp, toggleRemovedFromCombat, updateCharacterStatus,
  updateActionCheckbox, updateCurrentMovement, updateCharacterActions, addLogEntry, updateCharacterName,
  newCustomWeaponName, setNewCustomWeaponName, newCustomWeaponNumDice, setNewCustomWeaponNumDice,
  newCustomWeaponDieType, setNewCustomWeaponDieType, newCustomWeaponModifier, setNewCustomWeaponModifier,
  selectedDamageTypeForNewWeapon, setSelectedDamageTypeForNewWeapon, customDamageTypeName, setCustomDamageTypeName,
  newCustomWeaponToHitModifier, setNewCustomWeaponToHitModifier, onTogglePanelLock, updateAbilityRoll,
  handleRollDeathSave, handleActivateTrait, STATUS_EFFECTS,
  // Shared Components/Utilities
  MiniCharacterCard, ColorPickerWheel, NumberScroller, parseDiceNotation, rollDiceDetailed, getDieTypeMax,
  Skull, Check, Dice, Plus, Minus, Heart, ShieldCheck, Footprints, Bolt, Sword, Lock, LockOpen, Scroll, Trash2
}) => {

  return (
    <div className="p-2 bg-gray-700 rounded-xl shadow-inner border border-gray-600 flex flex-col space-y-3">
      {characters.length > 0 && (
        <button
          onClick={handleNextRound}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105 mb-4"
        >
          <Check className="w-5 h-5" />
          <span>Next Round</span>
        </button>
      )}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setDeathSavesEnabled(!deathSavesEnabled)}
          className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2
            ${deathSavesEnabled ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          title={deathSavesEnabled ? "Death Saves are ENABLED" : "Death Saves are DISABLED (0 HP = instant death)"}
        >
          {deathSavesEnabled ? <Check className="w-5 h-5" /> : <Skull className="w-5 h-5" />}
          <span>{deathSavesEnabled ? 'Death Saves: ON' : 'Death Saves: OFF'}</span>
        </button>
        <button
          onClick={handleRerollAllInitiatives}
          className="py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold transition-colors duration-200 flex items-center space-x-2"
          title="Reroll Initiative for all active combatants"
        >
          <Dice className="w-5 h-5" />
          <span>Reroll All Init</span>
        </button>

        <div className="text-xl font-bold text-gray-200">
          Round: {round}
        </div>
      </div>

      <div className="space-y-3">
        {sortedCharactersForInitiative.length === 0 ? (
          <p className="text-center text-gray-400 text-xl py-8">No combatants yet! Add some to start tracking.</p>
        ) : (
          sortedCharactersForInitiative.map(char => (
            <MiniCharacterCard
              key={char.id}
              character={char}
              onSelectCharacter={handleSelectCombatant}
              isSelected={openCombatantIds.has(char.id)}
              onUpdateColor={updateCharacterColor}
              allColors={COLORS}
              onUpdateHp={updateCharacterHp}
              onToggleRemovedFromCombat={toggleRemovedFromCombat}
              onUpdateStatus={updateCharacterStatus}
              onUpdateActionCheckbox={updateActionCheckbox}
              onUpdateCurrentMovement={updateCurrentMovement}
              onUpdateActions={updateCharacterActions}
              addLogEntry={addLogEntry}
              onUpdateCharacterName={updateCharacterName}
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
              onUpdateAbilityRoll={updateAbilityRoll}
              onRollDeathSave={handleRollDeathSave}
              deathSavesEnabled={deathSavesEnabled}
              onActivateTrait={handleActivateTrait}
              STATUS_EFFECTS={STATUS_EFFECTS}
              // Pass shared components/utilities to MiniCharacterCard
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
          ))
        )}
      </div>
    </div>
  );
};

export default InitiativeOrder;
