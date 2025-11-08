// WoW Pixel Duels - Game Engine
(function() {
    'use strict';

    // Game Configuration Constants
    const CONFIG = {
        // Combat
        CRIT_CHANCE: 0.25,
        CRIT_MULTIPLIER: 1.5,
        MANA_REGEN_PER_TURN: 10,

        // Shield absorb amounts
        WARRIOR_SHIELD_ABSORB: 300,
        PRIEST_SHIELD_ABSORB: 500,

        // DoT
        DOT_DAMAGE_PER_TICK: 50,
        DOT_DURATION: 4,

        // Stun/Freeze durations
        STUN_DURATION: 1,
        FREEZE_DURATION: 2,

        // Stalemate detection
        MAX_TURNS_WITHOUT_DAMAGE: 10,

        // UI
        COMBAT_LOG_MAX_ENTRIES: 50,

        // Timing (ms)
        TURN_DELAY: 1000,
        END_BATTLE_DELAY: 2000,
        ATTACK_ANIMATION_DURATION: 300,
        DAMAGE_NUMBER_DURATION: 1000,
        PARTICLE_DURATION: 1000
    };

    const CLASS_LIBRARY = {
        warrior: {
            displayName: 'Воин',
            stats: {
                maxHp: 1500,
                maxMana: 100
            },
            abilities: [
                {
                    id: 'execute',
                    name: 'Казнь',
                    icon: '⚔️',
                    damage: 250,
                    manaCost: 30,
                    maxCooldown: 5,
                    hotkey: '1',
                    description: 'Мощный удар'
                },
                {
                    id: 'shield_block',
                    name: 'Блок щитом',
                    icon: '🛡️',
                    manaCost: 20,
                    maxCooldown: 8,
                    hotkey: '2',
                    type: 'buff',
                    buffType: 'shield',
                    duration: 5,
                    description: 'Поглощает 300 урона'
                },
                {
                    id: 'whirlwind',
                    name: 'Вихрь',
                    icon: '🌪️',
                    damage: 150,
                    manaCost: 25,
                    maxCooldown: 6,
                    hotkey: '3',
                    description: 'Вихрь клинков'
                },
                {
                    id: 'charge',
                    name: 'Рывок',
                    icon: '💨',
                    damage: 100,
                    manaCost: 15,
                    maxCooldown: 3,
                    hotkey: '4',
                    stun: true,
                    description: 'Оглушает на 1 ход'
                }
            ]
        },
        mage: {
            displayName: 'Маг',
            stats: {
                maxHp: 800,
                maxMana: 150
            },
            abilities: [
                {
                    id: 'fireball',
                    name: 'Огненный шар',
                    icon: '🔥',
                    damage: 300,
                    manaCost: 40,
                    maxCooldown: 4,
                    hotkey: '1',
                    description: 'Мощное заклинание огня'
                },
                {
                    id: 'frost_nova',
                    name: 'Ледяная глыба',
                    icon: '❄️',
                    damage: 150,
                    manaCost: 30,
                    maxCooldown: 7,
                    hotkey: '2',
                    freeze: true,
                    description: 'Замораживает на 2 хода'
                },
                {
                    id: 'arcane_blast',
                    name: 'Чародейская вспышка',
                    icon: '✨',
                    damage: 200,
                    manaCost: 25,
                    maxCooldown: 2,
                    hotkey: '3',
                    description: 'Быстрое заклинание'
                },
                {
                    id: 'mana_shield',
                    name: 'Мана-щит',
                    icon: '🔮',
                    manaCost: 35,
                    maxCooldown: 10,
                    hotkey: '4',
                    type: 'buff',
                    buffType: 'manaShield',
                    duration: 6,
                    description: 'Мана поглощает урон'
                }
            ]
        },
        priest: {
            displayName: 'Жрец',
            stats: {
                maxHp: 1000,
                maxMana: 120
            },
            abilities: [
                {
                    id: 'smite',
                    name: 'Кара',
                    icon: '⚡',
                    damage: 180,
                    manaCost: 20,
                    maxCooldown: 3,
                    hotkey: '1',
                    description: 'Святой урон'
                },
                {
                    id: 'heal',
                    name: 'Исцеление',
                    icon: '💚',
                    heal: 400,
                    manaCost: 35,
                    maxCooldown: 5,
                    hotkey: '2',
                    description: 'Восстанавливает здоровье'
                },
                {
                    id: 'holy_fire',
                    name: 'Священный огонь',
                    icon: '🔆',
                    damage: 220,
                    manaCost: 30,
                    maxCooldown: 6,
                    hotkey: '3',
                    dot: true,
                    description: 'Урон со временем'
                },
                {
                    id: 'power_word_shield',
                    name: 'Слово силы: Щит',
                    icon: '✝️',
                    manaCost: 25,
                    maxCooldown: 8,
                    hotkey: '4',
                    type: 'buff',
                    buffType: 'holyShield',
                    duration: 8,
                    description: 'Поглощает 500 урона'
                }
            ]
        }
    };

    function cloneAbilityTemplate(template) {
        const ability = JSON.parse(JSON.stringify(template));
        ability.cooldown = 0;
        return ability;
    }

    function getClassDefinition(classId) {
        return CLASS_LIBRARY[classId] || null;
    }

    /**
     * Represents a character in the game (player or enemy)
     * @class Character
     */
    class Character {
        /**
         * Create a character
         * @param {string} name - Character display name
         * @param {string} className - Character class ('warrior', 'mage', 'priest')
         * @param {boolean} [isPlayer=false] - Whether this is the player character
         * @param {Game} [game=null] - Reference to the game instance
         */
        constructor(name, className, isPlayer = false, game = null) {
            this.name = name;
            this.className = className;
            this.isPlayer = isPlayer;
            this.game = game;
            this.maxHp = 1000;
            this.hp = 1000;
            this.maxMana = 100;
            this.mana = 100;
            this.abilities = [];
            this.buffs = [];
            this.debuffs = [];
            this.isAlive = true;

            this.initializeClass();
        }

        /**
         * Initialize character stats and abilities based on class
         * @private
         */
        initializeClass() {
            const definition = getClassDefinition(this.className);
            if (!definition) {
                console.warn(`Неизвестный класс: ${this.className}. Используются значения по умолчанию.`);
                return;
            }

            const { stats, abilities } = definition;
            if (stats) {
                if (typeof stats.maxHp === 'number') {
                    this.maxHp = stats.maxHp;
                    this.hp = stats.maxHp;
                }
                if (typeof stats.maxMana === 'number') {
                    this.maxMana = stats.maxMana;
                    this.mana = stats.maxMana;
                }
            }

            this.abilities = Array.isArray(abilities)
                ? abilities.map(cloneAbilityTemplate)
                : [];
        }

    /**
     * Safely call a method on the attached game instance if it exists
     * @param {string} methodName - Name of the game method to invoke
     * @param {...any} args - Arguments to pass to the method
     */
    callGameMethod(methodName, ...args) {
        if (!this.game || typeof methodName !== 'string') {
            return;
        }

        const method = this.game[methodName];
        if (typeof method === 'function') {
            method.apply(this.game, args);
        }
    }

    /**
     * Apply damage to character, accounting for shields
     * @param {number} damage - Amount of damage to apply
     * @param {boolean} [isCrit=false] - Whether this is a critical hit
     * @returns {number} Actual damage dealt after shield absorption
     */
    takeDamage(damage, isCrit = false) {
        // Input validation
        if (typeof damage !== 'number' || isNaN(damage) || damage < 0) {
            console.error('Invalid damage value:', damage);
            return 0;
        }

        // Check for shields
        let remainingDamage = damage;

        // Check shield buffs
        const shieldBuff = this.buffs.find(b => b.type === 'shield' || b.type === 'holyShield');
        if (shieldBuff) {
            if (shieldBuff.absorbAmount >= remainingDamage) {
                shieldBuff.absorbAmount -= remainingDamage;
                if (this.game) {
                    this.game.addLog(`${this.name} поглотил ${remainingDamage} урона щитом!`, 'buff');
                }
                if (shieldBuff.absorbAmount <= 0) {
                    this.removeBuff(shieldBuff);
                }
                return 0;
            } else {
                remainingDamage -= shieldBuff.absorbAmount;
                this.callGameMethod('addLog', `Щит ${this.name} разрушен!`, 'damage');
                this.removeBuff(shieldBuff);
            }
        }

        // Check mana shield
        const manaShieldBuff = this.buffs.find(b => b.type === 'manaShield');
        if (manaShieldBuff && this.mana > 0) {
            const manaToUse = Math.min(remainingDamage, this.mana);
            this.mana -= manaToUse;
            remainingDamage -= manaToUse;
            this.callGameMethod('addLog', `${this.name} поглотил ${manaToUse} урона маной!`, 'buff');
            if (remainingDamage <= 0) return 0;
        }

        this.hp = Math.max(0, this.hp - remainingDamage);

        if (this.hp === 0) {
            this.isAlive = false;
        }

        return remainingDamage;
    }

    /**
     * Heal character, capped at maximum HP
     * @param {number} amount - Amount of HP to restore
     * @returns {number} Actual amount healed (cannot exceed missing HP)
     */
    heal(amount) {
        // Input validation
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            console.error('Invalid heal amount:', amount);
            return 0;
        }

        const actualHeal = Math.min(amount, this.maxHp - this.hp);
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return actualHeal;
    }

    /**
     * Add a buff (positive effect) to character
     * @param {Object} buff - Buff object with name, type, duration, icon
     */
    addBuff(buff) {
        if (!buff || typeof buff !== 'object') {
            console.error('Invalid buff:', buff);
            return;
        }
        this.buffs.push(buff);
        this.callGameMethod('updateBuffs', this);
    }

    /**
     * Remove a buff from character
     * @param {Object} buff - Buff object to remove
     */
    removeBuff(buff) {
        if (!buff) {
            console.error('Invalid buff to remove:', buff);
            return;
        }
        const index = this.buffs.indexOf(buff);
        if (index > -1) {
            this.buffs.splice(index, 1);
            this.callGameMethod('updateBuffs', this);
        }
    }

    /**
     * Add a debuff (negative effect) to character
     * @param {Object} debuff - Debuff object with name, type, duration, icon
     */
    addDebuff(debuff) {
        if (!debuff || typeof debuff !== 'object') {
            console.error('Invalid debuff:', debuff);
            return;
        }
        this.debuffs.push(debuff);
        this.callGameMethod('updateBuffs', this);
    }

    /**
     * Update buff/debuff durations and apply DoT effects
     * Removes expired buffs and debuffs
     */
    updateBuffsAndDebuffs() {
        // Update buffs
        this.buffs = this.buffs.filter(buff => {
            buff.duration--;
            if (buff.duration <= 0) {
                this.callGameMethod('addLog', `${buff.name} на ${this.name} закончился`, 'buff');
                return false;
            }
            return true;
        });

        // Update debuffs (DoTs)
        this.debuffs = this.debuffs.filter(debuff => {
            if (debuff.type === 'dot') {
                this.takeDamage(debuff.damagePerTick);
                this.callGameMethod('addLog', `${this.name} получает ${debuff.damagePerTick} урона от ${debuff.name}`, 'damage');
                this.callGameMethod('showDamageNumber', this, debuff.damagePerTick, false);
            }

            debuff.duration--;
            if (debuff.duration <= 0) {
                return false;
            }
            return true;
        });

        this.callGameMethod('updateBuffs', this);
    }

    /**
     * Check if character is stunned
     * @returns {boolean} True if character has a stun debuff
     */
    isStunned() {
        return this.debuffs.some(d => d.type === 'stun');
    }

    /**
     * Check if character is frozen
     * @returns {boolean} True if character has a freeze debuff
     */
    isFrozen() {
        return this.debuffs.some(d => d.type === 'freeze');
    }

    /**
     * Check if character can perform actions
     * @returns {boolean} True if character is alive and not stunned/frozen
     */
    canAct() {
        return this.isAlive && !this.isStunned() && !this.isFrozen();
    }

    /**
     * Regenerate mana at the start of turn
     */
    regenerateMana() {
        this.mana = Math.min(this.maxMana, this.mana + CONFIG.MANA_REGEN_PER_TURN);
    }
}

/**
 * Main game controller class
 * @class Game
 */
class Game {
    /**
     * Create game instance and initialize event listeners
     */
    constructor() {
        this.player = null;
        this.enemy = null;
        this.currentScreen = 'title';
        this.turnTimer = null;
        this.combatLogMaxEntries = CONFIG.COMBAT_LOG_MAX_ENTRIES;
        this.isPaused = false;

        // Stalemate detection
        this.turnsWithoutDamage = 0;
        this.maxTurnsWithoutDamage = CONFIG.MAX_TURNS_WITHOUT_DAMAGE;
        this.lastPlayerHp = 0;
        this.lastEnemyHp = 0;

        this.init();
    }

    init() {
        this.setupClassSelection();
        this.setupKeyboardControls();
        this.setupRestartButton();
        this.setupPauseMenu();
    }

    setupClassSelection() {
        const classCards = document.querySelectorAll('.class-card');
        classCards.forEach(card => {
            card.addEventListener('click', () => {
                const selectedClass = card.dataset.class;
                this.startGame(selectedClass);
            });
        });
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // ESC key for pause
            if (e.key === 'Escape' && this.currentScreen === 'battle') {
                this.togglePause();
                return;
            }

            if (this.currentScreen !== 'battle') return;
            if (this.isPaused) return;
            if (!this.player || !this.player.canAct()) return;

            const key = e.key;
            const ability = this.player.abilities.find(a => a.hotkey === key);

            if (ability) {
                this.useAbility(this.player, this.enemy, ability);
            }
        });
    }

    setupRestartButton() {
        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    /**
     * Setup pause menu event listeners
     */
    setupPauseMenu() {
        const resumeBtn = document.getElementById('resume-btn');
        const restartBattleBtn = document.getElementById('restart-battle-btn');

        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }

        if (restartBattleBtn) {
            restartBattleBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.currentScreen !== 'battle') return;

        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');

        if (pauseOverlay) {
            if (this.isPaused) {
                pauseOverlay.classList.remove('hidden');
            } else {
                pauseOverlay.classList.add('hidden');
            }
        }
    }

    startGame(playerClass) {
        this.player = new Character('Игрок', playerClass, true, this);

        // Random enemy class
        const classes = ['warrior', 'mage', 'priest'];
        const enemyClass = classes[Math.floor(Math.random() * classes.length)];
        this.enemy = new Character('Противник', enemyClass, false, this);

        // Initialize stalemate detection
        this.turnsWithoutDamage = 0;
        this.lastPlayerHp = this.player.hp;
        this.lastEnemyHp = this.enemy.hp;

        this.switchScreen('battle');
        this.renderAbilities();
        this.updateUI();
        this.updateTurnIndicator('player');
        this.addLog(`Битва началась! Вы - ${this.getClassName(playerClass)}, противник - ${this.getClassName(enemyClass)}!`);
        this.addLog('Используйте способности нажатием кнопок или клавиш 1-4');
    }

    getClassName(classId) {
        const definition = getClassDefinition(classId);
        if (definition && definition.displayName) {
            return definition.displayName;
        }
        return classId;
    }

    switchScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    renderAbilities() {
        const container = document.getElementById('abilities-container');
        container.innerHTML = '';

        this.player.abilities.forEach(ability => {
            const btn = document.createElement('button');
            btn.className = 'ability-btn';
            btn.setAttribute('aria-label', this.getAbilityAriaLabel(ability));
            btn.dataset.abilityId = ability.id;

            const tooltipContent = this.getAbilityTooltipLines(ability)
                .map(line => `<li>${line}</li>`) 
                .join('');

            btn.innerHTML = `
                <div class="ability-hotkey">${ability.hotkey}</div>
                <div class="ability-icon">${ability.icon}</div>
                <div class="ability-name">${ability.name}</div>
                <div class="ability-meta">
                    <span class="ability-cost">${ability.manaCost} маны</span>
                    <span class="ability-cooldown-meta">КД: ${ability.maxCooldown}</span>
                </div>
                <div class="ability-tooltip" role="tooltip">
                    <div class="tooltip-title">${ability.name}</div>
                    <p class="tooltip-description">${ability.description}</p>
                    <ul class="tooltip-list">${tooltipContent}</ul>
                </div>
            `;

            btn.addEventListener('click', () => {
                this.useAbility(this.player, this.enemy, ability);
            });

            container.appendChild(btn);
        });
    }

    getAbilityAriaLabel(ability) {
        const parts = [
            `${ability.name}: ${ability.description}`,
            `Стоимость: ${ability.manaCost} маны`,
            `Перезарядка: ${ability.maxCooldown} ходов`
        ];

        const extra = this.getAbilityTooltipLines(ability);
        if (extra.length) {
            parts.push(`Эффекты: ${extra.join(', ')}`);
        }

        parts.push(`Клавиша: ${ability.hotkey}`);
        return parts.join('. ');
    }

    getAbilityTooltipLines(ability) {
        const lines = [];

        if (ability.damage) {
            lines.push(`Урон: ${ability.damage}`);
        }

        if (ability.heal) {
            lines.push(`Исцеление: ${ability.heal}`);
        }

        if (ability.type === 'buff') {
            if (ability.buffType === 'shield') {
                lines.push(`Поглощение: ${CONFIG.WARRIOR_SHIELD_ABSORB}`);
            }
            if (ability.buffType === 'holyShield') {
                lines.push(`Поглощение: ${CONFIG.PRIEST_SHIELD_ABSORB}`);
            }
            if (ability.buffType === 'manaShield') {
                lines.push('Поглощает урон за счёт маны');
            }
            lines.push(`Длительность: ${ability.duration} ходов`);
        }

        if (ability.stun) {
            lines.push(`Оглушение на ${CONFIG.STUN_DURATION} ход`);
        }

        if (ability.freeze) {
            lines.push(`Заморозка на ${CONFIG.FREEZE_DURATION} хода`);
        }

        if (ability.dot) {
            lines.push(`Ожог: ${CONFIG.DOT_DAMAGE_PER_TICK}/ход (${CONFIG.DOT_DURATION} хода)`);
        }

        return lines;
    }

    /**
     * Update turn indicator display
     * @param {string} turn - Turn state ('player', 'enemy', 'waiting')
     */
    updateTurnIndicator(turn) {
        const indicator = document.querySelector('.turn-text');
        if (!indicator) return;

        indicator.classList.remove('enemy-turn', 'waiting');

        switch(turn) {
            case 'player':
                indicator.textContent = 'Ваш ход';
                break;
            case 'enemy':
                indicator.textContent = 'Ход противника';
                indicator.classList.add('enemy-turn');
                break;
            case 'waiting':
                indicator.textContent = 'Ожидание...';
                indicator.classList.add('waiting');
                break;
        }
    }

    /**
     * Use an ability in combat
     * @param {Character} caster - Character using the ability
     * @param {Character} target - Character targeted by the ability
     * @param {Object} ability - Ability object with damage, heal, buffs, debuffs, etc.
     * @returns {boolean} True if ability was successfully used
     */
    useAbility(caster, target, ability) {
        // Check if game is paused
        if (this.isPaused) {
            return false;
        }

        // Input validation
        if (!caster || !target || !ability) {
            console.error('Invalid useAbility parameters:', { caster, target, ability });
            return false;
        }

        if (!caster.canAct()) {
            this.addLog(`${caster.name} не может действовать!`);
            return false;
        }

        if (ability.cooldown > 0) {
            this.addLog(`${ability.name} на перезарядке!`);
            return false;
        }

        if (caster.mana < ability.manaCost) {
            this.addLog(`Недостаточно маны для ${ability.name}!`);
            return false;
        }

        // Use mana
        caster.mana -= ability.manaCost;

        // Start cooldown
        ability.cooldown = ability.maxCooldown;

        // Animate
        this.animateAttack(caster);

        // Apply ability effects
        if (ability.damage) {
            const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
            const damage = isCrit ? Math.floor(ability.damage * CONFIG.CRIT_MULTIPLIER) : ability.damage;
            const actualDamage = target.takeDamage(damage, isCrit);

            if (isCrit) {
                this.addLog(`💥 ${caster.name} наносит КРИТИЧЕСКИЙ удар ${ability.name}! ${actualDamage} урона!`, 'crit');
            } else {
                this.addLog(`${caster.name} использует ${ability.name}! ${actualDamage} урона!`, 'damage');
            }

            this.showDamageNumber(target, actualDamage, isCrit);
            this.createParticles(target, isCrit ? '#ff4444' : '#ffd700');
        }

        if (ability.heal) {
            const actualHeal = caster.heal(ability.heal);
            this.addLog(`${caster.name} использует ${ability.name}! Восстановлено ${actualHeal} HP!`, 'heal');
            this.showDamageNumber(caster, actualHeal, false, true);
            this.createParticles(caster, '#51cf66');
        }

        if (ability.type === 'buff') {
            let buff = {
                name: ability.name,
                type: ability.buffType,
                duration: ability.duration,
                icon: ability.icon
            };

            if (ability.buffType === 'shield') {
                buff.absorbAmount = CONFIG.WARRIOR_SHIELD_ABSORB;
            } else if (ability.buffType === 'holyShield') {
                buff.absorbAmount = CONFIG.PRIEST_SHIELD_ABSORB;
            }

            caster.addBuff(buff);
            this.addLog(`${caster.name} использует ${ability.name}!`, 'buff');
        }

        if (ability.stun) {
            target.addDebuff({
                name: 'Оглушение',
                type: 'stun',
                duration: CONFIG.STUN_DURATION,
                icon: '💫'
            });
            this.addLog(`${target.name} оглушён!`, 'buff');
        }

        if (ability.freeze) {
            target.addDebuff({
                name: 'Заморожен',
                type: 'freeze',
                duration: CONFIG.FREEZE_DURATION,
                icon: '❄️'
            });
            this.addLog(`${target.name} заморожен!`, 'buff');
        }

        if (ability.dot) {
            target.addDebuff({
                name: ability.name,
                type: 'dot',
                duration: CONFIG.DOT_DURATION,
                damagePerTick: CONFIG.DOT_DAMAGE_PER_TICK,
                icon: '🔥'
            });
            this.addLog(`${target.name} горит от ${ability.name}!`, 'damage');
        }

        this.updateUI();

        // Check if battle ended
        if (!target.isAlive) {
            this.endBattle(caster.isPlayer);
            return true;
        }

        // If player turn, trigger enemy turn
        if (caster.isPlayer) {
            this.updateTurnIndicator('waiting');
            setTimeout(() => {
                this.enemyTurn();
            }, CONFIG.TURN_DELAY);
        }

        return true;
    }

    enemyTurn() {
        if (!this.enemy.isAlive || !this.player.isAlive) return;

        this.updateTurnIndicator('enemy');

        // Update cooldowns and buffs
        this.updateCooldowns(this.enemy);
        this.enemy.updateBuffsAndDebuffs();
        if (!this.enemy.isAlive) {
            this.endBattle(true);
            return;
        }
        this.enemy.regenerateMana();
        if (!this.enemy.isAlive) {
            this.endBattle(true);
            return;
        }

        // Check if enemy died from DoT
        if (!this.enemy.isAlive) {
            this.endBattle(true);
            return;
        }

        if (!this.enemy.canAct()) {
            this.addLog(`${this.enemy.name} не может действовать!`);
            this.playerTurnEnd();
            return;
        }

        // Simple AI
        const availableAbilities = this.enemy.abilities.filter(a =>
            a.cooldown === 0 && this.enemy.mana >= a.manaCost
        );

        if (availableAbilities.length === 0) {
            this.addLog(`${this.enemy.name} пропускает ход (нет маны или все на КД)`);
            this.playerTurnEnd();
            return;
        }

        // AI Strategy
        let chosenAbility = null;

        const playerUnderControl = this.player.isStunned() || this.player.isFrozen();
        const playerHasActiveDot = this.player.debuffs.some(d => d.type === 'dot');

        // Heal if low HP
        const healAbility = availableAbilities.find(a => a.heal);
        if (healAbility && this.enemy.hp < this.enemy.maxHp * 0.4) {
            chosenAbility = healAbility;
        }

        // Use shield if low HP and no shield
        if (!chosenAbility && this.enemy.hp < this.enemy.maxHp * 0.5) {
            const shieldAbility = availableAbilities.find(a => a.type === 'buff');
            if (shieldAbility && !this.enemy.buffs.some(b => b.type === 'shield' || b.type === 'holyShield')) {
                chosenAbility = shieldAbility;
            }
        }

        // Try to finish off the player if possible
        if (!chosenAbility) {
            const killingAbility = availableAbilities
                .filter(a => a.damage)
                .sort((a, b) => b.damage - a.damage)
                .find(a => a.damage >= this.player.hp);

            if (killingAbility) {
                chosenAbility = killingAbility;
            }
        }

        // Apply control if the player is able to act
        if (!chosenAbility && !playerUnderControl) {
            const controlAbility = availableAbilities.find(a => a.stun || a.freeze);
            if (controlAbility) {
                chosenAbility = controlAbility;
            }
        }

        // Apply DoT if target does not already have one
        if (!chosenAbility && !playerHasActiveDot) {
            const dotAbility = availableAbilities.find(a => a.dot);
            if (dotAbility) {
                chosenAbility = dotAbility;
            }
        }

        // Otherwise use highest damage ability
        if (!chosenAbility) {
            const damageAbilities = availableAbilities.filter(a => a.damage);
            if (damageAbilities.length > 0) {
                chosenAbility = damageAbilities.reduce((prev, curr) =>
                    curr.damage > prev.damage ? curr : prev
                );
            } else {
                chosenAbility = availableAbilities[0];
            }
        }

        if (chosenAbility.heal) {
            this.useAbility(this.enemy, this.enemy, chosenAbility);
        } else {
            this.useAbility(this.enemy, this.player, chosenAbility);
        }

        setTimeout(() => {
            if (this.player.isAlive && this.enemy.isAlive) {
                this.playerTurnEnd();
            }
        }, CONFIG.TURN_DELAY);
    }

    playerTurnEnd() {
        // Update cooldowns and buffs for player
        this.updateCooldowns(this.player);
        this.player.updateBuffsAndDebuffs();
        if (!this.player.isAlive) {
            this.endBattle(false);
            return;
        }
        this.player.regenerateMana();
        if (!this.player.isAlive) {
            this.endBattle(false);
            return;
        }

        // Check if player died from DoT
        if (!this.player.isAlive) {
            this.endBattle(false);
            return;
        }

        this.updateUI();

        // Check for stalemate (no damage dealt for N turns)
        if (this.player.hp === this.lastPlayerHp && this.enemy.hp === this.lastEnemyHp) {
            this.turnsWithoutDamage++;
            if (this.turnsWithoutDamage >= this.maxTurnsWithoutDamage) {
                this.addLog(`${this.maxTurnsWithoutDamage} ходов без урона - ничья!`, 'buff');
                this.endBattle(null); // null means draw
                return;
            }
        } else {
            this.turnsWithoutDamage = 0;
        }

        // Update HP tracking for stalemate detection
        this.lastPlayerHp = this.player.hp;
        this.lastEnemyHp = this.enemy.hp;

        // If player can't act (stunned/frozen), auto-skip to enemy turn
        if (!this.player.canAct()) {
            this.addLog(`${this.player.name} не может действовать - ход пропущен!`, 'buff');
            this.updateTurnIndicator('waiting');
            setTimeout(() => {
                this.enemyTurn();
            }, CONFIG.TURN_DELAY);
        } else {
            const hasAvailableAbility = this.hasAvailableAbility(this.player);

            if (!hasAvailableAbility) {
                this.addLog(`${this.player.name} пропускает ход (нет маны или все на КД)!`, 'buff');
                this.updateTurnIndicator('waiting');
                setTimeout(() => {
                    this.enemyTurn();
                }, CONFIG.TURN_DELAY);
                return;
            }

            // Player can act - show it's their turn
            this.updateTurnIndicator('player');
        }
    }

    hasAvailableAbility(character) {
        return character.abilities.some(ability =>
            ability.cooldown === 0 && character.mana >= ability.manaCost
        );
    }

    updateCooldowns(character) {
        character.abilities.forEach(ability => {
            if (ability.cooldown > 0) {
                ability.cooldown--;
            }
        });

        if (character.isPlayer) {
            this.updateAbilityButtons();
        }
    }

    updateAbilityButtons() {
        this.player.abilities.forEach(ability => {
            const btn = document.querySelector(`[data-ability-id="${ability.id}"]`);
            if (!btn) return;

            // Remove old cooldown display
            const oldCooldown = btn.querySelector('.ability-cooldown');
            if (oldCooldown) oldCooldown.remove();

            if (ability.cooldown > 0) {
                btn.classList.add('on-cooldown');
                const cooldownDiv = document.createElement('div');
                cooldownDiv.className = 'ability-cooldown';
                cooldownDiv.textContent = ability.cooldown;
                btn.appendChild(cooldownDiv);
            } else {
                btn.classList.remove('on-cooldown');
            }

            const lacksMana = this.player.mana < ability.manaCost;
            const playerCanAct = this.player.canAct();

            btn.classList.toggle('insufficient-mana', lacksMana);

            const shouldDisable = ability.cooldown > 0 || lacksMana || !playerCanAct;
            btn.disabled = shouldDisable;
        });
    }

    updateUI() {
        // Update player panel
        const playerHpPercent = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('player-hp').style.width = playerHpPercent + '%';
        document.getElementById('player-hp-text').textContent = `${Math.floor(this.player.hp)}/${this.player.maxHp}`;

        const playerManaPercent = (this.player.mana / this.player.maxMana) * 100;
        document.getElementById('player-mana').style.width = playerManaPercent + '%';
        document.getElementById('player-mana-text').textContent = `${Math.floor(this.player.mana)}/${this.player.maxMana}`;

        // Update enemy panel
        const enemyHpPercent = (this.enemy.hp / this.enemy.maxHp) * 100;
        document.getElementById('enemy-hp').style.width = enemyHpPercent + '%';
        document.getElementById('enemy-hp-text').textContent = `${Math.floor(this.enemy.hp)}/${this.enemy.maxHp}`;

        const enemyManaPercent = (this.enemy.mana / this.enemy.maxMana) * 100;
        document.getElementById('enemy-mana').style.width = enemyManaPercent + '%';
        document.getElementById('enemy-mana-text').textContent = `${Math.floor(this.enemy.mana)}/${this.enemy.maxMana}`;

        // Update ability buttons
        this.updateAbilityButtons();
    }

    updateBuffs(character) {
        const buffContainer = document.getElementById(
            character.isPlayer ? 'player-buffs' : 'enemy-buffs'
        );

        buffContainer.innerHTML = '';

        [...character.buffs, ...character.debuffs].forEach(buff => {
            const buffDiv = document.createElement('div');
            buffDiv.className = 'buff-icon';
            if (buff.type === 'stun' || buff.type === 'freeze' || buff.type === 'dot') {
                buffDiv.classList.add('debuff');
            }
            buffDiv.innerHTML = `
                ${buff.icon}
                <div class="buff-duration">${buff.duration}</div>
            `;
            buffDiv.title = buff.name;
            buffContainer.appendChild(buffDiv);
        });
    }

    /**
     * Add message to combat log
     * @param {string} message - Log message text
     * @param {string} [type=''] - Message type for styling ('damage', 'heal', 'buff', 'crit')
     */
    addLog(message, type = '') {
        const log = document.getElementById('combat-log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        log.appendChild(entry);

        // Limit log entries
        while (log.children.length > this.combatLogMaxEntries) {
            log.removeChild(log.firstChild);
        }

        // Auto scroll
        log.scrollTop = log.scrollHeight;
    }

    animateAttack(character) {
        const sprite = document.getElementById(
            character.isPlayer ? 'player-sprite' : 'enemy-sprite'
        );
        const pixelChar = sprite.querySelector('.pixel-character');

        pixelChar.classList.add('attacking');
        setTimeout(() => {
            pixelChar.classList.remove('attacking');
        }, CONFIG.ATTACK_ANIMATION_DURATION);
    }

    showDamageNumber(character, amount, isCrit = false, isHeal = false) {
        const sprite = document.getElementById(
            character.isPlayer ? 'player-sprite' : 'enemy-sprite'
        );

        const damageNum = document.createElement('div');
        damageNum.className = 'damage-number';
        if (isCrit) damageNum.classList.add('crit');
        if (isHeal) damageNum.classList.add('heal');

        damageNum.textContent = (isHeal ? '+' : '-') + Math.floor(amount);
        damageNum.style.left = '50%';
        damageNum.style.top = '30%';

        sprite.appendChild(damageNum);

        setTimeout(() => {
            damageNum.remove();
        }, CONFIG.DAMAGE_NUMBER_DURATION);
    }

    createParticles(character, color) {
        const sprite = document.getElementById(
            character.isPlayer ? 'player-sprite' : 'enemy-sprite'
        );

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.background = color;
            particle.style.boxShadow = `0 0 10px ${color}`;
            particle.style.left = '50%';
            particle.style.top = '50%';

            const angle = (Math.PI * 2 * i) / 8;
            const distance = 50 + Math.random() * 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');

            sprite.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, CONFIG.PARTICLE_DURATION);
        }
    }

    /**
     * End the battle and show result screen
     * @param {boolean|null} playerWon - True if player won, false if lost, null for draw
     */
    endBattle(playerWon) {
        if (playerWon === null) {
            this.addLog('Ничья!');
        } else {
            this.addLog(playerWon ? 'Вы победили!' : 'Вы проиграли!');
        }

        setTimeout(() => {
            const resultTitle = document.getElementById('result-title');
            if (playerWon === null) {
                resultTitle.textContent = 'НИЧЬЯ!';
                resultTitle.className = 'result-title draw';
            } else if (playerWon) {
                resultTitle.textContent = 'ПОБЕДА!';
                resultTitle.className = 'result-title victory';
            } else {
                resultTitle.textContent = 'ПОРАЖЕНИЕ!';
                resultTitle.className = 'result-title defeat';
            }

            this.switchScreen('victory');
        }, CONFIG.END_BATTLE_DELAY);
    }
}

// Initialize game when DOM is loaded (browser environment)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new Game();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Character };
}

})();
