const test = require('node:test');
const assert = require('node:assert');

const { Character } = require('../game');

test('shield absorbs incoming damage before health', () => {
    const character = new Character('Tester', 'warrior');
    character.hp = 500;
    const shieldBuff = {
        name: 'Test Shield',
        type: 'shield',
        duration: 2,
        absorbAmount: 150
    };

    character.buffs.push(shieldBuff);

    const actualDamage = character.takeDamage(100);

    assert.strictEqual(actualDamage, 0);
    assert.strictEqual(character.hp, 500);
    assert.strictEqual(shieldBuff.absorbAmount, 50);
    assert.ok(character.buffs.includes(shieldBuff));
});

test('mana shield consumes mana before health', () => {
    const character = new Character('Mage', 'mage');
    character.hp = 400;
    character.mana = 40;
    character.buffs.push({
        name: 'Mana Shield',
        type: 'manaShield',
        duration: 3
    });

    const actualDamage = character.takeDamage(25);

    assert.strictEqual(actualDamage, 0);
    assert.strictEqual(character.hp, 400);
    assert.strictEqual(character.mana, 15);
});

test('damage over time can finish a character', () => {
    const character = new Character('Target', 'warrior');
    character.hp = 40;
    character.debuffs.push({
        name: 'Burn',
        type: 'dot',
        duration: 1,
        damagePerTick: 50,
        icon: '🔥'
    });

    character.updateBuffsAndDebuffs();

    assert.strictEqual(character.hp, 0);
    assert.strictEqual(character.isAlive, false);
    assert.strictEqual(character.debuffs.length, 0);
});
