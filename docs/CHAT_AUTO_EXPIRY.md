# Playovia chat expiry (Spark-compatible)

New global messages carry a one-hour expiry timestamp. New private messages and game-invite DM cards carry a twelve-hour expiry timestamp. The interface hides expired messages immediately.

## Firebase cleanup without Blaze

Firestore TTL deletes require billing to be enabled, so this project does **not** use TTL or Cloud Functions. Instead, the app performs small client-side cleanup queries:
- Global chat: at most once per hour per browser when the global chat is opened.
- Private chat: when a friend conversation is opened.
- Each cleanup reads at most 400 expired messages and deletes them in one batch. Firestore Rules only permit deleting a global message after one hour or a private message after twelve hours.

This keeps the project on Spark. Cleanup is not server-scheduled: if nobody opens Playovia, deletion waits until the next active session. The UI still hides expired messages by age. Firestore delete operations count toward the free quota (20,000 document deletes/day); monitor usage if chat volume grows.

## Existing messages

Old messages without `expiresAt` are still found by their `createdAt` timestamp and cleaned by the client after the retention period.
