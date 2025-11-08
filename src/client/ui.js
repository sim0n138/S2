/**
 * Client UI module
 * Manages UI rendering and user interactions
 * @module client/ui
 */

class GameUI {
    /**
     * Create a new UI manager
     * @param {NetworkClient} netClient - Network client
     */
    constructor(netClient) {
        this.net = netClient;
        this.state = null;
        this.battlefieldGrid = null;
        this.selectedCard = null;
        
        this.setupNetworkHandlers();
    }

    /**
     * Setup network message handlers
     */
    setupNetworkHandlers() {
        this.net.on('CONNECTED', (msg) => {
            this.showStatus('Connected to server');
        });

        this.net.on('QUEUED', (msg) => {
            this.showStatus(`In queue (position ${msg.position})`);
        });

        this.net.on('MATCHED', (msg) => {
            this.showStatus(`Match found! You are ${msg.side}`);
            this.showClassSelection();
        });

        this.net.on('CLASS_PICKED', (msg) => {
            this.showStatus('Class picked, waiting for opponent...');
        });

        this.net.on('BOTH_PICKED', (msg) => {
            this.showStatus('Both classes picked! Preparing battle...');
            // Auto-ready after a moment
            setTimeout(() => {
                this.net.ready();
            }, 1000);
        });

        this.net.on('STATE', (msg) => {
            this.state = msg.state;
            this.renderState();
        });

        this.net.on('RESULT', (msg) => {
            this.showResult(msg.result);
        });

        this.net.on('ERROR', (msg) => {
            this.showError(msg.message);
        });

        this.net.on('DISCONNECTED', () => {
            this.showError('Disconnected from server');
        });
    }

    /**
     * Initialize UI
     */
    init() {
        // Show connection UI
        this.showConnectionScreen();
    }

    /**
     * Show connection screen
     */
    showConnectionScreen() {
        const container = document.getElementById('game-container') || document.body;
        
        container.innerHTML = `
            <div class="connection-screen">
                <h1>S2 Card Game</h1>
                <input type="text" id="player-name" placeholder="Enter your name" value="Player">
                <button id="connect-btn">Connect & Join Queue</button>
                <div id="status"></div>
            </div>
        `;

        document.getElementById('connect-btn').addEventListener('click', () => {
            this.handleConnect();
        });
    }

    /**
     * Handle connect button
     */
    async handleConnect() {
        const playerName = document.getElementById('player-name').value || 'Player';
        
        try {
            this.showStatus('Connecting...');
            await this.net.connect();
            this.net.joinQueue(playerName);
        } catch (error) {
            this.showError('Failed to connect: ' + error.message);
        }
    }

