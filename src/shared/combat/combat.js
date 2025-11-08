/**
 * Pure combat logic module
 * All functions are deterministic and side-effect free
 * @module shared/combat/combat
 */

const RNG = typeof require !== 'undefined' ? require('./rng.js') : window.RNG;
const Battlefield = typeof require !== 'undefined' ? require('./battlefield.js') : window.Battlefield;
const Deck = typeof require !== 'undefined' ? require('./deck.js') : window.Deck;

/**
 * Create initial match state
 * @param {Object} config - Game configuration
 * @param {number} seed - Random seed
 * @param {Object} player1 - Player 1 data (class, talents)
 * @param {Object} player2 - Player 2 data (class, talents)
 * @returns {Object} Initial state
 */
function createMatch(config, seed, player1, player2) {
    const rng = new RNG(seed);
    const battlefield = new Battlefield(config.battlefield.width, config.battlefield.height);

    // Determine starting side (random)
    const startingSide = rng.chance(0.5) ? 'player1' : 'player2';

    const state = {
        version: '1.0.0',
        matchId: null,
        seed,
        turn: 0,
        phase: 'PICK', // PICK, READY, TURN, RESULT
        currentSide: startingSide,
        turnTimer: config.server?.turnTimeout || 60000,
        turnsWithoutDamage: 0,
        
        battlefield: battlefield,
        rng: rng,

        player1: createPlayerState(player1, config),
        player2: createPlayerState(player2, config),

        effects: [], // Global effects (field effects, etc.)
        
        result: null // {winner: 'player1'|'player2'|'draw', reason: '...'}
    };

    return state;
}

/**
 * Create player state object
 * @param {Object} playerData - Player data
 * @param {Object} config - Game config
 * @returns {Object} Player state
 */
function createPlayerState(playerData, config) {
    const classData = playerData.classData;
    
    return {
        id: playerData.id,
        name: playerData.name || 'Player',
        classId: playerData.classId,
        side: playerData.side,
        
        hp: classData.stats.maxHp,
        maxHp: classData.stats.maxHp,
        mana: classData.stats.maxMana,
        maxMana: classData.stats.maxMana,
        
        position: null, // {x, y} when placed on battlefield
        
        deck: null, // Will be initialized with cards
        
        buffs: [],
        debuffs: [],
        
        cooldowns: {}, // {abilityId: turnsRemaining}
        
        talents: playerData.talents || [],
        modifiers: {
            damageMultiplier: 1.0,
            healMultiplier: 1.0,
            shieldBonus: 0
        },
        
        isAlive: true,
        isStunned: false,
        isFrozen: false
    };
}

/**
 * Apply an action to the state
 * @param {Object} state - Current state
 * @param {Object} action - Action to apply
 * @returns {Object} New state
 */
function applyAction(state, action) {
    // Create deep copy of state
    const newState = JSON.parse(JSON.stringify(state));
    
    // Restore non-serializable objects
    newState.battlefield = Object.assign(
        new Battlefield(state.battlefield.width, state.battlefield.height),
        state.battlefield
    );
    newState.rng = new RNG(state.rng.state);
    newState.rng.setState(state.rng.getState());

    switch (action.type) {
        case 'PLACE_HERO':
            return applyPlaceHero(newState, action);
        case 'PLAY_CARD':
            return applyPlayCard(newState, action);
        case 'END_TURN':
            return applyEndTurn(newState, action);
        case 'SURRENDER':
            return applySurrender(newState, action);
        default:
            console.warn('Unknown action type:', action.type);
            return newState;
    }
}

/**
 * Place hero on battlefield
 * @param {Object} state - Current state
 * @param {Object} action - Action {side, x, y}
 * @returns {Object} New state
 */
function applyPlaceHero(state, action) {
    const player = state[action.side];
    
    if (!state.battlefield.place(player, action.x, action.y)) {
        throw new Error('Invalid placement position');
    }
    
    player.position = { x: action.x, y: action.y };
    return state;
}

/**
 * Play a card
 * @param {Object} state - Current state
 * @param {Object} action - Action {side, cardId, targets}
 * @returns {Object} New state
 */
