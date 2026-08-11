import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSession, ChatMessage } from '@workspace/api-client-react';
import { format } from 'date-fns';

// ─── Admin chat uses raw fetch (no generated hooks) ───────────────────────────
function useAdminApi() {
  const { token } = useAuth();
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  return async <T>(path: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
        ...(options?.headers as any),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  };
}

function ChatSessionsPanel({ colors, onSelect }: { colors: ReturnType<typeof useColors>; onSelect: (s: ChatSession) => void }) {
  const apiFetch = useAdminApi();
  const { data, isLoading, refetch } = useQuery<{ sessions: ChatSession[] }>({
    queryKey: ['admin', 'chat', 'sessions'],
    queryFn: () => apiFetch('/api/admin/chat/sessions'),
    refetchInterval: 10_000,
  });

  const sessions = data?.sessions ?? [];
  const s = chs(colors);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.refreshRow}>
        <Text style={[s.sessionCount, { color: colors.mutedForeground }]}>{sessions.length} conversations</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : sessions.length === 0 ? (
        <View style={s.empty}>
          <Feather name="message-circle" size={28} color={colors.mutedForeground} />
          <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No chat sessions</Text>
        </View>
      ) : (
        <FlatList
          data={sessions} keyExtractor={s => String(s.id)} scrollEnabled={false}
          renderItem={({ item: ses }) => (
            <TouchableOpacity style={[s.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onSelect(ses)} activeOpacity={0.8}>
              <View style={[s.sessionAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.sessionAvatarTxt, { color: colors.primary }]}>{(ses.user?.fullName?.[0] ?? 'U').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sessionName, { color: colors.foreground }]} numberOfLines={1}>
                  {ses.user?.fullName ?? 'User #' + ses.userId}
                </Text>
                {ses.lastMessage && (
                  <Text style={[s.sessionLastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {ses.lastMessage.senderRole === 'admin' ? 'You: ' : ''}{ses.lastMessage.message}
                  </Text>
                )}
                <Text style={[s.sessionTime, { color: colors.mutedForeground }]}>
                  {format(new Date(ses.lastMessageAt || ses.createdAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <View style={[s.statusDot, { backgroundColor: ses.status === 'open' ? colors.success : colors.mutedForeground + '60' }]} />
                {(ses.unreadCount ?? 0) > 0 && (
                  <View style={[s.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[s.unreadTxt, { color: colors.primaryForeground }]}>{ses.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function ChatView({ session, colors, onBack }: { session: ChatSession; colors: ReturnType<typeof useColors>; onBack: () => void }) {
  const apiFetch = useAdminApi();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ['admin', 'chat', 'messages', session.id],
    queryFn: () => apiFetch(`/api/admin/chat/sessions/${session.id}/messages`),
    refetchInterval: 5_000,
  });

  const replyM = useMutation({
    mutationFn: (message: string) => apiFetch(`/api/admin/chat/sessions/${session.id}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),
    onSuccess: () => { setReply(''); refetch(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Send failed.'),
  });

  const closeM = useMutation({
    mutationFn: () => apiFetch(`/api/admin/chat/sessions/${session.id}/close`, { method: 'PATCH' }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'chat', 'sessions'] });
      onBack();
      Alert.alert('Session closed', 'This chat has been closed.');
    },
  });

  const messages = data?.messages ?? [];
  const s = chs(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.chatHeader, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.chatUser, { color: colors.foreground }]} numberOfLines={1}>
            {session.user?.fullName ?? 'User #' + session.userId}
          </Text>
          <Text style={[s.chatStatus, { color: session.status === 'open' ? colors.success : colors.mutedForeground }]}>
            {session.status === 'open' ? '● Open' : '● Closed'}
          </Text>
        </View>
        {session.status === 'open' && (
          <TouchableOpacity style={[s.closeSessionBtn, { borderColor: colors.destructive + '60' }]}
            onPress={() => Alert.alert('Close Session', 'Mark this chat as closed?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Close', style: 'destructive', onPress: () => closeM.mutate() }])}>
            <Text style={[s.closeSessionTxt, { color: colors.destructive }]}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.messagesArea}
        contentContainerStyle={s.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : messages.map(msg => {
          const isAdmin = msg.senderRole === 'admin';
          return (
            <View key={msg.id} style={[s.msgWrap, isAdmin ? s.msgRight : s.msgLeft]}>
              <View style={[s.msgBubble, isAdmin
                ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
                <Text style={[s.msgText, { color: isAdmin ? colors.primaryForeground : colors.foreground }]}>{msg.message}</Text>
                <Text style={[s.msgTime, { color: isAdmin ? colors.primaryForeground + '99' : colors.mutedForeground }]}>
                  {format(new Date(msg.createdAt), 'h:mm a')}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Reply input */}
      {session.status === 'open' && (
        <View style={[s.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[s.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Type a reply…" placeholderTextColor={colors.mutedForeground}
            value={reply} onChangeText={setReply} multiline maxLength={1000} returnKeyType="send" />
          <TouchableOpacity style={[s.sendBtn, { backgroundColor: colors.primary }, (!reply.trim() || replyM.isPending) && { opacity: 0.5 }]}
            onPress={() => { if (reply.trim()) replyM.mutate(reply.trim()); }}
            disabled={!reply.trim() || replyM.isPending}>
            {replyM.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="send" size={16} color={colors.primaryForeground} />}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function AdminChat({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);

  if (activeSession) {
    return <ChatView session={activeSession} colors={colors} onBack={() => setActiveSession(null)} />;
  }
  return <ChatSessionsPanel colors={colors} onSelect={setActiveSession} />;
}

const chs = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  refreshRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sessionCount: { fontSize: 11 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8, gap: 10 },
  sessionAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sessionAvatarTxt: { fontSize: 16, fontWeight: '700' as const },
  sessionName: { fontSize: 14, fontWeight: '600' as const },
  sessionLastMsg: { fontSize: 12, marginTop: 2 },
  sessionTime: { fontSize: 11, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadTxt: { fontSize: 10, fontWeight: '700' as const },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  // Chat view
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, gap: 10, marginBottom: 8 },
  backBtn: { padding: 4 },
  chatUser: { fontSize: 15, fontWeight: '700' as const },
  chatStatus: { fontSize: 12, marginTop: 2 },
  closeSessionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1 },
  closeSessionTxt: { fontSize: 12, fontWeight: '600' as const },
  messagesArea: { flex: 1 },
  messagesContent: { gap: 8, paddingVertical: 8 },
  msgWrap: { maxWidth: '80%' },
  msgLeft: { alignSelf: 'flex-start' as const },
  msgRight: { alignSelf: 'flex-end' as const },
  msgBubble: { borderRadius: 14, padding: 12 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' as const },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
