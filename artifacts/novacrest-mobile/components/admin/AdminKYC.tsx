import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, Image,
  Share, Dimensions, StatusBar, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetAdminKyc, useUpdateKycStatus } from '@workspace/api-client-react';
import type { KycDocument } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { format } from 'date-fns';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Full-screen pinch-to-zoom image viewer */
function ImageViewerModal({ uri, label, visible, onClose }: {
  uri: string; label: string; visible: boolean; onClose: () => void;
}) {
  const handleShare = async () => {
    try {
      await Share.share({ message: label, url: uri });
    } catch {
      // user cancelled or share failed — silently ignore
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={iv.container}>
        {/* Pinch-to-zoom via ScrollView native zoom */}
        <ScrollView
          style={iv.scroll}
          contentContainerStyle={iv.scrollContent}
          maximumZoomScale={6}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom
        >
          <Image
            source={{ uri }}
            style={{ width: SCREEN_W, height: SCREEN_H }}
            resizeMode="contain"
          />
        </ScrollView>

        {/* Top bar */}
        <View style={iv.topBar}>
          <TouchableOpacity style={iv.iconBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={iv.label} numberOfLines={1}>{label}</Text>
          <TouchableOpacity style={iv.iconBtn} onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={Platform.OS === 'ios' ? 'share' : 'share-2'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const iv = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
});

type KFilter = 'all' | 'pending' | 'approved' | 'rejected';
const KFILTERS: KFilter[] = ['all', 'pending', 'approved', 'rejected'];

const STATUS_COLOR = (colors: ReturnType<typeof useColors>) => ({
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.destructive,
});

function KycDetailModal({ kyc, visible, onClose, colors }: {
  kyc: (KycDocument & { userEmail?: string; userFullName?: string }) | null;
  visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const [notes, setNotes] = useState(kyc?.adminNotes ?? '');
  const updateM = useUpdateKycStatus();
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState('');

  const handle = (status: 'approved' | 'rejected') => {
    if (!kyc) return;
    Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'} KYC`, `Confirm ${status === 'approved' ? 'approval' : 'rejection'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: status === 'approved' ? 'Approve' : 'Reject',
        style: status === 'rejected' ? 'destructive' : 'default',
        onPress: () => {
          updateM.mutate({ id: kyc.id, status, adminNotes: notes.trim() || undefined },
            {
              onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', `KYC ${status}.`); },
              onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed.'),
            });
        },
      },
    ]);
  };

  if (!kyc) return null;
  const s = ks(colors);
  const sc = STATUS_COLOR(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.title, { color: colors.foreground }]}>KYC Review</Text>

            {/* User info */}
            <View style={[s.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[s.infoName, { color: colors.foreground }]}>{kyc.userFullName ?? 'Unknown User'}</Text>
              <Text style={[s.infoEmail, { color: colors.mutedForeground }]}>{kyc.userEmail}</Text>
              <Text style={[s.infoMeta, { color: colors.mutedForeground }]}>
                {kyc.documentType.replace('_', ' ').toUpperCase()} · Submitted {format(new Date(kyc.submittedAt), 'MMM d, yyyy')}
              </Text>
              <View style={[s.badge, { backgroundColor: sc[kyc.status] + '20' }]}>
                <Text style={[s.badgeTxt, { color: sc[kyc.status] }]}>{kyc.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Document images — tap to open full-screen viewer */}
            {kyc.frontUrl && (
              <View style={s.docSection}>
                <Text style={[s.docLabel, { color: colors.mutedForeground }]}>Front Document</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => { setViewerUri(kyc.frontUrl!); setViewerLabel('Front Document'); }}>
                  <Image source={{ uri: kyc.frontUrl }} style={s.docImg} resizeMode="cover" />
                  <View style={s.zoomHint}><Feather name="zoom-in" size={14} color="#fff" /><Text style={s.zoomTxt}>Tap to zoom</Text></View>
                </TouchableOpacity>
              </View>
            )}
            {kyc.backUrl && (
              <View style={s.docSection}>
                <Text style={[s.docLabel, { color: colors.mutedForeground }]}>Back Document</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => { setViewerUri(kyc.backUrl!); setViewerLabel('Back Document'); }}>
                  <Image source={{ uri: kyc.backUrl }} style={s.docImg} resizeMode="cover" />
                  <View style={s.zoomHint}><Feather name="zoom-in" size={14} color="#fff" /><Text style={s.zoomTxt}>Tap to zoom</Text></View>
                </TouchableOpacity>
              </View>
            )}
            {kyc.selfieUrl && (
              <View style={s.docSection}>
                <Text style={[s.docLabel, { color: colors.mutedForeground }]}>Selfie</Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => { setViewerUri(kyc.selfieUrl!); setViewerLabel('Selfie'); }}>
                  <Image source={{ uri: kyc.selfieUrl }} style={s.docImg} resizeMode="cover" />
                  <View style={s.zoomHint}><Feather name="zoom-in" size={14} color="#fff" /><Text style={s.zoomTxt}>Tap to zoom</Text></View>
                </TouchableOpacity>
              </View>
            )}

            {/* Admin notes */}
            <View style={s.field}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Admin Notes (optional)</Text>
              <TextInput
                style={[s.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Notes visible to user…" placeholderTextColor={colors.mutedForeground}
                value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
            </View>

            {kyc.status === 'pending' && (
              <View style={s.actionRow}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.success }, updateM.isPending && { opacity: 0.6 }]}
                  onPress={() => handle('approved')} disabled={updateM.isPending}>
                  {updateM.isPending ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Feather name="check-circle" size={16} color="#fff" />
                      <Text style={s.actionTxt}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.destructive }, updateM.isPending && { opacity: 0.6 }]}
                  onPress={() => handle('rejected')} disabled={updateM.isPending}>
                  <Feather name="x-circle" size={16} color="#fff" />
                  <Text style={s.actionTxt}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[s.closeTxt, { color: colors.foreground }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      {viewerUri && (
        <ImageViewerModal
          uri={viewerUri}
          label={viewerLabel}
          visible={!!viewerUri}
          onClose={() => setViewerUri(null)}
        />
      )}
    </Modal>
  );
}

