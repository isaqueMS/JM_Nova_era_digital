
import { Platform } from 'react-native';

/**
 * JM DIGITAL - Centralized Configuration
 * Handles environment variables for Web (Vite) and Mobile (Expo)
 */

export const CONFIG = {
    GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    MIKWEB_TOKEN: process.env.EXPO_PUBLIC_MIKWEB_TOKEN || '',
    EFI_CLIENT_ID: process.env.EXPO_PUBLIC_EFI_CLIENT_ID || '',
    EFI_CLIENT_SECRET: process.env.EXPO_PUBLIC_EFI_CLIENT_SECRET || '',
    IS_WEB: Platform.OS === 'web',
    IS_PROD: process.env.NODE_ENV === 'production',
};

// Debug (only in dev)
if (__DEV__) {
    console.log('[CONFIG] Environment loaded');
}
