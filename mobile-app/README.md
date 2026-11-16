# Playovia Mobile

Isolated Expo + React Native app for Android and iOS. Root website files remain untouched.

- Native home and game catalogue.
- Reads game folders and optional game.json metadata from this repository.
- Runs existing HTML games in a native WebView; games are not rewritten.
- Android/iOS EAS build profiles are included.

## Local development
Use Node.js 22.13+.

```bash
cd mobile-app
npm install
npx expo install --fix
npx expo start
```

## Build
Create an Expo project, set its project ID in app.json, then run eas build --platform android --profile preview or eas build --platform ios --profile preview. Android preview builds an APK. iOS distribution needs Apple signing credentials and an Apple Developer account.

## Firebase
The website uses Google sign-in with Firebase project play-hub-688e. Native Google sign-in needs Android and iOS OAuth client IDs matching the app identifiers. These must be configured from Firebase/Google Cloud. Once configured, the app can use the same Firebase project and accounts.

Do not move or rename root website files. Any future website/backend changes must be reviewed separately.
