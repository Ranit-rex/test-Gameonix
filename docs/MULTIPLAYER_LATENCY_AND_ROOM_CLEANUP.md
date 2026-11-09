# Multiplayer latency and inactive room cleanup

## What changed
- Player movement writes are sent more frequently, but only after meaningful movement.
- Bomb Tag host-state sync is reduced from 500 ms to 200 ms.
- Antarctic player sync is reduced from 150 ms to 100 ms and host world sync from 500 ms to 250 ms.
- Room heartbeats update the member's `lastSeen` and the room's `updatedAt` together.
- Disaster Rush and Antarctic now send a heartbeat every 25 seconds while in a room.
- A scheduled Firebase Function runs every 15 minutes and removes rooms whose `updatedAt` is older than 30 minutes, including their linked match record. Active rooms stay alive because connected members refresh the heartbeat timestamp.

## One-time Firebase deployment requirement
Realtime Database does not run scheduled cleanup from a static HTML site. Deploy the scheduled function from the repository root:

```bash
npm install -g firebase-tools
firebase login
firebase use play-hub-688e
cd functions
npm install
cd ..
firebase deploy --only functions:cleanupInactiveMultiplayerRooms
```

Scheduled Cloud Functions require the Firebase project to use the Blaze billing plan and have billing enabled. The function is not active just because its source is committed to GitHub. The database index in `database.rules.json` must also be published to Realtime Database rules; preserve the existing rules and add `updatedAt` alongside `gameId` in the `multiplayer/rooms` `.indexOn` array.

## Safety
Cleanup uses a 30-minute inactivity threshold and a 15-minute schedule. It removes only stale room records and their linked match state. A room with any active member heartbeat is retained. This change does not modify Google sign-in or authentication.
