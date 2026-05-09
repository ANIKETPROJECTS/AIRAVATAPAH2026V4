import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';

const STEPS = [
  { key: 'submitted', icon: '📤', label: 'Documents Submitted', sub: 'Documents received successfully' },
  { key: 'underReview', icon: '🔍', label: 'Under Review', sub: 'Documents being verified' },
  { key: 'decision', icon: '✅', label: 'Admin Decision', sub: 'Awaiting final approval' },
];

export default function PendingScreen() {
  const { state, refreshFarmer, logout } = useAuth();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const [refreshing, setRefreshing] = useState(false);
  const farmer = state.farmer;

  useEffect(() => {
    refreshFarmer().catch(() => {});
    const interval = setInterval(async () => {
      try { await refreshFarmer(); } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshFarmer]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await refreshFarmer(); }
    catch { Alert.alert('Error', 'Could not fetch updated status. Please try again.'); }
    finally { setRefreshing(false); }
  }

  async function handleLogout() {
    if (Platform.OS === 'web') {
      const msg = t('logoutConfirm') || 'Are you sure you want to logout?';
      if (window.confirm(msg)) await logout();
      return;
    }
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => { logout(); } },
    ]);
  }

  const docs = farmer?.docs ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>Application Status</Text>
        </View>
        <TouchableOpacity style={styles.refreshTopBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={COLORS.gold} />
            : <Text style={styles.refreshTopText}>↻ Refresh</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHero}>
          <View style={styles.statusIconRing}>
            <View style={styles.statusIconInner}>
              <Text style={styles.statusEmoji}>⏳</Text>
            </View>
          </View>
          <Text style={styles.title}>{t('pendingTitle')}</Text>
          <Text style={styles.subtitle}>{t('pendingSubtitle')}</Text>
        </View>

        {!!farmer?.farmerId && (
          <View style={styles.idCard}>
            <View style={styles.idCardLeft}>
              <Text style={styles.idLabel}>{t('farmerId')}</Text>
              <Text style={styles.idValue}>{farmer.farmerId}</Text>
              <Text style={styles.idMobile}>+91 {state.mobile}</Text>
            </View>
            <View style={styles.idIconBox}>
              <Text style={styles.idIcon}>🪪</Text>
            </View>
          </View>
        )}

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Application Timeline</Text>
          {STEPS.map((step, idx) => {
            const isActive = idx === 1;
            const isDone = idx === 0;
            return (
              <View key={step.key}>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    isDone && styles.stepDotDone,
                    isActive && styles.stepDotActive,
                  ]}>
                    <Text style={styles.stepDotIcon}>{step.icon}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>
                      {idx === 0 ? t('statusSubmitted') : idx === 1 ? t('statusUnderReview') : t('statusDecision')}
                    </Text>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                  {(isDone || isActive) && (
                    <View style={[styles.stepBadge, isDone ? styles.stepBadgeDone : styles.stepBadgeActive]}>
                      <Text style={styles.stepBadgeText}>{isDone ? '✓' : '●'}</Text>
                    </View>
                  )}
                </View>
                {idx < STEPS.length - 1 && (
                  <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                )}
              </View>
            );
          })}
        </View>

        {docs.length > 0 && (
          <View style={styles.docsCard}>
            <Text style={styles.cardTitle}>{t('docsSubmitted')}</Text>
            {docs.map((doc, i) => (
              <View key={i} style={styles.docRow}>
                <View style={styles.docIconBox}>
                  <Text style={styles.docIcon}>📄</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docDate}>
                    {doc.extractedAt ? new Date(doc.extractedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
                <View style={styles.docBadge}>
                  <Text style={styles.docBadgeText}>✓ Done</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>⏰ What happens next?</Text>
          <Text style={styles.infoText}>
            The agriculture officer will review your uploaded documents and verify your land records. This typically takes 2–5 working days. You will be notified once a decision is made.
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.85}>
          {refreshing
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.refreshBtnText}>🔄  {t('refreshStatus')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  refreshTopBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  refreshTopText: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },
  statusHero: { alignItems: 'center', marginBottom: 20 },
  statusIconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.primaryLight, ...SHADOW.sm,
  },
  statusIconInner: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center',
  },
  statusEmoji: { fontSize: 40 },
  title: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.primaryDark, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  idCard: {
    backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOW.md,
  },
  idCardLeft: {},
  idLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  idValue: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  idMobile: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  idIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  idIcon: { fontSize: 26 },
  timelineCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, ...SHADOW.sm,
  },
  cardTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepDot: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: COLORS.primaryBg, borderWidth: 2, borderColor: COLORS.primary },
  stepDotActive: { backgroundColor: COLORS.goldLight, borderWidth: 2, borderColor: COLORS.gold },
  stepDotIcon: { fontSize: 22 },
  stepInfo: { flex: 1, paddingTop: 4 },
  stepLabel: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.textMuted },
  stepLabelActive: { color: COLORS.text },
  stepSub: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  stepBadgeDone: { backgroundColor: COLORS.primary },
  stepBadgeActive: { backgroundColor: COLORS.gold },
  stepBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  stepLine: { width: 2, height: 24, backgroundColor: COLORS.border, marginLeft: 23, marginVertical: 4 },
  stepLineDone: { backgroundColor: COLORS.primary },
  docsCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 16, ...SHADOW.sm, gap: 2,
  },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  docIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  docIcon: { fontSize: 18 },
  docInfo: { flex: 1 },
  docName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  docDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  docBadge: {
    backgroundColor: COLORS.primaryBg, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary,
  },
  docBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },
  infoBox: {
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md, padding: 16,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  infoTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.primaryDark, marginBottom: 8 },
  infoText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryMid, lineHeight: 20 },
  refreshBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: COLORS.primary, ...SHADOW.sm,
  },
  refreshBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.base, fontWeight: '800' },
  logoutBtn: { paddingVertical: 14, alignItems: 'center' },
  logoutBtnText: { color: COLORS.error, fontSize: FONT_SIZE.base, fontWeight: '600' },
});
