import { StyleSheet } from 'react-native';

import {
    AMOUNT_DARK,
    BORDER,
    CARD_BG,
    FONTS as F,
    GREEN,
    PAGE_BG,
    TEXT_HELPER,
    TEXT_MUTED,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
} from './constants';

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  container: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32, gap: 10 },

  header: { marginBottom: 2 },
  heading: { fontSize: F.lg, fontWeight: '800', color: TEXT_PRIMARY },
  subHeading: { marginTop: 2, fontSize: F.sm, fontWeight: '600', color: TEXT_SECONDARY },

  heroCard: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0,
    minHeight: 120, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden',
  },
  heroImageWrap: {
    width: 104, alignSelf: 'stretch', marginRight: 10, marginLeft: -2,
    justifyContent: 'flex-end', alignItems: 'center',
  },
  heroImage: { width: 104, height: 128, marginTop: -6 },
  heroBody: { flex: 1, paddingVertical: 14 },
  heroTitle: { color: TEXT_PRIMARY, fontSize: F.md, fontWeight: '800', marginBottom: 6 },
  heroText: { color: 'rgba(24,59,86,0.72)', fontSize: F.base, lineHeight: 18 },
  streakBox: { alignItems: 'center', marginLeft: 10, paddingVertical: 14 },
  fireBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
  },
  streakTitle: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.base },
  streakSub: { color: TEXT_SECONDARY, fontSize: F.xs, marginTop: 3 },

  card: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sectionLabel: {
    fontSize: F.xs, fontWeight: '700', color: TEXT_HELPER,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  insightPill: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(216,236,255,0.8)',
  },
  insightPillLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  insightPillTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  insightPillSub: { color: TEXT_MUTED, fontSize: F.xs, marginTop: 2 },
  seeImpactBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeImpactText: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  snapshotHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  snapshotTitleRow: { gap: 2 },
  dateTag: { fontSize: F.xs, color: TEXT_MUTED },
  thisWeekBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  thisWeekText: { fontSize: F.sm, color: GREEN, fontWeight: '600' },

  snapshotBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  circleWrap: { justifyContent: 'center', alignItems: 'center' },
  circleOuter: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 9, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  circleText: { fontSize: F.xl, fontWeight: '800', color: GREEN },

  snapAmount: { fontSize: F.xl, fontWeight: '800', color: AMOUNT_DARK },
  snapOf: { fontSize: F.md, fontWeight: '500', color: TEXT_MUTED },
  snapSub: { color: TEXT_MUTED, fontSize: F.sm, marginTop: 2 },
  snapBarBg: { height: 8, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 10 },
  snapBarFill: { height: '100%', backgroundColor: GREEN, borderRadius: 999 },

  /* Dummy controls */
  dummyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(24,59,86,0.08)',
    backgroundColor: 'transparent',
  },
  dummyBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  dummyBtnText: { color: TEXT_PRIMARY, fontWeight: '700' },
  dummyControls: { marginBottom: 8 },
  input: {
    minWidth: 90,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(176,198,219,0.28)',
  },
  addBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: { justifyContent: 'center', paddingHorizontal: 10 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(176,198,219,0.35)' },
  statNum: { fontSize: F.xl, fontWeight: '800', color: AMOUNT_DARK },
  statLbl: { fontSize: F.xs, color: TEXT_MUTED, textAlign: 'center', marginTop: 4, lineHeight: 14 },

  twoColRow: { gap: 10 },
  catCard: { flex: 1, paddingBottom: 10 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  thisMonthTag: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  catItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  catNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: F.base, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  catAmt: { fontSize: F.base, fontWeight: '700', color: AMOUNT_DARK, marginRight: 4 },
  catPct: { fontSize: F.xs, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  catBarBg: { height: 6, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 6 },
  catBarFill: { height: '100%', borderRadius: 999 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 2 },
  viewAllText: { fontSize: F.sm, color: GREEN, fontWeight: '700' },

  impactCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  impactCardLayout: {
    flexDirection: 'row', minHeight: 220, padding: 0, alignItems: 'stretch',
  },
  visualSection: {
    width: '60%', position: 'relative', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', alignSelf: 'stretch', backgroundColor: 'rgba(243,248,253,0.95)',
  },
  treeImage: { width: '108%', height: '108%', position: 'absolute', left: -6, top: -4 },
  fadeOverlay: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '92%' },
  treeSeam: { position: 'absolute', right: -6, top: 0, bottom: 0, width: 12, backgroundColor: 'rgba(255,255,255,0.88)' },
  particlesContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', overflow: 'hidden', opacity: 0.85 },
  particle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(181,219,255,0.86)' },

  impactTextContainer: {
    flex: 1, paddingVertical: 18, paddingRight: 18, paddingLeft: 20,
    justifyContent: 'center', alignItems: 'flex-start', marginLeft: -8,
  },
  impactLabel: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700', color: TEXT_HELPER, textTransform: 'uppercase' },
  impactAmountBlock: { marginTop: 8 },
  impactAmt: { fontSize: 30, fontWeight: '800', color: AMOUNT_DARK },
  impactSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  impactGrowBlock: { marginTop: 12 },
  impactGrowText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },

  guidanceCard: {
    backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0,
    minHeight: 96, flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1, borderColor: BORDER, gap: 12, overflow: 'hidden',
  },
  guidanceImgWrap: { width: 78, marginRight: 8, marginLeft: -2, justifyContent: 'flex-end', alignItems: 'center' },
  guidanceImg: { width: 78, height: 104, marginTop: -6 },
  guidanceContent: { flex: 1, justifyContent: 'center', paddingVertical: 14 },
  guidanceLabel: { fontSize: F.xs, fontWeight: '700', color: TEXT_HELPER, letterSpacing: 0.5, marginBottom: 4 },
  guidanceMain: { fontSize: F.md, fontWeight: '800', color: TEXT_PRIMARY },
  guidanceSub: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 4, lineHeight: 16 },

  rewardCard: {
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', overflow: 'hidden',
  },
  rewardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rewardIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  rewardTitle: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.base },
  rewardSub: { color: TEXT_SECONDARY, fontSize: F.xs, marginTop: 3 },
  rewardBarBg: { height: 7, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 8, width: 130 },
  rewardBarFill: { height: '100%', width: '22%', backgroundColor: GREEN, borderRadius: 999 },
  rewardBarLabels: { marginTop: 4 },
  rewardBarLbl: { fontSize: F.xs, color: TEXT_SECONDARY },
  rewardBadge: { width: 72, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, padding: 10, marginLeft: 10 },
  rewardBadgeLbl: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.xs, marginTop: 4, textAlign: 'center' },
  rewardBadgeSub: { color: TEXT_SECONDARY, fontSize: F.xs, textAlign: 'center' },

  tipCard: {
    backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', gap: 10,
  },
  tipTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  tipText: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 2, lineHeight: 16 },
});