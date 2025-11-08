# S2 Game - Setup and Development Guide

## Overview

S2 Game is an online dueling CCG (Collectible Card Game) with:
- Grid-based battlefield (4×3 configurable)
- Card system with decks
- Talent trees
- Authoritative server architecture
- Deterministic combat with replay support

## Project Structure

```
S2Game/
├── data/                    # Game data (JSON)
│   ├── config.json         # Game configuration
│   ├── classes.json        # Class definitions
│   ├── cards.json          # Card definitions
│   └── talents.json        # Talent trees
├── src/
│   ├── client/             # Client-side code
│   │   ├── net.js         # Network client
│   │   └── ui.js          # UI manager
│   ├── server/             # Server-side code
│   │   └── server.js      # Game server
│   └── shared/             # Shared modules
│       ├── combat/         # Combat logic
│       │   ├── rng.js     # Deterministic RNG
│       │   ├── battlefield.js  # Grid management
│       │   ├── deck.js    # Deck management
│       │   └── combat.js  # Core combat
│       └── schemas/        # JSON schemas
├── tests/                  # Test files
│   ├── character.test.js  # Legacy tests
│   └── combat/            # Combat module tests
├── client.html            # New client UI
├── index.html             # Legacy client UI
└── game.js                # Legacy game code

```

## Prerequisites

- Node.js v16 or higher
- npm (comes with Node.js)
- A modern web browser

## Installation

```bash
# Clone the repository
git clone https://github.com/sim0n138/S2Game.git
cd S2Game

# Install dependencies
npm install
```

## Running the Game

### Option 1: Full Online Mode (Server + Clients)

#### 1. Start the Server

```bash
npm run dev:server
```

The server will start on port 3000 (configurable in `data/config.json`).

You should see:
```
🎮 Game server started on port 3000
📡 WebSocket server ready for connections
```

#### 2. Start Client(s)

Open `client.html` in your browser:

**Method A: Direct file**
```bash
# Open in browser
open client.html  # macOS
xdg-open client.html  # Linux
start client.html  # Windows
```

**Method B: HTTP Server**
```bash
# In a new terminal
npm run dev:client
# Then open http://localhost:8080/client.html
```

#### 3. Play

- Open `client.html` in **two different browser windows** (or tabs)
- Enter player names
- Click "Connect & Join Queue"
- Both players will be matched automatically
- Select your class
- Battle begins!

### Option 2: Legacy Single-Player Mode

Open `index.html` in your browser to play the original single-player game against AI.

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Combat module tests only
npm run test:combat

# Legacy character tests
node --test tests/character.test.js
```

## Development

### Server Development

The server (`src/server/server.js`) handles:
- WebSocket connections
- Matchmaking queue
- Authoritative game state
- Action validation
- State synchronization

To modify server behavior:
1. Edit `src/server/server.js`
2. Restart the server
3. Test with clients

### Client Development

The client consists of:
- `src/client/net.js` - Network communication
- `src/client/ui.js` - UI rendering and interactions
- `client.html` - HTML structure and styles

To modify client:
1. Edit the relevant files
2. Refresh browser (no build step needed)

### Shared Combat Logic

The shared combat modules are used by both client and server:
- `src/shared/combat/combat.js` - Pure combat functions
- `src/shared/combat/rng.js` - Deterministic random
- `src/shared/combat/battlefield.js` - Grid management
- `src/shared/combat/deck.js` - Deck/hand management

Changes here affect both sides. Always run tests after modifying.

### Data Configuration

Game data is in JSON files under `data/`:
- `config.json` - Game parameters (damage, cooldowns, etc.)
- `classes.json` - Class stats and starting cards
- `cards.json` - Card definitions
- `talents.json` - Talent tree definitions

These are validated against schemas in `src/shared/schemas/`.

## Network Protocol

### Client → Server Messages

- `JOIN` - Join matchmaking queue
- `PICK_CLASS` - Select a class
- `READY` - Signal ready to start
- `PLAY_CARD` - Play a card
- `END_TURN` - End current turn
- `SURRENDER` - Forfeit match

### Server → Client Messages

- `CONNECTED` - Connection established
- `QUEUED` - In matchmaking queue
- `MATCHED` - Match found
- `CLASS_PICKED` - Class selection confirmed
- `BOTH_PICKED` - Both players ready
- `STATE` - Game state update
- `RESULT` - Match ended
- `ERROR` - Error message

All messages are JSON with a `type` field.

## Configuration

### Server Port

Edit `data/config.json`:
```json
{
  "server": {
    "port": 3000
  }
}
```

### Game Balance

Edit values in `data/config.json`:
```json
{
  "combat": {
    "critChance": 0.25,
    "critMultiplier": 1.5,
    "manaRegenPerTurn": 10
  }
}
```

### Battlefield Size

```json
{
  "battlefield": {
    "width": 4,
    "height": 3
  }
}
```

## Troubleshooting

### Server won't start

- Check if port 3000 is already in use
- Run: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill the process or change the port in config

### Client can't connect

- Make sure server is running first
- Check browser console for errors
- Verify WebSocket URL in `client.html` matches server address

### Tests failing

- Run `npm install` to ensure dependencies are installed
- Check Node.js version: `node --version` (should be v16+)

## Known Limitations

Current implementation:
- ✅ Server architecture with WebSocket
- ✅ Matchmaking system
- ✅ Grid-based battlefield
- ✅ Deterministic RNG
- ✅ Core combat module
- ⏳ Card drawing/playing (in progress)
- ⏳ Talent system (data ready, not integrated)
- ⏳ Full UI with cards
- ⏳ Reconnection support
- ⏳ Replay system

## Next Steps

1. Integrate deck system into matches
2. Implement card playing mechanics
3. Add talent selection UI
4. Implement reconnection
5. Add replay recording/playback
6. Performance optimization
7. Add more cards and classes

## Support

For issues or questions:
- Check existing issues on GitHub
- Create a new issue with detailed description
- Include console output and browser info

## License

ISC License
