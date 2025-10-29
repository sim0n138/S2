// WoW Pixel Duels - Game Engine
let game;

function callGameMethod(method, ...args) {
    if (game && typeof game[method] === 'function') {
        game[method](...args);
    }
}

class Character {
    constructor(name, className, isPlayer = false) {
        this.name = name;
        this.className = className;
        this.isPlayer = isPlayer;
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

    initializeClass() {
        switch(this.className) {
            case 'warrior':
                this.maxHp = 1500;
                this.hp = 1500;
                this.abilities = [
                    {
                        id: 'execute',
                        name: 'Казнь',
                        icon: '⚔️',
                        damage: 250,
                        manaCost: 30,
                        cooldown: 0,
                        maxCooldown: 5,
                        hotkey: '1',
                        description: 'Мощный удар'
                    },
                    {
                        id: 'shield_block',
                        name: 'Блок щитом',
                        icon: '🛡️',
                        manaCost: 20,
                        cooldown: 0,
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
                        cooldown: 0,
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
                        cooldown: 0,
                        maxCooldown: 3,
                        hotkey: '4',
                        stun: true,
                        description: 'Оглушает на 1 ход'
                    }
                ];
                break;

            case 'mage':
                this.maxHp = 800;
                this.hp = 800;
                this.maxMana = 150;
                this.mana = 150;
                this.abilities = [
                    {
                        id: 'fireball',
                        name: 'Огненный шар',
                        icon: '🔥',
                        damage: 300,
                        manaCost: 40,
                        cooldown: 0,
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
                        cooldown: 0,
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
                        cooldown: 0,
                        maxCooldown: 2,
                        hotkey: '3',
                        description: 'Быстрое заклинание'
                    },
                    {
                        id: 'mana_shield',
                        name: 'Мана-щит',
                        icon: '🔮',
                        manaCost: 35,
                        cooldown: 0,
                        maxCooldown: 10,
                        hotkey: '4',
                        type: 'buff',
                        buffType: 'manaShield',
                        duration: 6,
                        description: 'Мана поглощает урон'
                    }
                ];
                break;

            case 'priest':
                this.maxHp = 1000;
                this.hp = 1000;
                this.maxMana = 120;
                this.mana = 120;
                this.abilities = [
                    {
                        id: 'smite',
                        name: 'Кара',
                        icon: '⚡',
                        damage: 180,
                        manaCost: 20,
                        cooldown: 0,
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
                        cooldown: 0,
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
                        cooldown: 0,
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
                        cooldown: 0,
                        maxCooldown: 8,
                        hotkey: '4',
                        type: 'buff',
                        buffType: 'holyShield',
                        duration: 8,
                        description: 'Поглощает 500 урона'
                    }
                ];
                break;
        }
    }

    takeDamage(damage, isCrit = false) {
        // Check for shields
        let remainingDamage = damage;

        // Check shield buffs
        const shieldBuff = this.buffs.find(b => b.type === 'shield' || b.type === 'holyShield');
        if (shieldBuff) {
            if (shieldBuff.absorbAmount >= remainingDamage) {
                shieldBuff.absorbAmount -= remainingDamage;
                callGameMethod('addLog', `${this.name} поглотил ${remainingDamage} урона щитом!`, 'buff');
                if (shieldBuff.absorbAmount <= 0) {
                    this.removeBuff(shieldBuff);
                }
                return 0;
            } else {
                remainingDamage -= shieldBuff.absorbAmount;
                callGameMethod('addLog', `Щит ${this.name} разрушен!`, 'damage');
                this.removeBuff(shieldBuff);
            }
        }

        // Check mana shield
        const manaShieldBuff = this.buffs.find(b => b.type === 'manaShield');
        if (manaShieldBuff && this.mana > 0) {
            const manaToUse = Math.min(remainingDamage, this.mana);
            this.mana -= manaToUse;
            remainingDamage -= manaToUse;
            callGameMethod('addLog', `${this.name} поглотил ${manaToUse} урона маной!`, 'buff');
            if (remainingDamage <= 0) return 0;
        }

        this.hp = Math.max(0, this.hp - remainingDamage);

        if (this.hp === 0) {
            this.isAlive = false;
        }

        return remainingDamage;
    }

    heal(amount) {
        const actualHeal = Math.min(amount, this.maxHp - this.hp);
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return actualHeal;
    }

    addBuff(buff) {
        this.buffs.push(buff);
        callGameMethod('updateBuffs', this);
    }

    removeBuff(buff) {
        const index = this.buffs.indexOf(buff);
        if (index > -1) {
            this.buffs.splice(index, 1);
            callGameMethod('updateBuffs', this);
        }
    }

    addDebuff(debuff) {
        this.debuffs.push(debuff);
        callGameMethod('updateBuffs', this);
    }

    updateBuffsAndDebuffs() {
        // Update buffs
        this.buffs = this.buffs.filter(buff => {
            buff.duration--;
            if (buff.duration <= 0) {
                callGameMethod('addLog', `${buff.name} на ${this.name} закончился`, 'buff');
                return false;
            }
            return true;
        });

        // Update debuffs (DoTs)
        this.debuffs = this.debuffs.filter(debuff => {
            if (debuff.type === 'dot') {
                this.takeDamage(debuff.damagePerTick);
                callGameMethod('addLog', `${this.name} получает ${debuff.damagePerTick} урона от ${debuff.name}`, 'damage');
                callGameMethod('showDamageNumber', this, debuff.damagePerTick, false);
            }

            debuff.duration--;
            if (debuff.duration <= 0) {
                return false;
            }
            return true;
        });

        callGameMethod('updateBuffs', this);
    }

    isStunned() {
        return this.debuffs.some(d => d.type === 'stun');
    }

    isFrozen() {
        return this.debuffs.some(d => d.type === 'freeze');
    }

    canAct() {
        return this.isAlive && !this.isStunned() && !this.isFrozen();
    }

    regenerateMana() {
        this.mana = Math.min(this.maxMana, this.mana + 10);
    }
}

class Game {
    constructor() {
        this.player = null;
        this.enemy = null;
        this.currentScreen = 'title';
        this.turnTimer = null;
        this.combatLogMaxEntries = 50;

        // Stalemate detection
        this.turnsWithoutDamage = 0;
        this.maxTurnsWithoutDamage = 10;
        this.lastPlayerHp = 0;
        this.lastEnemyHp = 0;

        this.init();
    }

