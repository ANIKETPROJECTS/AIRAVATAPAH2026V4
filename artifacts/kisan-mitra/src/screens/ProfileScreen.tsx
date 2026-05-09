import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Platform, Image, Modal, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { api, API_BASE } from '../api';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface DocImage {
  docType: string;
  base64: string;
  mimeType: string;
  uploadedAt: string;
}

const DOC_LABELS: Record<string, string> = {
  aadhar: 'Aadhaar Card',
  bank_passbook: 'Bank Passbook',
  form7: 'Form 7 (7/12)',
  form12: 'Form 12 (Pik Pahani)',
  form8a: 'Form 8A',
};

const DOC_ICONS: Record<string, string> = {
  aadhar: '🪪',
  bank_passbook: '🏦',
  form7: '📄',
  form12: '🌾',
  form8a: '📋',
};

function val(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '—';
  const s = String(v).trim();
  if (!s || s === '—' || s === '-') return '—';
  return s;
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  const v = val(value);
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, v === '—' && { color: COLORS.textMuted }]} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  label: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, flex: 1, fontWeight: '500' },
  value: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, flex: 1.5, textAlign: 'right' },
});

function SectionCard({ title, icon, color = COLORS.primary, children }: { title: string; icon: string; color?: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.cardHeader, { borderLeftColor: color }]}>
        <View style={[cardStyles.iconBox, { backgroundColor: color + '15' }]}>
          <Text style={cardStyles.cardIcon}>{icon}</Text>
        </View>
        <Text style={[cardStyles.cardTitle, { color: COLORS.primaryDark }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 14, ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    paddingLeft: 10,
  },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 18 },
  cardTitle: { fontSize: FONT_SIZE.base, fontWeight: '800' },
});

function DocImageModal({ doc, onClose }: { doc: DocImage; onClose: () => void }) {
  const label = DOC_LABELS[doc.docType] ?? doc.docType;
  const imgSrc = `data:${doc.mimeType};base64,${doc.base64}`;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primaryDark }}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>{DOC_ICONS[doc.docType] ?? '📄'}  {label}</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
            <Text style={modalStyles.closeText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: '#111' }} contentContainerStyle={{ padding: 12 }}>
          <Image source={{ uri: imgSrc }} style={modalStyles.docImage} resizeMode="contain" />
          <Text style={modalStyles.uploadedAt}>
            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.primaryDark,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold, flex: 1 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  closeText: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: '700' },
  docImage: { width: '100%', height: undefined, aspectRatio: 0.707, borderRadius: RADIUS.md },
  uploadedAt: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.xs, textAlign: 'center', marginTop: 12 },
});

