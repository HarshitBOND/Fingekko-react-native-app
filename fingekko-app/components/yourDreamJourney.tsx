import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { palette, spacing, radius, shadows, gradients } from '../constants/design';
import AppText from './ui/AppText';
import Card from './ui/Card';
import ProgressBar from './ProgressBar';

export default function YourDreamJourney() {
  const Saved = 12450;
  const goal = 35000;
  const levelProgress = Saved / goal;

  return (
    <Card variant="elevated" padding={20}>
      <View style={styles.contentRow}>
        <View style={styles.detailsCol}>
          <AppText variant="title" color="textPrimary" weight="bold">
            Your Dream Journey
          </AppText>
          <AppText variant="caption" color="textSecondary" weight="semibold" style={styles.description}>
            Goa Trip 🌴
          </AppText>
          
          <View style={styles.amountRow}>
            <AppText variant="bodySm" color="textPrimary" weight="bold">
              Rs. {Saved.toLocaleString()}{' '}
              <AppText variant="caption" color="textTertiary" weight="semibold">
                / Rs. {goal.toLocaleString()}
              </AppText>
            </AppText>
            <AppText variant="caption" color="primaryDeep" weight="bold">
              {Math.round(levelProgress * 100)}%
            </AppText>
          </View>

          <ProgressBar
            progress={levelProgress}
            height={6}
            radius={radius.pill}
            colors={gradients.brand}
            trackColor={palette.primaryLight}
          />
          <AppText variant="micro" color="textSecondary" style={styles.tipText}>
            💡 Save Rs. 1,200 more this month to stay on track!
          </AppText>
        </View>

        <View style={styles.imageCol}>
          <Image
            source={require('../assets/images/goa.jpg')}
            style={styles.goalImage}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailsCol: {
    flex: 2,
  },
  imageCol: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  description: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  goalImage: {
    width: '100%',
    height: 76,
    borderRadius: radius.md,
  },
  tipText: {
    marginTop: spacing.sm,
  },
});