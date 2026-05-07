import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS } from '../constants';
import { Scheme, InsuranceSubsidy, Application, REQUIRED_DOCUMENTS, DocumentTypeId, DocUploadState } from '../types';
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
  farmer: { docs?: { section: string; status: string }[]; status?: string } | null,
): EligibilityResult {
  const uploadedCount = (farmer?.docs ?? []).length;
  const totalDocs = 5;

  const reasons: { ok: boolean; text: string }[] = [
    {
      ok: uploadedCount >= totalDocs,
      text: uploadedCount >= totalDocs
        ? `All ${totalDocs} required documents uploaded ✓`
        : uploadedCount > 0
          ? `${uploadedCount} of ${totalDocs} required documents uploaded`
          : 'No documents uploaded yet',
    },
  ];

  const score = Math.round((uploadedCount / totalDocs) * 100);
  const eligible = uploadedCount >= totalDocs;

  return { eligible, score, reasons };
}

const APP_STATUS_COLOR: Record<string, string> = {
  Pending: '#D97706',
  'Under Review': '#2563EB',
  Approved: '#16A34A',
  Rejected: '#DC2626',
  Settled: '#0D9488',
};

function mapSchemeDocToType(docStr: string): DocumentTypeId | null {
  const d = docStr.toLowerCase();
  if (d.includes('aadhar') || d.includes('aadhaar') || d.includes('identity') || d.includes('uid')) return 'aadhar';
  if (d.includes('bank') || d.includes('passbook') || d.includes('account')) return 'bank_passbook';
  if (d.includes('7/12') || d.includes('form 7') || d.includes('satbara') || d.includes('land record') || d.includes('form7')) return 'form7';
  if (d.includes('pik pahani') || d.includes('form 12') || d.includes('form12') || d.includes('crop inspection')) return 'form12';
  if (d.includes('8a') || d.includes('8-a') || d.includes('holding register') || d.includes('form8')) return 'form8a';
  return null;
}

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

  // ── Document upload modal state ─────────────────────────────────────────────
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    requiredDocIds: DocumentTypeId[];
    pendingEligible: boolean;
    pendingEligibilityText: string;
  } | null>(null);
  const [modalDocStates, setModalDocStates] = useState<Record<string, DocUploadState>>({});
  const pollingRef = useRef<Record<string, boolean>>({});

  function setModalDoc(id: DocumentTypeId, patch: Partial<DocUploadState>) {
    setModalDocStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? { status: 'idle' }), ...patch } }));
  }

  async function pollModalDoc(docId: DocumentTypeId, requestId: string) {
    pollingRef.current[docId] = true;
    for (let i = 0; i < 60; i++) {
      if (!pollingRef.current[docId]) break;
      await new Promise(r => setTimeout(r, 4000));
      try {
        const result = await api.pollExtraction(requestId);
        if (result.status === 'complete') { setModalDoc(docId, { status: 'done' }); pollingRef.current[docId] = false; return; }
        if (result.status === 'error') { setModalDoc(docId, { status: 'error', error: result.error ?? 'Processing failed' }); pollingRef.current[docId] = false; return; }
      } catch { /* keep polling */ }
    }
    setModalDoc(docId, { status: 'error', error: 'Timed out. Please re-upload.' });
    pollingRef.current[docId] = false;
  }

  async function pickAndUploadModalDoc(docId: DocumentTypeId) {
    const mobile = farmer?.mobile ?? state.mobile;
    if (!mobile) return;
    setModalDoc(docId, { status: 'picking', error: undefined });
    try {
      let fileUri = '', fileName = `${docId}.pdf`, fileMime = 'application/pdf';
      if (Platform.OS === 'web') {
        const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: false });
        if (result.canceled || !result.assets?.[0]) { setModalDoc(docId, { status: 'idle' }); return; }
        const asset = result.assets[0]; fileUri = asset.uri; fileName = asset.name ?? fileName; fileMime = asset.mimeType ?? fileMime;
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please allow access to your photos.'); setModalDoc(docId, { status: 'idle' }); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: false });
        if (result.canceled || !result.assets?.[0]) { setModalDoc(docId, { status: 'idle' }); return; }
        const asset = result.assets[0]; fileUri = asset.uri; fileName = `${docId}.jpg`; fileMime = 'image/jpeg';
      }
      setModalDoc(docId, { status: 'uploading', fileName });
      const submitResult = await api.uploadDocument(fileUri, fileName, fileMime, docId, mobile);
      setModalDoc(docId, { status: 'processing', requestId: submitResult.request_id });
      pollModalDoc(docId, submitResult.request_id);
    } catch (err) {
      setModalDoc(docId, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  function getRequiredDocIds(): DocumentTypeId[] {
    if (tabType === 'schemes') {
      const docs = (item as Scheme).documents ?? [];
      if (docs.length === 0) return ['aadhar', 'form7'];
      const mapped = docs.map(mapSchemeDocToType).filter(Boolean) as DocumentTypeId[];
      return mapped.length > 0 ? mapped : ['aadhar', 'form7'];
    }
    return ['aadhar', 'bank_passbook'];
  }

  function getMissingDocIds(requiredDocIds: DocumentTypeId[]): DocumentTypeId[] {
    const uploadedSections = new Set((farmer?.docs ?? []).map(d => d.section));
    return requiredDocIds.filter(id => !uploadedSections.has(id));
  }

  async function proceedWithApply(docIds: DocumentTypeId[] = []) {
    if (!farmer) return;
    const mobile = farmer.mobile ?? state.mobile;
    if (!mobile) return;

    const applyLabel = t('Apply', 'आवेदन करें', 'अर्ज करा');
    const confirmMsg = t(`Apply for "${item.name}"?`, `"${item.name}" के लिए आवेदन करें?`, `"${item.name}" साठी अर्ज करायचा आहे का?`);

    Alert.alert(applyLabel, confirmMsg, [
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
              documentRefs: docIds,
            });
            setSubmittedApp(app);
            Alert.alert(
              t('Submitted! 🎉', 'आवेदन सफल! 🎉', 'अर्ज यशस्वी! 🎉'),
              t(
                `Application submitted.\nApp ID: ${app.applicationId}`,
                `आवेदन सफलतापूर्वक जमा हुआ.\nID: ${app.applicationId}`,
                `अर्ज यशस्वीरित्या सादर झाला.\nID: ${app.applicationId}`,
              ),
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
    ]);
  }

  const handleApply = useCallback(() => {
    if (!farmer) return;

    const requiredDocIds = getRequiredDocIds();
    const missingDocIds = getMissingDocIds(requiredDocIds);

    // If missing required documents → open upload modal
    if (missingDocIds.length > 0) {
      const initStates: Record<string, DocUploadState> = {};
      requiredDocIds.forEach(id => {
        const alreadyUploaded = (farmer.docs ?? []).some(d => d.section === id);
        initStates[id] = { status: alreadyUploaded ? 'done' : 'idle' };
      });
      setModalDocStates(initStates);
      setDocModal({
        visible: true,
        requiredDocIds,
        pendingEligible: eligibility.eligible,
        pendingEligibilityText: eligSummary,
      });
      return;
    }

    // If not eligible → show warning but allow applying anyway
    if (!eligibility.eligible) {
      Alert.alert(
        t('Eligibility Notice', 'पात्रता नोटिस', 'पात्रता सूचना'),
        t(
          `You may not fully meet the eligibility criteria.\n\nYou can still apply — the district officer will review your case.`,
          `आप पूरी तरह पात्र नहीं हो सकते।\n\nफिर भी आवेदन किया जा सकता है — अधिकारी समीक्षा करेंगे।`,
          `तुम्ही पूर्णपणे पात्र नसाल.\n\nतरीही अर्ज करता येतो — अधिकारी आढावा घेतील.`,
        ),
        [
          { text: t('Cancel', 'रद्द करें', 'रद्द करा'), style: 'cancel' },
          { text: t('Apply Anyway', 'फिर भी आवेदन करें', 'तरीही अर्ज करा'), onPress: () => proceedWithApply(requiredDocIds) },
        ],
      );
      return;
    }

    proceedWithApply(requiredDocIds);
  }, [farmer, state.mobile, item, appType, eligibility, eligSummary]);

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

      {/* Document Upload Modal */}
      {docModal && (
        <Modal visible={docModal.visible} animationType="slide" transparent onRequestClose={() => setDocModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {lang === 'hi' ? 'दस्तावेज़ अपलोड करें' : lang === 'mr' ? 'कागदपत्रे अपलोड करा' : 'Upload Required Documents'}
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setDocModal(null)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalNote}>
                {lang === 'hi'
                  ? 'नीचे दिए गए दस्तावेज़ इस योजना के लिए आवश्यक हैं। सभी अपलोड करने के बाद आवेदन करें।'
                  : lang === 'mr'
                  ? 'खालील कागदपत्रे या योजनेसाठी आवश्यक आहेत. सर्व अपलोड केल्यानंतर अर्ज करा.'
                  : 'The following documents are required for this scheme. Upload any missing ones, then proceed to apply.'}
              </Text>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {docModal.requiredDocIds.map(docId => {
                  const docDef = REQUIRED_DOCUMENTS.find(d => d.id === docId);
                  if (!docDef) return null;
                  const ds = modalDocStates[docId] ?? { status: 'idle' };
                  const isDone = ds.status === 'done';
                  const isWorking = ds.status === 'uploading' || ds.status === 'processing' || ds.status === 'picking';
                  const docLabel = lang === 'hi' ? docDef.labelHi : lang === 'mr' ? docDef.labelMr : docDef.label;

                  return (
                    <View key={docId} style={[styles.modalDocCard, isDone && styles.modalDocCardDone]}>
                      <View style={styles.modalDocLeft}>
                        <Text style={styles.modalDocIcon}>{docDef.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalDocLabel}>{docLabel}</Text>
                          {ds.status === 'error' && <Text style={styles.modalDocError}>{ds.error}</Text>}
                          {ds.status === 'uploading' && <Text style={styles.modalDocStatus}>Uploading…</Text>}
                          {ds.status === 'processing' && <Text style={[styles.modalDocStatus, { color: COLORS.gold }]}>Processing…</Text>}
                          {isDone && <Text style={[styles.modalDocStatus, { color: COLORS.primary }]}>
                            {lang === 'hi' ? '✓ अपलोड हो गया' : lang === 'mr' ? '✓ अपलोड झाले' : '✓ Uploaded'}
                          </Text>}
                        </View>
                      </View>
                      {isDone ? (
                        <View style={styles.modalDocDoneBadge}>
                          <Text style={styles.modalDocDoneText}>✓</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.modalUploadBtn, isWorking && { opacity: 0.6 }]}
                          disabled={isWorking}
                          onPress={() => pickAndUploadModalDoc(docId)}
                        >
                          {isWorking
                            ? <ActivityIndicator size="small" color={COLORS.white} />
                            : <Text style={styles.modalUploadText}>
                                {lang === 'hi' ? 'अपलोड' : lang === 'mr' ? 'अपलोड' : 'Upload'}
                              </Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                {(() => {
                  const allDone = docModal.requiredDocIds.every(id => (modalDocStates[id]?.status ?? 'idle') === 'done');
                  const anyUploaded = docModal.requiredDocIds.some(id => (modalDocStates[id]?.status ?? 'idle') === 'done');
                  return (
                    <TouchableOpacity
                      style={[styles.modalApplyBtn, !anyUploaded && styles.modalApplyBtnDisabled]}
                      disabled={!anyUploaded}
                      onPress={() => {
                        const uploadedDocIds = docModal.requiredDocIds.filter(id => (modalDocStates[id]?.status ?? 'idle') === 'done');
                        setDocModal(null);
                        if (!allDone && !docModal.pendingEligible) {
                          Alert.alert(
                            lang === 'hi' ? 'पात्रता नोटिस' : lang === 'mr' ? 'पात्रता सूचना' : 'Eligibility Notice',
                            lang === 'hi'
                              ? 'आप पूरी तरह पात्र नहीं हो सकते, फिर भी आवेदन जमा किया जाएगा।'
                              : lang === 'mr'
                              ? 'तुम्ही पूर्णपणे पात्र नसाल, तरीही अर्ज सादर केला जाईल.'
                              : 'You may not fully qualify, but your application will be submitted for review.',
                            [
                              { text: lang === 'hi' ? 'रद्द करें' : lang === 'mr' ? 'रद्द करा' : 'Cancel', style: 'cancel' },
                              { text: lang === 'hi' ? 'आवेदन करें' : lang === 'mr' ? 'अर्ज करा' : 'Apply', onPress: () => proceedWithApply(uploadedDocIds) },
                            ],
                          );
                        } else {
                          proceedWithApply(uploadedDocIds);
                        }
                      }}
                    >
                      <Text style={styles.modalApplyText}>
                        {lang === 'hi' ? 'आवेदन करें' : lang === 'mr' ? 'अर्ज करा' : 'Apply Now'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZE.base, fontWeight: '900', color: COLORS.text },
  modalSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginTop: 2 },
  modalCloseText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700' },
  modalNote: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.primaryBg, borderBottomWidth: 1, borderBottomColor: COLORS.primaryLight },
  modalScroll: { maxHeight: 320 },
  modalDocCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalDocCardDone: { backgroundColor: '#F0FDF4' },
  modalDocLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalDocIcon: { fontSize: 28 },
  modalDocLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  modalDocStatus: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  modalDocError: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: 2 },
  modalDocDoneBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  modalDocDoneText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },
  modalUploadBtn: { backgroundColor: COLORS.primaryDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  modalUploadText: { color: COLORS.white, fontSize: FONT_SIZE.xs, fontWeight: '800' },
  modalFooter: { paddingHorizontal: 20, paddingTop: 16 },
  modalApplyBtn: { backgroundColor: COLORS.primaryDark, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  modalApplyBtnDisabled: { backgroundColor: COLORS.border },
  modalApplyText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: '900' },
});
