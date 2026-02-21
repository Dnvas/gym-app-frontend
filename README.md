# Gym App Frontend

This repository houses the source code for my final year solo project; a mobile gym application!

## Developer Guide

The codebase leverages React Native with Expo, so as a prerequisite please make sure you have followed the [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/) for your OS + build type and consequently installed all necessary dependencies.

- Windows: Android Emulator -> Development Build -> Uncheck EAS build -> Follow steps

>[!NOTE]
> For iOS development utilising a build is only possible on macOS with Xcoode.

Please also ensure you have Node.js installed (LTS 22 Jod preferred).

### Step 1: Install dependencies
Once you have cloned the repo locally, you can install all necessary packages using:

```bash
npm install
```

### Step 2: Start Expo server
To launch the development server you can run:

```bash
npm start
```

### Step 3: Start the UI
After running the command above, you will see a QR code in your terminal. You may scan this QR code to open the app on your device.
>[!CAUTION]
> Using this method does not give a 'production-ready' representation of the application.

If you're using an Android Emulator or iOS Simulator, you can press `a` or `i` respectively to open the app.

## CI/CD

The current GitHub Actions pipeline runs on Ubuntu and has 2 main jobs:

1. Initial code typecheck.
2. Android environment setup and application apk build.