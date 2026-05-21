import { Colors, FontSizes } from '@/constants/Colors';
import { ChevronRight, Lock } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

const badges = [
	{
		id: 'smart-saver',
		label: 'Smart Saver',
		source: require('../assets/images/leafSaberBadgelv1.png'),
	},
	{
		id: 'goal-getter',
		label: 'Goal Getter',
		source: require('../assets/images/badgelv1.png'),
	},
	{
		id: 'consistent',
		label: 'Consistent',
		source: require('../assets/images/leafSaberBadgelv1.png'),
	},
	{
		id: 'discipline-pro',
		label: 'Discipline Pro',
		locked: true,
	},
];

export default function BageSection() {
	return (
		<View style={styles.section}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Badges</Text>
				<View style={styles.viewAll}>
					<Text style={styles.viewAllText}>View all</Text>
					<ChevronRight size={14} color="#16a34a" />
				</View>
			</View>

			<View style={styles.badgesRow}>
				{badges.map((badge) => (
					<View key={badge.id} style={styles.badgeItem}>
						<View style={[styles.badgeIconWrap, badge.locked && styles.badgeLocked]}>
							{badge.locked ? (
								<Lock size={18} color="#9ca3af" />
							) : (
								<Image source={badge.source} style={styles.badgeImage} />
							)}
						</View>
						<Text style={[styles.badgeLabel, badge.locked && styles.badgeLabelLocked]}>
							{badge.label}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		backgroundColor: Colors.surface,
		borderRadius: 16,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: '#eef2f7',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: FontSizes.xs,
		fontWeight: '800',
		color: '#6b7280',
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	viewAll: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewAllText: {
		fontSize: FontSizes.xs,
		fontWeight: '700',
		color: '#16a34a',
	},
	badgesRow: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	badgeItem: {
		flex: 1,
		alignItems: 'center',
		gap: 6,
	},
	badgeIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f7f7fb',
		
	},
	badgeImage: {
		width: 46,
		height: 46,
		resizeMode: 'contain',
	},
	badgeLocked: {
		backgroundColor: '#f3f4f6',
	},
	badgeLabel: {
		fontSize: FontSizes.xs,
		fontWeight: '600',
		color: '#6b7280',
		textAlign: 'center',
	},
	badgeLabelLocked: {
		color: '#9ca3af',
	},
});
