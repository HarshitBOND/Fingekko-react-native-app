import { Image, Text, View } from 'react-native';
import Icon from '../ui/Icon';
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
    <View style={s.heroCard}>
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
          <Icon
            name="Flame"
            color="#000000"
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
    </View>
  );
}