import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexastream.app',
  appName: 'NexaStream',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    hostname: 'nexastream.org'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0ea5e9',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0c4a6e'
    }
  },
  android: {
    backgroundColor: '#0ea5e9',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0ea5e9',
    allowsLinkPreview: true,
    scrollEnabled: false
  }
};

export default config;
