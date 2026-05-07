import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW } from '../constants';
import { Scheme, InsuranceSubsidy, Application } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SchemeDetail'>;
type RouteP = RouteProp<RootStackParamList, 'SchemeDetail'>;

function getEligibilityText(eligibility: Scheme['eligibility']): string {
  if (!eligibility) return '';
  if (typeof eligibility === 'string') return eligibility;
  const parts: string[] = [];
  if (eligibility.summary) parts.push(eligibility.summary);
  if (Array.isArray(eligibility.familyCriteria)) parts.push(...eligibility.familyCriteria);
  if (Array.isArray(eligibility.exclusions)) parts.push(...eligibility.exclusions);
  if (Array.isArray(eligibility.parameters)) {
    eligibility.parameters.forEach(p => parts.push(`${p.parameter}: ${p.rule}`));
  }
  return parts.join('. ');
}

interface EligibilityResult {
  eligible: boolean;
  score: number; // 0-100
  reasons: { ok: boolean; text: string }[];
}

function assessEligibility(
  tabType: 'schemes' | 'insurance' | 'subsidies',
  item: Scheme | InsuranceSubsidy,
  farmer: { crop?: string; land?: string | number; docs?: { section: string; status: string }[]; status?: string } | null,
): EligibilityResult {
  const reasons: { ok: boolean; text: string }[] = [];
  const crop = farmer?.crop;
  const land = farmer?.land;
  const docsCount = (farmer?.docs ?? []).filter(d => d.status === 'uploaded').length;
  const totalDocs = 5;

  // Check 1: Farmer is verified/active
  const isVerified = farmer?.status === 'Active' || farmer?.status === 'Verified';
  reasons.push({ ok: isVerified, text: isVerified ? 'Your profile is verified ✓' : 'Profile verification required' });

  // Check 2: Documents uploaded
  const allDocsUploaded = docsCount >= totalDocs;
  reasons.push({
    ok: allDocsUploaded,
    text: allDocsUploaded
      ? `All ${totalDocs} documents uploaded ✓`
      : `${docsCount}/${totalDocs} documents uploaded (upload remaining docs)`,
  });

  // Check 3: Crop match (if scheme specifies crops)
  if (tabType === 'schemes') {
    const scheme = item as Scheme;
    const eligText = getEligibilityText(scheme.eligibility).toLowerCase();
    if (eligText && crop && crop !== '—') {
      const cropMatch = eligText.includes(crop.toLowerCase()) || eligText.includes('all') || eligText.includes('any');
      reasons.push({ ok: cropMatch, text: cropMatch ? `Your crop (${crop}) is covered ✓` : `Your crop (${crop}) may not be covered` });
    } else if (!crop || crop === '—') {
      reasons.push({ ok: false, text: 'Crop information missing in your profile' });
    }
  } else {
    const ins = item as InsuranceSubsidy;
    if (ins.crops && ins.crops.length > 0) {
      if (crop && crop !== '—') {
        const cropMatch = ins.crops.some(c => c.toLowerCase().includes(crop.toLowerCase()) || crop.toLowerCase().includes(c.toLowerCase()));
        reasons.push({ ok: cropMatch, text: cropMatch ? `Your crop (${crop}) is covered ✓` : `Your crop (${crop}) not in covered list: ${ins.crops.join(', ')}` });
      } else {
        reasons.push({ ok: false, text: `Crop info required. Covered crops: ${ins.crops.join(', ')}` });
      }
    } else {
      reasons.push({ ok: true, text: 'Open to all crops ✓' });
    }
  }

  // Check 4: Land requirement
  if (tabType !== 'schemes') {
    const ins = item as InsuranceSubsidy;
    if (ins.minLand !== undefined) {
      const acres = parseFloat(String(land ?? '0'));
      const meetsMin = !isNaN(acres) && acres >= ins.minLand;
      reasons.push({ ok: meetsMin, text: meetsMin ? `Land holding (${acres} acres) meets minimum (${ins.minLand} acres) ✓` : `Minimum ${ins.minLand} acres required (you have ${land || '?'} acres)` });
    }
    if (ins.maxLand !== undefined) {
      const acres = parseFloat(String(land ?? '0'));
      const meetsMax = !isNaN(acres) && acres <= ins.maxLand;
      reasons.push({ ok: meetsMax, text: meetsMax ? `Land holding within maximum limit ✓` : `Maximum ${ins.maxLand} acres limit (you have ${acres} acres)` });
    }
  } else {
    if (land && land !== '—') {
      reasons.push({ ok: true, text: `Land holding recorded: ${land} acres ✓` });
    } else {
      reasons.push({ ok: false, text: 'Land holding information missing in profile' });
    }
  }

  const okCount = reasons.filter(r => r.ok).length;
  const score = Math.round((okCount / reasons.length) * 100);
  const eligible = score >= 60 && reasons[0]?.ok; // must be verified + majority pass

  return { eligible, score, reasons };
}