    init() {
        this.setupClassSelection();
        this.setupKeyboardControls();
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
            if (this.currentScreen !== 'battle') return;
            if (!this.player || !this.player.canAct()) return;

            const key = e.key;
            const ability = this.player.abilities.find(a => a.hotkey === key);

            if (ability) {
                this.useAbility(this.player, this.enemy, ability);
            }
        });
    }

    startGame(playerClass) {
        this.player = new Character('Игрок', playerClass, true);

        // Random enemy class
        const classes = ['warrior', 'mage', 'priest'];
        const enemyClass = classes[Math.floor(Math.random() * classes.length)];
        this.enemy = new Character('Противник', enemyClass, false);

        // Initialize stalemate detection
        this.turnsWithoutDamage = 0;
        this.lastPlayerHp = this.player.hp;
        this.lastEnemyHp = this.enemy.hp;

        this.switchScreen('battle');
        this.renderAbilities();
        this.updateUI();
        this.addLog(`Битва началась! Вы - ${this.getClassName(playerClass)}, противник - ${this.getClassName(enemyClass)}!`);
        this.addLog('Используйте способности нажатием кнопок или клавиш 1-4');
    }

    getClassName(classId) {
        const names = {
            'warrior': 'Воин',
            'mage': 'Маг',
            'priest': 'Жрец'
        };
        return names[classId] || classId;
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
            btn.innerHTML = `
                <div class="ability-hotkey">${ability.hotkey}</div>
                <div class="ability-icon">${ability.icon}</div>
                <div class="ability-name">${ability.name}</div>
                <div class="ability-cost">${ability.manaCost} маны</div>
            `;

            btn.addEventListener('click', () => {
                this.useAbility(this.player, this.enemy, ability);
            });

            btn.dataset.abilityId = ability.id;
            container.appendChild(btn);
        });
    }

    useAbility(caster, target, ability) {
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
            const isCrit = Math.random() < 0.25; // 25% crit chance
            const damage = isCrit ? Math.floor(ability.damage * 1.5) : ability.damage;
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
                buff.absorbAmount = 300;
            } else if (ability.buffType === 'holyShield') {
                buff.absorbAmount = 500;
            }

            caster.addBuff(buff);
            this.addLog(`${caster.name} использует ${ability.name}!`, 'buff');
        }

        if (ability.stun) {
            target.addDebuff({
                name: 'Оглушение',
                type: 'stun',
                duration: 1,
                icon: '💫'
            });
            this.addLog(`${target.name} оглушён!`, 'buff');
        }

        if (ability.freeze) {
            target.addDebuff({
                name: 'Заморожен',
                type: 'freeze',
                duration: 2,
                icon: '❄️'
            });
            this.addLog(`${target.name} заморожен!`, 'buff');
        }

        if (ability.dot) {
            target.addDebuff({
                name: ability.name,
                type: 'dot',
                duration: 4,
                damagePerTick: 50,
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
            setTimeout(() => {
                this.enemyTurn();
            }, 1000);
        }

        return true;
    }

    enemyTurn() {
        if (!this.enemy.isAlive || !this.player.isAlive) return;

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
        }, 1000);
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
            setTimeout(() => {
                this.enemyTurn();
            }, 1000);
        }
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

            if (this.player.mana < ability.manaCost) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }

            if (!this.player.canAct()) {
                btn.disabled = true;
            }
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
        }, 300);
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
        }, 1000);
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
            }, 1000);
        }
    }

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
        }, 2000);
    }
}

// Initialize game when DOM is loaded (browser environment)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new Game();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Character };
}
