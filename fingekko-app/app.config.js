/**
 * Dynamic Expo config.
 *
 * Replaces the static app.json so development, preview and production builds
 * can carry *different* Android package names. Without this, installing a dev
 * build over the Play Store version replaces it (same package id) — you'd lose
 * the released app from your device and couldn't run both side by side.
 *
 * The variant is chosen by APP_VARIANT, set per-profile in eas.json. Running
 * locally with no variant set behaves as development.
 */

const VARIANT = process.env.APP_VARIANT || 'development';

const VARIANTS = {
  development: {
    // Distinct id + name so it installs alongside the store build.
    packageSuffix: '.dev',
    name: 'FinGekko Dev',
    scheme: 'fingekkoappdev',
  },
  preview: {
    packageSuffix: '.preview',
    name: 'FinGekko Preview',
    scheme: 'fingekkoapppreview',
  },
  production: {
    // The real thing — this id is permanent once published to Play.
    packageSuffix: '',
    name: 'FinGekko',
    scheme: 'fingekkoapp',
  },
};

const variant = VARIANTS[VARIANT] ?? VARIANTS.development;
const BASE_PACKAGE = 'com.fingekko.app';

/** Public site — also where the Play listing's privacy policy lives. */
const WEBSITE_URL = 'https://www.fingekko.com';

/**
 * Permissions pulled in by dependencies for features this app doesn't use.
 *
 *  RECORD_AUDIO / CAMERA — expo-image-picker's video capture. Profile photos
 *                          come from the library only.
 *
 * USE_BIOMETRIC / USE_FINGERPRINT are deliberately NOT blocked: the app-lock
 * feature is planned, and both are "normal" permissions — they show no runtime
 * prompt and don't appear in the Play listing's permission summary, so keeping
 * them costs the user nothing today.
 */
const BLOCKED_ALWAYS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.CAMERA',
];

/**
 * "Draw over other apps" comes from expo-dev-client's debug overlay. It's a
 * sensitive permission Play scrutinises, and a release build has no dev menu —
 * but dev/preview builds need it, so only production blocks it.
 */
const BLOCKED_PERMISSIONS =
  VARIANT === 'production'
    ? [...BLOCKED_ALWAYS, 'android.permission.SYSTEM_ALERT_WINDOW']
    : BLOCKED_ALWAYS;

module.exports = () => ({
  expo: {
    name: variant.name,
    slug: 'fingekko-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: variant.scheme,
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: `${BASE_PACKAGE}${variant.packageSuffix}`,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
        backgroundColor: '#EAF8E5',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: true,
      package: `${BASE_PACKAGE}${variant.packageSuffix}`,
      // No permissions requested: the app only talks to its own API. Anything
      // added here must map to a real feature or Play review will query it.
      permissions: [],
      // `permissions: []` only means "add none of my own" — it does not remove
      // permissions injected by config plugins. These are blocked with
      // `tools:node="remove"`, which the manifest merger strips at build time.
      // Every entry here is a permission some dependency requests for a feature
      // this app does not have; shipping them invites Play review questions and
      // scares users at install.
      blockedPermissions: BLOCKED_PERMISSIONS,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          // Matches the icon background so launch doesn't flash white.
          backgroundColor: '#EAF8E5',
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
      'expo-font',
      [
        'expo-image-picker',
        {
          photosPermission:
            'FinGekko needs access to your photos so you can set a profile picture.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'f0568c8d-bedd-4752-b561-9589b8b326b2',
      },
      // Surfaced in-app (Profile → Legal) and used for the Play listing.
      websiteUrl: WEBSITE_URL,
      privacyPolicyUrl: `${WEBSITE_URL}/privacy`,
      appVariant: VARIANT,
    },
  },
});