const APP_STATUS_COLOR: Record<string, string> = {
  Pending: '#D97706',
  'Under Review': '#2563EB',
  Approved: '#16A34A',
  Rejected: '#DC2626',
  Settled: '#0D9488',
};

export default function SchemeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { state } = useAuth();
  const farmer = state.farmer;

  const { itemJson, tabType, existingAppJson } = route.params;
  const item: Scheme | InsuranceSubsidy = JSON.parse(itemJson);
  const existingApp: Application | null = existingAppJson ? JSON.parse(existingAppJson) : null;

  const [applying, setApplying] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<Application | null>(existingApp);

  const lang = state.lang;
  const t = (en: string, hi: string, mr: string) => lang === 'hi' ? hi : lang === 'mr' ? mr : en;

  const eligibility = assessEligibility(tabType, item, farmer);

  const isScheme = tabType === 'schemes';
  const ins = !isScheme ? (item as InsuranceSubsidy) : null;
  const sch = isScheme ? (item as Scheme) : null;

  const benefit = isScheme ? (sch?.benefit ?? sch?.benefits) : ins?.benefit;
  const crops = ins?.crops ?? [];
  const isState = isScheme ? sch?.type === 'STATE' : ins?.region !== 'Central';
  const schemeTypeLabel = isState ? t('State', 'राज्य', 'राज्य') : t('Central', 'केंद्रीय', 'केंद्रीय');
  const appType: 'scheme' | 'subsidy' | 'insurance' = tabType === 'schemes' ? 'scheme' : tabType === 'insurance' ? 'insurance' : 'subsidy';

  const handleApply = useCallback(async () => {
    if (!farmer) return;
    const mobile = farmer.mobile ?? state.mobile;
    if (!mobile) return;

    const confirmMsg = t(
      `Apply for "${item.name}"?`,
      `"${item.name}" के लिए आवेदन करें?`,
      `"${item.name}" साठी अर्ज करायचा आहे का?`,
    );

    Alert.alert(
      t('Confirm Application', 'आवेदन की पुष्टि', 'अर्जाची पुष्टी'),
      confirmMsg,
      [
        { text: t('Cancel', 'रद्द करें', 'रद्द करा'), style: 'cancel' },
        {
          text: t('Apply Now', 'अभी आवेदन करें', 'आत्ता अर्ज करा'),
          onPress: async () => {
            setApplying(true);
            try {
              const app = await api.applyForScheme({
                type: appType,
                farmerId: farmer.farmerId,
                farmerName: farmer.name ?? null,
                mobile,
                district: farmer.district ?? null,
                village: farmer.village ?? null,
                schemeId: item.id,
                schemeName: item.name,
                schemeType: isScheme ? sch?.type ?? null : ins?.type ?? null,
                crop: farmer.crop ?? null,
                land: farmer.land != null ? parseFloat(String(farmer.land)) : null,
              });
              setSubmittedApp(app);
              Alert.alert(
                t('Application Submitted! 🎉', 'आवेदन सफल! 🎉', 'अर्ज यशस्वी! 🎉'),
                t(
                  `Your application has been submitted.\nApp ID: ${app.applicationId}`,
                  `आपका आवेदन सफलतापूर्वक जमा किया गया।\nID: ${app.applicationId}`,
                  `अर्ज यशस्वीरित्या सादर केला गेला.\nID: ${app.applicationId}`,
                ),
                [{ text: 'OK' }],
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed';
              if (msg.includes('Already applied')) {
                Alert.alert(
                  t('Already Applied', 'पहले से आवेदन किया', 'आधीच अर्ज केला'),
                  t('You have already applied for this scheme.', 'आपने पहले से इस योजना के लिए आवेदन किया है।', 'तुम्ही आधीच या योजनेसाठी अर्ज केला आहे.'),
                  [{ text: 'OK' }],
                );
              } else {
                Alert.alert(t('Error', 'त्रुटि', 'चूक'), t('Could not submit application. Please try again.', 'आवेदन सबमिट नहीं हो सका।', 'अर्ज सादर होऊ शकला नाही.'), [{ text: 'OK' }]);
              }
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  }, [farmer, state.mobile, item, appType]);

  const eligibilityColor = eligibility.eligible ? COLORS.primary : eligibility.score >= 40 ? COLORS.gold : COLORS.error;
  const eligibilityBg = eligibility.eligible ? COLORS.primaryBg : eligibility.score >= 40 ? '#FEF3C7' : '#FEE2E2';
  const eligibilityLabel = eligibility.eligible
    ? t('You are likely eligible ✓', 'आप संभवतः पात्र हैं ✓', 'तुम्ही बहुधा पात्र आहात ✓')
    : eligibility.score >= 40
    ? t('Partially eligible — check requirements', 'आंशिक रूप से पात्र', 'आंशिक पात्रता')
    : t('You may not be eligible', 'आप पात्र नहीं हो सकते', 'तुम्ही पात्र नसू शकता');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.topBarSub}>
            {tabType === 'schemes' ? t('Government Scheme', 'सरकारी योजना', 'सरकारी योजना')
              : tabType === 'insurance' ? t('Crop Insurance', 'फसल बीमा', 'पीक विमा')
              : t('Subsidy Programme', 'सब्सिडी कार्यक्रम', 'अनुदान कार्यक्रम')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.typeBadge, isState ? styles.stateBadge : styles.centralBadge]}>
              <Text style={[styles.typeBadgeText, isState ? styles.stateText : styles.centralText]}>{schemeTypeLabel}</Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, item.status === 'Active' ? styles.activeText : styles.closedText]}>
                {item.status === 'Active' ? (lang === 'hi' ? 'सक्रिय' : lang === 'mr' ? 'सक्रिय' : 'Active') : (lang === 'hi' ? 'बंद' : lang === 'mr' ? 'बंद' : 'Closed')}
              </Text>
            </View>
          </View>
          <Text style={styles.heroName}>{item.name}</Text>
          {item.description ? <Text style={styles.heroDesc}>{item.description}</Text> : null}
        </View>

        {/* Application status */}
        {submittedApp && (
          <View style={[styles.appStatusCard, { borderColor: APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280', backgroundColor: `${APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280'}10` }]}>
            <Text style={styles.appStatusTitle}>📋 {t('Your Application', 'आपका आवेदन', 'तुमचा अर्ज')}</Text>
            <View style={styles.appStatusRow}>
              <Text style={styles.appStatusId}>{submittedApp.applicationId}</Text>
              <View style={[styles.appStatusBadge, { backgroundColor: APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280' }]}>
                <Text style={styles.appStatusBadgeText}>{submittedApp.status}</Text>
              </View>
            </View>
            {submittedApp.adminReply ? (
              <View style={styles.adminReplyBox}>
                <Text style={styles.adminReplyLabel}>{t('Admin Response:', 'अधिकारी प्रतिक्रिया:', 'अधिकारी प्रतिसाद:')}</Text>
                <Text style={styles.adminReplyText}>{submittedApp.adminReply}</Text>
              </View>
            ) : null}
            <Text style={styles.appStatusDate}>
              {t('Applied', 'आवेदन दिनांक', 'अर्ज दिनांक')}: {new Date(submittedApp.appliedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Eligibility section */}
        <View style={[styles.section, { borderColor: eligibilityColor + '40', backgroundColor: eligibilityBg }]}>
          <View style={styles.eligibilityHeader}>
            <Text style={[styles.eligibilityLabel, { color: eligibilityColor }]}>
              {eligibility.eligible ? '✅' : eligibility.score >= 40 ? '⚠️' : '❌'} {eligibilityLabel}
            </Text>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreText, { color: eligibilityColor }]}>{eligibility.score}%</Text>
            </View>
          </View>
          <View style={styles.eligibilityList}>
            {eligibility.reasons.map((r, i) => (
              <View key={i} style={styles.eligibilityItem}>
                <Text style={[styles.eligibilityDot, { color: r.ok ? COLORS.primary : COLORS.error }]}>{r.ok ? '✓' : '✗'}</Text>
                <Text style={[styles.eligibilityItemText, { color: r.ok ? COLORS.text : COLORS.textSecondary }]}>{r.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefit */}
        {benefit ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 {t('Benefit', 'लाभ', 'फायदा')}</Text>
            <Text style={styles.sectionContent}>{benefit}</Text>
          </View>
        ) : null}

        {/* Eligibility criteria */}
        {(isScheme ? getEligibilityText(sch?.eligibility) : ins?.eligibility) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 {t('Eligibility Criteria', 'पात्रता मानदंड', 'पात्रतेचे निकष')}</Text>
            <Text style={styles.sectionContent}>
              {isScheme ? getEligibilityText(sch?.eligibility) : ins?.eligibility}
            </Text>
          </View>
        ) : null}

        {/* Covered crops */}
        {crops.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 {t('Covered Crops', 'शामिल फसलें', 'समाविष्ट पिके')}</Text>
            <View style={styles.cropRow}>
              {crops.map((c, i) => (
                <View key={i} style={[styles.cropChip, farmer?.crop && c.toLowerCase().includes((farmer.crop ?? '').toLowerCase()) && styles.cropChipMatch]}>
                  <Text style={[styles.cropChipText, farmer?.crop && c.toLowerCase().includes((farmer.crop ?? '').toLowerCase()) && styles.cropChipTextMatch]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Land requirement */}
        {ins && (ins.minLand !== undefined || ins.maxLand !== undefined) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏡 {t('Land Requirement', 'भूमि आवश्यकता', 'जमीन आवश्यकता')}</Text>
            {ins.minLand !== undefined && <Text style={styles.sectionContent}>{t('Minimum', 'न्यूनतम', 'किमान')}: {ins.minLand} {t('acres', 'एकड़', 'एकर')}</Text>}
            {ins.maxLand !== undefined && <Text style={styles.sectionContent}>{t('Maximum', 'अधिकतम', 'कमाल')}: {ins.maxLand} {t('acres', 'एकड़', 'एकर')}</Text>}
            {farmer?.land && farmer.land !== '—' && (
              <Text style={[styles.yourValue, { color: COLORS.primary }]}>
                {t('Your holding', 'आपकी जमीन', 'तुमची जमीन')}: {farmer.land} {t('acres', 'एकड़', 'एकर')}
              </Text>
            )}
          </View>
        ) : null}

        {/* Deadline */}
        {item.deadline ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 {t('Application Deadline', 'आवेदन की अंतिम तिथि', 'अर्जाची अंतिम तारीख')}</Text>
            <Text style={[styles.sectionContent, styles.deadlineText]}>{item.deadline}</Text>
          </View>
        ) : null}

        {/* Ministry / Region */}
        {(sch?.ministry || ins?.region) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏛️ {t('Implementing Authority', 'कार्यान्वयन प्राधिकरण', 'अंमलबजावणी प्राधिकरण')}</Text>
            <Text style={styles.sectionContent}>{sch?.ministry ?? (ins?.region === 'Central' ? t('Government of India', 'भारत सरकार', 'भारत सरकार') : t('Government of Maharashtra', 'महाराष्ट्र सरकार', 'महाराष्ट्र शासन'))}</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom action */}
      {item.status === 'Active' && !submittedApp && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.applyBtn, eligibility.eligible ? styles.applyBtnEligible : styles.applyBtnNeutral, applying && styles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.applyBtnText}>
                  {t('Apply Now', 'अभी आवेदन करें', 'आत्ता अर्ज करा')}
                </Text>
                {eligibility.eligible && <Text style={styles.applyBtnSub}>{t('You are eligible', 'आप पात्र हैं', 'तुम्ही पात्र आहात')}</Text>}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Active' && submittedApp && submittedApp.status === 'Rejected' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.applyBtn, styles.applyBtnEligible, applying && styles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.applyBtnText}>{t('Re-apply', 'पुनः आवेदन करें', 'पुन्हा अर्ज करा')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Closed' && (
        <View style={styles.bottomBar}>
          <View style={styles.closedBar}>
            <Text style={styles.closedBarText}>🔒 {t('Applications Closed', 'आवेदन बंद हैं', 'अर्ज बंद आहेत')}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.white, lineHeight: 22 },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...({ shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 } as object),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  heroName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text, lineHeight: 24, marginBottom: 8 },
  heroDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  centralBadge: { backgroundColor: '#DBEAFE' },
  stateBadge: { backgroundColor: COLORS.primaryBg },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800' },
  centralText: { color: '#2563EB' },
  stateText: { color: COLORS.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  activeBadge: { backgroundColor: COLORS.primaryBg },
  closedBadge: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '800' },
  activeText: { color: COLORS.primary },
  closedText: { color: COLORS.textMuted },

  appStatusCard: {
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  appStatusTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.text },
  appStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appStatusId: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary },
  appStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  appStatusBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.white },
  adminReplyBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: RADIUS.md, padding: 10, gap: 4 },
  adminReplyLabel: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.textSecondary },
  adminReplyText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  appStatusDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...({ shadowColor: '#166534', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } as object),
  },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  sectionContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  yourValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: 4 },
  deadlineText: { fontWeight: '700', color: COLORS.gold },

  eligibilityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  eligibilityLabel: { fontSize: FONT_SIZE.sm, fontWeight: '800', flex: 1 },
  scoreCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
  },
  scoreText: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
  eligibilityList: { gap: 8 },
  eligibilityItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  eligibilityDot: { fontSize: FONT_SIZE.base, fontWeight: '800', width: 18, marginTop: 1 },
  eligibilityItemText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20 },

  cropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cropChipMatch: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  cropChipText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  cropChipTextMatch: { color: COLORS.primary },

  bottomBar: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 } as object),
  },
  applyBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  applyBtnEligible: { backgroundColor: COLORS.primaryDark },
  applyBtnNeutral: { backgroundColor: COLORS.primary },
  applyBtnDisabled: { opacity: 0.7 },
  applyBtnText: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.white },
  applyBtnSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.75)' },
  closedBar: {
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closedBarText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textMuted },
});