export function AdminKYC({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [filter, setFilter] = useState<KFilter>('pending');
  const [selected, setSelected] = useState<(KycDocument & { userEmail?: string; userFullName?: string }) | null>(null);
  const { data, isLoading, refetch } = useGetAdminKyc();
  const all = data?.kycs ?? [];
  const filtered = filter === 'all' ? all : all.filter(k => k.status === filter);
  const sc = STATUS_COLOR(colors);
  const s = ks(colors);

  return (
    <>
      <View style={s.filterRow}>
        {KFILTERS.map(f => (
          <TouchableOpacity key={f}
            style={[s.chip, { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: filter === f ? colors.primary : colors.border }]}
            onPress={() => setFilter(f)} activeOpacity={0.8}>
            <Text style={[s.chipTxt, { color: filter === f ? colors.primaryForeground : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.count, { color: colors.mutedForeground }]}>{filtered.length} submissions</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered} keyExtractor={k => String(k.id)} scrollEnabled={false}
          renderItem={({ item: k }) => (
            <TouchableOpacity style={[s.kycRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelected(k)} activeOpacity={0.8}>
              <View style={[s.kycIcon, { backgroundColor: sc[k.status] + '20' }]}>
                <Feather name="file-text" size={18} color={sc[k.status]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.kycName, { color: colors.foreground }]} numberOfLines={1}>{k.userFullName ?? 'Unknown'}</Text>
                <Text style={[s.kycType, { color: colors.mutedForeground }]}>{k.documentType.replace('_', ' ')}</Text>
                <Text style={[s.kycDate, { color: colors.mutedForeground }]}>{format(new Date(k.submittedAt), 'MMM d, yyyy')}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: sc[k.status] + '20' }]}>
                <Text style={[s.badgeTxt, { color: sc[k.status] }]}>{k.status.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="shield" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No KYC submissions</Text>
            </View>
          }
        />
      )}

      <KycDetailModal kyc={selected} visible={selected !== null} onClose={() => { setSelected(null); refetch(); }} colors={colors} />
    </>
  );
}

const ks = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '600' as const },
  count: { fontSize: 11, marginBottom: 10 },
  kycRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8 },
  kycIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  kycName: { fontSize: 14, fontWeight: '600' as const },
  kycType: { fontSize: 12, textTransform: 'capitalize' as const, marginTop: 2 },
  kycDate: { fontSize: 11, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTxt: { fontSize: 10, fontWeight: '700' as const },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  // Modal
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' as const, marginBottom: 14 },
  infoCard: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 14 },
  infoName: { fontSize: 15, fontWeight: '700' as const },
  infoEmail: { fontSize: 13, marginTop: 2 },
  infoMeta: { fontSize: 12, marginTop: 4 },
  docSection: { marginBottom: 14 },
  docLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  docImg: { width: '100%', height: 180, borderRadius: 4 },
  zoomHint: { position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  zoomTxt: { color: '#fff', fontSize: 11, fontWeight: '500' as const },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  notesInput: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14, minHeight: 80 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 4 },
  actionTxt: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  closeBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});
