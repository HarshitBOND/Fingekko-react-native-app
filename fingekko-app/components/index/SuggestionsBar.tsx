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
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
        <View style={styles.suggIconWrap}><TrendingUp color={Theme.primaryDark} size={20} /></View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: FontSizes.base, color: Theme.textMain, fontWeight: '800' }}>Better choice?</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, marginTop: 2 }}>Cook at home more often to save ₹850!</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, marginTop: 1 }}>Move 2 days closer to Goa Trip</Text>
        </View>
      </View>
      <Pressable onPress={onViewInsights} style={styles.seeImpactBtn}>
        <Text style={{ color: Theme.white, fontWeight: '700', fontSize: FontSizes.xs }}>See Impact</Text>
        <ChevronRight size={14} color="rgba(249,255,250,0.86)" />
      </Pressable>
    </View>
  );
}