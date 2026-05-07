import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { Scheme, InsuranceSubsidy, Application, REQUIRED_DOCUMENTS, DocumentTypeId, DocUploadState } from '../types';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type SchemeFilter = 'ALL' | 'CENTRAL' | 'STATE';
type EligibilityFilter = 'ALL' | 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
type Tab = 'schemes' | 'insurance' | 'subsidies';

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
  return parts.join(' ');
}

function formatEligibilityForDisplay(eligibility: Scheme['eligibility']): string {
  if (!eligibility) return '';
  if (typeof eligibility === 'string') return eligibility;
  const lines: string[] = [];
  if (eligibility.summary) lines.push(eligibility.summary);
  if (Array.isArray(eligibility.familyCriteria) && eligibility.familyCriteria.length > 0) {
    lines.push('Criteria: ' + eligibility.familyCriteria.join(', '));
  }
  if (Array.isArray(eligibility.exclusions) && eligibility.exclusions.length > 0) {
    lines.push('Exclusions: ' + eligibility.exclusions.slice(0, 3).join(', '));
  }
  return lines.join('\n');
}

function isEligibleScheme(scheme: Scheme, crop?: string, land?: string | number): boolean {
  const e = getEligibilityText(scheme.eligibility).toLowerCase();
  if (!e) return true;
  if (crop && crop !== '—' && e.includes(crop.toLowerCase())) return true;
  if (land) {
    const acres = parseFloat(String(land));
    if (!isNaN(acres)) {
      const minMatch = e.match(/(\d+(\.\d+)?)\s*(ha|acre|hectare)/);
      if (minMatch) {
        const minVal = parseFloat(minMatch[1]);
        if (acres >= minVal) return true;
      }
    }
  }
  return false;
}

function isEligibleItem(item: InsuranceSubsidy, crop?: string, land?: string | number): boolean {
  const eligible = item.eligibility?.toLowerCase() ?? '';
  if (item.crops && item.crops.length > 0 && crop && crop !== '—') {
    if (item.crops.some((c) => c.toLowerCase().includes(crop.toLowerCase()) || crop.toLowerCase().includes(c.toLowerCase()))) return true;
  }
  if (crop && crop !== '—' && eligible.includes(crop.toLowerCase())) return true;
  if (land) {
    const acres = parseFloat(String(land));
    if (!isNaN(acres)) {
      if (item.minLand !== undefined && acres >= item.minLand) return true;
    }
  }
  return !item.crops || item.crops.length === 0;
}

const APP_STATUS_COLOR: Record<string, string> = {
  Pending:        '#D97706',
  'Under Review': '#2563EB',
  Approved:       '#16A34A',
  Rejected:       '#DC2626',
  Settled:        '#0D9488',
};

const APP_STATUS_LABEL: Record<string, string> = {
  Pending:        'Pending Review',
  'Under Review': 'Under Review',
  Approved:       'Approved ✓',
  Rejected:       'Rejected',
  Settled:        'Settled 💰',
};

const APP_STATUS_ICON: Record<string, string> = {
  Pending:        '⏳',
  'Under Review': '🔍',
  Approved:       '✅',
  Rejected:       '❌',
  Settled:        '💰',
};

const APP_STATUS_DESC: Record<string, { en: string; hi: string; mr: string }> = {
  Pending:        { en: 'Your application has been submitted and is awaiting review by the district officer.', hi: 'आपका आवेदन सफलतापूर्वक जमा हो गया है और जिला अधिकारी द्वारा समीक्षा की प्रतीक्षा है।', mr: 'तुमचा अर्ज यशस्वीरित्या सादर केला गेला आहे आणि जिल्हा अधिकाऱ्याच्या पुनरावलोकनाची प्रतीक्षा आहे.' },
  'Under Review': { en: 'Your application is currently being reviewed by the district officer.', hi: 'आपका आवेदन वर्तमान में जिला अधिकारी द्वारा समीक्षा में है।', mr: 'तुमचा अर्ज सध्या जिल्हा अधिकाऱ्याद्वारे पुनरावलोकनाधीन आहे.' },
  Approved:       { en: 'Congratulations! Your application has been approved.', hi: 'बधाई! आपका आवेदन स्वीकृत हो गया है।', mr: 'अभिनंदन! तुमचा अर्ज मंजूर झाला आहे.' },
  Rejected:       { en: 'Your application has been rejected. You may re-apply or contact the office for details.', hi: 'आपका आवेदन अस्वीकृत कर दिया गया है। आप पुनः आवेदन कर सकते हैं या विवरण के लिए कार्यालय से संपर्क करें।', mr: 'तुमचा अर्ज नाकारला गेला आहे. तुम्ही पुन्हा अर्ज करू शकता किंवा तपशीलांसाठी कार्यालयाशी संपर्क साधा.' },
  Settled:        { en: 'Your claim has been settled. Funds will be transferred to your registered bank account.', hi: 'आपका दावा निपटा दिया गया है। धनराशि आपके पंजीकृत बैंक खाते में स्थानांतरित की जाएगी।', mr: 'तुमचा दावा निकाला गेला आहे. निधी तुमच्या नोंदणीकृत बँक खात्यात हस्तांतरित केला जाईल.' },
};