function applyPlayCard(state, action) {
    const player = state[action.side];
    const opponent = action.side === 'player1' ? state.player2 : state.player1;
    
    // Validate card is in hand
    if (!player.deck || !player.deck.hasCard(action.cardId)) {
        throw new Error('Card not in hand');
    }
    
    const card = player.deck.getCardInHand(action.cardId);
    
    // Check mana cost
    if (player.mana < card.cost) {
        throw new Error('Insufficient mana');
    }
    
    // Check cooldown
    if (player.cooldowns[action.cardId] && player.cooldowns[action.cardId] > 0) {
        throw new Error('Ability on cooldown');
    }
    
    // Deduct mana
    player.mana -= card.cost;
    
    // Apply card effects
    for (const effect of card.effects) {
        applyEffect(state, player, opponent, effect, action.targets);
    }
    
    // Set cooldown
    if (card.cooldown) {
        player.cooldowns[action.cardId] = card.cooldown;
    }
    
    // Move card to discard
    const playedCard = player.deck.playCard(action.cardId);
    if (card.exhaust) {
        player.deck.exhaust(playedCard);
    } else {
        player.deck.discard(playedCard);
    }
    
    return state;
}

/**
 * Apply a single effect
 * @param {Object} state - Current state
 * @param {Object} caster - Caster player
 * @param {Object} target - Target player
 * @param {Object} effect - Effect definition
 * @param {Array} targets - Target coordinates
 */
function applyEffect(state, caster, target, effect, targets) {
    switch (effect.type) {
        case 'damage':
            applyDamage(state, target, effect.amount * caster.modifiers.damageMultiplier, caster);
            break;
        case 'heal':
            applyHeal(target, effect.amount * caster.modifiers.healMultiplier);
            break;
        case 'shield':
            applyShield(target, effect.amount + caster.modifiers.shieldBonus, effect.duration);
            break;
        case 'manaShield':
            applyManaShield(target, effect.duration);
            break;
        case 'stun':
            applyStun(target, effect.duration);
            break;
        case 'freeze':
            applyFreeze(target, effect.duration);
            break;
        case 'dot':
            applyDoT(target, effect.damagePerTick, effect.duration);
            break;
        default:
            console.warn('Unknown effect type:', effect.type);
    }
}

/**
 * Apply damage to target
 * @param {Object} state - Current state
 * @param {Object} target - Target player
 * @param {number} amount - Damage amount
 * @param {Object} caster - Caster (for crit calculation)
 */
function applyDamage(state, target, amount, caster) {
    let finalDamage = amount;
    
    // Check for critical hit
    if (state.rng.chance(0.25)) {
        finalDamage *= 1.5;
    }
    
    // Apply shields
    const shieldBuff = target.buffs.find(b => b.type === 'shield');
    if (shieldBuff) {
        const absorbed = Math.min(shieldBuff.absorbAmount, finalDamage);
        shieldBuff.absorbAmount -= absorbed;
        finalDamage -= absorbed;
        
        if (shieldBuff.absorbAmount <= 0) {
            target.buffs = target.buffs.filter(b => b !== shieldBuff);
        }
    }
    
    // Apply mana shield
    const manaShieldBuff = target.buffs.find(b => b.type === 'manaShield');
    if (manaShieldBuff && target.mana > 0) {
        const absorbed = Math.min(target.mana, finalDamage);
        target.mana -= absorbed;
        finalDamage -= absorbed;
    }
    
    // Apply remaining damage to HP
    target.hp = Math.max(0, target.hp - finalDamage);
    
    if (target.hp === 0) {
        target.isAlive = false;
    }
    
    // Reset stalemate counter
    if (finalDamage > 0) {
        state.turnsWithoutDamage = 0;
    }
}

/**
 * Apply healing
 * @param {Object} target - Target player
 * @param {number} amount - Heal amount
 */
function applyHeal(target, amount) {
    const actualHeal = Math.min(amount, target.maxHp - target.hp);
    target.hp = Math.min(target.maxHp, target.hp + amount);
    return actualHeal;
}

/**
 * Apply shield buff
 * @param {Object} target - Target player
 * @param {number} amount - Shield amount
 * @param {number} duration - Duration in turns
 */
function applyShield(target, amount, duration) {
    target.buffs.push({
        type: 'shield',
        absorbAmount: amount,
        duration: duration,
        name: 'Shield'
    });
}

/**
 * Apply mana shield buff
 * @param {Object} target - Target player
 * @param {number} duration - Duration in turns
 */
function applyManaShield(target, duration) {
    target.buffs.push({
        type: 'manaShield',
        duration: duration,
        name: 'Mana Shield'
    });
}

/**
 * Apply stun debuff
 * @param {Object} target - Target player
 * @param {number} duration - Duration in turns
 */
function applyStun(target, duration) {
    target.debuffs.push({
        type: 'stun',
        duration: duration,
        name: 'Stunned'
    });
    target.isStunned = true;
}

/**
 * Apply freeze debuff
 * @param {Object} target - Target player
 * @param {number} duration - Duration in turns
 */
