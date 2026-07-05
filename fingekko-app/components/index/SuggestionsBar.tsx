import { FontSizes } from '@/constants/Colors';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { Text, View } from 'react-native';
import { Theme } from './constants';
import { styles } from './styles';

type SuggestionsBarProps = {
  onViewInsights: () => void;
};

export default function SuggestionsBar({ onViewInsights }: SuggestionsBarProps) {
  return (
    <View style={styles.suggestionsBar}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
        <View style={styles.suggIconWrap}><Icon name="TrendingUp" color={Theme.primaryDark} size={20} /></View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: FontSizes.base, color: Theme.textMain, fontWeight: '800' }}>Better choice?</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, marginTop: 2 }}>Cook at home more often to save ₹850!</Text>
          <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, marginTop: 1 }}>Move 2 days closer to Goa Trip</Text>
        </View>
      </View>
      <Button
        variant="primary"
        size="sm"
        onPress={onViewInsights}
        style={{ width: 'auto' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: '#000000', fontWeight: '800', fontSize: FontSizes.xs }}>See Impact</Text>
          <Icon name="ChevronRight" size={14} color="#000000" />
        </View>
      </Button>
    </View>
  );
}