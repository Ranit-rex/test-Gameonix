# Disaster Rush

## Game overview
A Three.js 3D survival game for Playovia. Players survive a sequence of environmental disasters on a floating island.

## Modes
- Solo: one player survives for 60 seconds against the environment.
- Multiplayer: 2–8 real players in public rooms or private 8-character room-code matches. No bots are added to multiplayer.

## Technology
- Three.js r160 from CDN for the 3D scene.
- Existing `../../shared/multiplayer.js` helper for room creation, joining, public room discovery, host start, and room lifecycle.
- Firebase Realtime Database project `play-hub-688e8`, reusing the existing Playovia multiplayer paths.
- Existing PlayHub Firebase bridge is used when the game is opened inside the platform; standalone fallback uses Firebase anonymous auth.
- Game id: `disasterrush`.

## Controls
- Desktop: WASD / arrow keys to move; Space to jump.
- Mobile: on-screen directional pad and jump button.

## Disasters
- Meteor shower: falling meteors with impact zones.
- Earthquake: falling rock hazards and camera shake.
- Lava rise: rising lava ring.
- Tsunami: rising water that threatens the outer island.

## Files
- `games/Disaster Rush/index.html`: complete game and multiplayer client.
- `games/Disaster Rush/game.json`: discovery metadata; category is `Survival`.
- `games/Disaster Rush/cover.svg`: game card artwork.

## Notes
The game uses the same shared multiplayer service as the other standard Playovia games. Google login and the homepage authentication code were not changed for this game. Multiplayer needs a real two-device test before declaring the live session fully verified.
