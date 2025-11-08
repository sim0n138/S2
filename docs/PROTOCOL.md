# S2 Game Network Protocol

## Overview

The S2 Game uses WebSocket for real-time bidirectional communication between clients and the authoritative server. All messages are JSON-formatted with versioning support.

## Message Structure

All messages follow this base structure:

```json
{
  "type": "MESSAGE_TYPE",
  "v": "1.0.0",
  ...additionalFields
}
```

- `type` (required): Message type identifier (string)
- `v` (optional): Protocol version (default: "1.0.0")
- Additional fields specific to message type

## Connection Flow

```
Client                                    Server
  |                                         |
  |-------- WebSocket Connect ------------->|
  |<------- CONNECTED (clientId) -----------|
  |                                         |
  |-------- JOIN (playerName) -------------->|
  |<------- QUEUED (position) --------------|
  |                                         |
  |         [Waiting for opponent...]       |
  |                                         |
  |<------- MATCHED (matchId, side) --------|
  |                                         |
  |-------- PICK_CLASS (classId) ----------->|
  |<------- CLASS_PICKED -------------------|
  |                                         |
  |         [Both players pick...]          |
  |                                         |
  |<------- BOTH_PICKED --------------------|
  |                                         |
  |-------- READY -------------------------->|
  |                                         |
  |         [Both players ready...]         |
  |                                         |
  |<------- STATE (initial game state) -----|
  |                                         |
  |         [Game loop...]                  |
  |                                         |
  |-------- PLAY_CARD / END_TURN ----------->|
  |<------- STATE (updated) ----------------|
  |                                         |
  |         [Game continues...]             |
  |                                         |
  |<------- RESULT (winner, reason) --------|
  |                                         |
```

## Client to Server Messages

### JOIN
Join the matchmaking queue.

**Request:**
```json
{
  "type": "JOIN",
  "playerId": "optional-player-id",
  "playerName": "Player Name"
}
```

**Fields:**
- `playerId` (optional): Persistent player identifier
- `playerName` (required): Display name

**Response:** `QUEUED` or `ERROR`

---

### PICK_CLASS
Select a character class.

**Request:**
```json
{
  "type": "PICK_CLASS",
  "classId": "warrior"
}
```

**Fields:**
- `classId` (required): Class identifier ("warrior", "mage", "priest")

**Response:** `CLASS_PICKED` or `ERROR`

---

### READY
Signal ready to start the match.

**Request:**
```json
{
  "type": "READY"
}
```

**Response:** Match starts when both players ready → `STATE`

---

### PLAY_CARD
Play a card from hand.

**Request:**
```json
{
  "type": "PLAY_CARD",
  "cardId": "fireball",
  "targets": [
    {"x": 2, "y": 1}
  ]
}
```

**Fields:**
- `cardId` (required): Card identifier
- `targets` (optional): Array of target coordinates

**Response:** `STATE` or `ERROR`

**Validation:**
- Card must be in hand
- Player must have enough mana
- Card must not be on cooldown
- Must be player's turn
- Targets must be valid for card's targeting type

---

### END_TURN
End the current turn.

**Request:**
```json
{
  "type": "END_TURN"
}
```

**Response:** `STATE` with updated turn

**Effects:**
- Buffs/debuffs tick down
- DoT damage applied
- Cooldowns reduced
- Mana regenerated
- Turn switches to opponent

---

### SURRENDER
Forfeit the match.

**Request:**
```json
{
  "type": "SURRENDER"
}
```

**Response:** `STATE` and `RESULT`

---

## Server to Client Messages

### CONNECTED
Sent immediately upon WebSocket connection.

**Message:**
```json
{
  "type": "CONNECTED",
  "clientId": "client_123",
  "version": "1.0.0"
}
```

**Fields:**
- `clientId`: Unique client identifier for this session
- `version`: Server protocol version

---

### QUEUED
Confirmation of joining matchmaking queue.

**Message:**
```json
{
  "type": "QUEUED",
  "position": 1
}
```

**Fields:**
- `position`: Position in queue

---

### MATCHED
Match found with opponent.

**Message:**
```json
{
  "type": "MATCHED",
  "matchId": "match_123",
  "side": "player1",
  "seed": 1234567890,
  "opponent": {
    "name": "Opponent Name"
  }
}
```

**Fields:**
- `matchId`: Unique match identifier
- `side`: Your side ("player1" or "player2")
- `seed`: Random seed for deterministic combat
- `opponent`: Opponent information

---

### CLASS_PICKED
Confirmation of class selection.

**Message:**
```json
{
  "type": "CLASS_PICKED",
  "classId": "warrior"
}
```

