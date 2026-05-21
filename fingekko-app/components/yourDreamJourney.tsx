import {View, Text, StyleSheet,Image} from 'react-native';
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
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 8}}>
                    <Text style={styles.savedAmount}> Rs. {Saved.toLocaleString()}</Text>
                    <Text style={styles.goalAmount}> / Rs. {goal.toLocaleString()}</Text>
                </View>
                <Text style={{fontSize: FontSizes.xs}}> {Math.round(levelProgress * 100)}% </Text>
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
});