# Playovia Native Android

This is a React Native CLI app. It does not use Expo or WebView. The website at the repository root remains independent and unchanged.

## Current migration status
- Native React Native app shell and catalogue.
- Capital Quest has a first native solo-game implementation.
- Other titles remain visible in the catalogue but open a native migration notice until their gameplay is ported. No HTML game is embedded or opened.
- Native Firebase sign-in and the remaining 17 game ports are planned follow-up work; website login and gameplay are unchanged.

## Local development
Use Node.js 22.13+ and Android Studio with Android SDK configured.

```bash
cd mobile-app
npm install
npx react-native start
npx react-native run-android
```

The Android native project is generated from the React Native CLI template in the Android build workflow. Google sign-in requires Android OAuth configuration for package `xyz.playovia.app` in the existing Firebase project `play-hub-688e`.
