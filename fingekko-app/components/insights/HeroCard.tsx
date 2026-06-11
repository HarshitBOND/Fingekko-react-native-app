import { Image, Text, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Flame } from 'lucide-react-native';

import { s } from './style';

interface Props {
  firstName: string;
  heroLine: string;
  streakSub: string;
}

export default function HeroCard({
  firstName,
  heroLine,
  streakSub,
}: Props) {
  return (
    <LinearGradient
      colors={[
        '#CFE7FF',
        '#D9EEFF',
        '#E7F4FF',
        '#EEF7FF',
        '#DCEEFF',
        '#C6E4FF',
        '#B5DBFF',
        '#CFE8FF',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.heroCard}
    >
      <View style={s.heroImageWrap}>
        <Image
          source={require('../../assets/images/cardImagePlannergekko.png')}
          style={s.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={s.heroBody}>
        <Text style={s.heroTitle}>
          Great job, {firstName}! 👋
        </Text>

        <Text style={s.heroText}>
          {heroLine}
        </Text>
      </View>

      <View style={s.streakBox}>
        <View style={s.fireBadge}>
          <Flame
            color="rgba(255,255,255,0.92)"
            size={16}
          />
        </View>

        <Text style={s.streakTitle}>
          On fire!
        </Text>

        <Text style={s.streakSub}>
          {streakSub}
        </Text>
      </View>
    </LinearGradient>
  );
}