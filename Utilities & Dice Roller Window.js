import React, { useState, useEffect, useRef, useMemo } from 'react';

// Import icons and utilities from App.js (assuming they are passed as props or globally available)

const SimpleDiceRoller = ({ rollDiceDetailed, Dice, NumberScroller }) => {
  const [numDice, setNumDice] = useState(1);
  const [dieType, setDieType] = useState('d20');
  const [modifier, setModifier] = useState(0);
  const [rollResult, setRollResult] = useState(null);
  const [lastRollDetails, setLastRollDetails] = useState('');

  const handleRoll = () => {
    const diceNotation = `${numDice}${dieType}${modifier >= 0 ? '+' : ''}${modifier}`;
    const result = rollDiceDetailed(diceNotation);
    setRollResult(result.total);
    setLastRollDetails(`(${result.rolls.join(' + ')}${result.modifier !== 0 ? (result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`) : ''})`);
  };

  return (
    <div className="p-4 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
      <h3 className="text-lg font-bold text-center mb-4 text-gray-200 flex items-center justify-center space-x-2">
        <Dice className="w-5 h-5 text-purple-400" />
        <span>Simple Dice Roller</span>
      </h3>
      <div className="flex items-center justify-center space-x-2 mb-4">
        <input
          type="number"
          min="1" max="100"
          value={numDice}
          onChange={(e) => setNumDice(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-16 p-2 rounded-lg text-center bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <span className="text-lg font-bold text-gray-300">D</span>
        <select
          value={dieType}
          onChange={(e) => setDieType(e.target.value)}
          className="p-2 rounded-lg bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex-grow"
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
          value={modifier.toString()}
          onChange={(val) => setModifier(parseInt(val) || 0)}
          min={-20} max={20}
          isDefaultValueDisplay={true}
          inputWidthClass="w-14" buttonPaddingClass="p-0.5" iconSizeClass="w-3 h-3"
        />
      </div>
      <button
        onClick={handleRoll}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-300 flex items-center justify-center space-x-2"
      >
        <Dice className="w-5 h-5" />
        <span>Roll Dice</span>
      </button>
      {rollResult !== null && (
        <div className="mt-4 text-center text-xl font-bold text-green-400">
          Result: {rollResult} <span className="text-sm text-gray-400">{lastRollDetails}</span>
        </div>
      )}
    </div>
  );
};


const UtilitiesDiceRoller = ({
  logEntries, showLog, setShowLog, logRef, characters,
  groupedLootPool, totalXpPool, showLootPool, setShowLootPool,
  // Shared Components/Utilities
  SimpleDiceRoller, rollDiceDetailed, Dice, NumberScroller, Gem, ScrollText, STATUS_EFFECTS
}) => {

  // Scroll log to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logEntries]);

  return (
    <div className="p-2 bg-gray-700 rounded-xl shadow-inner border border-gray-600 space-y-8">
      <div className="mt-8">
        <button
          onClick={() => setShowLootPool(!showLootPool)}
          className="w-full py-3 px-6 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
        >
          <Gem className="w-5 h-5" />
          <span>{showLootPool ? 'Hide Loot/XP Pool' : 'Show Loot/XP Pool'}</span>
        </button>

        {showLootPool && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg shadow-inner border border-gray-700 max-h-60 overflow-y-auto text-sm text-gray-300">
            <div className="font-bold text-lg text-yellow-300 mb-2">Total XP: {totalXpPool}</div>
            {groupedLootPool.length === 0 ? (
              <p className="text-center text-gray-500">Loot pool is empty.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {groupedLootPool.map((item, index) => (
                  <li key={`${item.name}-${item.unit || ''}-${item.isCustom || false}-${index}`}>
                    {item.isCustom && <span className="text-purple-300 mr-2">◇</span>}
                    {item.name}
                    {item.quantity && item.quantity > 1 && ` (${item.quantity})`}
                    {item.unit && ` ${item.unit}`}
                    {item.value && ` (Value: ${item.value})`}
                    {item.damage && ` (Damage: ${item.damage})`}
                    {item.ac && ` (AC: ${item.ac})`}
                    {item.effect && ` (Effect: ${item.effect})`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
        >
          <ScrollText className="w-5 h-5" />
          <span>{showLog ? 'Hide Combat Log' : 'Show Combat Log'}</span>
        </button>

        {showLog && (
          <div ref={logRef} className="mt-4 p-4 bg-gray-900 rounded-lg shadow-inner border border-gray-700 h-60 overflow-y-auto text-sm text-gray-300">
            {logEntries.length === 0 ? (
              <p className="text-center text-gray-500">Log is empty.</p>
            ) : (
              logEntries.map((entry, index) => {
                const character = entry.characterId ? characters.find(c => c.id === entry.characterId) : null;
                const characterName = character ? character.name : '';
                const characterColor = character ? character.color : 'inherit';

                let valueColorClass = 'text-gray-300';
                if (entry.type === 'to_hit' || entry.type === 'skill' || entry.type === 'initiative_set') {
                  valueColorClass = 'text-blue-400';
                } else if (entry.type === 'damage' || (entry.type === 'hp_change' && entry.hpChangeType === 'damage')) {
                  valueColorClass = 'text-red-400';
                } else if (entry.type === 'hp_change' && entry.hpChangeType === 'heal') {
                  valueColorClass = 'text-green-400';
                } else if (entry.type === 'death_save') {
                  valueColorClass = entry.details.includes('Success') ? 'text-green-400' : 'text-red-400';
                }

                return (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                    {characterName ? (
                      <span style={{ color: characterColor }} className="font-semibold">{characterName}</span>
                    ) : null}
                    {' '}
                    {entry.message}{' '}
                    {entry.value !== undefined && (
                      <span className={`${valueColorClass} font-bold`}>{entry.value}</span>
                    )}
                    {entry.details && (
                      <span className="text-gray-400 ml-1">{entry.details}</span>
                    )}
                    {entry.isCrit && (
                      <span className="text-yellow-300 ml-1 font-bold">(CRITICAL!)</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <SimpleDiceRoller
        rollDiceDetailed={rollDiceDetailed}
        Dice={Dice}
        NumberScroller={NumberScroller}
      />
    </div>
  );
};

export default UtilitiesDiceRoller;
