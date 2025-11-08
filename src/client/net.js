/**
 * Client networking module
 * Handles WebSocket connection to game server
 * @module client/net
 */

class NetworkClient {
    /**
     * Create a new network client
     * @param {string} serverUrl - WebSocket server URL
     */
    constructor(serverUrl = 'ws://localhost:3000') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.clientId = null;
        this.matchId = null;
        this.side = null;
        this.connected = false;
        this.handlers = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Connect to server
     * @returns {Promise} Resolves when connected
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('✅ Connected to game server');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from server');
                    this.connected = false;
                    this.handleDisconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle incoming message
     * @param {string} data - Message data
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            console.log('📨 Received:', message.type);

            // Store connection info
            if (message.type === 'CONNECTED') {
                this.clientId = message.clientId;
            }

            if (message.type === 'MATCHED') {
                this.matchId = message.matchId;
                this.side = message.side;
            }

            // Call registered handler
            const handler = this.handlers[message.type];
            if (handler) {
                handler(message);
            }

            // Call generic handler
            if (this.handlers['*']) {
                this.handlers['*'](message);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    /**
     * Register message handler
     * @param {string} type - Message type or '*' for all
     * @param {Function} handler - Handler function
     */
    on(type, handler) {
        this.handlers[type] = handler;
    }

    /**
     * Send message to server
     * @param {Object} message - Message object
     */
    send(message) {
        if (!this.connected || !this.ws) {
            console.warn('Not connected to server');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    /**
     * Join matchmaking queue
     * @param {string} playerName - Player name
     */
    joinQueue(playerName = 'Player') {
        this.send({
            type: 'JOIN',
            playerId: this.clientId,
            playerName
        });
    }

    /**
     * Pick a class
     * @param {string} classId - Class ID
     */
    pickClass(classId) {
        this.send({
            type: 'PICK_CLASS',
            classId
        });
    }

    /**
     * Signal ready to start
     */
    ready() {
        this.send({
            type: 'READY'
        });
    }

    /**
     * Play a card
     * @param {string} cardId - Card ID
     * @param {Array} targets - Target coordinates
     */
    playCard(cardId, targets = []) {
        this.send({
            type: 'PLAY_CARD',
            cardId,
            targets
        });
    }

    /**
     * End current turn
     */
    endTurn() {
        this.send({
            type: 'END_TURN'
        });
    }

    /**
     * Surrender the match
     */
    surrender() {
        this.send({
            type: 'SURRENDER'
        });
    }

    /**
     * Handle disconnect
     */
    handleDisconnect() {
        this.connected = false;
        
        // Notify handlers
        if (this.handlers['DISCONNECTED']) {
            this.handlers['DISCONNECTED']();
        }

        // Attempt reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, 2000 * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached');
            if (this.handlers['CONNECTION_FAILED']) {
                this.handlers['CONNECTION_FAILED']();
            }
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.maxReconnectAttempts = 0; // Prevent reconnection
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    /**
     * Check if connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.NetworkClient = NetworkClient;
}
