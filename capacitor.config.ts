import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Must match the app ID you register in App Store Connect / Google Play Console
  appId: "com.memoryflix.forus",
  appName: "Memory Flix",
  // Capacitor copies the built web assets from this folder into the native projects
  webDir: "dist",
  server: {
    // In production the app loads from the bundled assets (no live URL needed).
    // During development you can point this at your local dev server:
    //   url: "http://192.168.1.100:8080",
    //   cleartext: true,
    androidScheme: "https",
    // Allow the native WebView to make requests to your deployed backend
    allowNavigation: [
      // Replace with your actual deployed backend domain after deployment
      "*.railway.app",
      "*.up.railway.app",
      "*.vercel.app",
      "*.render.com",
      "*.fly.dev",
    ],
  },
  plugins: {
    // Splash screen shown while the app loads
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Status bar styling (dark background app)
    StatusBar: {
      style: "Dark",
      backgroundColor: "#000000",
    },
    // Push notifications (optional — add later)
    // PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
  // iOS-specific config
  ios: {
    contentInset: "automatic",
    // Allows video autoplay without user gesture (needed for hero video)
    allowsLinkPreview: false,
  },
  // Android-specific config
  android: {
    // Allows cleartext HTTP in dev builds only — production uses HTTPS
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true only for debug builds
  },
};

export default config;
