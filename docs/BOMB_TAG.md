# Bomb Tag — Playovia

## Game modes
- Solo: one human player versus five local AI bots. Bots pursue the bomb holder, evade when holding the bomb, and pass the bomb on contact.
- Multiplayer: 2–8 real authenticated players. No AI bots are added to online rooms.
- Controls: WASD / arrow keys on desktop and on-screen directional buttons on touch devices.
- The bomb automatically passes when the holder gets close to another living player. The fuse resets on each pass. The holder is eliminated when the fuse expires. Last living player wins.
- The room host starts the match and controls subsequent rounds.

## Multiplayer architecture
Bomb Tag uses the existing shared engine, not a new matchmaking implementation:
- Shared helper: `../../shared/multiplayer.js`
- Game ID: `bombtag`
- Rooms: `multiplayer/rooms/{ROOM_CODE}`
- Match envelope: `multiplayer/matches/{MATCH_ID}`
- Live game state: `multiplayer/matches/{MATCH_ID}/state`
- Room creation uses `PlayoviaMultiplayer.createRoom({ ..., gameId: 'bombtag', mode: 'versus', maxPlayers: 8 })`.
- Joining uses `PlayoviaMultiplayer.joinRoom`; public room discovery uses `listRooms({ gameId: 'bombtag' })`.
- Host starts with `PlayoviaMultiplayer.startMatch`. Members publish only their own position under `state/players/{uid}`; the host synchronizes bomb holder, fuse, eliminations and round result.
- Existing generic `multiplayer` RTDB rules already cover this room/match envelope. No Firebase rules or Google Login changes were required.

## Important safety boundaries
- Do not edit the homepage Google Login / Firebase Auth implementation to change Bomb Tag.
- Do not create a new RTDB root or per-game matchmaking schema.
- Do not add bots to multiplayer rooms.
- Keep the unique game ID `bombtag` so rooms from other games are never mixed in.

## Files
- `games/Bomb Tag/index.html`: game, solo AI, arena, controls, lobby and RTDB gameplay.
- `games/Bomb Tag/game.json`: homepage metadata.
- `games/Bomb Tag/cover.svg`: local cover art.

## Verification note
The game files were committed to the repository. A live two-device multiplayer session and Firebase rules were not independently exercised from this editing session; test with two signed-in accounts before announcing online multiplayer as production-verified.
