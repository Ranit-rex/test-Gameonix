const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp({
  databaseURL: "https://play-hub-688e8-default-rtdb.asia-southeast1.firebasedatabase.app"
});

Object.assign(exports, require("./admin"));

const ROOM_TTL_MS = 60 * 60 * 1000;
const ROOM_PATHS = ["multiplayer/rooms", "rooms"];
const MATCH_PATHS = ["multiplayer/matches", "matches"];

async function cleanupRoomTree(db, roomPath, matchPath, now) {
  const cutoff = now - ROOM_TTL_MS;
  // Read only expired room metadata, never download the full matches/drawing tree.
  const snapshot = await db.ref(roomPath)
    .orderByChild("updatedAt")
    .endAt(cutoff)
    .once("value");
  const updates = {};
  let removedRooms = 0;
  let removedMatches = 0;

  snapshot.forEach(child => {
    const room = child.val() || {};
    const updatedAt = Number(room.updatedAt || room.createdAt || 0);
    if (!updatedAt || now - updatedAt < ROOM_TTL_MS) return;
    updates[`${roomPath}/${child.key}`] = null;
    removedRooms++;
    if (room.matchId && matchPath) {
      updates[`${matchPath}/${room.matchId}`] = null;
      removedMatches++;
    }
  });

  if (Object.keys(updates).length) await db.ref().update(updates);
  return { removedRooms, removedMatches };
}

// Server-side expiry: room and its match are removed after one hour without activity.
// The scheduler runs every five minutes, so cleanup happens within roughly 5 minutes
// after the one-hour expiry threshold. Active rooms stay alive via room.updatedAt heartbeat.
exports.cleanupInactiveMultiplayerRooms = onSchedule(
  { schedule: "every 5 minutes", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    const db = getDatabase();
    const now = Date.now();
    const results = [];
    for (const roomPath of ROOM_PATHS) {
      const matchPath = roomPath === "multiplayer/rooms" ? "multiplayer/matches" : "matches";
      results.push(await cleanupRoomTree(db, roomPath, matchPath, now));
    }
    const totals = results.reduce((a, x) => ({
      rooms: a.rooms + x.removedRooms,
      matches: a.matches + x.removedMatches
    }), { rooms: 0, matches: 0 });
    console.log("Automatic multiplayer cleanup complete", totals);
  }
);
