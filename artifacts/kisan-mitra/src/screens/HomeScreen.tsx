import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { Notification } from '../types';
import type { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

const QUICK_ACTIONS = [
  { key: 'applyScheme', icon: '📋', color: COLORS.primary },
  { key: 'fileInsurance', icon: '🛡️', color: COLORS.info },
  { key: 'raiseGrievance', icon: '📢', color: COLORS.gold },
  { key: 'checkSubsidy', icon: '💰', color: '#7C3AED' },
];

export default function HomeScreen() {
  const { state } = useAuth();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const farmer = state.farmer;
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const fetchRecentNotifs = useCallback(() => {
    if (state.mobile) {
      api.getNotifications(state.mobile)
        .then((n) => setRecentNotifs(n.slice(0, 3)))
        .catch(() => {});
    }
  }, [state.mobile]);

  useEffect(() => {
    fetchRecentNotifs();
  }, [fetchRecentNotifs]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentNotifs();
    }, [fetchRecentNotifs]),
  );

  const initials = (farmer?.name && farmer.name !== '—')
    ? farmer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  function handleQuickAction(key: string) {
    if (key === 'raiseGrievance') {
      stackNav.navigate('Grievance');
      return;
    }
    if (key === 'applyScheme') {
      tabNav.navigate('Schemes', { initialTab: 'schemes' });
      return;
    }
    if (key === 'fileInsurance') {
      tabNav.navigate('Schemes', { initialTab: 'insurance' });
      return;
    }
    if (key === 'checkSubsidy') {
      tabNav.navigate('Schemes', { initialTab: 'subsidies' });
      return;
    }
  }

  const greetName = farmer?.name && farmer.name !== '—' ? farmer.name.split(' ')[0] : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.greeting}>
                {t('welcome')}{greetName ? `, ${greetName}` : ''} 🙏
              </Text>
              <Text style={styles.greetingSub}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>{t('activeStatus')}</Text>
            </View>
            {farmer?.farmerId && (
              <Text style={styles.farmerIdText}>ID: {farmer.farmerId}</Text>
            )}
          </View>
        </View>

        <View style={styles.farmCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{t('farmSummary')}</Text>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>📊</Text></View>
          </View>
          <View style={styles.farmGrid}>
            <FarmStat icon="📐" label={t('totalLand')} value={farmer?.land ? `${farmer.land} ha` : t('na')} color={COLORS.primary} />
            <FarmStat icon="🌾" label={t('primaryCrop')} value={(farmer?.crop && farmer.crop !== '—') ? farmer.crop : t('na')} color={COLORS.gold} />
            <FarmStat icon="🏘️" label={t('location')} value={(farmer?.village && farmer.village !== '—') ? farmer.village : t('na')} color={COLORS.info} />
            <FarmStat icon="🗺️" label={t('district')} value={(farmer?.district && farmer.district !== '—') ? farmer.district : t('na')} color="#7C3AED" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.actionBtn, { borderTopColor: a.color }]}
              onPress={() => handleQuickAction(a.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: a.color + '15' }]}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{t(a.key)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {recentNotifs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>{t('recentNotifs')}</Text>
            </View>
            <View style={styles.notifList}>
              {recentNotifs.map((n) => (
                <View key={n.notificationId} style={[styles.notifRow, !n.read && styles.notifRowUnread]}>
                  <View style={[styles.notifIconBox, { backgroundColor: (n.type === 'approval' ? COLORS.primary : n.type === 'rejection' ? COLORS.error : COLORS.info) + '18' }]}>
                    <Text style={styles.notifIcon}>
                      {n.type === 'approval' ? '✅' : n.type === 'rejection' ? '❌' : '🔔'}
                    </Text>
                  </View>
                  <View style={styles.notifInfo}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.advisoryCard}>
          <View style={styles.advisoryIconBox}>
            <Text style={styles.advisoryIcon}>🌤️</Text>
          </View>
          <View style={styles.advisoryInfo}>
            <Text style={styles.advisoryTitle}>Weather Advisory</Text>
            <Text style={styles.advisoryText}>Good conditions for sowing this week. Moderate rainfall expected in your district.</Text>
          </View>
        </View>

        <View style={styles.brandingStrip}>
          <Text style={styles.brandingText}>कृषी सुविधा  •  Govt. of Maharashtra</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FarmStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[farmStyles.stat, { borderTopColor: color }]}>
      <View style={[farmStyles.iconBox, { backgroundColor: color + '15' }]}>
        <Text style={farmStyles.icon}>{icon}</Text>
      </View>
      <Text style={farmStyles.label}>{label}</Text>
      <Text style={[farmStyles.value, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const farmStyles = StyleSheet.create({
  stat: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: 14, alignItems: 'center', gap: 6, borderTopWidth: 3, ...SHADOW.sm,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  value: { fontSize: FONT_SIZE.sm, fontWeight: '800', textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  heroCard: {
    backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.xl,
    padding: 20, marginBottom: 16, ...SHADOW.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroText: { flex: 1 },
  greeting: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  greetingSub: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.6)' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.gold + '60',
  },
  avatarText: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.white },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  statusPillText: { color: COLORS.white, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  farmerIdText: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.xs, fontWeight: '600' },
  farmCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 20, ...SHADOW.sm,
  },
  section: { marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  sectionBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  sectionBadgeText: { fontSize: 15 },
  farmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionBtn: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center', gap: 10, ...SHADOW.sm, borderTopWidth: 3,
  },
  actionIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  notifList: { gap: 10 },
  notifRow: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, ...SHADOW.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  notifRowUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 20 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  notifBody: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 16 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  advisoryCard: {
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, padding: 16,
    flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.primaryLight,
  },
  advisoryIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  advisoryIcon: { fontSize: 26 },
  advisoryInfo: { flex: 1 },
  advisoryTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 4 },
  advisoryText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryMid, lineHeight: 18 },
  brandingStrip: {
    alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4,
  },
  brandingText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
});
