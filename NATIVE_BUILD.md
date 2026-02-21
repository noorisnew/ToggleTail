# Native Build Guide for ToggleTail

This guide explains how to build ToggleTail as a native app (required for speech recognition in "Help Me Read" mode).

## Why Native Build?

The `expo-speech-recognition` package requires native code that cannot run in Expo Go. To use the full "Help Me Read" feature with speech recognition, you need to build a native app.

## Prerequisites

1. **Node.js** (v18+)
2. **EAS CLI**: Install with `npm install -g eas-cli`
3. **Expo Account**: Sign up at https://expo.dev
4. **For iOS**: macOS with Xcode installed
5. **For Android**: Android Studio with SDK installed

## Quick Start

### 1. Login to Expo
```bash
npx eas login
```

### 2. Configure Project (First Time Only)
```bash
npx eas build:configure
```

### 3. Build Options

#### Development Build (with dev tools)
```bash
# iOS Simulator
npm run build:dev:ios

# Android APK
npm run build:dev:android
```

#### Preview Build (for testing)
```bash
npm run build:preview
```

#### Production Build
```bash
npm run build:production
```

## Local Development (Without EAS)

If you want to run the native app locally without using EAS Build:

### iOS (macOS only)
```bash
# Generate native iOS project
npm run prebuild

# Run on simulator
npm run run:ios

# Or run on device (requires Apple Developer account)
npm run run:ios -- --device
```

### Android
```bash
# Generate native Android project
npm run prebuild

# Run on emulator/device
npm run run:android
```

## Project Structure After Prebuild

After running `npm run prebuild`, you'll have:
```
ToggleTail/
├── ios/              # Native iOS project
├── android/          # Native Android project
├── app/              # Expo Router screens
├── ...
```

## Clean Rebuild

If you encounter issues, try a clean prebuild:
```bash
npm run prebuild:clean
```

## Environment Variables

The app uses these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://192.168.1.37:3001` |

For production, update `eas.json` with your production API URL.

## Permissions

The app requires these permissions:

### iOS (Info.plist)
- `NSMicrophoneUsageDescription` - For recording and speech recognition
- `NSSpeechRecognitionUsageDescription` - For "Help Me Read" mode

### Android (AndroidManifest.xml)
- `RECORD_AUDIO` - For recording and speech recognition
- `MODIFY_AUDIO_SETTINGS` - For audio playback control

## Troubleshooting

### "expo-speech-recognition is not available"
This means you're running in Expo Go. Use a development build instead.

### Build fails with CocoaPods error
```bash
cd ios && pod install && cd ..
```

### Android build fails
Make sure you have the Android SDK installed and ANDROID_HOME set:
```bash
# Windows
set ANDROID_HOME=C:\Users\YourUser\AppData\Local\Android\Sdk

# macOS/Linux
export ANDROID_HOME=$HOME/Android/Sdk
```

### Speech recognition not working
1. Ensure microphone permissions are granted
2. Check that you're running a native build, not Expo Go
3. On iOS, speech recognition requires network connectivity

## Deploying to App Stores

### iOS (App Store)
1. Create an App Store Connect entry
2. Update `eas.json` with your `appleId` and `ascAppId`
3. Run `eas submit --platform ios`

### Android (Play Store)
1. Create a Google Play Console entry
2. Generate a service account key
3. Save as `google-service-account.json`
4. Run `eas submit --platform android`

## Feature Availability Matrix

| Feature | Expo Go | Development Build | Production Build |
|---------|---------|-------------------|------------------|
| Story Library | ✅ | ✅ | ✅ |
| Read to Me (TTS) | ✅ | ✅ | ✅ |
| AI Story Generation | ✅ | ✅ | ✅ |
| Help Me Read (Speech Recognition) | ❌ | ✅ | ✅ |
| Parent Narration Recording | ❌ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
