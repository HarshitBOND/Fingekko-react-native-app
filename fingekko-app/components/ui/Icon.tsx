import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import * as LucideIcons from 'lucide-react-native';

const LORDICON_REGISTRY: Record<string, string> = {
  Home: 'https://cdn.lordicon.com/etqbfrgp.json',       // house
  Wallet: 'https://cdn.lordicon.com/qhviklyi.json',     // card
  Settings: 'https://cdn.lordicon.com/lecpriep.json',   // gear
  User: 'https://cdn.lordicon.com/kthelypq.json',       // profile
  Bell: 'https://cdn.lordicon.com/vspoxoxr.json',       // bell
  Search: 'https://cdn.lordicon.com/msoeawqm.json',     // magnifying glass
  Plus: 'https://cdn.lordicon.com/pdsouras.json',       // plus sign
  Check: 'https://cdn.lordicon.com/oarvyoxn.json',      // checkmark
  X: 'https://cdn.lordicon.com/zxvnaqod.json',          // close cross
  Trash: 'https://cdn.lordicon.com/wpyrrmcq.json',      // trash bin
  Calendar: 'https://cdn.lordicon.com/aswjckcz.json',   // calendar
  CalendarDays: 'https://cdn.lordicon.com/aswjckcz.json',// calendar days
  Menu: 'https://cdn.lordicon.com/tyvtvbcy.json',       // hamburger menu
  Target: 'https://cdn.lordicon.com/lbjtvqiv.json',     // target/goal
  Coins: 'https://cdn.lordicon.com/wyqtxzeh.json',      // coins/money
  CircleAlert: 'https://cdn.lordicon.com/usownftb.json',// warning alert
  Flame: 'https://cdn.lordicon.com/fpipqsbu.json',      // fire flame streak
  ChevronLeft: 'https://cdn.lordicon.com/lhsldbqq.json', // chevron left
  ChevronRight: 'https://cdn.lordicon.com/vduvxnmg.json',// chevron right
  Plane: 'https://cdn.lordicon.com/uqvldyri.json',      // plane
  Car: 'https://cdn.lordicon.com/dqrkejz7.json',        // car
  Utensils: 'https://cdn.lordicon.com/xhecdoaa.json',   // food/fork
  Briefcase: 'https://cdn.lordicon.com/nlvycxod.json',  // briefcase/bag
  ArrowLeft: 'https://cdn.lordicon.com/whtfgdfm.json',  // arrow left
  ArrowRight: 'https://cdn.lordicon.com/zmzvcohj.json', // arrow right
  Handshake: 'https://cdn.lordicon.com/lupuorrc.json',  // handshake
  // Newly mapped icons:
  Eye: 'https://cdn.lordicon.com/tyounuzx.json',        // eye visible
  EyeOff: 'https://cdn.lordicon.com/mrdnllab.json',     // eye hidden
  BarChart: 'https://cdn.lordicon.com/gxdwdlzy.json',   // bar chart
  BarChart3: 'https://cdn.lordicon.com/gxdwdlzy.json',  // bar chart 3
  TrendingUp: 'https://cdn.lordicon.com/gxdwdlzy.json', // trending up chart
  Zap: 'https://cdn.lordicon.com/flvisbip.json',        // energy/lightning
  Repeat: 'https://cdn.lordicon.com/bonsoxbe.json',     // sync/repeat
  Star: 'https://cdn.lordicon.com/xhdhgmqj.json',       // star rating
  PiggyBank: 'https://cdn.lordicon.com/wyqtxzeh.json',  // piggy bank / coins
  Shield: 'https://cdn.lordicon.com/khddyilg.json',     // shield security
  Lock: 'https://cdn.lordicon.com/khddyilg.json',       // padlock lock
  Users: 'https://cdn.lordicon.com/ljvjkiun.json',      // users group
  UserPlus: 'https://cdn.lordicon.com/kthelypq.json',   // add user
  ChevronDown: 'https://cdn.lordicon.com/vduvxnmg.json',// chevron down
  ChevronUp: 'https://cdn.lordicon.com/vduvxnmg.json',  // chevron up
  CheckSquare2: 'https://cdn.lordicon.com/oarvyoxn.json',// checkmark box
  Circle: 'https://cdn.lordicon.com/zxvnaqod.json',      // circle/shape
  ArrowDownLeft: 'https://cdn.lordicon.com/zmzvcohj.json', // arrow down-left
  TextAlignStart: 'https://cdn.lordicon.com/tyvtvbcy.json',// text alignment
  StickyNote: 'https://cdn.lordicon.com/hjrvrgki.json',  // sticky note
};

interface IconProps {
  name: string; // E.g., 'Home', 'Wallet', 'UserPlus', 'ChevronRight', etc.
  size?: number;
  color?: string;
  autoplay?: boolean;
  style?: StyleProp<ViewStyle>;
  clickable?: boolean; // Only clickable icons load Lordicons
}

const IconComponent = ({
  name,
  size = 24,
  color,
  autoplay = true,
  style,
  clickable = false,
}: IconProps) => {
  const lottieUrl = clickable ? LORDICON_REGISTRY[name] : undefined;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (lottieRef.current && autoplay && lottieUrl) {
      lottieRef.current.play();
    }
  }, [autoplay, lottieUrl]);

  const colorFilters = useMemo(() => {
    if (!color) return undefined;
    return [
      {
        keypath: '**',
        color: color,
      },
    ];
  }, [color]);

  let extraStyle: ViewStyle = {};
  let resolvedUrl = lottieUrl;

  if (clickable) {
    if (name === 'Trash2') {
      resolvedUrl = LORDICON_REGISTRY['Trash'];
    } else if (name === 'ChevronDown') {
      resolvedUrl = LORDICON_REGISTRY['ChevronRight'];
      extraStyle = { transform: [{ rotate: '90deg' }] };
    } else if (name === 'ChevronUp') {
      resolvedUrl = LORDICON_REGISTRY['ChevronRight'];
      extraStyle = { transform: [{ rotate: '270deg' }] };
    } else if (name === 'ArrowDownLeft') {
      resolvedUrl = LORDICON_REGISTRY['ArrowRight'];
      extraStyle = { transform: [{ rotate: '135deg' }] };
    }
  }

  if (resolvedUrl) {
    return (
      <View style={[{ width: size, height: size }, style, extraStyle]}>
        <LottieView
          ref={lottieRef}
          source={{ uri: resolvedUrl }}
          style={StyleSheet.absoluteFill}
          autoPlay={autoplay}
          loop={autoplay}
          colorFilters={colorFilters}
        />
      </View>
    );
  }

  // Fallback to Lucide React Icons if not present in the animated registry
  const LucideIconComponent = (LucideIcons as any)[name];
  if (LucideIconComponent) {
    return <LucideIconComponent size={size} color={color} style={style} />;
  }

  return null;
};

IconComponent.displayName = 'Icon';

export default React.memo(IconComponent);
