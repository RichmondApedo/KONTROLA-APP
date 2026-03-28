# Kontrola: Store Deployment Execution Guide

This document outlines the final steps to transition Kontrola from your current web environment into the official Apple and Google Play stores.

## 1. Google Play Store (Android)
We use **Trusted Web Activity (TWA)** to ensure the app runs with the native engine without the browser URL bar.

### Prerequisites:
- **Google Play Developer Account**: ($25 one-time fee).
- **Bubblewrap CLI**: Used to generate the local `.apk` and `.aab` bundles.

### Execution:
1. **Replace SHA256**: 
   - Open [assetlinks.json](file:///c:/Users/richm/KONTROLA-APP/public/.well-known/assetlinks.json).
   - Once your Google Play console generates your "App Signing Key SHA256", replace the placeholder.
2. **Generate Bundle**:
   - Run `npx @bubblewrap/cli init --manifest=https://kontrola.app/manifest.json`.
   - Run `npx @bubblewrap/cli build`.
3. **Upload**: 
   - Upload the generated `.aab` file to the Google Play Console for review.

---

## 2. Apple App Store (iOS)
We use **Capacitor** to wrap the web app in a native `WKWebView` container.

### Prerequisites:
- **Apple Developer Account**: ($99 annual fee).
- **Mac Hardware**: Required for Xcode packaging and final submission.

### Execution:
1. **Initialize Capacitor**:
   ```bash
   npm i @capacitor/core @capacitor/cli
   npx cap init KONTROLA com.kontrola.app
   npm i @capacitor/ios
   npx cap add ios
   ```
2. **Setup Domain Verification**:
   - Open [apple-app-site-association](file:///c:/Users/richm/KONTROLA-APP/public/.well-known/apple-app-site-association).
   - Replace `YOUR_TEAM_ID` with your official Apple Developer Team ID from your account dashboard.
3. **Build & Sync**:
   - Run `npm run build` to generate the production Next.js bundle.
   - Run `npx cap sync ios` to move the build to the native folder.
4. **Xcode & Submission**:
   - Run `npx cap open ios` to open the project in Xcode.
   - Validate and upload the Archive to **App Store Connect**.

---

## 3. High-Fidelity Assets
I have identified the official assets in your `/public/App icons/` folder. Ensure you use the following during the store listing phase:
- **Main Icon**: [Kontrola_Apple_1024x1024.jpg (1).jpeg](file:///c:/Users/richm/KONTROLA-APP/public/App%20icons/Kontrola_Apple_1024x1024.jpg%20(1).jpeg)
- **Play Store Icon**: [Kontrola_GooglePlay_512x512.png](file:///c:/Users/richm/KONTROLA-APP/public/App%20icons/Kontrola_GooglePlay_512x512.png)
- **Desktop/Web Icon**: [Kontrola_Desktop_512x512.png](file:///c:/Users/richm/KONTROLA-APP/public/App%20icons/Kontrola_Desktop_512x512.png)

These files have already been linked in your app's code to ensure a seamless "Install" experience.
