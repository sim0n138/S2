/**
 * Deck management module
 * Handles draw pile, hand, discard, and exhaust
 * @module shared/combat/deck
 */

class Deck {
    /**
     * Create a new deck
     * @param {Array} cards - Initial card list
     * @param {number} maxHandSize - Maximum hand size (default: 10)
     */
    constructor(cards = [], maxHandSize = 10) {
        this.drawPile = [...cards];
        this.hand = [];
        this.discardPile = [];
        this.exhaustPile = [];
        this.maxHandSize = maxHandSize;
    }

    /**
     * Shuffle draw pile using provided RNG
     * @param {RNG} rng - Random number generator
     */
    shuffle(rng) {
        if (!rng || typeof rng.shuffle !== 'function') {
            throw new Error('Valid RNG instance required for shuffling');
        }
        this.drawPile = rng.shuffle(this.drawPile);
    }

    /**
     * Draw cards from draw pile to hand
     * @param {number} count - Number of cards to draw
     * @param {RNG} rng - Random number generator for shuffling if needed
     * @returns {Array} Cards drawn
     */
    draw(count, rng) {
        const drawn = [];
        
        for (let i = 0; i < count; i++) {
            // Check if hand is full
            if (this.hand.length >= this.maxHandSize) {
                break;
            }

            // If draw pile is empty, shuffle discard into draw
            if (this.drawPile.length === 0) {
                if (this.discardPile.length === 0) {
                    break; // No more cards to draw
                }
                this.drawPile = [...this.discardPile];
                this.discardPile = [];
                if (rng) {
                    this.shuffle(rng);
                }
            }

            // Draw card
            const card = this.drawPile.shift();
            this.hand.push(card);
            drawn.push(card);
        }

        return drawn;
    }

    /**
     * Play a card from hand
     * @param {string} cardId - Card ID to play
     * @returns {Object|null} Card object or null if not found
     */
    playCard(cardId) {
        const index = this.hand.findIndex(c => c.id === cardId);
        if (index === -1) {
            return null;
        }
        
        const card = this.hand.splice(index, 1)[0];
        return card;
    }

    /**
     * Discard a card (can be drawn again)
     * @param {Object} card - Card to discard
     */
    discard(card) {
        this.discardPile.push(card);
    }

    /**
     * Exhaust a card (removed from combat)
     * @param {Object} card - Card to exhaust
     */
    exhaust(card) {
        this.exhaustPile.push(card);
    }

    /**
     * Discard entire hand at end of turn
     */
    discardHand() {
        this.discardPile.push(...this.hand);
        this.hand = [];
    }

    /**
     * Add card to hand directly (e.g., generated cards)
     * @param {Object} card - Card to add
     * @returns {boolean} True if added, false if hand is full
     */
    addToHand(card) {
        if (this.hand.length >= this.maxHandSize) {
            return false;
        }
        this.hand.push(card);
        return true;
    }

    /**
     * Get card from hand by ID
     * @param {string} cardId - Card ID
     * @returns {Object|null} Card or null
     */
    getCardInHand(cardId) {
        return this.hand.find(c => c.id === cardId) || null;
    }

    /**
     * Check if hand contains card
     * @param {string} cardId - Card ID
     * @returns {boolean} True if in hand
     */
    hasCard(cardId) {
        return this.hand.some(c => c.id === cardId);
    }

    /**
     * Get total number of cards in all piles
     * @returns {number} Total cards
     */
    getTotalCards() {
        return this.drawPile.length + 
               this.hand.length + 
               this.discardPile.length + 
               this.exhaustPile.length;
    }

    /**
     * Get state for serialization
     * @returns {Object} State object
     */
    getState() {
        return {
            drawPile: this.drawPile.map(c => c.id),
            hand: this.hand.map(c => c.id),
            discardPile: this.discardPile.map(c => c.id),
            exhaustPile: this.exhaustPile.map(c => c.id),
            maxHandSize: this.maxHandSize
        };
    }

    /**
     * Restore from state
     * @param {Object} state - State object
     * @param {Object} cardLibrary - Card definitions lookup
     */
    static fromState(state, cardLibrary) {
        const deck = new Deck([], state.maxHandSize);
        
        deck.drawPile = state.drawPile.map(id => ({ ...cardLibrary[id], id }));
        deck.hand = state.hand.map(id => ({ ...cardLibrary[id], id }));
        deck.discardPile = state.discardPile.map(id => ({ ...cardLibrary[id], id }));
        deck.exhaustPile = state.exhaustPile.map(id => ({ ...cardLibrary[id], id }));
        
        return deck;
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Deck;
} else if (typeof window !== 'undefined') {
    window.Deck = Deck;
}