export default function SchemesScreen() {
  const { state } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, 'Schemes'>>();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const farmer = state.farmer;
  const crop = farmer?.crop;
  const land = farmer?.land;

  const routeInitialTab = (route.params as { initialTab?: Tab } | undefined)?.initialTab;
  const [tab, setTab] = useState<Tab>(routeInitialTab ?? 'schemes');

  useEffect(() => {
    if (routeInitialTab) setTab(routeInitialTab);
  }, [routeInitialTab]);

  useEffect(() => {
    setEligFilter('ALL');
    setFilter('ALL');
    setSearch('');
  }, [tab]);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [insuranceItems, setInsuranceItems] = useState<InsuranceSubsidy[]>([]);
  const [subsidyItems, setSubsidyItems] = useState<InsuranceSubsidy[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<SchemeFilter>('ALL');
  const [eligFilter, setEligFilter] = useState<EligibilityFilter>('ALL');
  const [search, setSearch] = useState('');
  const [successModal, setSuccessModal] = useState<{ schemeName: string; applicationId: string } | null>(null);
  const [statusModal, setStatusModal] = useState<{ app: Application; reapplyFn?: () => void } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mobile = farmer?.mobile ?? state.mobile;
      const [schemesRes, insuranceRes, subsidyRes, appsRes] = await Promise.all([
        api.getSchemes(),
        api.getInsuranceSubsidies({ type: 'Insurance', limit: 50 }),
        api.getInsuranceSubsidies({ type: 'Subsidy', limit: 50 }),
        mobile ? api.getMyApplications(mobile) : Promise.resolve<Application[]>([]),
      ]);
      setSchemes(schemesRes);
      setInsuranceItems(insuranceRes.items);
      setSubsidyItems(subsidyRes.items);
      setMyApplications(appsRes);
    } catch {
      setSchemes([]); setInsuranceItems([]); setSubsidyItems([]);
    } finally {
      setLoading(false);
    }
  }, [farmer?.mobile, state.mobile]);

  const refreshApplications = useCallback(async () => {
    const mobile = farmer?.mobile ?? state.mobile;
    if (!mobile) return;
    try {
      const appsRes = await api.getMyApplications(mobile);
      setMyApplications(appsRes);
    } catch { /* silent — keep existing data */ }
  }, [farmer?.mobile, state.mobile]);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      refreshApplications();
    }, [refreshApplications]),
  );

  const handleManualRefresh = useCallback(() => {
    handlePullRefresh();
  }, [handlePullRefresh]);

  const getApplicationForItem = (itemId: string, type: 'scheme' | 'subsidy' | 'insurance'): Application | undefined =>
    myApplications.find(a => a.type === type && (a.schemeId === itemId || a.schemeName === itemId));

  // ── Document upload modal state ─────────────────────────────────────────────
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    itemId: string;
    itemName: string;
    appType: 'scheme' | 'subsidy' | 'insurance';
    itemType?: string | null;
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

  function mapSchemeDocToType(docStr: string): DocumentTypeId | null {
    const d = docStr.toLowerCase();
    if (d.includes('aadhar') || d.includes('aadhaar') || d.includes('identity') || d.includes('uid')) return 'aadhar';
    if (d.includes('bank') || d.includes('passbook') || d.includes('account')) return 'bank_passbook';
    if (d.includes('7/12') || d.includes('form 7') || d.includes('satbara') || d.includes('land record') || d.includes('form7')) return 'form7';
    if (d.includes('pik pahani') || d.includes('form 12') || d.includes('form12') || d.includes('crop inspection')) return 'form12';
    if (d.includes('8a') || d.includes('8-a') || d.includes('holding register') || d.includes('form8')) return 'form8a';
    return null;
  }

  function getRequiredDocIds(item: Scheme | InsuranceSubsidy, currentTab: Tab): DocumentTypeId[] {
    if (currentTab === 'schemes') {
      const docs = (item as Scheme).documents ?? [];
      if (docs.length === 0) return ['aadhar', 'form7'];
      const mapped = docs.map(mapSchemeDocToType).filter(Boolean) as DocumentTypeId[];
      return mapped.length > 0 ? mapped : ['aadhar', 'form7'];
    }
    return ['aadhar', 'bank_passbook'];
  }

  function getMissingDocIds(requiredDocIds: DocumentTypeId[]): DocumentTypeId[] {
    const totalUploaded = Math.max(
      (farmer?.docs ?? []).length,
      farmer?.documentsCount ?? 0,
    );
    if (totalUploaded >= 5) return [];
    const uploadedSections = new Set((farmer?.docs ?? []).map(d => d.section));
    return requiredDocIds.filter(id => !uploadedSections.has(id));
  }

  async function proceedWithApply(
    type: 'scheme' | 'subsidy' | 'insurance',
    itemId: string,
    itemName: string,
    itemType?: string | null,
    docIds: DocumentTypeId[] = [],
  ) {
    if (!farmer) return;
    const mobile = farmer.mobile ?? state.mobile;
    if (!mobile) return;
    setApplying(itemId);
    try {
      const rejectedApp = myApplications.find(
        a => a.type === type && (a.schemeId === itemId || a.schemeName === itemName) && a.status === 'Rejected',
      );
      let app: Application;
      if (rejectedApp) {
        app = await api.reapplyApplication(rejectedApp.applicationId);
        setMyApplications(prev => prev.map(a => a.applicationId === app.applicationId ? app : a));
      } else {
        app = await api.applyForScheme({
          type,
          farmerId: farmer.farmerId,
          farmerName: farmer.name ?? null,
          mobile,
          district: farmer.district ?? null,
          village: farmer.village ?? null,
          schemeId: itemId,
          schemeName: itemName,
          schemeType: itemType ?? null,
          crop: farmer.crop ?? null,
          land: farmer.land != null ? parseFloat(String(farmer.land)) : null,
          documentRefs: docIds,
        });
        setMyApplications(prev => [...prev, app]);
      }
      setStatusModal(null);
      setSuccessModal({ schemeName: itemName, applicationId: app.applicationId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (msg.includes('Already applied')) {
        Alert.alert('Already Applied', 'You have already submitted an application for this scheme.', [{ text: 'OK' }]);
        await loadData();
      } else {
        Alert.alert('Error', 'Could not submit application. Please try again.', [{ text: 'OK' }]);
      }
    } finally {
      setApplying(null);
    }
  }

  async function handleApply(
    type: 'scheme' | 'subsidy' | 'insurance',
    item: Scheme | InsuranceSubsidy,
    itemType?: string | null,
    eligible?: boolean,
    eligibilityText?: string,
    currentTab?: Tab,
  ) {
    if (!farmer) return;

    const itemId = item.id;
    const itemName = item.name;
    const requiredDocIds = getRequiredDocIds(item, currentTab ?? 'schemes');
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
        itemId,
        itemName,
        appType: type,
        itemType,
        requiredDocIds,
        pendingEligible: eligible ?? true,
        pendingEligibilityText: eligibilityText ?? '',
      });
      return;
    }

    proceedWithApply(type, itemId, itemName, itemType, requiredDocIds);
  }

  function handleKnowMore(
    item: Scheme | InsuranceSubsidy,
    currentTab: Tab,
    existingApp?: Application,
  ) {
    navigation.navigate('SchemeDetail', {
      itemJson: JSON.stringify(item),
      tabType: currentTab,
      existingAppJson: existingApp ? JSON.stringify(existingApp) : undefined,
    });
  }

  function getEligibilityCategory(_item: Scheme | InsuranceSubsidy, _itemTab: Tab): EligibilityFilter {
    const uploadedCount = Math.max(
      (farmer?.docs ?? []).length,
      farmer?.documentsCount ?? 0,
    );
    const totalDocs = 5;
    if (uploadedCount >= totalDocs) return 'ELIGIBLE';
    if (uploadedCount > 0) return 'PARTIAL';
    return 'NOT_ELIGIBLE';
  }

  const filteredSchemes = schemes.filter((s) => {
    if (filter !== 'ALL' && s.type !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (eligFilter !== 'ALL' && getEligibilityCategory(s, 'schemes') !== eligFilter) return false;
    return true;
  });
  const filteredInsurance = insuranceItems.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (eligFilter !== 'ALL' && getEligibilityCategory(s, 'insurance') !== eligFilter) return false;
    return true;
  });
  const filteredSubsidies = subsidyItems.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (eligFilter !== 'ALL' && getEligibilityCategory(s, 'subsidies') !== eligFilter) return false;
    return true;
  });

  const displayBenefit = (scheme: Scheme) => scheme.benefit ?? scheme.benefits ?? '';

  const TABS: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: 'schemes',   label: state.lang === 'hi' ? 'योजनाएं' : state.lang === 'mr' ? 'योजना' : 'Schemes',   icon: '📋', count: schemes.length },
    { id: 'insurance', label: state.lang === 'hi' ? 'बीमा'    : state.lang === 'mr' ? 'विमा'  : 'Insurance', icon: '🛡️', count: insuranceItems.length },
    { id: 'subsidies', label: state.lang === 'hi' ? 'सब्सिडी' : state.lang === 'mr' ? 'अनुदान': 'Subsidies', icon: '💰', count: subsidyItems.length },
  ];

  const SCHEME_FILTERS: { id: SchemeFilter; label: string }[] = [
    { id: 'ALL',     label: 'All' },
    { id: 'CENTRAL', label: t('centralScheme') },
    { id: 'STATE',   label: t('stateScheme') },
  ];

  const ELIGIBILITY_FILTERS: { id: EligibilityFilter; label: string; icon: string; color: string }[] = [
    {
      id: 'ALL',
      label: state.lang === 'hi' ? 'सभी' : state.lang === 'mr' ? 'सर्व' : 'All',
      icon: '📋',
      color: COLORS.primaryDark,
    },
    {
      id: 'ELIGIBLE',
      label: state.lang === 'hi' ? 'पात्र' : state.lang === 'mr' ? 'पात्र' : 'Eligible',
      icon: '✅',
      color: '#16A34A',
    },
    {
      id: 'PARTIAL',
      label: state.lang === 'hi' ? 'आंशिक' : state.lang === 'mr' ? 'आंशिक' : 'Partial',
      icon: '⚠️',
      color: '#D97706',
    },
    {
      id: 'NOT_ELIGIBLE',
      label: state.lang === 'hi' ? 'अपात्र' : state.lang === 'mr' ? 'अपात्र' : 'Not Eligible',
      icon: '❌',
      color: '#DC2626',
    },
  ];

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

  const currentItems = tab === 'schemes' ? filteredSchemes : tab === 'insurance' ? filteredInsurance : filteredSubsidies;
  const emptyMsg = tab === 'insurance'
    ? (state.lang === 'hi' ? 'कोई बीमा योजना नहीं' : state.lang === 'mr' ? 'कोणताही विमा नाही' : 'No insurance schemes')
    : tab === 'subsidies'
    ? (state.lang === 'hi' ? 'कोई सब्सिडी नहीं' : state.lang === 'mr' ? 'कोणतेही अनुदान नाही' : 'No subsidies')
    : t('noSchemes');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>{t('availableSchemes')}</Text>
        </View>
        <TouchableOpacity onPress={handleManualRefresh} style={styles.refreshBtn} activeOpacity={0.7} disabled={refreshing}>
          <Text style={[styles.refreshBtnText, refreshing && { opacity: 0.4 }]}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerBar}>
        {crop && crop !== '—' && (
          <View style={styles.eligibilityBanner}>
            <Text style={styles.eligibilityText}>
              🌾 {state.lang === 'hi' ? `${crop} किसानों के लिए योजनाएं` : state.lang === 'mr' ? `${crop} शेतकऱ्यांसाठी योजना` : `Personalized for ${crop} farmers`}
            </Text>
          </View>
        )}

        <View style={styles.tabRow}>
          {TABS.map((tb) => (
            <TouchableOpacity key={tb.id} style={[styles.tabBtn, tab === tb.id && styles.tabBtnActive]} onPress={() => setTab(tb.id)} activeOpacity={0.8}>
              <Text style={[styles.tabText, tab === tb.id && styles.tabTextActive]}>{tb.icon} {tb.label}</Text>
              <View style={[styles.tabCountBadge, tab === tb.id && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, tab === tb.id && styles.tabCountTextActive]}>{tb.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.search}
            placeholder={state.lang === 'hi' ? 'खोजें...' : state.lang === 'mr' ? 'शोधा...' : 'Search schemes…'}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {tab === 'schemes' && (
          <View style={styles.filterRow}>
            {SCHEME_FILTERS.map((f) => (
              <TouchableOpacity key={f.id} style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]} onPress={() => setFilter(f.id)}>
                <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.countText}>{filteredSchemes.length} {state.lang === 'hi' ? 'मिले' : state.lang === 'mr' ? 'मिळाले' : 'found'}</Text>
          </View>
        )}

        <View style={styles.eligFilterRow}>
          {ELIGIBILITY_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.eligFilterBtn, eligFilter === f.id && { ...styles.eligFilterBtnActive, backgroundColor: f.color, borderColor: f.color }]}
              onPress={() => setEligFilter(f.id)}
            >
              <Text style={[styles.eligFilterText, eligFilter === f.id && styles.eligFilterTextActive]}>{f.icon} {f.label}</Text>
            </TouchableOpacity>
          ))}
          {tab !== 'schemes' && (
            <Text style={styles.countText}>
              {tab === 'insurance' ? filteredInsurance.length : filteredSubsidies.length}
              {' '}{state.lang === 'hi' ? 'मिले' : state.lang === 'mr' ? 'मिळाले' : 'found'}
            </Text>
          )}
        </View>
      </View>

      {currentItems.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>{tab === 'insurance' ? '🛡️' : tab === 'subsidies' ? '💰' : '📭'}</Text>
          </View>
          <Text style={styles.emptyText}>{emptyMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={currentItems as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handlePullRefresh}
          renderItem={({ item }) => {
            const appType: 'scheme' | 'subsidy' | 'insurance' = tab === 'schemes' ? 'scheme' : tab === 'insurance' ? 'insurance' : 'subsidy';
            const existingApp = getApplicationForItem(item.id, appType);
            const isApplyingThis = applying === item.id;
            const eligible = tab === 'schemes'
              ? isEligibleScheme(item as Scheme, crop, land)
              : isEligibleItem(item as InsuranceSubsidy, crop, land);
            const benefit = tab === 'schemes' ? displayBenefit(item as Scheme) : (item as InsuranceSubsidy).benefit;
            const isState = tab === 'schemes' ? (item as Scheme).type === 'STATE' : (item as InsuranceSubsidy).region !== 'Central';
            const itemType = tab === 'schemes' ? (item as Scheme).type : undefined;

            return (
              <View style={[styles.card, item.status === 'Closed' && styles.cardClosed, eligible && styles.cardEligible]}>
                {/* Applied status banner */}
                {existingApp && (
                  <View style={[styles.appliedBanner, { backgroundColor: `${APP_STATUS_COLOR[existingApp.status] ?? '#6B7280'}18`, borderColor: APP_STATUS_COLOR[existingApp.status] ?? '#6B7280' }]}>
                    <Text style={[styles.appliedBannerText, { color: APP_STATUS_COLOR[existingApp.status] ?? '#6B7280' }]}>
                      📋 {APP_STATUS_LABEL[existingApp.status] ?? existingApp.status} · {existingApp.applicationId}
                    </Text>
                  </View>
                )}

                {!existingApp && eligible && (
                  <View style={styles.eligibleBadge}>
                    <Text style={styles.eligibleBadgeText}>
                      ✓ {state.lang === 'hi' ? 'आप पात्र हैं' : state.lang === 'mr' ? 'तुम्ही पात्र आहात' : 'You may be eligible'}
                    </Text>
                  </View>
                )}

                <View style={styles.cardTop}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.typeBadge, isState ? styles.stateBadge : styles.centralBadge]}>
                      <Text style={[styles.typeBadgeText, isState ? styles.stateText : styles.centralText]}>
                        {isState ? t('stateScheme') : t('centralScheme')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.closedBadge]}>
                      <Text style={[styles.statusText, item.status === 'Active' ? styles.activeText : styles.closedText]}>
                        {item.status === 'Active' ? t('active') : t('closed')}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}

                <View style={styles.metaRow}>
                  {benefit ? <View style={styles.metaItem}><Text style={styles.metaIcon}>💰</Text><Text style={styles.metaText} numberOfLines={1}>{benefit}</Text></View> : null}
                  {item.deadline && <View style={styles.metaItem}><Text style={styles.metaIcon}>📅</Text><Text style={styles.metaText}>{item.deadline}</Text></View>}
                  {(item as InsuranceSubsidy).crops && (item as InsuranceSubsidy).crops!.length > 0 && (
                    <View style={styles.metaItem}><Text style={styles.metaIcon}>🌾</Text><Text style={styles.metaText} numberOfLines={1}>{(item as InsuranceSubsidy).crops!.join(', ')}</Text></View>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.knowMoreBtn}
                    onPress={() => handleKnowMore(item, tab, existingApp)}
                  >
                    <Text style={styles.knowMoreText}>{t('knowMore')}</Text>
                  </TouchableOpacity>

                  {item.status !== 'Closed' && !existingApp && (
                    <TouchableOpacity
                      style={[styles.applyBtn, styles.applyBtnEligible, isApplyingThis && styles.applyBtnDisabled]}
                      disabled={isApplyingThis}
                      onPress={() => handleApply(appType, item as Scheme | InsuranceSubsidy, itemType, eligible, tab === 'schemes' ? formatEligibilityForDisplay((item as Scheme).eligibility) : (item as InsuranceSubsidy).eligibility ?? '', tab)}
                    >
                      {isApplyingThis
                        ? <ActivityIndicator size="small" color={COLORS.white}/>
                        : <Text style={styles.applyText}>
                            {state.lang === 'hi' ? 'आवेदन करें' : state.lang === 'mr' ? 'अर्ज करा' : 'Apply Now'}
                          </Text>
                      }
                    </TouchableOpacity>
                  )}

                  {item.status !== 'Closed' && existingApp && (
                    <TouchableOpacity
                      style={[styles.appliedBtn, { backgroundColor: `${APP_STATUS_COLOR[existingApp.status] ?? '#6B7280'}20`, borderWidth: 1.5, borderColor: `${APP_STATUS_COLOR[existingApp.status] ?? '#6B7280'}60` }]}
                      onPress={() => setStatusModal({
                        app: existingApp,
                        reapplyFn: existingApp.status === 'Rejected'
                          ? () => handleApply(appType, item as Scheme | InsuranceSubsidy, itemType, eligible, undefined, tab)
                          : undefined,
                      })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.appliedBtnText, { color: APP_STATUS_COLOR[existingApp.status] ?? '#6B7280' }]}>
                        {APP_STATUS_ICON[existingApp.status] ?? '📋'} Status
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    {/* Success Modal */}
    {successModal && (
      <Modal visible animationType="fade" transparent onRequestClose={() => setSuccessModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successSheet}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIconText}>✅</Text>
            </View>
            <Text style={styles.successTitle}>
              {state.lang === 'hi' ? 'आवेदन सफल!' : state.lang === 'mr' ? 'अर्ज यशस्वी!' : 'Application Submitted!'}
            </Text>
            <Text style={styles.successSchemeName} numberOfLines={2}>{successModal.schemeName}</Text>
            <Text style={styles.successBody}>
              {state.lang === 'hi'
                ? 'आपका आवेदन सफलतापूर्वक जमा कर दिया गया है। जिला अधिकारी इसकी समीक्षा करेंगे।'
                : state.lang === 'mr'
                ? 'तुमचा अर्ज यशस्वीरित्या सादर केला गेला आहे. जिल्हा अधिकारी त्याचे पुनरावलोकन करतील.'
                : 'Your application has been successfully submitted. The district officer will review it shortly.'}
            </Text>
            <View style={styles.successIdBox}>
              <Text style={styles.successIdLabel}>
                {state.lang === 'hi' ? 'आवेदन ID' : state.lang === 'mr' ? 'अर्ज ID' : 'Application ID'}
              </Text>
              <Text style={styles.successIdValue}>{successModal.applicationId}</Text>
            </View>
            <TouchableOpacity style={styles.successBtn} onPress={() => setSuccessModal(null)} activeOpacity={0.85}>
              <Text style={styles.successBtnText}>
                {state.lang === 'hi' ? 'ठीक है' : state.lang === 'mr' ? 'ठीक आहे' : 'Great, Got it!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )}

    {/* Status Modal */}
    {statusModal && (
      <Modal visible animationType="slide" transparent onRequestClose={() => setStatusModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.statusSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {state.lang === 'hi' ? 'आवेदन स्थिति' : state.lang === 'mr' ? 'अर्जाची स्थिती' : 'Application Status'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{statusModal.app.schemeName}</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusModal(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusContent}>
              <View style={[styles.statusBigBadge, { backgroundColor: `${APP_STATUS_COLOR[statusModal.app.status] ?? '#6B7280'}18`, borderColor: APP_STATUS_COLOR[statusModal.app.status] ?? '#6B7280' }]}>
                <Text style={styles.statusBigIcon}>{APP_STATUS_ICON[statusModal.app.status] ?? '📋'}</Text>
                <Text style={[styles.statusBigLabel, { color: APP_STATUS_COLOR[statusModal.app.status] ?? '#6B7280' }]}>
                  {APP_STATUS_LABEL[statusModal.app.status] ?? statusModal.app.status}
                </Text>
              </View>

              <Text style={styles.statusDescription}>
                {APP_STATUS_DESC[statusModal.app.status]?.[state.lang as 'en' | 'hi' | 'mr'] ?? APP_STATUS_DESC[statusModal.app.status]?.en ?? ''}
              </Text>

              <View style={styles.statusMeta}>
                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusMetaLabel}>
                    {state.lang === 'hi' ? 'आवेदन ID' : state.lang === 'mr' ? 'अर्ज ID' : 'Application ID'}
                  </Text>
                  <Text style={styles.statusMetaValue}>{statusModal.app.applicationId}</Text>
                </View>
                <View style={styles.statusMetaDivider}/>
                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusMetaLabel}>
                    {state.lang === 'hi' ? 'आवेदन की तारीख' : state.lang === 'mr' ? 'अर्जाची तारीख' : 'Applied On'}
                  </Text>
                  <Text style={styles.statusMetaValue}>{new Date(statusModal.app.appliedAt).toLocaleDateString('en-IN')}</Text>
                </View>
                {(statusModal.app.adminNotes || statusModal.app.adminReply) ? (
                  <>
                    <View style={styles.statusMetaDivider}/>
                    <View style={styles.statusAdminReply}>
                      <Text style={[styles.statusMetaLabel, statusModal.app.status === 'Rejected' && { color: '#DC2626' }]}>
                        {statusModal.app.status === 'Rejected'
                          ? (state.lang === 'hi' ? '❌ अस्वीकृति का कारण' : state.lang === 'mr' ? '❌ नाकारण्याचे कारण' : '❌ Reason for Rejection')
                          : (state.lang === 'hi' ? 'अधिकारी टिप्पणी' : state.lang === 'mr' ? 'अधिकाऱ्याची टिप्पणी' : 'Officer Reply')}
                      </Text>
                      <Text style={[styles.statusAdminReplyText, statusModal.app.status === 'Rejected' && { color: '#DC2626', fontWeight: '700' }]}>
                        {statusModal.app.adminNotes ?? statusModal.app.adminReply}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            <View style={[styles.modalFooter, { gap: 10 }]}>
              {statusModal.reapplyFn && (
                <TouchableOpacity
                  style={[styles.statusCloseBtn, { backgroundColor: COLORS.primary }]}
                  onPress={() => { setStatusModal(null); statusModal.reapplyFn?.(); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.statusCloseBtnText}>
                    {state.lang === 'hi' ? '🔄 पुनः आवेदन करें' : state.lang === 'mr' ? '🔄 पुन्हा अर्ज करा' : '🔄 Re-apply'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.statusCloseBtn, { backgroundColor: COLORS.border }]} onPress={() => setStatusModal(null)} activeOpacity={0.85}>
                <Text style={[styles.statusCloseBtnText, { color: COLORS.text }]}>
                  {state.lang === 'hi' ? 'बंद करें' : state.lang === 'mr' ? 'बंद करा' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )}

    {/* Document Upload Modal */}
    {docModal && (
      <Modal visible={docModal.visible} animationType="slide" transparent onRequestClose={() => setDocModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {state.lang === 'hi' ? 'दस्तावेज़ अपलोड करें' : state.lang === 'mr' ? 'कागदपत्रे अपलोड करा' : 'Upload Required Documents'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{docModal.itemName}</Text>
              </View>
              <TouchableOpacity onPress={() => setDocModal(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNote}>
              {state.lang === 'hi'
                ? 'नीचे दिए गए दस्तावेज़ इस योजना के लिए आवश्यक हैं। सभी अपलोड करने के बाद आवेदन करें।'
                : state.lang === 'mr'
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
                const docLabel = state.lang === 'hi' ? docDef.labelHi : state.lang === 'mr' ? docDef.labelMr : docDef.label;

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
                          {state.lang === 'hi' ? '✓ अपलोड हो गया' : state.lang === 'mr' ? '✓ अपलोड झाले' : '✓ Uploaded'}
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
                              {state.lang === 'hi' ? 'अपलोड' : state.lang === 'mr' ? 'अपलोड' : 'Upload'}
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
                          state.lang === 'hi' ? 'पात्रता नोटिस' : state.lang === 'mr' ? 'पात्रता सूचना' : 'Eligibility Notice',
                          state.lang === 'hi'
                            ? 'आप पूरी तरह पात्र नहीं हो सकते, फिर भी आवेदन जमा किया जाएगा।'
                            : state.lang === 'mr'
                            ? 'तुम्ही पूर्णपणे पात्र नसाल, तरीही अर्ज सादर केला जाईल.'
                            : 'You may not fully qualify, but your application will be submitted for review.',
                          [
                            { text: state.lang === 'hi' ? 'रद्द करें' : state.lang === 'mr' ? 'रद्द करा' : 'Cancel', style: 'cancel' },
                            { text: state.lang === 'hi' ? 'आवेदन करें' : state.lang === 'mr' ? 'अर्ज करा' : 'Apply', onPress: () => proceedWithApply(docModal.appType, docModal.itemId, docModal.itemName, docModal.itemType, uploadedDocIds) },
                          ],
                        );
                      } else {
                        proceedWithApply(docModal.appType, docModal.itemId, docModal.itemName, docModal.itemType, uploadedDocIds);
                      }
                    }}
                  >
                    <Text style={styles.modalApplyText}>
                      {state.lang === 'hi' ? 'आवेदन करें' : state.lang === 'mr' ? 'अर्ज करा' : 'Apply Now'}
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
  topBar: { backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  refreshBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primaryLight },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: FONT_SIZE.base, color: COLORS.textMuted, fontWeight: '600' },
  headerBar: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  eligibilityBanner: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primaryLight },
  eligibilityText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryDark, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 9, borderRadius: RADIUS.md, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  tabBtnActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  tabText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  tabCountBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  tabCountTextActive: { color: COLORS.white },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  searchIcon: { fontSize: 14 },
  search: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text, paddingVertical: 6 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  countText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginLeft: 'auto', fontWeight: '600' },
  eligFilterRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  eligFilterBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  eligFilterBtnActive: { borderWidth: 1.5 },
  eligFilterText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  eligFilterTextActive: { color: COLORS.white },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.sm, borderWidth: 1.5, borderColor: COLORS.border },
  cardClosed: { opacity: 0.65 },
  cardEligible: { borderColor: COLORS.primary, borderWidth: 2 },
  appliedBanner: { borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderWidth: 1, alignSelf: 'stretch' },
  appliedBannerText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  eligibleBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primaryLight },
  eligibleBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.primary },
  cardTop: { marginBottom: 8 },
  cardName: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.text, lineHeight: 22, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  centralBadge: { backgroundColor: COLORS.infoLight },
  stateBadge: { backgroundColor: COLORS.primaryBg },
  typeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800' },
  centralText: { color: COLORS.info },
  stateText: { color: COLORS.primary },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  activeBadge: { backgroundColor: COLORS.primaryBg },
  closedBadge: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '800' },
  activeText: { color: COLORS.primary },
  closedText: { color: COLORS.textMuted },
  cardDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  metaIcon: { fontSize: 13 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, maxWidth: 160 },
  cardActions: { flexDirection: 'row', gap: 10 },
  knowMoreBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center' },
  knowMoreText: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.primary },
  applyBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  applyBtnEligible: { backgroundColor: COLORS.primaryDark },
  applyBtnIneligible: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.error },
  applyBtnDisabled: { opacity: 0.7 },
  applyText: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.white },
  applyTextIneligible: { color: COLORS.error },
  appliedBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  appliedBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
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

  successSheet: { backgroundColor: COLORS.white, borderRadius: 24, marginHorizontal: 24, padding: 28, alignItems: 'center', ...SHADOW.md },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#16A34A30' },
  successIconText: { fontSize: 40 },
  successTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 6, textAlign: 'center' },
  successSchemeName: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.primary, marginBottom: 12, textAlign: 'center' },
  successBody: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  successIdBox: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', marginBottom: 20, width: '100%', borderWidth: 1, borderColor: COLORS.primaryLight },
  successIdLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4 },
  successIdValue: { fontSize: FONT_SIZE.sm, fontWeight: '900', color: COLORS.primaryDark, fontFamily: 'monospace' },
  successBtn: { backgroundColor: COLORS.primaryDark, paddingVertical: 14, paddingHorizontal: 40, borderRadius: RADIUS.md, width: '100%', alignItems: 'center' },
  successBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: '900' },

  statusSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 24 },
  statusContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  statusBigBadge: { borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 2, alignItems: 'center', flexDirection: 'row', gap: 12 },
  statusBigIcon: { fontSize: 32 },
  statusBigLabel: { fontSize: 20, fontWeight: '900' },
  statusDescription: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  statusMeta: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  statusMetaRow: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  statusMetaDivider: { height: 1, backgroundColor: COLORS.border },
  statusMetaLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700', flex: 1 },
  statusMetaValue: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '700', flex: 2, textAlign: 'right' },
  statusAdminReply: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  statusAdminReplyText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  statusCloseBtn: { backgroundColor: COLORS.primaryDark, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  statusCloseBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: '900' },
});