export default function ProfileScreen() {
  const { state, logout, refreshFarmer } = useAuth();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const farmer = state.farmer;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [docImages, setDocImages] = useState<DocImage[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocImage | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canViewDocs = farmer?.status === 'Active' || farmer?.status === 'Verified';

  const loadData = useCallback(() => {
    refreshFarmer();
    if (farmer?.farmerId && canViewDocs) {
      setLoadingDocs(true);
      api.getDocumentImages(farmer.farmerId)
        .then(data => setDocImages(data.documents ?? []))
        .catch(() => {})
        .finally(() => setLoadingDocs(false));
    }
  }, [farmer?.farmerId, canViewDocs]);

  useEffect(() => { loadData(); }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const initials = (farmer?.name && farmer.name !== '—')
    ? farmer.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  async function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('logoutConfirm') || 'Are you sure you want to logout?')) await logout();
      return;
    }
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }

  const docsUploaded = farmer?.docs ?? [];
  const hasAadhaar = docsUploaded.some(d => d.section === 'aadhar');
  const hasPassbook = docsUploaded.some(d => d.section === 'passbook');
  const hasForm7 = docsUploaded.some(d => d.section === 'form7');
  const hasForm12 = docsUploaded.some(d => d.section === 'form12');
  const hasForm8a = docsUploaded.some(d => d.section === 'form8a');

  const anyDocUploaded = docsUploaded.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {selectedDoc && (
        <DocImageModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>{t('myProfile')}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.75}
        >
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Card */}
        <View style={styles.profileHero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.farmerName}>{(farmer?.name && farmer.name !== '—') ? farmer.name : 'Farmer'}</Text>
          <Text style={styles.farmerMobile}>+91 {state.mobile}</Text>
          <View style={styles.badgeRow}>
            {farmer?.farmerId && (
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>🪪  {farmer.farmerId}</Text>
              </View>
            )}
            <View style={styles.kycBadge}>
              <Text style={styles.kycBadgeText}>✓  {t('kycVerified')}</Text>
            </View>
          </View>
        </View>

        {/* Personal Details (from Aadhaar) */}
        <SectionCard title={t('personalInfo')} icon="👤" color={COLORS.primary}>
          <InfoRow label={t('name')} value={farmer?.name} />
          <InfoRow label={t('aadhaar')} value={farmer?.aadhaar} />
          <InfoRow label={t('dob')} value={(farmer as any)?.dob} />
          <InfoRow label={t('gender')} value={(farmer as any)?.gender} />
          <InfoRow label={t('mobile')} value={state.mobile ? `+91 ${state.mobile}` : undefined} />
          {(farmer as any)?.fatherName && (
            <InfoRow label="Father's Name" value={(farmer as any).fatherName} />
          )}
          {(farmer as any)?.address && (
            <InfoRow label="Address" value={(farmer as any).address} />
          )}
        </SectionCard>

        {/* Land Details (from Form 7 / Form 12 / Form 8A) */}
        {(anyDocUploaded || farmer?.village || farmer?.district) && (
          <SectionCard title={t('landInfo')} icon="🌾" color={COLORS.gold}>
            <InfoRow label={t('village')} value={farmer?.village} />
            <InfoRow label={t('district')} value={farmer?.district} />
            <InfoRow label={t('taluka')} value={farmer?.taluka} />
            <InfoRow label={t('surveyNo')} value={farmer?.surveyNumber} />
            <InfoRow label={t('landArea')} value={farmer?.land ? `${farmer.land} हे. / ha` : undefined} />
            <InfoRow label={t('crop')} value={farmer?.crop} />
          </SectionCard>
        )}

        {/* Bank Details (from Passbook) */}
        {(anyDocUploaded || farmer?.bankAccount || farmer?.bankName) && (
          <SectionCard title={t('bankInfo')} icon="🏦" color={COLORS.info}>
            <InfoRow label={t('bank')} value={farmer?.bankName} />
            <InfoRow label={t('branch')} value={(farmer as any)?.branchName} />
            <InfoRow label={t('ifsc')} value={(farmer as any)?.ifsc} />
            <InfoRow label={t('accountNo')} value={farmer?.bankAccount} />
          </SectionCard>
        )}

        {/* Submitted Documents section */}
        {docsUploaded.length > 0 && (
          <SectionCard title="Submitted Documents" icon="📁" color="#7C3AED">
            {docsUploaded.map((doc, i) => {
              const docIcon = DOC_ICONS[(doc as any).section] ?? '📄';
              const docLabel = DOC_LABELS[(doc as any).section] ?? doc.name;
              return (
                <View key={i} style={styles.docRow}>
                  <View style={styles.docIconBox}>
                    <Text style={styles.docIcon}>{docIcon}</Text>
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{docLabel || doc.name}</Text>
                    <Text style={styles.docDate}>
                      {doc.extractedAt
                        ? new Date(doc.extractedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Processing…'}
                    </Text>
                  </View>
                  <View style={[styles.docBadge, { backgroundColor: COLORS.primaryBg }]}>
                    <Text style={styles.docBadgeText}>✓</Text>
                  </View>
                </View>
              );
            })}
          </SectionCard>
        )}

        {/* Original Document Images */}
        {canViewDocs && (
          <SectionCard title="My Documents" icon="🖼️" color={COLORS.gold}>
            {loadingDocs ? (
              <View style={styles.docsLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.docsLoadingText}>Loading documents…</Text>
              </View>
            ) : docImages.length === 0 ? (
              <View style={styles.docsEmpty}>
                <Text style={styles.docsEmptyText}>No document images available.</Text>
              </View>
            ) : (
              docImages.map((doc, i) => {
                const label = DOC_LABELS[doc.docType] ?? doc.docType;
                const icon = DOC_ICONS[doc.docType] ?? '📄';
                const imgSrc = `data:${doc.mimeType};base64,${doc.base64}`;
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.docImageCard}
                    onPress={() => setSelectedDoc(doc)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: imgSrc }} style={styles.docThumbnail} resizeMode="cover" />
                    <View style={styles.docImageInfo}>
                      <Text style={styles.docImageIcon}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docImageLabel}>{label}</Text>
                        <Text style={styles.docImageDate}>
                          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={styles.viewBtn}>
                        <Text style={styles.viewBtnText}>View</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </SectionCard>
        )}

        <TouchableOpacity
          style={styles.grievanceBtn}
          onPress={() => navigation.navigate('Grievance')}
          activeOpacity={0.85}
        >
          <Text style={styles.grievanceBtnText}>📢  {t('raiseGrievance')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>🚪  {t('logout')}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Text style={styles.footerLogoText}>🌾</Text>
          </View>
          <Text style={styles.footerTitle}>कृषी सुविधा</Text>
          <Text style={styles.footerText}>Govt. of Maharashtra  •  Agriculture & Farmers Welfare Dept.</Text>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  settingsBtnText: { fontSize: 20 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  profileHero: {
    backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.xl, padding: 24,
    alignItems: 'center', marginBottom: 16, ...SHADOW.md,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: COLORS.gold + '60',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarLarge: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE['3xl'], fontWeight: '800', color: COLORS.white },
  farmerName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  farmerMobile: { fontSize: FONT_SIZE.base, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  idBadgeText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.white },
  kycBadge: {
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.primary,
  },
  kycBadgeText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
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
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  docBadgeText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '800' },
  docsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  docsLoadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  docsEmpty: { paddingVertical: 12 },
  docsEmptyText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  docImageCard: {
    borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1,
    borderColor: COLORS.borderLight, marginBottom: 12, backgroundColor: COLORS.white, ...SHADOW.sm,
  },
  docThumbnail: { width: '100%', height: 160, backgroundColor: '#f5f5f5' },
  docImageInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  docImageIcon: { fontSize: 22 },
  docImageLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  docImageDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  viewBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6,
  },
  viewBtnText: { color: COLORS.white, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  grievanceBtn: {
    backgroundColor: COLORS.goldLight, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.gold, ...SHADOW.sm,
  },
  grievanceBtnText: { color: COLORS.gold, fontSize: FONT_SIZE.base, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: COLORS.error, ...SHADOW.sm,
  },
  logoutText: { color: COLORS.error, fontSize: FONT_SIZE.base, fontWeight: '700' },
  footer: { alignItems: 'center', gap: 8, paddingTop: 8 },
  footerLogo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
  },
  footerLogoText: { fontSize: 22 },
  footerTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.primaryDark },
  footerText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center' },
});
