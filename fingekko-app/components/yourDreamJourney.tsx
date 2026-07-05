import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes } from '../constants/Colors';
import ProgressBar from './ProgressBar';

export default function YourDreamJourney() {
    const Saved= 12450;
    const goal = 35000;
    const levelProgress = Saved / goal; 

  return (
    

    <View style={styles.container}>
        <View style={{flex: 2, paddingRight: 12}}>
            <Text style={styles.title}>Your Dream Journey</Text>
            <Text style={styles.description}>
                Goa Trip 🌴
            </Text>
                        <View style={styles.amountRow}>
                                <Text
                                    style={styles.savedAmount}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    Rs. {Saved.toLocaleString()}{' '}
                                    <Text style={styles.goalAmount}>/ Rs. {goal.toLocaleString()}</Text>
                                </Text>
                                <Text style={styles.amountPercent}>{Math.round(levelProgress * 100)}%</Text>
                        </View>
            <ProgressBar
                progress={levelProgress}
                height={6}
                radius={999}
                trackColor="rgba(158, 207, 240, 0.18)"
            />
            <Text style={{fontSize: FontSizes.xs, color: Colors.textSecondary, paddingTop: 6}}>
                💡 Save Rs. 1200 more this month to stay on track!
            </Text>
        </View>

        <View style={{flex: 1.3, marginLeft: 12, marginTop: 16}}>
            <Image
            source={require('../assets/images/goa.jpg')}
            style={{width: '100%', height: 80, borderRadius: 8}}
        />
        </View>
        
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        borderWidth: 3,
        borderColor: '#000000',
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000000',
    },
    description: {
        fontSize: 12,
        color: '#000000',
        fontWeight: '700',
        marginTop: 4,
    },
    savedAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#000000',
    },
    goalAmount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333333',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8,
    },
    amountValues: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        minWidth: 0,
    },
    amountPercent: {
        fontSize: FontSizes.xs,
        fontWeight: '800',
        color: '#000000',
        marginLeft: 8,
    },
});