function applyFreeze(target, duration) {
    target.debuffs.push({
        type: 'freeze',
        duration: duration,
        name: 'Frozen'
    });
    target.isFrozen = true;
}

/**
 * Apply damage over time debuff
 * @param {Object} target - Target player
 * @param {number} damagePerTick - Damage per turn
 * @param {number} duration - Duration in turns
 */
function applyDoT(target, damagePerTick, duration) {
    target.debuffs.push({
        type: 'dot',
        damagePerTick: damagePerTick,
        duration: duration,
        name: 'Damage over Time'
    });
}

/**
 * End current turn
 * @param {Object} state - Current state
 * @param {Object} action - Action {side}
 * @returns {Object} New state
 */
function applyEndTurn(state, action) {
    const player = state[action.side];
    
    // Update buffs/debuffs
    updateBuffsAndDebuffs(player);
    
    // Reduce cooldowns
    for (const abilityId in player.cooldowns) {
        if (player.cooldowns[abilityId] > 0) {
            player.cooldowns[abilityId]--;
        }
    }
    
    // Regenerate mana
    player.mana = Math.min(player.maxMana, player.mana + 10);
    
    // Switch sides
    state.currentSide = state.currentSide === 'player1' ? 'player2' : 'player1';
    state.turn++;
    state.turnsWithoutDamage++;
    
    // Check for game over
    checkGameOver(state);
    
    return state;
}

/**
 * Update buffs and debuffs, apply DoT
 * @param {Object} player - Player state
 */
function updateBuffsAndDebuffs(player) {
    // Process debuffs
    player.debuffs = player.debuffs.filter(debuff => {
        if (debuff.type === 'dot') {
            player.hp = Math.max(0, player.hp - debuff.damagePerTick);
            if (player.hp === 0) {
                player.isAlive = false;
            }
        }
        
        debuff.duration--;
        return debuff.duration > 0;
    });
    
    // Update control flags
    player.isStunned = player.debuffs.some(d => d.type === 'stun');
    player.isFrozen = player.debuffs.some(d => d.type === 'freeze');
    
    // Process buffs
    player.buffs = player.buffs.filter(buff => {
        buff.duration--;
        return buff.duration > 0;
    });
}

/**
 * Apply surrender
 * @param {Object} state - Current state
 * @param {Object} action - Action {side}
 * @returns {Object} New state
 */
function applySurrender(state, action) {
    const winner = action.side === 'player1' ? 'player2' : 'player1';
    state.result = {
        winner,
        reason: 'surrender'
    };
    state.phase = 'RESULT';
    return state;
}

/**
 * Check if game is over
 * @param {Object} state - Current state
 */
function checkGameOver(state) {
    if (!state.player1.isAlive) {
        state.result = { winner: 'player2', reason: 'death' };
        state.phase = 'RESULT';
    } else if (!state.player2.isAlive) {
        state.result = { winner: 'player1', reason: 'death' };
        state.phase = 'RESULT';
    } else if (state.turnsWithoutDamage >= 10) {
        state.result = { winner: 'draw', reason: 'stalemate' };
        state.phase = 'RESULT';
    }
}

/**
 * Get legal actions for a side
 * @param {Object} state - Current state
 * @param {string} side - 'player1' or 'player2'
 * @returns {Array} Array of legal actions
 */
function legalActions(state, side) {
    if (state.phase === 'RESULT') {
        return [];
    }
    
    if (state.currentSide !== side) {
        return [];
    }
    
    const player = state[side];
    const actions = [];
    
    // Can always surrender
    actions.push({ type: 'SURRENDER', side });
    
    // Can always end turn
    actions.push({ type: 'END_TURN', side });
    
    // If stunned or frozen, can't play cards
    if (player.isStunned || player.isFrozen) {
        return actions;
    }
    
    // Check playable cards
    if (player.deck && player.deck.hand) {
        for (const card of player.deck.hand) {
            // Check mana
            if (player.mana < card.cost) continue;
            
            // Check cooldown
            if (player.cooldowns[card.id] && player.cooldowns[card.id] > 0) continue;
            
            // Add play card action (simplified - would need target validation)
            actions.push({
                type: 'PLAY_CARD',
                side,
                cardId: card.id
            });
        }
    }
    
    return actions;
}

/**
 * Check if state is terminal (game over)
 * @param {Object} state - Current state
 * @returns {Object|null} Result object or null
 */
function isTerminal(state) {
    return state.result;
}

// Export
const Combat = {
    createMatch,
    applyAction,
    legalActions,
    isTerminal
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Combat;
} else if (typeof window !== 'undefined') {
    window.Combat = Combat;
}
