declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

/**
 * `lucide-icon/<kebab-name>` — the Metro alias for a single lucide glyph module
 * (see metro.config.js). The package ships no per-icon type declarations, so
 * describe the shape once here; it matches lucide-react-native's `LucideIcon`.
 */
declare module 'lucide-icon/*' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const icon: React.FC<SvgProps & { size?: number | string; absoluteStrokeWidth?: boolean }>;
  export default icon;
}
