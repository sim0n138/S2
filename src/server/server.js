/**
 * Game server with WebSocket support
 * Handles matchmaking, authoritative game state, and player connections
 * @module server/server
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/config.json'), 'utf8'));
const classesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/classes.json'), 'utf8'));
const cardsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/cards.json'), 'utf8'));

// Import shared modules
const Combat = require('../shared/combat/combat');
const RNG = require('../shared/combat/rng');

const PORT = config.server?.port || 3000;

class GameServer {
    constructor(port) {
        this.port = port;
        this.wss = null;
        this.clients = new Map(); // clientId -> {ws, playerId, state}
        this.matches = new Map(); // matchId -> Match
        this.queue = []; // Array of waiting players
        this.nextMatchId = 1;
        this.nextClientId = 1;
    }

    /**
     * Start the server
     */
    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });

        console.log(`🎮 Game server started on port ${this.port}`);
        console.log(`📡 WebSocket server ready for connections`);
    }

    /**
     * Handle new client connection
     * @param {WebSocket} ws - WebSocket connection
     */
    handleConnection(ws) {
        const clientId = `client_${this.nextClientId++}`;
        
        this.clients.set(clientId, {
            ws,
            playerId: null,
            state: 'CONNECTED'
        });

        console.log(`✅ Client connected: ${clientId}`);

        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });

        ws.on('close', () => {
            this.handleDisconnect(clientId);
        });

        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for ${clientId}:`, error);
        });

        // Send welcome message
        this.sendToClient(clientId, {
            type: 'CONNECTED',
            clientId,
            version: '1.0.0'
        });
    }

    /**
     * Handle incoming message from client
     * @param {string} clientId - Client ID
     * @param {Buffer} data - Message data
     */
    handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data.toString());
            
            console.log(`📨 Message from ${clientId}:`, message.type);

            switch (message.type) {
                case 'JOIN':
                    this.handleJoin(clientId, message);
                    break;
                case 'PICK_CLASS':
                    this.handlePickClass(clientId, message);
                    break;
                case 'READY':
                    this.handleReady(clientId, message);
                    break;
                case 'PLAY_CARD':
                    this.handlePlayCard(clientId, message);
                    break;
                case 'END_TURN':
                    this.handleEndTurn(clientId, message);
                    break;
                case 'SURRENDER':
                    this.handleSurrender(clientId, message);
                    break;
                default:
                    this.sendError(clientId, 'Unknown message type');
            }
        } catch (error) {
            console.error(`❌ Error handling message from ${clientId}:`, error);
            this.sendError(clientId, 'Invalid message format');
        }
    }

    /**
     * Handle JOIN request - add to matchmaking queue
     * @param {string} clientId - Client ID
     * @param {Object} message - Message data
     */
    handleJoin(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.playerId = message.playerId || clientId;
        client.playerName = message.playerName || 'Player';
        client.state = 'QUEUED';

        this.queue.push(clientId);
        
        this.sendToClient(clientId, {
            type: 'QUEUED',
            position: this.queue.length
        });

        console.log(`🎯 Player ${client.playerName} joined queue (${this.queue.length} waiting)`);

        // Try to match
        this.tryMatchmaking();
    }

    /**
     * Try to create matches from queue
     */
    tryMatchmaking() {
        while (this.queue.length >= 2) {
            const client1Id = this.queue.shift();
            const client2Id = this.queue.shift();

            const client1 = this.clients.get(client1Id);
            const client2 = this.clients.get(client2Id);

            if (!client1 || !client2) continue;

            this.createMatch(client1Id, client2Id);
        }
    }

    /**
     * Create a new match
     * @param {string} client1Id - Player 1 client ID
     * @param {string} client2Id - Player 2 client ID
     */
    createMatch(client1Id, client2Id) {
        const matchId = `match_${this.nextMatchId++}`;
        const seed = Date.now();

        const client1 = this.clients.get(client1Id);
        const client2 = this.clients.get(client2Id);

        const match = {
            id: matchId,
            seed,
            player1: {
                clientId: client1Id,
                playerId: client1.playerId,
                name: client1.playerName,
                side: 'player1',
                classId: null,
                ready: false
            },
            player2: {
                clientId: client2Id,
                playerId: client2.playerId,
                name: client2.playerName,
                side: 'player2',
                classId: null,
                ready: false
            },
            state: null,
            phase: 'PICK'
        };

        this.matches.set(matchId, match);
        client1.matchId = matchId;
        client2.matchId = matchId;
        client1.state = 'PICK';
        client2.state = 'PICK';

        // Notify both players
        this.sendToClient(client1Id, {
            type: 'MATCHED',
            matchId,
            side: 'player1',
            seed,
            opponent: {
                name: client2.playerName
            }
        });

        this.sendToClient(client2Id, {
            type: 'MATCHED',
            matchId,
            side: 'player2',
            seed,
            opponent: {
                name: client1.playerName
            }
        });

        console.log(`🎮 Match created: ${matchId} (${client1.playerName} vs ${client2.playerName})`);
    }

    /**
     * Handle PICK_CLASS request
     * @param {string} clientId - Client ID
     * @param {Object} message - Message {classId}
     */
    handlePickClass(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.matchId) {
            return this.sendError(clientId, 'Not in a match');
        }

        const match = this.matches.get(client.matchId);
        if (!match) {
            return this.sendError(clientId, 'Match not found');
        }

        const player = match.player1.clientId === clientId ? match.player1 : match.player2;
        
        if (!classesData.classes[message.classId]) {
            return this.sendError(clientId, 'Invalid class');
        }

        player.classId = message.classId;
        client.state = 'PICKED';

        this.sendToClient(clientId, {
            type: 'CLASS_PICKED',
            classId: message.classId
        });

        console.log(`👤 ${player.name} picked class: ${message.classId}`);

        // Check if both players picked
        if (match.player1.classId && match.player2.classId) {
            match.phase = 'READY';
            this.notifyBothPlayers(match, {
                type: 'BOTH_PICKED',
                player1Class: match.player1.classId,
                player2Class: match.player2.classId
            });
        }
    }

    /**
     * Handle READY request
     * @param {string} clientId - Client ID
     * @param {Object} message - Message
     */
    handleReady(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.matchId) {
            return this.sendError(clientId, 'Not in a match');
        }

        const match = this.matches.get(client.matchId);
        if (!match) {
            return this.sendError(clientId, 'Match not found');
        }

        const player = match.player1.clientId === clientId ? match.player1 : match.player2;
        player.ready = true;

        console.log(`✅ ${player.name} is ready`);

        // Start game if both ready
        if (match.player1.ready && match.player2.ready) {
            this.startMatch(match);
        }
    }

    /**
     * Start the match
     * @param {Object} match - Match object
     */
    startMatch(match) {
        // Initialize game state
        const player1Data = {
            id: match.player1.playerId,
            name: match.player1.name,
            classId: match.player1.classId,
            side: 'player1',
            classData: classesData.classes[match.player1.classId]
        };

        const player2Data = {
            id: match.player2.playerId,
            name: match.player2.name,
            classId: match.player2.classId,
            side: 'player2',
            classData: classesData.classes[match.player2.classId]
        };

        match.state = Combat.createMatch(config, match.seed, player1Data, player2Data);
        match.state.matchId = match.id;
        match.phase = 'TURN';

        console.log(`🎲 Match ${match.id} started!`);

        // Send initial state to both players
        this.broadcastState(match);
    }

    /**
     * Handle PLAY_CARD action
     * @param {string} clientId - Client ID
     * @param {Object} message - Message {cardId, targets}
     */
    handlePlayCard(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.matchId) {
            return this.sendError(clientId, 'Not in a match');
        }

        const match = this.matches.get(client.matchId);
        if (!match || !match.state) {
            return this.sendError(clientId, 'Match not started');
        }

        const side = match.player1.clientId === clientId ? 'player1' : 'player2';
        
        if (match.state.currentSide !== side) {
            return this.sendError(clientId, 'Not your turn');
        }

        try {
            const action = {
                type: 'PLAY_CARD',
                side,
                cardId: message.cardId,
                targets: message.targets || []
            };

            match.state = Combat.applyAction(match.state, action);

            console.log(`🃏 ${side} played card: ${message.cardId}`);

            // Broadcast updated state
            this.broadcastState(match);

            // Check for game over
            this.checkMatchEnd(match);
        } catch (error) {
            console.error('Error applying action:', error);
            this.sendError(clientId, error.message);
        }
    }

    /**
     * Handle END_TURN action
     * @param {string} clientId - Client ID
     * @param {Object} message - Message
     */
    handleEndTurn(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.matchId) {
            return this.sendError(clientId, 'Not in a match');
        }

        const match = this.matches.get(client.matchId);
        if (!match || !match.state) {
            return this.sendError(clientId, 'Match not started');
        }

        const side = match.player1.clientId === clientId ? 'player1' : 'player2';
        
        if (match.state.currentSide !== side) {
            return this.sendError(clientId, 'Not your turn');
        }

        try {
            const action = { type: 'END_TURN', side };
            match.state = Combat.applyAction(match.state, action);

            console.log(`⏭️  ${side} ended turn (Turn ${match.state.turn})`);

            // Broadcast updated state
            this.broadcastState(match);

            // Check for game over
            this.checkMatchEnd(match);
        } catch (error) {
            console.error('Error ending turn:', error);
            this.sendError(clientId, error.message);
        }
    }

    /**
     * Handle SURRENDER action
     * @param {string} clientId - Client ID
     * @param {Object} message - Message
     */
    handleSurrender(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.matchId) {
            return this.sendError(clientId, 'Not in a match');
        }

        const match = this.matches.get(client.matchId);
        if (!match || !match.state) {
            return this.sendError(clientId, 'Match not started');
        }

        const side = match.player1.clientId === clientId ? 'player1' : 'player2';

        try {
            const action = { type: 'SURRENDER', side };
            match.state = Combat.applyAction(match.state, action);

            console.log(`🏳️  ${side} surrendered`);

            // Broadcast result
            this.broadcastState(match);
            this.endMatch(match);
        } catch (error) {
            console.error('Error surrendering:', error);
            this.sendError(clientId, error.message);
        }
    }

    /**
     * Check if match has ended
     * @param {Object} match - Match object
     */
    checkMatchEnd(match) {
        const result = Combat.isTerminal(match.state);
        if (result) {
            this.endMatch(match);
        }
    }

    /**
     * End the match
     * @param {Object} match - Match object
     */
    endMatch(match) {
        const result = match.state.result;
        
        this.notifyBothPlayers(match, {
            type: 'RESULT',
            result
        });

        console.log(`🏁 Match ${match.id} ended: ${result.winner} (${result.reason})`);

        // Clean up
        setTimeout(() => {
            this.matches.delete(match.id);
        }, 60000); // Keep match for 1 minute for replay
    }

    /**
     * Broadcast current state to both players
     * @param {Object} match - Match object
     */
    broadcastState(match) {
        const stateSnapshot = this.createStateSnapshot(match.state);
        
        this.notifyBothPlayers(match, {
            type: 'STATE',
            state: stateSnapshot
        });
    }

    /**
     * Create serializable state snapshot
     * @param {Object} state - Game state
     * @returns {Object} Snapshot
     */
    createStateSnapshot(state) {
        return {
            version: state.version,
            matchId: state.matchId,
            turn: state.turn,
            phase: state.phase,
            currentSide: state.currentSide,
            player1: this.serializePlayer(state.player1),
            player2: this.serializePlayer(state.player2),
            battlefield: state.battlefield.getState(),
            result: state.result
        };
    }

    /**
     * Serialize player state
     * @param {Object} player - Player state
     * @returns {Object} Serialized player
     */
    serializePlayer(player) {
        return {
            id: player.id,
            name: player.name,
            classId: player.classId,
            hp: player.hp,
            maxHp: player.maxHp,
            mana: player.mana,
            maxMana: player.maxMana,
            position: player.position,
            buffs: player.buffs,
            debuffs: player.debuffs,
            cooldowns: player.cooldowns,
            isAlive: player.isAlive,
            isStunned: player.isStunned,
            isFrozen: player.isFrozen,
            deck: player.deck ? player.deck.getState() : null
        };
    }

    /**
     * Send message to both players in match
     * @param {Object} match - Match object
     * @param {Object} message - Message to send
     */
    notifyBothPlayers(match, message) {
        this.sendToClient(match.player1.clientId, message);
        this.sendToClient(match.player2.clientId, message);
    }

    /**
     * Send message to client
     * @param {string} clientId - Client ID
     * @param {Object} message - Message object
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            client.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error(`Error sending to ${clientId}:`, error);
        }
    }

    /**
     * Send error message to client
     * @param {string} clientId - Client ID
     * @param {string} message - Error message
     */
    sendError(clientId, message) {
        this.sendToClient(clientId, {
            type: 'ERROR',
            message
        });
    }

    /**
     * Handle client disconnect
     * @param {string} clientId - Client ID
     */
    handleDisconnect(clientId) {
        console.log(`❌ Client disconnected: ${clientId}`);

        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from queue if waiting
        const queueIndex = this.queue.indexOf(clientId);
        if (queueIndex > -1) {
            this.queue.splice(queueIndex, 1);
        }

        // Handle match disconnect (simplified - no reconnection yet)
        if (client.matchId) {
            const match = this.matches.get(client.matchId);
            if (match) {
                // Auto-surrender on disconnect
                const side = match.player1.clientId === clientId ? 'player1' : 'player2';
                console.log(`⚠️  Player disconnected from match, auto-surrendering`);
                
                if (match.state) {
                    try {
                        match.state = Combat.applyAction(match.state, { type: 'SURRENDER', side });
                        this.endMatch(match);
                    } catch (error) {
                        console.error('Error auto-surrendering:', error);
                    }
                }
            }
        }

        this.clients.delete(clientId);
    }
}

// Start server
const server = new GameServer(PORT);
server.start();

module.exports = GameServer;