    /**
     * Show class selection
     */
    showClassSelection() {
        const container = document.getElementById('game-container') || document.body;
        
        container.innerHTML = `
            <div class="class-selection">
                <h2>Select Your Class</h2>
                <div class="class-cards">
                    <div class="class-card" data-class="warrior">
                        <h3>⚔️ Воин</h3>
                        <p>High HP, Physical damage</p>
                    </div>
                    <div class="class-card" data-class="mage">
                        <h3>🔮 Маг</h3>
                        <p>High damage, Low HP</p>
                    </div>
                    <div class="class-card" data-class="priest">
                        <h3>✨ Жрец</h3>
                        <p>Balanced, Healing</p>
                    </div>
                </div>
                <div id="status"></div>
            </div>
        `;

        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                const classId = card.dataset.class;
                this.net.pickClass(classId);
                document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    /**
     * Render current game state
     */
    renderState() {
        if (!this.state) return;

        const container = document.getElementById('game-container') || document.body;
        
        // Create battlefield UI if not exists
        if (!document.getElementById('battlefield')) {
            container.innerHTML = `
                <div class="battle-screen">
                    <div class="player-panel top">
                        <div class="player-info">
                            <div class="player-name" id="opponent-name"></div>
                            <div class="resources">
                                <div class="hp-orb">
                                    <span id="opponent-hp">0/0</span>
                                </div>
                                <div class="mana-orb">
                                    <span id="opponent-mana">0/0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="battlefield-container">
                        <div class="talents-left"></div>
                        <div id="battlefield"></div>
                        <div class="talents-right"></div>
                    </div>
                    
                    <div class="player-panel bottom">
                        <div class="player-info">
                            <div class="player-name" id="player-name"></div>
                            <div class="resources">
                                <div class="hp-orb">
                                    <span id="player-hp">0/0</span>
                                </div>
                                <div class="mana-orb">
                                    <span id="player-mana">0/0</span>
                                </div>
                            </div>
                        </div>
                        <div class="hand" id="hand"></div>
                        <div class="actions">
                            <button id="end-turn-btn">End Turn</button>
                            <button id="surrender-btn">Surrender</button>
                        </div>
                    </div>
                    
                    <div class="combat-log" id="combat-log"></div>
                    <div id="status"></div>
                </div>
            `;

            // Setup action buttons
            document.getElementById('end-turn-btn').addEventListener('click', () => {
                this.net.endTurn();
            });

            document.getElementById('surrender-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to surrender?')) {
                    this.net.surrender();
                }
            });
        }

        // Update player info
        const myPlayer = this.state[this.net.side];
        const opponentSide = this.net.side === 'player1' ? 'player2' : 'player1';
        const opponent = this.state[opponentSide];

        document.getElementById('player-name').textContent = myPlayer.name;
        document.getElementById('player-hp').textContent = `${myPlayer.hp}/${myPlayer.maxHp}`;
        document.getElementById('player-mana').textContent = `${myPlayer.mana}/${myPlayer.maxMana}`;

        document.getElementById('opponent-name').textContent = opponent.name;
        document.getElementById('opponent-hp').textContent = `${opponent.hp}/${opponent.maxHp}`;
        document.getElementById('opponent-mana').textContent = `${opponent.mana}/${opponent.maxMana}`;

        // Render battlefield
        this.renderBattlefield();

        // Render hand (simplified - no actual deck yet)
        this.renderHand(myPlayer);

        // Update turn indicator
        const isMyTurn = this.state.currentSide === this.net.side;
        const statusMsg = isMyTurn ? '🎯 YOUR TURN' : '⏳ Opponent\'s Turn';
        this.showStatus(statusMsg + ` (Turn ${this.state.turn})`);

        // Enable/disable actions
        document.getElementById('end-turn-btn').disabled = !isMyTurn;
    }

    /**
     * Render battlefield grid
     */
    renderBattlefield() {
        const battlefield = document.getElementById('battlefield');
        if (!battlefield) return;

        const grid = this.state.battlefield.grid;
        const height = grid.length;
        const width = grid[0].length;

        battlefield.innerHTML = '';
        battlefield.style.display = 'grid';
        battlefield.style.gridTemplateColumns = `repeat(${width}, 60px)`;
        battlefield.style.gridTemplateRows = `repeat(${height}, 60px)`;
        battlefield.style.gap = '2px';

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'battlefield-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const entityId = grid[y][x];
                if (entityId) {
                    cell.classList.add('occupied');
                    cell.textContent = entityId === this.net.side ? '👤' : '👾';
                }

                battlefield.appendChild(cell);
            }
        }
    }

    /**
     * Render hand (simplified)
     */
    renderHand(player) {
        const handElement = document.getElementById('hand');
        if (!handElement) return;

        handElement.innerHTML = '';

        // For now, just show that cards will be here
        handElement.innerHTML = '<div class="hand-placeholder">Hand (cards coming soon)</div>';
    }

    /**
     * Show result screen
     * @param {Object} result - Result object
     */
    showResult(result) {
        const container = document.getElementById('game-container') || document.body;
        
        let message = '';
        if (result.winner === 'draw') {
            message = 'Draw!';
        } else if (result.winner === this.net.side) {
            message = '🎉 Victory!';
        } else {
            message = '💀 Defeat';
        }

        container.innerHTML = `
            <div class="result-screen">
                <h1>${message}</h1>
                <p>Reason: ${result.reason}</p>
                <button onclick="location.reload()">Play Again</button>
            </div>
        `;
    }

    /**
     * Show status message
     * @param {string} message - Status message
     */
    showStatus(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = 'status';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = '❌ ' + message;
            status.className = 'status error';
        }
        console.error(message);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.GameUI = GameUI;
}
