const test = require('node:test');
const assert = require('node:assert');
const RNG = require('../../src/shared/combat/rng');

test('RNG produces deterministic sequence with same seed', () => {
    const rng1 = new RNG(12345);
    const rng2 = new RNG(12345);
    
    const sequence1 = [rng1.next(), rng1.next(), rng1.next()];
    const sequence2 = [rng2.next(), rng2.next(), rng2.next()];
    
    assert.deepStrictEqual(sequence1, sequence2);
});

test('RNG produces different sequences with different seeds', () => {
    const rng1 = new RNG(12345);
    const rng2 = new RNG(54321);
    
    const val1 = rng1.next();
    const val2 = rng2.next();
    
    assert.notStrictEqual(val1, val2);
});

test('RNG.nextInt returns integers in range', () => {
    const rng = new RNG(12345);
    
    for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(1, 10);
        assert.ok(Number.isInteger(value));
        assert.ok(value >= 1 && value <= 10);
    }
});

test('RNG.chance returns boolean based on probability', () => {
    const rng = new RNG(12345);
    let trueCount = 0;
    
    for (let i = 0; i < 1000; i++) {
        if (rng.chance(0.5)) {
            trueCount++;
        }
    }
    
    // Should be roughly 50% (allow 10% margin)
    assert.ok(trueCount > 400 && trueCount < 600);
});

test('RNG.shuffle produces different order', () => {
    const rng = new RNG(12345);
    const original = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(original);
    
    assert.strictEqual(shuffled.length, original.length);
    assert.notDeepStrictEqual(shuffled, original);
    
    // Check all elements are present
    const sorted = [...shuffled].sort((a, b) => a - b);
    assert.deepStrictEqual(sorted, original);
});

test('RNG state can be saved and restored', () => {
    const rng1 = new RNG(12345);
    rng1.next();
    rng1.next();
    
    const state = rng1.getState();
    const nextValue = rng1.next();
    
    const rng2 = new RNG(0);
    rng2.setState(state);
    const restoredValue = rng2.next();
    
    assert.strictEqual(nextValue, restoredValue);
});
