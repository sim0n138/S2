const test = require('node:test');
const assert = require('node:assert');
const Deck = require('../../src/shared/combat/deck');
const RNG = require('../../src/shared/combat/rng');

test('Deck initializes with correct piles', () => {
    const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
    ];
    const deck = new Deck(cards, 10);
    
    assert.strictEqual(deck.drawPile.length, 2);
    assert.strictEqual(deck.hand.length, 0);
    assert.strictEqual(deck.discardPile.length, 0);
    assert.strictEqual(deck.maxHandSize, 10);
});

test('draw moves cards from draw pile to hand', () => {
    const cards = [
        { id: 'card1' },
        { id: 'card2' },
        { id: 'card3' }
    ];
    const deck = new Deck(cards);
    const rng = new RNG(12345);
    
    const drawn = deck.draw(2, rng);
    
    assert.strictEqual(drawn.length, 2);
    assert.strictEqual(deck.hand.length, 2);
    assert.strictEqual(deck.drawPile.length, 1);
});

test('draw reshuffles discard when draw pile is empty', () => {
    const cards = [
        { id: 'card1' },
        { id: 'card2' }
    ];
    const deck = new Deck(cards);
    const rng = new RNG(12345);
    
    // Draw all cards
    deck.draw(2, rng);
    // Play and discard one
    const card = deck.playCard('card1');
    deck.discard(card);
    
    assert.strictEqual(deck.drawPile.length, 0);
    assert.strictEqual(deck.discardPile.length, 1);
    
    // Draw again - should reshuffle
    const drawn = deck.draw(1, rng);
    
    assert.strictEqual(drawn.length, 1);
    assert.strictEqual(deck.discardPile.length, 0);
});

test('draw respects max hand size', () => {
    const cards = Array.from({ length: 15 }, (_, i) => ({ id: `card${i}` }));
    const deck = new Deck(cards, 10);
    const rng = new RNG(12345);
    
    deck.draw(15, rng);
    
    assert.strictEqual(deck.hand.length, 10);
});

test('playCard removes card from hand', () => {
    const deck = new Deck([{ id: 'card1' }, { id: 'card2' }]);
    const rng = new RNG(12345);
    deck.draw(2, rng);
    
    const card = deck.playCard('card1');
    
    assert.strictEqual(card.id, 'card1');
    assert.strictEqual(deck.hand.length, 1);
    assert.ok(!deck.hasCard('card1'));
});

test('playCard returns null for non-existent card', () => {
    const deck = new Deck([{ id: 'card1' }]);
    const rng = new RNG(12345);
    deck.draw(1, rng);
    
    const card = deck.playCard('card999');
    
    assert.strictEqual(card, null);
});

test('discard adds card to discard pile', () => {
    const deck = new Deck([{ id: 'card1' }]);
    const card = { id: 'card1' };
    
    deck.discard(card);
    
    assert.strictEqual(deck.discardPile.length, 1);
    assert.strictEqual(deck.discardPile[0].id, 'card1');
});

test('exhaust adds card to exhaust pile', () => {
    const deck = new Deck([{ id: 'card1' }]);
    const card = { id: 'card1' };
    
    deck.exhaust(card);
    
    assert.strictEqual(deck.exhaustPile.length, 1);
    assert.strictEqual(deck.exhaustPile[0].id, 'card1');
});

test('discardHand moves all cards from hand to discard', () => {
    const deck = new Deck([{ id: 'card1' }, { id: 'card2' }, { id: 'card3' }]);
    const rng = new RNG(12345);
    deck.draw(3, rng);
    
    deck.discardHand();
    
    assert.strictEqual(deck.hand.length, 0);
    assert.strictEqual(deck.discardPile.length, 3);
});

test('getTotalCards counts all cards', () => {
    const deck = new Deck([{ id: 'card1' }, { id: 'card2' }, { id: 'card3' }]);
    const rng = new RNG(12345);
    deck.draw(2, rng);
    deck.discard({ id: 'card4' });
    deck.exhaust({ id: 'card5' });
    
    assert.strictEqual(deck.getTotalCards(), 5);
});

test('getState returns serializable state', () => {
    const deck = new Deck([{ id: 'card1' }, { id: 'card2' }]);
    const rng = new RNG(12345);
    deck.draw(1, rng);
    
    const state = deck.getState();
    
    assert.ok(Array.isArray(state.drawPile));
    assert.ok(Array.isArray(state.hand));
    assert.strictEqual(state.hand.length, 1);
    assert.strictEqual(state.drawPile.length, 1);
});
