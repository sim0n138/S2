/**
 * Deterministic pseudo-random number generator
 * Uses a simple LCG (Linear Congruential Generator) algorithm
 * @module shared/combat/rng
 */

class RNG {
    /**
     * Create a new RNG instance
     * @param {number} seed - Initial seed value
     */
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.state = seed;
        // LCG parameters (from Numerical Recipes)
        this.a = 1664525;
        this.c = 1013904223;
        this.m = Math.pow(2, 32);
    }

    /**
     * Get next random number [0, 1)
     * @returns {number} Random number
     */
    next() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / this.m;
    }

    /**
     * Get random integer in range [min, max]
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {number} Random integer
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Get random float in range [min, max)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Check if random event occurs based on probability
     * @param {number} probability - Probability [0, 1]
     * @returns {boolean} True if event occurs
     */
    chance(probability) {
        return this.next() < probability;
    }

    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Get current state for serialization
     * @returns {Object} State object
     */
    getState() {
        return {
            seed: this.seed,
            state: this.state
        };
    }

    /**
     * Restore from saved state
     * @param {Object} state - State object
     */
    setState(state) {
        this.seed = state.seed;
        this.state = state.state;
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RNG;
} else if (typeof window !== 'undefined') {
    window.RNG = RNG;
}
