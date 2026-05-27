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
                                <View style={styles.amountValues}>
                                        <Text
                                            style={styles.savedAmount}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.8}
                                        >
                                            Rs. {Saved.toLocaleString()}
                                        </Text>
                                        <Text
                                            style={styles.goalAmount}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.8}
                                        >
                                            / Rs. {goal.toLocaleString()}
                                        </Text>
                                </View>
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
        backgroundColor: '#f8fbf8',
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#323947',
    },
    description: {
        fontSize: 12,
        color: Colors.primaryDark,
        marginTop: 4,
    },
    savedAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    goalAmount: {
        fontSize: 12,
        color: Colors.textSecondary,
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
        color: Colors.textSecondary,
        marginLeft: 8,
    },
});