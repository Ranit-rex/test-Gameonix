# Ash Grave Homepage Image Fix

**Date:** 2026-11-08  
**Repository:** `Ranit-rex/test-Gameonix`  
**Status:** Fixed and confirmed by the project owner

## What was broken

The Ash Grave game card on the Playovia homepage was showing a missing/broken image. The homepage's `discoverGames()` function contained a special-case override for the `ashgrave` slug that returned an old, hardcoded Base64 JPEG. That override took priority over the image path in the game's metadata, so updating the cover asset alone could not fix the homepage card.

There was also a path mismatch: the metadata referred to `cover.svg`, while the actual custom cover file was stored at `games/Ashgrave/images/ashgrave-cover.svg`.

## Exact fix applied

1. Kept the custom cover asset at:
   `games/Ashgrave/images/ashgrave-cover.svg`
2. Updated `games/Ashgrave/game.json` so its `thumbnail` field points to the real asset:
   `images/ashgrave-cover.svg`
3. In the existing Ash Grave special case inside homepage `index.html`, replaced the old hardcoded Base64 JPEG with the raw GitHub URL for the real SVG:
   `https://raw.githubusercontent.com/Ranit-rex/test-Gameonix/main/games/Ashgrave/images/ashgrave-cover.svg`
4. Left the homepage's existing cache-busting query parameter in place so the browser can request the latest image.

## Login safety

Google Login had stopped working after earlier homepage discovery edits. To recover it, the complete homepage `index.html` was first restored from the known-working commit `44aa3a585c49c6dfbe4150a75716931b115764da` (restore commit `2e4a12b6d41086b311acffc44ba1ba975739027c`).

For the image-only fix, the change was restricted to the Ash Grave thumbnail expression in `discoverGames()`. The full `initFirebase()` function was compared before and after the edit and was byte-for-byte unchanged. Firebase configuration and Google authentication logic were not modified.

**Important rule for future homepage image fixes:** do not rewrite or replace `initFirebase()`, the login button handlers, or Firebase configuration to fix a game card image. Change only the relevant game's thumbnail asset/metadata and its specific image mapping. After editing `index.html`, verify that `initFirebase()` remains unchanged.

## Commits

- Login-safe homepage restore: `2e4a12b6d41086b311acffc44ba1ba975739027c`
- Ash Grave homepage image mapping: `624db7554cc72c2ac41ec89140f1e6d37cb2493b`
- Ash Grave metadata thumbnail path: `6c04554ceca22054a10f645996b774285b081101`

## Verification

The project owner refreshed Playovia and confirmed that the Ash Grave image was fixed. Google Login code was preserved during the image correction.
