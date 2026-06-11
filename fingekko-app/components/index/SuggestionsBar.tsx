import { FontSizes } from '@/constants/Colors';
import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Theme } from './constants';
import { styles } from './styles';

type SuggestionsBarProps = {
  onViewInsights: () => void;
};

export default function SuggestionsBar({ onViewInsights }: SuggestionsBarProps) {
  return (
    <View style={styles.suggestionsBar}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }}>
        <View style={styles.suggIconWrap}><TrendingUp color={Theme.primaryDark} size={22} /></View>
        <View>
          <Text style={{ fontSize: FontSizes.base, color: Theme.textMain, fontWeight: '800' }}>Better choice?</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted }}>Cook at home more often to save ₹850!</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted }}>Move 2 days closer to Goa Trip</Text>
        </View>
      </View>
      <Pressable onPress={onViewInsights} style={styles.seeImpactBtn}>
        <Text style={{ color: Theme.white, fontWeight: '600', fontSize: FontSizes.xs, padding: 8 }}>See Impact</Text>
        <ChevronRight size={18} color="rgba(249,255,250,0.86)" />
      </Pressable>
    </View>
  );
}