---

### BOTH_PICKED
Both players have selected classes.

**Message:**
```json
{
  "type": "BOTH_PICKED",
  "player1Class": "warrior",
  "player2Class": "mage"
}
```

---

### STATE
Full or partial game state update.

**Message:**
```json
{
  "type": "STATE",
  "state": {
    "version": "1.0.0",
    "matchId": "match_123",
    "turn": 5,
    "phase": "TURN",
    "currentSide": "player1",
    "player1": {
      "id": "p1",
      "name": "Player 1",
      "classId": "warrior",
      "hp": 1200,
      "maxHp": 1500,
      "mana": 60,
      "maxMana": 100,
      "position": {"x": 0, "y": 0},
      "buffs": [
        {
          "type": "shield",
          "absorbAmount": 200,
          "duration": 3,
          "name": "Shield"
        }
      ],
      "debuffs": [],
      "cooldowns": {
        "execute": 2
      },
      "isAlive": true,
      "isStunned": false,
      "isFrozen": false,
      "deck": {
        "drawPile": ["card1", "card2"],
        "hand": ["card3", "card4"],
        "discardPile": ["card5"],
        "exhaustPile": [],
        "maxHandSize": 10
      }
    },
    "player2": { /* same structure */ },
    "battlefield": {
      "width": 4,
      "height": 3,
      "grid": [
        ["player1", null, null, "player2"],
        [null, null, null, null],
        [null, null, null, null]
      ]
    },
    "result": null
  }
}
```

**State Fields:**
- `version`: Protocol version
- `matchId`: Match identifier
- `turn`: Current turn number
- `phase`: Game phase ("PICK", "READY", "TURN", "RESULT")
- `currentSide`: Whose turn ("player1" or "player2")
- `player1`, `player2`: Full player states
- `battlefield`: Grid state
- `result`: Game result if ended (null otherwise)

**Player State:**
- `id`: Player ID
- `name`: Display name
- `classId`: Class identifier
- `hp`, `maxHp`: Current and maximum health
- `mana`, `maxMana`: Current and maximum mana
- `position`: Grid coordinates `{x, y}` or null
- `buffs`: Active positive effects
- `debuffs`: Active negative effects
- `cooldowns`: Ability cooldowns `{abilityId: turnsRemaining}`
- `isAlive`: Alive status
- `isStunned`: Stunned status
- `isFrozen`: Frozen status
- `deck`: Deck state (draw pile, hand, discard, exhaust)

---

### RESULT
Match has ended.

**Message:**
```json
{
  "type": "RESULT",
  "result": {
    "winner": "player1",
    "reason": "death"
  }
}
```

**Fields:**
- `result.winner`: Winner side ("player1", "player2", or "draw")
- `result.reason`: End reason ("death", "surrender", "stalemate", "disconnect")

---

### ERROR
Error occurred processing request.

**Message:**
```json
{
  "type": "ERROR",
  "message": "Insufficient mana"
}
```

**Fields:**
- `message`: Human-readable error description

**Common Errors:**
- "Not in a match"
- "Match not found"
- "Invalid class"
- "Card not in hand"
- "Insufficient mana"
- "Ability on cooldown"
- "Not your turn"
- "Invalid message format"

---

## Game Phases

### PICK
Players select their classes.

**Actions:** `PICK_CLASS`

### READY
Both classes picked, waiting for ready signals.

**Actions:** `READY`

### TURN
Active gameplay, players take turns.

**Actions:** `PLAY_CARD`, `END_TURN`, `SURRENDER`

### RESULT
Match ended.

**Actions:** None (read-only)

---

## Security Considerations

### Server-Side Validation

All client actions are validated server-side:
1. **Authentication**: Client ID must be valid
2. **Authorization**: Player must be in the match
3. **Turn Validation**: Must be player's turn (except SURRENDER)
4. **Action Legality**: Action must be in `legalActions(state, side)`
5. **Resource Validation**: Sufficient mana, card in hand, etc.
6. **Targeting Validation**: Targets must be valid for ability

### Anti-Cheat Measures

1. **Authoritative Server**: All combat calculations on server
2. **Deterministic RNG**: Seed-based, server-controlled
3. **State Validation**: Client state is advisory only
4. **Rate Limiting**: Message flood protection (TODO)
5. **Action Logs**: All actions logged with seeds for replay

### Message Size Limits

Maximum message size: 64KB (configurable in `data/config.json`)

Exceeding this limit results in disconnection.

---

## Reconnection Protocol

**Status:** Planned (not yet implemented)

