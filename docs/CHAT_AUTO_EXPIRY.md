# Playovia chat expiry setup

New chat messages carry an `expiresAt` timestamp:
- `globalChat/main/messages`: one hour after sending
- `conversations/{conversationId}/messages`: twelve hours after sending

The app hides expired messages immediately. Firestore needs a TTL policy to physically delete the same documents from Firebase.

## One-time Firestore TTL setup

1. Open the [Firestore TTL policies page](https://console.cloud.google.com/firestore/databases/-default-/ttl?project=play-hub-688e8).
2. Create a TTL policy for collection group **messages**.
3. Set the timestamp field to **expiresAt**.
4. Save and wait for the policy to become active.

One policy works for both global and private chat because each message has its own expiry timestamp. Firestore TTL deletion is asynchronous; the app hides messages at the expiry time, but physical deletion can happen later (often within 24 hours). This does not require Cloud Functions or a Blaze upgrade.

## Existing messages

TTL only acts on documents that have an `expiresAt` field. Messages created before this update do not have that field. Clear those old documents once in Firestore Console if you want the old chat history removed too. Delete only `globalChat/main/messages` and the `messages` subcollections under `conversations`; keep the parent conversation documents.
