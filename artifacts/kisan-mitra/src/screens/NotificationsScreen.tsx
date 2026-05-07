import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { Notification } from '../types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function notifIcon(type: string): string {
  switch (type) {
    case 'approval': return '✅';
    case 'rejection': return '❌';
    case 'scheme': return '📋';
    case 'subsidy': return '💰';
    case 'insurance': return '🛡️';
    default: return '🔔';
  }
}

function notifColor(type: string): string {
  switch (type) {
    case 'approval': return COLORS.primary;
    case 'rejection': return COLORS.error;
    case 'scheme': return COLORS.info;
    case 'subsidy': return '#7C3AED';
    default: return COLORS.gold;
  }
}

export default function NotificationsScreen() {
  const { state } = useAuth();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!state.mobile) return;
    try {
      const data = await api.getNotifications(state.mobile);
      setNotifs(data);
    } catch {}
  }, [state.mobile]);

  useEffect(() => {
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifs();
    }, [fetchNotifs]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  async function markRead(id: string) {
    try {
      await api.markNotificationRead(id);
      setNotifs((prev) => prev.map((n) => n.notificationId === id ? { ...n, read: true } : n));
    } catch {}
  }

  async function markAllRead() {
    if (!state.mobile) return;
    try {
      await api.markAllRead(state.mobile);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  const unreadCount = notifs.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>{t('notifications')}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>{t('markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadDotLarge} />
          <Text style={styles.unreadBannerText}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
        </View>
      )}

      {notifs.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>🔕</Text>
          </View>
          <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
          <Text style={styles.emptySub}>You'll receive updates here when the admin takes action on your registration.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.notificationId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => {
            const color = notifColor(item.type);
            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => !item.read && markRead(item.notificationId)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
                  <Text style={styles.icon}>{notifIcon(item.type)}</Text>
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
                  </View>
                  <Text style={styles.notifBody} numberOfLines={3}>{item.body}</Text>
                  <View style={styles.notifFooter}>
                    <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                    {!item.read && (
                      <View style={[styles.tapToRead, { borderColor: color }]}>
                        <Text style={[styles.tapToReadText, { color }]}>Tap to mark read</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  markAllText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  unreadBanner: {
    backgroundColor: COLORS.primaryBg, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  unreadDotLarge: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  unreadBannerText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryDark, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primaryLight,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  list: { padding: 16, gap: 10 },
  notifCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', ...SHADOW.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  notifCardUnread: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  iconBox: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { flex: 1, fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 8 },
  notifBody: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  notifFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTime: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  tapToRead: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  tapToReadText: { fontSize: 10, fontWeight: '700' },
});
