// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This box has only ~4 GB of physical RAM, so Metro OOMs (`jest-worker` ENOMEM
// / "Data cannot be cloned, out of memory", then an OS-level AlignedAlloc
// failure) when it spawns one transform worker per CPU core and bundles the
// native + web + SSR targets at once. Each worker is a full Node process, so a
// single worker keeps the combined footprint under the commit limit. Pair it
// with the *lowered* (not raised) Node heap in the start scripts — on 4 GB a
// high cap lets each process grow instead of GCing and starves the OS. See the
// tsc-oom-workaround note.
config.maxWorkers = 1;

// Import `.svg` files as React components via react-native-svg-transformer.
// SVGs move out of the asset pipeline and into the source pipeline so they can
// be rendered (and tinted) as <Svg> components — used by the streak flow's
// calendarAvatar illustration.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// `lucide-icon/<kebab-name>` → that single icon module.
//
// lucide-react-native's `exports` map only publishes the package root, which is
// a barrel over ~1,700 icons. Metro doesn't tree-shake, so importing from it
// dragged every glyph through Babel and the React Compiler on each bundle — the
// main reason this project OOMed while bundling. The alias reaches the per-icon
// modules directly; see components/ui/lucide-icons.ts for the allow-list.
const LUCIDE_PREFIX = 'lucide-icon/';
const LUCIDE_ICON_DIR = path.join(
  __dirname,
  'node_modules',
  'lucide-react-native',
  'dist',
  'esm',
  'icons',
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(LUCIDE_PREFIX)) {
    return {
      type: 'sourceFile',
      filePath: path.join(LUCIDE_ICON_DIR, `${moduleName.slice(LUCIDE_PREFIX.length)}.mjs`),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
