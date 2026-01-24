# Android App Setup Guide

## ✅ What's Already Done (via Antigravity)

1. ✅ Installed `@capacitor/android` package
2. ✅ Created Android platform in `android/` folder
3. ✅ Synced web build to Android project
4. ✅ Configured Capacitor plugins:
   - Speech Recognition
   - Local Notifications

## 📱 Your Android Project Info

- **Package Name:** `com.lemonstudios.mindify`
- **App Name:** Mindify
- **Location:** `/Users/Vertigo/CODE/MINDIFY/android/`
- **Build Output:** `dist/` (web assets)

---

## 🚀 Next Steps: Open in Android Studio

### Step 1: Open Android Studio

```bash
# From your project directory, run:
npx cap open android
```

This will automatically launch Android Studio with the MINDIFY Android project.

**OR** manually open Android Studio and select:
- **"Open an Existing Project"**
- Navigate to: `/Users/Vertigo/CODE/MINDIFY/android/`

---

### Step 2: Add Firebase Configuration

You need to add **google-services.json** to your Android project.

#### A. Download google-services.json

1. Go to [Firebase Console](https://console.firebase.google.com/project/mindify-93328)
2. Click **Project Settings** (gear icon)
3. Scroll to **Your apps**
4. Click on your Android app (or create one if it doesn't exist):
   - Package name: `com.lemonstudios.mindify`
5. Click **Download google-services.json**

#### B. Add to Android Project

In Android Studio:
1. Switch to **Project** view (dropdown at top-left)
2. Navigate to: `app/` folder
3. Drag and drop `google-services.json` into the `app/` folder
4. It should be at: `android/app/google-services.json`

**File Structure Should Look Like:**
```
android/
├── app/
│   ├── google-services.json  ← HERE
│   ├── build.gradle
│   └── src/
├── build.gradle
└── settings.gradle
```

---

### Step 3: Verify Gradle Sync

After adding google-services.json:

1. Android Studio will show a banner: **"Gradle files have changed"**
2. Click **"Sync Now"**
3. Wait for Gradle sync to complete (may take 1-2 minutes first time)

**Look for:**
- ✅ "BUILD SUCCESSFUL" in the Build output
- ✅ No red errors in the file tree

---

### Step 4: Run the App

#### Option A: On Emulator

1. Click **Device Manager** (phone icon on right sidebar)
2. Click **"Create Device"** if you don't have one
3. Select a device (e.g., Pixel 7)
4. Download a system image (e.g., Android 14)
5. Click **Run** (green play button) or `Shift + F10`

#### Option B: On Physical Device

1. Enable **Developer Options** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Click **Run** and select your device

---

## 🔧 Common Setup Tasks

### Update App Permissions

If you need additional permissions, edit:
`android/app/src/main/AndroidManifest.xml`

**Already configured:**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Change App Icon

1. Right-click `res/` folder in Android Studio
2. Select **New → Image Asset**
3. Upload your icon image
4. Generate all sizes

### Update App Name

Edit: `android/app/src/main/res/values/strings.xml`

```xml
<string name="app_name">Mindify</string>
```

---

## 🏗️ Building for Release

### Step 1: Generate Signing Key

```bash
keytool -genkey -v -keystore mindify-release-key.keystore \
  -alias mindify -keyalg RSA -keysize 2048 -validity 10000
```

Enter a secure password and save it!

### Step 2: Configure Signing

Create `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mindify
storeFile=../mindify-release-key.keystore
```

**⚠️ IMPORTANT:** Add to `.gitignore`:
```
android/key.properties
*.keystore
```

### Step 3: Build Release APK

In Android Studio:
1. **Build → Generate Signed Bundle/APK**
2. Select **APK**
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Click **Finish**

**Output:** `android/app/release/app-release.apk`

---

## 🔄 Development Workflow

### After Making Web Changes

```bash
# 1. Build web version
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Android Studio will detect changes
# Click "Sync Now" when prompted
```

### Live Reload (Optional)

For faster development, you can use the web version:

```bash
npm run dev
```

Open in Android Chrome:
`http://YOUR_LOCAL_IP:5173`

Then use Chrome DevTools for mobile debugging.

---

## 🐛 Troubleshooting

### "Gradle sync failed"

**Problem:** Build configuration errors

**Solution:**
1. **File → Invalidate Caches and Restart**
2. Delete `android/.gradle` and `android/app/build` folders
3. Click **Sync Now** again

### "google-services.json is missing"

**Problem:** Firebase config not found

**Solution:**
1. Make sure file is at: `android/app/google-services.json`
2. Check file is valid JSON
3. Sync Gradle again

### "App crashes on startup"

**Problem:** Missing permissions or plugin errors

**Solution:**
1. Check **Logcat** (bottom panel in Android Studio)
2. Look for red error messages
3. Common issues:
   - Missing microphone permission
   - Firebase not initialized
   - Plugin version mismatch

### "Speech recognition not working"

**Problem:** Permissions not granted at runtime

**Solution:**
Add runtime permission request in your app:
```typescript
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// Request permission
const { granted } = await SpeechRecognition.requestPermissions();
```

---

## 📊 Build Variants

Android Studio has different build types:

| Variant | Purpose | Debuggable | Optimized |
|---------|---------|------------|-----------|
| **debug** | Development | ✅ Yes | ❌ No |
| **release** | Production | ❌ No | ✅ Yes |

Select variant:
**Build → Select Build Variant**

---

## 🚀 Publishing to Google Play

### Prerequisites

1. ✅ Release APK/AAB built and signed
2. ✅ App tested on multiple devices
3. ✅ Screenshots prepared (phone + tablet)
4. ✅ Privacy policy URL
5. ✅ Google Play Developer account ($25 one-time)

### Steps

1. **Create App Listing** in [Play Console](https://play.google.com/console)
2. **Upload AAB** (recommended over APK)
3. **Fill in store listing**:
   - App name: Mindify
   - Short description
   - Full description
   - Screenshots (min 2)
   - Feature graphic (1024x500)
4. **Set pricing** (free/paid)
5. **Submit for review**

**Review time:** 1-7 days

---

## 📝 Quick Reference Commands

```bash
# Add Android platform
npx cap add android

# Sync changes
npx cap sync android

# Copy web assets only
npx cap copy android

# Update native plugins
npx cap update android

# Open in Android Studio
npx cap open android

# Build production bundle
npm run build && npx cap sync android
```

---

## ✅ Current Status

**Completed:**
- [x] Android platform created
- [x] Capacitor configured
- [x] Plugins synced
- [x] Web assets copied

**Next (requires Android Studio):**
- [ ] Add google-services.json
- [ ] First build and run
- [ ] Test on device/emulator
- [ ] Generate release build
- [ ] Publish to Play Store

---

## 🆘 Need Help?

- **Capacitor Docs:** https://capacitorjs.com/docs/android
- **Firebase Setup:** https://firebase.google.com/docs/android/setup
- **Android Studio Docs:** https://developer.android.com/studio

---

**Your Android project is ready!** 🎉

Run `npx cap open android` to launch Android Studio and continue with Step 2.
