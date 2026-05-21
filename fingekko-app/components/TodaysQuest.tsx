import { Colors, FontSizes } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Check, ChevronRight, Target, Wallet, Zap } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import Divider from './Divider';
import ProgressBar from './ProgressBar';

const quests = [
	{
		id: 'save',
		title: 'Save ₹500 today',
		subtitle: 'You saved ₹620 🎉',
		progress: 1,
		xp: 30,
		icon: Wallet,
	},
	{
		id: 'delivery',
		title: 'Avoid food delivery',
		subtitle: '0 / 1 day completed',
		progress: 0,
		xp: 20,
		icon: Target,
	},
	{
		id: 'expenses',
		title: 'Track all expenses',
		subtitle: '2 / 5 days',
		progress: 0.4,
		xp: 15,
		icon: BarChart3,
	},
];

export default function TodaysQuest() {
	const completedCount = quests.filter((quest) => quest.progress >= 1).length;

	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Today's Quests</Text>
				<Text style={styles.completionText}>
					{completedCount} / {quests.length} completed
				</Text>
			</View>

			<View style={styles.list}>
				{quests.map((quest, index) => {
					const Icon = quest.icon;
					const isDone = quest.progress >= 1;

					return (
						<View key={quest.id}>
							<View style={styles.questRow}>
								<View style={styles.iconWrap}>
									<Icon size={32} strokeWidth={1.3} color="#16a34a" />
								</View>

								<View style={styles.questBody}>
									<Text style={styles.questTitle}>{quest.title}</Text>
									<Text style={styles.questSubtitle}>{quest.subtitle}</Text>
									<View style={styles.questProgress}>
										<ProgressBar
											progress={quest.progress}
											height={4}
											radius={999}
											trackColor="#d1d5dd"
											
										/>
									</View>
								</View>

								<View style={styles.questRight}>
									<View style={styles.xpRow}>
										<Zap size={14} color="#f59e0b" />
										<Text style={styles.xpText}>+{quest.xp} XP</Text>
									</View>
									<View style={[styles.statusBadge, isDone ? styles.statusDone : styles.statusNext]}>
										{isDone ? (
											<Check size={14} color="#ffffff" />
										) : (
											<ChevronRight size={16} color="#6b7280" />
										)}
									</View>
								</View>
							</View>

							{index < quests.length - 1 && (
								<Divider
									orientation="horizontal"
									thickness={1}
									color="#eef2f7"
									inset={6}
									length="100%"
									style={styles.questDivider}
								/>
							)}
						</View>
					);
				})}
			</View>

			<LinearGradient
				colors={['#fff4d7', '#f4f9e4']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.bonusCard}
			>
				<View style={styles.bonusLeft}>
					<View style={styles.bonusIconWrap}>
						<Wallet size={20} color="#c77c1c" />
					</View>
					<View>
						<Text style={styles.bonusTitle}>Complete all quests</Text>
						<Text style={styles.bonusSubtitle}>to earn bonus XP!</Text>
						<Text style={styles.bonusXP}>+75 XP</Text>
					</View>
				</View>

				<Image
					source={require('../assets/images/gekko.png')}
					style={styles.bonusGekko}
				/>
			</LinearGradient>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#f8fbf8',
		borderRadius: 12,
		padding:8,	
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
	completionText: {
		fontSize: FontSizes.xs,
		fontWeight: '700',
		color: '#16a34a',
	},
	list: {
		marginTop: 12,
		gap: 6,
	},
	questRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#eaf3ed',
		alignItems: 'center',
		justifyContent: 'center',
	},
	questBody: {
		flex: 1,
	},
	questTitle: {
		fontSize: FontSizes.sm,
		fontWeight: '700',
		color: Colors.textPrimary,
	},
	questSubtitle: {
		fontSize: FontSizes.xs,
		color: '#6b7280',
		marginTop: 2,
	},
	questProgress: {
		marginTop: 6,
	},
	questRight: {
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		gap: 6,
	},
	xpRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	xpText: {
		fontSize: FontSizes.xs,
		fontWeight: '700',
		color: '#16a34a',
	},
	statusBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusDone: {
		backgroundColor: '#16a34a',
	},
	statusNext: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	questDivider: {
		marginLeft: 48,
	},
	bonusCard: {
		marginTop: 12,
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	bonusLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	bonusIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#ffe2b3',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bonusTitle: {
		fontSize: FontSizes.sm,
		fontWeight: '700',
		color: '#111827',
	},
	bonusSubtitle: {
		fontSize: FontSizes.xs,
		color: '#6b7280',
	},
	bonusXP: {
		fontSize: FontSizes.xs,
		fontWeight: '800',
		color: '#7c3aed',
		marginTop: 2,
	},
	bonusGekko: {
		width: 64,
		height: 64,
		resizeMode: 'contain',
	},
});
