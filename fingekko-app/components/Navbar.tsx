import { useUser } from '@clerk/clerk-expo';
import Icon from './ui/Icon';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Navbar() {
  const { user } = useUser();
  const initials = (() => {
    if (!user) {
      return 'FG';
    }

    const first = user.firstName?.trim() || '';
    const last = user.lastName?.trim() || '';
    const fallback = user.username?.trim() || user.fullName?.trim() || '';
    const source = first || fallback;
    const initialA = source ? source.charAt(0).toUpperCase() : 'F';
    const initialB = last ? last.charAt(0).toUpperCase() : 'G';

    return `${initialA}${initialB}`;
  })();

  return (
    <View style={styles.header}>

      <View style={styles.headerSide}>
        <Icon name="TextAlignStart" size={24} color="#374151" />
      </View>

      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../assets/images/navgekko.png')}
            style={styles.logoImage}
          />
        </View>
      </View>

      <View style={styles.headerActions}>
        <Icon name="Bell" size={22} color="#374151" />

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },

  headerSide: {
    width: 40,
    alignItems: 'flex-start',
  },

  logoWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },

  logoBadge: {
    width:102,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logoImage: {
    width: 102,
    height: 72,
    resizeMode: 'contain',
  },

  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  headerActions: {
    width: 96,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2f3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontWeight: '700',
    color: '#4b5563',
  },
});