Intended flow:
1. Client disconnects
2. Server keeps match alive for `reconnectWindow` (5 minutes)
3. Client reconnects with same `matchId`
4. Server sends full `STATE` to sync
5. Match resumes

Current behavior: Disconnect triggers auto-surrender.

---

## Replay Protocol

**Status:** Planned (not yet implemented)

Replay format:
```json
{
  "version": "1.0.0",
  "matchId": "match_123",
  "seed": 1234567890,
  "player1Class": "warrior",
  "player2Class": "mage",
  "actions": [
    {"turn": 1, "side": "player1", "type": "PLAY_CARD", "cardId": "execute", "targets": [...]},
    {"turn": 1, "side": "player1", "type": "END_TURN"},
    {"turn": 2, "side": "player2", "type": "PLAY_CARD", "cardId": "fireball", "targets": [...]},
    ...
  ],
  "result": {"winner": "player1", "reason": "death"}
}
```

Replays can be:
1. Saved to server
2. Downloaded by clients
3. Replayed deterministically using same seed + actions

---

## Example Session

### Client 1 Connects
```
→ WebSocket Open
← {"type": "CONNECTED", "clientId": "client_1", "version": "1.0.0"}
```

### Client 1 Joins Queue
```
→ {"type": "JOIN", "playerName": "Alice"}
← {"type": "QUEUED", "position": 1}
```

### Client 2 Joins Queue
```
[Client 2 connects and joins...]
```

### Match Created
```
[To Client 1]
← {"type": "MATCHED", "matchId": "match_1", "side": "player1", "seed": 123, "opponent": {"name": "Bob"}}

[To Client 2]
← {"type": "MATCHED", "matchId": "match_1", "side": "player2", "seed": 123, "opponent": {"name": "Alice"}}
```

### Class Selection
```
[Client 1]
→ {"type": "PICK_CLASS", "classId": "warrior"}
← {"type": "CLASS_PICKED", "classId": "warrior"}

[Client 2]
→ {"type": "PICK_CLASS", "classId": "mage"}
← {"type": "CLASS_PICKED", "classId": "mage"}

[Both clients]
← {"type": "BOTH_PICKED", "player1Class": "warrior", "player2Class": "mage"}
```

### Ready and Start
```
[Both clients]
→ {"type": "READY"}

[Both clients receive initial state]
← {"type": "STATE", "state": {...}}
```

### Gameplay
```
[Client 1 - Turn 1]
→ {"type": "PLAY_CARD", "cardId": "execute", "targets": [{"x": 3, "y": 0}]}
← {"type": "STATE", "state": {...}}

→ {"type": "END_TURN"}
← {"type": "STATE", "state": {...}} [turn: 2, currentSide: "player2"]

[Client 2 - Turn 2]
→ {"type": "PLAY_CARD", "cardId": "fireball", "targets": [{"x": 0, "y": 0}]}
← {"type": "STATE", "state": {...}}
...
```

### Match End
```
[Both clients]
← {"type": "STATE", "state": {..., "result": {"winner": "player1", "reason": "death"}}}
← {"type": "RESULT", "result": {"winner": "player1", "reason": "death"}}
```

---

## Versioning

Current version: **1.0.0**

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible protocol changes
- **MINOR**: Backward-compatible additions
- **PATCH**: Bug fixes

Clients and servers must have compatible MAJOR versions.

---

## Rate Limiting

**Status:** Planned

Proposed limits:
- 10 messages per second per client
- 100 messages per minute per client
- Exponential backoff on violation

---

## Compression

**Status:** Not implemented

Future consideration: WebSocket compression (permessage-deflate) for large states.

---

## Error Codes

Currently errors use plain text messages. Future versions may use error codes:

```json
{
  "type": "ERROR",
  "code": "INSUFFICIENT_MANA",
  "message": "Not enough mana to play this card",
  "details": {
    "required": 40,
    "available": 25
  }
}
```

---

## Testing

Test the protocol using WebSocket client tools:
- Browser DevTools Console
- `wscat` command-line tool
- Postman WebSocket support

Example using `wscat`:
```bash
npm install -g wscat
wscat -c ws://localhost:3000
> {"type":"JOIN","playerName":"Test"}
< {"type":"QUEUED","position":1}
```

---

## Summary

The S2 Game protocol is designed for:
- ✅ Real-time bidirectional communication
- ✅ Authoritative server architecture
- ✅ Deterministic game state
- ✅ Clear error handling
- ✅ Extensible message format
- ⏳ Future replay support
- ⏳ Future reconnection support

All game logic is server-side to prevent cheating and ensure fair play.
