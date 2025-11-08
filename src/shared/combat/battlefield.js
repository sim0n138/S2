/**
 * Battlefield grid management module
 * Handles positioning, movement, and area queries
 * @module shared/combat/battlefield
 */

class Battlefield {
    /**
     * Create a new battlefield
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     */
    constructor(width = 4, height = 3) {
        this.width = width;
        this.height = height;
        this.grid = this.createGrid();
    }

    /**
     * Create empty grid
     * @private
     * @returns {Array} 2D array representing grid
     */
    createGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = null;
            }
        }
        return grid;
    }

    /**
     * Check if coordinates are valid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if valid
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Check if cell is empty
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if empty
     */
    isEmpty(x, y) {
        if (!this.isValidPosition(x, y)) return false;
        return this.grid[y][x] === null;
    }

    /**
     * Get entity at position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Entity or null
     */
    getEntity(x, y) {
        if (!this.isValidPosition(x, y)) return null;
        return this.grid[y][x];
    }

    /**
     * Place entity on grid
     * @param {Object} entity - Entity to place
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if successful
     */
    place(entity, x, y) {
        if (!this.isValidPosition(x, y)) {
            return false;
        }
        if (!this.isEmpty(x, y)) {
            return false;
        }
        
        // Remove from old position if exists
        if (entity.x !== undefined && entity.y !== undefined) {
            this.remove(entity.x, entity.y);
        }

        this.grid[y][x] = entity;
        entity.x = x;
        entity.y = y;
        return true;
    }

    /**
     * Move entity to new position
     * @param {number} fromX - Source X
     * @param {number} fromY - Source Y
     * @param {number} toX - Target X
     * @param {number} toY - Target Y
     * @returns {boolean} True if successful
     */
    move(fromX, fromY, toX, toY) {
        const entity = this.getEntity(fromX, fromY);
        if (!entity) return false;
        if (!this.isEmpty(toX, toY)) return false;

        this.grid[fromY][fromX] = null;
        this.grid[toY][toX] = entity;
        entity.x = toX;
        entity.y = toY;
        return true;
    }

    /**
     * Remove entity from grid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Removed entity or null
     */
    remove(x, y) {
        if (!this.isValidPosition(x, y)) return null;
        const entity = this.grid[y][x];
        this.grid[y][x] = null;
        if (entity) {
            delete entity.x;
            delete entity.y;
        }
        return entity;
    }

    /**
     * Calculate Manhattan distance between two points
     * @param {number} x1 - First X
     * @param {number} y1 - First Y
     * @param {number} x2 - Second X
     * @param {number} y2 - Second Y
     * @returns {number} Distance
     */
    distance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Get cells in a line from source to target
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @returns {Array} Array of {x, y} coordinates
     */
    getLine(x1, y1, x2, y2) {
        const cells = [];
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            cells.push({ x, y });
            
            if (x === x2 && y === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return cells;
    }

    /**
     * Get cells in area of effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Radius
     * @returns {Array} Array of {x, y} coordinates
     */
    getAOE(x, y, radius) {
        const cells = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.isValidPosition(nx, ny)) {
                    if (Math.abs(dx) + Math.abs(dy) <= radius) {
                        cells.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return cells;
    }

    /**
     * Get cells in a cone
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} dirX - Direction X (-1, 0, 1)
     * @param {number} dirY - Direction Y (-1, 0, 1)
     * @param {number} range - Max range
     * @param {number} width - Cone width
     * @returns {Array} Array of {x, y} coordinates
     */
    getCone(x, y, dirX, dirY, range, width) {
        const cells = [];
        for (let r = 1; r <= range; r++) {
            for (let w = -Math.floor(width * r / range); w <= Math.floor(width * r / range); w++) {
                let nx, ny;
                if (Math.abs(dirX) > Math.abs(dirY)) {
                    nx = x + dirX * r;
                    ny = y + w;
                } else {
                    nx = x + w;
                    ny = y + dirY * r;
                }
                if (this.isValidPosition(nx, ny)) {
                    cells.push({ x: nx, y: ny });
                }
            }
        }
        return cells;
    }

    /**
     * Get all entities on the battlefield
     * @returns {Array} Array of entities with positions
     */
    getAllEntities() {
        const entities = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x]) {
                    entities.push({
                        entity: this.grid[y][x],
                        x,
                        y
                    });
                }
            }
        }
        return entities;
    }

    /**
     * Get state for serialization
     * @returns {Object} State object
     */
    getState() {
        return {
            width: this.width,
            height: this.height,
            grid: this.grid.map(row => row.map(cell => cell ? cell.id : null))
        };
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Battlefield;
} else if (typeof window !== 'undefined') {
    window.Battlefield = Battlefield;
}
