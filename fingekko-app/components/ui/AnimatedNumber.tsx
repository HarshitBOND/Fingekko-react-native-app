import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { TypographyVariant } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import AppText from './AppText';

interface AnimatedNumberProps {
  value: number;
  /** format the current animated value into a string */
  format?: (n: number) => string;
  duration?: number;
  variant?: TypographyVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

/** Counts up to `value` on mount / when the value changes. JS-driven (rAF) for cross-platform reliability. */
export default function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
  variant = 'moneyLg',
  color,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    // Reduce Motion: snap straight to the final value, no count-up.
    if (from === to || reducedMotion) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const start = Date.now();

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration, reducedMotion]);

  return (
    <AppText
      variant={variant}
      // Always a numeral — tabular figures also stop the count-up from
      // reflowing the layout on every frame as digit widths change.
      numeric
      color={color}
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {format(display)}
    </AppText>
  );
}
