import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS } from '../constants';
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
  if (Array.isArray(eligibility.parameters)) {
    eligibility.parameters.forEach(p => parts.push(`${p.parameter}: ${p.rule}`));
  }
  return parts.join('. ');
}

function getEligibilitySummary(eligibility: Scheme['eligibility']): string {
  if (!eligibility) return '';
  if (typeof eligibility === 'string') return eligibility;
  return eligibility.summary ?? '';
}

function getEligibilityParams(eligibility: Scheme['eligibility']): { parameter: string; rule: string }[] {
  if (!eligibility || typeof eligibility === 'string') return [];
  return (eligibility.parameters ?? []).map(p => ({ parameter: p.parameter, rule: p.rule }));
}

function getEligibilityCriteria(eligibility: Scheme['eligibility']): string[] {
  if (!eligibility || typeof eligibility === 'string') return [];
  return eligibility.familyCriteria ?? [];
}

interface EligibilityResult {
  eligible: boolean;
  score: number;
  reasons: { ok: boolean; text: string }[];
}

function assessEligibility(
  tabType: 'schemes' | 'insurance' | 'subsidies',
  item: Scheme | InsuranceSubsidy,
  farmer: { crop?: string; land?: string | number; docs?: { section: string; status: string }[]; status?: string; bankAccount?: string } | null,
): EligibilityResult {
  const reasons: { ok: boolean; text: string }[] = [];
  const crop = farmer?.crop;
  const land = farmer?.land;
  const docsCount = (farmer?.docs ?? []).length;
  const totalDocs = 5;

  const isVerified = farmer?.status === 'Active' || farmer?.status === 'Verified';
  reasons.push({ ok: isVerified, text: isVerified ? 'Your profile is verified ✓' : 'Profile verification pending' });

  const allDocsUploaded = docsCount >= totalDocs;
  reasons.push({
    ok: allDocsUploaded,
    text: allDocsUploaded
      ? `All ${totalDocs} required documents uploaded ✓`
      : `${docsCount}/${totalDocs} documents uploaded — upload remaining docs`,
  });

  if (tabType === 'schemes') {
    const scheme = item as Scheme;
    const eligText = getEligibilityText(scheme.eligibility).toLowerCase();
    if (eligText) {
      if (crop && crop !== '—') {
        const cropMatch = eligText.includes(crop.toLowerCase()) || eligText.includes('all farmers') || eligText.includes('any crop');
        reasons.push({ ok: cropMatch, text: cropMatch ? `Your crop (${crop}) matches scheme coverage ✓` : `Your crop (${crop}) may not be in scope — check eligibility text` });
      } else {
        reasons.push({ ok: false, text: 'Crop information not recorded in your profile' });
      }
    }
    if (land && land !== '—') {
      reasons.push({ ok: true, text: `Land holding recorded: ${land} acres ✓` });
    } else {
      reasons.push({ ok: false, text: 'Land holding not recorded in your profile' });
    }
    if (farmer?.bankAccount && farmer.bankAccount !== '—') {
      reasons.push({ ok: true, text: 'Bank account linked for DBT ✓' });
    } else {
      reasons.push({ ok: false, text: 'Link bank account for benefit disbursement' });
    }
  } else {
    const ins = item as InsuranceSubsidy;
    if (ins.crops && ins.crops.length > 0) {
      if (crop && crop !== '—') {
        const cropMatch = ins.crops.some(c => c.toLowerCase().includes(crop.toLowerCase()) || crop.toLowerCase().includes(c.toLowerCase()));
        reasons.push({ ok: cropMatch, text: cropMatch ? `Your crop (${crop}) is in the covered list ✓` : `Your crop (${crop}) not in: ${ins.crops.join(', ')}` });
      } else {
        reasons.push({ ok: false, text: `Crop info required — covered: ${ins.crops.join(', ')}` });
      }
    } else if (ins.eligibility) {
      const e = ins.eligibility.toLowerCase();
      if (crop && crop !== '—' && e.includes(crop.toLowerCase())) {
        reasons.push({ ok: true, text: `Your crop (${crop}) is mentioned in eligibility ✓` });
      } else {
        reasons.push({ ok: true, text: 'Open to all eligible farmers — check criteria below ✓' });
      }
    }
    if (ins.minLand !== undefined) {
      const acres = parseFloat(String(land ?? '0'));
      const ok = !isNaN(acres) && acres >= ins.minLand;
      reasons.push({ ok, text: ok ? `Land (${acres} acres) meets minimum ${ins.minLand} acres ✓` : `Need ≥ ${ins.minLand} acres (you have ${land || '?'} acres)` });
    }
    if (farmer?.bankAccount && farmer.bankAccount !== '—') {
      reasons.push({ ok: true, text: 'Bank account linked ✓' });
    } else {
      reasons.push({ ok: false, text: 'Bank account required for claim disbursement' });
    }
  }

  const okCount = reasons.filter(r => r.ok).length;
  const score = Math.round((okCount / reasons.length) * 100);
  const eligible = score >= 60 && isVerified;

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

  const benefit = isScheme
    ? (sch?.benefits ?? sch?.benefit ?? '')
    : (ins?.parameters ?? ins?.benefit ?? '');

  const crops = ins?.crops ?? [];
  const isState = isScheme ? sch?.type === 'STATE' : ins?.region !== 'Central';
  const schemeTypeLabel = isState ? t('Maharashtra', 'महाराष्ट्र', 'महाराष्ट्र') : t('Central Govt', 'केंद्र सरकार', 'केंद्र सरकार');
  const appType: 'scheme' | 'subsidy' | 'insurance' = tabType === 'schemes' ? 'scheme' : tabType === 'insurance' ? 'insurance' : 'subsidy';

  const eligSummary = isScheme ? getEligibilitySummary(sch?.eligibility) : (ins?.eligibility ?? '');
  const eligParams = isScheme ? getEligibilityParams(sch?.eligibility) : [];
  const eligCriteria = isScheme ? getEligibilityCriteria(sch?.eligibility) : [];
  const documents: string[] = isScheme ? (sch?.documents ?? []) : [];
  const approveRules: string[] = isScheme ? (sch?.approvalRules?.approve ?? []) : [];
  const rejectRules: string[] = isScheme ? (sch?.approvalRules?.reject ?? []) : [];
  const features: string = ins?.features ?? '';

  const handleApply = useCallback(async () => {
    if (!farmer) return;
    const mobile = farmer.mobile ?? state.mobile;
    if (!mobile) return;

    Alert.alert(
      t('Confirm Application', 'आवेदन की पुष्टि', 'अर्जाची पुष्टी'),
      t(`Apply for "${item.name}"?`, `"${item.name}" के लिए आवेदन करें?`, `"${item.name}" साठी अर्ज करायचा आहे का?`),
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
                t('Submitted! 🎉', 'आवेदन सफल! 🎉', 'अर्ज यशस्वी! 🎉'),
                t(`Application submitted.\nApp ID: ${app.applicationId}`, `आवेदन सफलतापूर्वक जमा हुआ.\nID: ${app.applicationId}`, `अर्ज यशस्वीरित्या सादर झाला.\nID: ${app.applicationId}`),
                [{ text: 'OK' }],
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed';
              if (msg.includes('Already applied')) {
                Alert.alert(t('Already Applied', 'पहले से आवेदन', 'आधीच अर्ज'), t('You have already applied.', 'आप पहले से आवेदन कर चुके हैं।', 'तुम्ही आधीच अर्ज केला आहे.'), [{ text: 'OK' }]);
              } else {
                Alert.alert(t('Error', 'त्रुटि', 'चूक'), t('Could not submit. Try again.', 'आवेदन नहीं हो सका।', 'अर्ज होऊ शकला नाही.'), [{ text: 'OK' }]);
              }
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  }, [farmer, state.mobile, item, appType]);

  const eligColor = eligibility.eligible ? COLORS.primary : eligibility.score >= 40 ? COLORS.gold : COLORS.error;
  const eligBg = eligibility.eligible ? COLORS.primaryBg : eligibility.score >= 40 ? '#FEF3C7' : '#FEE2E2';
  const eligLabel = eligibility.eligible
    ? t('Likely Eligible ✓', 'संभवतः पात्र ✓', 'बहुधा पात्र ✓')
    : eligibility.score >= 40
    ? t('Partially Eligible — review criteria', 'आंशिक पात्रता', 'आंशिक पात्रता')
    : t('May not be eligible — check requirements', 'पात्र नहीं हो सकते', 'पात्र नसू शकता');

  return (
    <SafeAreaView style={styles.safe}>
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

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.typeBadge, isState ? styles.stateBadge : styles.centralBadge]}>
              <Text style={[styles.typeBadgeText, isState ? styles.stateText : styles.centralText]}>{isState ? '🏠' : '🏛️'} {schemeTypeLabel}</Text>
            </View>
            <View style={[styles.statusBadge, (item.status ?? 'Active') === 'Active' ? styles.activeBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, (item.status ?? 'Active') === 'Active' ? styles.activeText : styles.closedText]}>
                {(item.status ?? 'Active') === 'Active' ? t('Active', 'सक्रिय', 'सक्रिय') : t('Closed', 'बंद', 'बंद')}
              </Text>
            </View>
            {sch?.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{sch.category}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroName}>{item.name}</Text>
          {item.description ? <Text style={styles.heroDesc}>{item.description}</Text> : null}
        </View>

        {/* Application status */}
        {submittedApp && (
          <View style={[styles.section, { borderColor: APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280', backgroundColor: `${APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280'}12` }]}>
            <Text style={styles.sectionTitle}>📋 {t('Your Application', 'आपका आवेदन', 'तुमचा अर्ज')}</Text>
            <View style={styles.appRow}>
              <Text style={styles.appId}>{submittedApp.applicationId}</Text>
              <View style={[styles.appBadge, { backgroundColor: APP_STATUS_COLOR[submittedApp.status] ?? '#6B7280' }]}>
                <Text style={styles.appBadgeText}>{submittedApp.status}</Text>
              </View>
            </View>
            {submittedApp.adminReply ? (
              <View style={styles.adminReply}>
                <Text style={styles.adminReplyLabel}>{t('Admin:', 'अधिकारी:', 'अधिकारी:')}</Text>
                <Text style={styles.adminReplyText}>{submittedApp.adminReply}</Text>
              </View>
            ) : null}
            <Text style={styles.appDate}>{t('Applied', 'आवेदन', 'अर्ज')}: {new Date(submittedApp.appliedAt).toLocaleDateString()}</Text>
          </View>
        )}

        {/* Eligibility Assessment */}
        <View style={[styles.section, { borderColor: eligColor + '50', backgroundColor: eligBg }]}>
          <View style={styles.eligHeader}>
            <Text style={[styles.eligLabel, { color: eligColor }]}>
              {eligibility.eligible ? '✅' : eligibility.score >= 40 ? '⚠️' : '❌'} {eligLabel}
            </Text>
            <View style={[styles.scoreCircle, { borderColor: eligColor + '40' }]}>
              <Text style={[styles.scoreText, { color: eligColor }]}>{eligibility.score}%</Text>
            </View>
          </View>
          <View style={styles.eligList}>
            {eligibility.reasons.map((r, i) => (
              <View key={i} style={styles.eligItem}>
                <Text style={[styles.eligDot, { color: r.ok ? COLORS.primary : COLORS.error }]}>{r.ok ? '✓' : '✗'}</Text>
                <Text style={[styles.eligItemText, { color: r.ok ? COLORS.text : COLORS.textSecondary }]}>{r.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits / Benefit Details */}
        {benefit ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              💰 {tabType === 'insurance' ? t('Coverage & Benefits', 'कवरेज और लाभ', 'कव्हरेज आणि फायदे')
                : tabType === 'subsidies' ? t('Subsidy Details', 'सब्सिडी विवरण', 'अनुदान तपशील')
                : t('Benefits', 'लाभ', 'फायदे')}
            </Text>
            <Text style={styles.sectionContent}>{benefit}</Text>
          </View>
        ) : null}

        {/* Key Features (Insurance/Subsidy) */}
        {features ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌟 {t('Key Features', 'मुख्य विशेषताएं', 'मुख्य वैशिष्ट्ये')}</Text>
            {features.split(/\.\s+|\n/).filter(Boolean).map((f, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{f.replace(/\.$/, '')}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Eligibility Criteria */}
        {eligSummary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 {t('Eligibility Criteria', 'पात्रता मानदंड', 'पात्रतेचे निकष')}</Text>
            <Text style={styles.sectionContent}>{eligSummary}</Text>
            {eligCriteria.length > 0 && (
              <View style={styles.subList}>
                {eligCriteria.map((c, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
            {eligParams.length > 0 && (
              <View style={styles.paramTable}>
                {eligParams.map((p, i) => (
                  <View key={i} style={[styles.paramRow, i < eligParams.length - 1 && styles.paramRowBorder]}>
                    <Text style={styles.paramKey}>{p.parameter}</Text>
                    <Text style={styles.paramVal}>{p.rule}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Covered Crops */}
        {crops.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 {t('Covered Crops', 'शामिल फसलें', 'समाविष्ट पिके')}</Text>
            <View style={styles.cropRow}>
              {crops.map((c, i) => {
                const isMatch = farmer?.crop && c.toLowerCase().includes((farmer.crop ?? '').toLowerCase());
                return (
                  <View key={i} style={[styles.cropChip, isMatch && styles.cropChipMatch]}>
                    <Text style={[styles.cropChipText, isMatch && styles.cropChipTextMatch]}>{c}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Required Documents */}
        {documents.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 {t('Documents Required', 'आवश्यक दस्तावेज़', 'आवश्यक कागदपत्रे')}</Text>
            {documents.map((d, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>📎</Text>
                <Text style={styles.bulletText}>{d}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Approval Rules */}
        {(approveRules.length > 0 || rejectRules.length > 0) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚖️ {t('Approval Criteria', 'स्वीकृति मानदंड', 'मंजुरीचे निकष')}</Text>
            {approveRules.length > 0 && (
              <View style={styles.rulesBlock}>
                <Text style={styles.rulesLabel}>✅ {t('Approved when:', 'स्वीकृत जब:', 'मंजूर केव्हा:')}</Text>
                {approveRules.map((r, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: COLORS.primary }]}>✓</Text>
                    <Text style={styles.bulletText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
            {rejectRules.length > 0 && (
              <View style={[styles.rulesBlock, { marginTop: 10 }]}>
                <Text style={[styles.rulesLabel, { color: COLORS.error }]}>❌ {t('Rejected when:', 'अस्वीकृत जब:', 'नाकारले केव्हा:')}</Text>
                {rejectRules.map((r, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: COLORS.error }]}>✗</Text>
                    <Text style={styles.bulletText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Land requirement */}
        {ins && (ins.minLand !== undefined || ins.maxLand !== undefined) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏡 {t('Land Requirement', 'भूमि आवश्यकता', 'जमीन आवश्यकता')}</Text>
            {ins.minLand !== undefined && (
              <Text style={styles.sectionContent}>{t('Minimum', 'न्यूनतम', 'किमान')}: {ins.minLand} {t('acres', 'एकड़', 'एकर')}</Text>
            )}
            {ins.maxLand !== undefined && (
              <Text style={styles.sectionContent}>{t('Maximum', 'अधिकतम', 'कमाल')}: {ins.maxLand} {t('acres', 'एकड़', 'एकर')}</Text>
            )}
            {farmer?.land && farmer.land !== '—' && (
              <Text style={[styles.sectionContent, { color: COLORS.primary, fontWeight: '700', marginTop: 4 }]}>
                {t('Your holding', 'आपकी जमीन', 'तुमची जमीन')}: {farmer.land} {t('acres', 'एकड़', 'एकर')}
              </Text>
            )}
          </View>
        ) : null}

        {/* Deadline */}
        {item.deadline ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 {t('Deadline', 'अंतिम तिथि', 'अंतिम तारीख')}</Text>
            <Text style={[styles.sectionContent, { color: COLORS.gold, fontWeight: '700' }]}>{item.deadline}</Text>
          </View>
        ) : null}

        {/* Implementing Authority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏛️ {t('Implementing Authority', 'कार्यान्वयन प्राधिकरण', 'अंमलबजावणी प्राधिकरण')}</Text>
          <Text style={styles.sectionContent}>
            {sch?.ministry ?? (isState
              ? t('Government of Maharashtra', 'महाराष्ट्र शासन', 'महाराष्ट्र शासन')
              : t('Government of India', 'भारत सरकार', 'भारत सरकार'))}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom action */}
      {(item.status ?? 'Active') === 'Active' && !submittedApp && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.applyBtn, eligibility.eligible ? styles.applyEligible : styles.applyNeutral, applying && styles.applyDisabled]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.applyText}>{t('Apply Now', 'अभी आवेदन करें', 'आत्ता अर्ज करा')}</Text>
                {eligibility.eligible && <Text style={styles.applySubText}>{t('You appear eligible', 'आप पात्र लगते हैं', 'तुम्ही पात्र दिसता')}</Text>}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {(item.status ?? 'Active') === 'Active' && submittedApp?.status === 'Rejected' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.applyBtn, styles.applyEligible, applying && styles.applyDisabled]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.applyText}>{t('Re-apply', 'पुनः आवेदन', 'पुन्हा अर्ज')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {(item.status ?? 'Active') === 'Closed' && (
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
  topBar: { backgroundColor: COLORS.primaryDark, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: COLORS.white, lineHeight: 22 },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  heroCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  heroBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  heroName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text, lineHeight: 24, marginBottom: 8 },
  heroDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  centralBadge: { backgroundColor: '#DBEAFE' },
  stateBadge: { backgroundColor: COLORS.primaryBg },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  centralText: { color: '#2563EB' },
  stateText: { color: COLORS.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  activeBadge: { backgroundColor: COLORS.primaryBg },
  closedBadge: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  activeText: { color: COLORS.primary },
  closedText: { color: COLORS.textMuted },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: '#FEF3C7' },
  categoryText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: '#92400E' },

  section: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sectionContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },

  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appId: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary },
  appBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  appBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.white },
  adminReply: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: RADIUS.md, padding: 10, gap: 3 },
  adminReplyLabel: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.textSecondary },
  adminReplyText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  appDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  eligHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  eligLabel: { fontSize: FONT_SIZE.sm, fontWeight: '800', flex: 1, lineHeight: 18 },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  scoreText: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
  eligList: { gap: 8 },
  eligItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  eligDot: { fontSize: FONT_SIZE.base, fontWeight: '800', width: 18, marginTop: 1 },
  eligItemText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20 },

  bulletItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 4 },
  bulletDot: { fontSize: FONT_SIZE.sm, color: COLORS.primary, width: 16, marginTop: 2 },
  bulletText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  subList: { marginTop: 6, gap: 4 },

  paramTable: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden' },
  paramRow: { flexDirection: 'row', padding: 10, gap: 12, backgroundColor: COLORS.background },
  paramRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paramKey: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.text, width: 100 },
  paramVal: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  cropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cropChipMatch: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  cropChipText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  cropChipTextMatch: { color: COLORS.primary },

  rulesBlock: {},
  rulesLabel: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },

  bottomBar: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  applyEligible: { backgroundColor: COLORS.primaryDark },
  applyNeutral: { backgroundColor: COLORS.primary },
  applyDisabled: { opacity: 0.7 },
  applyText: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.white },
  applySubText: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.75)' },
  closedBar: { borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: COLORS.border },
  closedBarText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textMuted },
});
