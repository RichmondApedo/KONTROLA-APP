import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kontrola.app',
  appName: 'KONTROLA',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
