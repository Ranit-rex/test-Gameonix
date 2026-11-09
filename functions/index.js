const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp({
  databaseURL: "https://play-hub-688e-default-rtdb.asia-southeast1.firebasedatabase.app"
});

Object.assign(exports, require("./admin"));

// Runs every 15 minutes. A room is considered inactive after 30 minutes
// without any member heartbeat. Active players refresh room.updatedAt.
exports.cleanupInactiveMultiplayerRooms = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    const db = getDatabase();
    const cutoff = Date.now() - 30 * 60 * 1000;
    const snapshot = await db.ref("multiplayer/rooms")
      .orderByChild("updatedAt")
      .endAt(cutoff)
      .once("value");

    const updates = {};
    snapshot.forEach(child => {
      const room = child.val() || {};
      const updatedAt = Number(room.updatedAt || room.createdAt || 0);
      if (!updatedAt || updatedAt > cutoff) return;

      const code = child.key;
      updates[`multiplayer/rooms/${code}`] = null;
      if (room.matchId) updates[`multiplayer/matches/${room.matchId}`] = null;
    });

    if (Object.keys(updates).length) {
      await db.ref().update(updates);
      console.log(`Removed ${Object.keys(updates).length} inactive room/match records`);
    }
  }
);
