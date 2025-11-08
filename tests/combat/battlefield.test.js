const test = require('node:test');
const assert = require('node:assert');
const Battlefield = require('../../src/shared/combat/battlefield');

test('Battlefield creates grid with correct dimensions', () => {
    const bf = new Battlefield(4, 3);
    
    assert.strictEqual(bf.width, 4);
    assert.strictEqual(bf.height, 3);
    assert.strictEqual(bf.grid.length, 3);
    assert.strictEqual(bf.grid[0].length, 4);
});

test('isValidPosition checks boundaries correctly', () => {
    const bf = new Battlefield(4, 3);
    
    assert.ok(bf.isValidPosition(0, 0));
    assert.ok(bf.isValidPosition(3, 2));
    assert.ok(!bf.isValidPosition(-1, 0));
    assert.ok(!bf.isValidPosition(0, -1));
    assert.ok(!bf.isValidPosition(4, 0));
    assert.ok(!bf.isValidPosition(0, 3));
});

test('place puts entity on grid', () => {
    const bf = new Battlefield(4, 3);
    const entity = { id: 'hero1', name: 'Hero' };
    
    const result = bf.place(entity, 1, 1);
    
    assert.ok(result);
    assert.strictEqual(entity.x, 1);
    assert.strictEqual(entity.y, 1);
    assert.strictEqual(bf.getEntity(1, 1), entity);
});

test('place fails on occupied cell', () => {
    const bf = new Battlefield(4, 3);
    const entity1 = { id: 'hero1' };
    const entity2 = { id: 'hero2' };
    
    bf.place(entity1, 1, 1);
    const result = bf.place(entity2, 1, 1);
    
    assert.ok(!result);
    assert.strictEqual(bf.getEntity(1, 1), entity1);
});

test('move relocates entity', () => {
    const bf = new Battlefield(4, 3);
    const entity = { id: 'hero1' };
    
    bf.place(entity, 1, 1);
    const result = bf.move(1, 1, 2, 2);
    
    assert.ok(result);
    assert.ok(bf.isEmpty(1, 1));
    assert.strictEqual(bf.getEntity(2, 2), entity);
    assert.strictEqual(entity.x, 2);
    assert.strictEqual(entity.y, 2);
});

test('remove clears cell and removes position', () => {
    const bf = new Battlefield(4, 3);
    const entity = { id: 'hero1' };
    
    bf.place(entity, 1, 1);
    const removed = bf.remove(1, 1);
    
    assert.strictEqual(removed, entity);
    assert.ok(bf.isEmpty(1, 1));
    assert.strictEqual(entity.x, undefined);
    assert.strictEqual(entity.y, undefined);
});

test('distance calculates Manhattan distance', () => {
    const bf = new Battlefield(4, 3);
    
    assert.strictEqual(bf.distance(0, 0, 0, 0), 0);
    assert.strictEqual(bf.distance(0, 0, 1, 0), 1);
    assert.strictEqual(bf.distance(0, 0, 1, 1), 2);
    assert.strictEqual(bf.distance(0, 0, 3, 2), 5);
});

test('getLine returns cells in line', () => {
    const bf = new Battlefield(4, 3);
    
    const line = bf.getLine(0, 0, 3, 0);
    
    assert.strictEqual(line.length, 4);
    assert.deepStrictEqual(line[0], { x: 0, y: 0 });
    assert.deepStrictEqual(line[3], { x: 3, y: 0 });
});

test('getAOE returns cells in radius', () => {
    const bf = new Battlefield(5, 5);
    
    const aoe = bf.getAOE(2, 2, 1);
    
    // Should include center + 4 adjacent cells
    assert.ok(aoe.length >= 5);
    assert.ok(aoe.some(c => c.x === 2 && c.y === 2)); // Center
    assert.ok(aoe.some(c => c.x === 1 && c.y === 2)); // Left
    assert.ok(aoe.some(c => c.x === 3 && c.y === 2)); // Right
});

test('getAllEntities returns all placed entities', () => {
    const bf = new Battlefield(4, 3);
    const entity1 = { id: 'hero1' };
    const entity2 = { id: 'hero2' };
    
    bf.place(entity1, 0, 0);
    bf.place(entity2, 3, 2);
    
    const entities = bf.getAllEntities();
    
    assert.strictEqual(entities.length, 2);
    assert.ok(entities.some(e => e.entity === entity1));
    assert.ok(entities.some(e => e.entity === entity2));
});
