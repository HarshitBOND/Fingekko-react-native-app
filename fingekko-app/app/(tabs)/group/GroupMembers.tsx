import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AddMembersModal from '../../../components/groups/AddMembersModal';
import AppText from '../../../components/ui/AppText';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import ScreenContainer from '../../../components/ui/ScreenContainer';
import Toast from '../../../components/ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { apiRequest } from '../../../utils/api';
import { layout, palette, radius, spacing } from '../../../constants/design';

type Member = { id: string; dbId: string; name: string; email: string };
type GroupResponse = { id: string; name: string; members: Member[] };

const getInitials = (name: string) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function GroupMembersScreen() {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { groupId, groupName } = useLocalSearchParams<{ groupId?: string; groupName?: string }>();

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiRequest<GroupResponse>({ method: 'get', url: `/api/groups/${groupId}`, token });
      setGroup(res);
    } catch (err) {
      console.warn('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, getToken]);

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
    }, [fetchGroup])
  );

  const handleAddMembers = async (clerkIds: string[]) => {
    if (!groupId) return false;
    try {
      const token = await getToken();
      if (!token) return false;
      const res = await apiRequest<{ message: string; added: number }>({
        method: 'post',
        url: `/api/groups/${groupId}/members`,
        token,
        data: { members: clerkIds },
      });
      await fetchGroup();
      showToast({
        title: res.added > 0 ? `Added ${res.added} member${res.added === 1 ? '' : 's'}` : 'Already in the group',
        tone: 'info',
        duration: 2000,
      });
      return true;
    } catch {
      return false;
    }
  };

  const members = useMemo(() => group?.members ?? [], [group]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />
      <ScreenContainer
        header={
          <View style={styles.header}>
            <Pressable style={styles.headerBtn} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
              <Icon name="ChevronLeft" size={22} color={palette.textPrimary} clickable={false} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold">Members</AppText>
              {!!groupName && <AppText variant="micro" color="textTertiary" numberOfLines={1}>{groupName}</AppText>}
            </View>
            <Pressable style={styles.headerBtn} onPress={() => setAddOpen(true)} hitSlop={6}>
              <Icon name="UserPlus" size={20} color={palette.primaryDeep} clickable={false} />
            </Pressable>
          </View>
        }
      >
        <View style={styles.searchBar}>
          <Icon name="Search" size={16} color={palette.textTertiary} clickable={false} />
          <TextInput
            placeholder="Search members"
            placeholderTextColor={palette.textTertiary}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <Button variant="secondary" size="md" onPress={() => setAddOpen(true)} style={{ marginBottom: spacing.lg }}>
          + Add member
        </Button>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={palette.primaryDeep} /></View>
        ) : filtered.length === 0 ? (
          <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: spacing.lg }}>
            No members match “{query}”.
          </AppText>
        ) : (
          filtered.map((m) => {
            const isYou = m.id === userId;
            return (
              <Pressable
                key={m.id}
                style={styles.row}
                onPress={() => {
                  if (!isYou && m.dbId) {
                    router.push({ pathname: '/(tabs)/FriendSplits', params: { friendId: m.dbId, friendName: m.name } });
                  }
                }}
              >
                <View style={styles.avatar}>
                  <AppText variant="caption" color="primaryDeep" weight="bold">{getInitials(m.name)}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" numberOfLines={1}>{isYou ? 'You' : m.name}</AppText>
                  {!!m.email && <AppText variant="micro" color="textTertiary" numberOfLines={1}>{m.email}</AppText>}
                </View>
                {!isYou && <Icon name="ChevronRight" size={18} color={palette.textTertiary} clickable={false} />}
              </Pressable>
            );
          })
        )}
      </ScreenContainer>

      <AddMembersModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existingMemberIds={members.map((m) => m.id)}
        onAdd={handleAddMembers}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { paddingVertical: 60, alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: palette.textPrimary, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
