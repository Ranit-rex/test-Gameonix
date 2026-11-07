# Universal RTDB Multiplayer Contract

All multiplayer games except **Ghost Night** and **Ashgrave** use one shared Realtime Database namespace. Do not add per-game branches or per-game rules.

## Paths

- Waiting/public/private rooms: `multiplayer/rooms/{ROOM_CODE}`
- Match envelope and game state: `multiplayer/matches/{MATCH_ID}`
- Game-specific mutable data: `multiplayer/matches/{MATCH_ID}/state`

## Room envelope

Every game must create a room with this common shape:

```js
{
  roomId: code,
  gameId: "your-game-id", // stable unique slug
  mode: "solo|versus|coop|team|your-mode",
  gameSlug: "your-game-id", // optional legacy display compatibility
  gameTitle: "Your Game",
  hostUid: auth.currentUser.uid,
  hostName: playerName,
  members: {
    [auth.currentUser.uid]: {
      uid: auth.currentUser.uid,
      name: playerName,
      joinedAt: Date.now(),
      lastSeen: Date.now()
    }
  },
  status: "waiting",
  visibility: "public",
  maxPlayers: 4,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

## Match envelope

Create one match at `multiplayer/matches` and store all game-specific fields inside `state`:

```js
{
  gameId: "your-game-id",
  hostUid: auth.currentUser.uid,
  roomCode: code,
  createdAt: Date.now(),
  state: {
    // game-specific fields: board, score, round, chat, players, etc.
  }
}
```

## Required matchmaking behaviour

1. Always filter discovered rooms by exact `gameId` and `status === "waiting"`. Never show another game's rooms.
2. When joining, validate the room's `gameId`, status, and player capacity before writing the member record.
3. Only the room host starts the match and updates room `status` / `matchId`.
4. Read match state only after the player is a room member.
5. Keep all game-specific writes below the match `state` node. Do not add new root-level match fields or custom RTDB rules.
6. Update the current player's `members/{uid}/lastSeen` heartbeat and remove the player on leave. Host can close the room.
7. Treat a room as stale after 30 minutes without an update; clients should ignore stale rooms and hosts should close them when practical.

## Firebase Rules

The generic wildcard rules in `database.rules.json` validate the shared room/match envelope and member access. A new game only needs a unique `gameId`, its mode, and the common room/match shape. No new RTDB rules are required.

Ghost Night and Ashgrave remain on their existing dedicated paths and are intentionally not migrated by this contract.
