import { Bell, TextAlignStart } from 'lucide-react-native';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Navbar() {
  return (
    <View style={styles.header}>

      <View style={styles.headerSide}>
        <TextAlignStart size={24} color="#374151" />
      </View>

      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../assets/images/navgekko.png')}
            style={styles.logoImage}
          />
        </View>

        <Text style={styles.logoText}>
          FinGekko
        </Text>
      </View>

      <View style={styles.headerActions}>
        <Bell size={22} color="#374151" />

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AR</Text>
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
    width: 48,
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
    width: 48,
    height: 48,
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