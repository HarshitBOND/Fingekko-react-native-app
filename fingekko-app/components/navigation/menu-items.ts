/**
 * Side menu information architecture.
 *
 * The bottom tab bar carries the five highest-frequency destinations; everything
 * else lives here so no single screen has to hold every entry point at once.
 */

export type MenuItem = {
  icon: string;
  label: string;
  href: string;
  /** Short line under the label — keep it to a few words. */
  hint?: string;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Money',
    items: [
      { icon: 'Wallet', label: 'Safe to Spend', href: '/(tabs)/safe-to-spend', hint: 'What you can spend today' },
      { icon: 'ReceiptText', label: 'Bills & Essentials', href: '/(tabs)/essentials', hint: 'Add or manage recurring bills' },
      { icon: 'BarChart3', label: 'Insights', href: '/(tabs)/insights', hint: 'Where your money went' },
      { icon: 'Target', label: 'Goals', href: '/(tabs)/goals', hint: 'What you are saving for' },
    ],
  },
  {
    title: 'Shared',
    items: [
      { icon: 'Users', label: 'Your Groups', href: '/(tabs)/YourGroups' },
      { icon: 'UserPlus', label: 'Friends', href: '/(tabs)/Friends' },
      { icon: 'Handshake', label: 'Friend Splits', href: '/(tabs)/FriendSplits' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'Bell', label: 'Notifications', href: '/(tabs)/Notifications' },
      { icon: 'User', label: 'Profile & Settings', href: '/(tabs)/profile' },
    ],
  },
];
