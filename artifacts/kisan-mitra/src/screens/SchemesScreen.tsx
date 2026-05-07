import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { Scheme, InsuranceSubsidy, Application } from '../types';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type SchemeFilter = 'ALL' | 'CENTRAL' | 'STATE';
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

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [insuranceItems, setInsuranceItems] = useState<InsuranceSubsidy[]>([]);
  const [subsidyItems, setSubsidyItems] = useState<InsuranceSubsidy[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<SchemeFilter>('ALL');
  const [search, setSearch] = useState('');

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

  useEffect(() => { loadData(); }, [loadData]);

  const getApplicationForItem = (itemId: string, type: 'scheme' | 'subsidy' | 'insurance'): Application | undefined =>
    myApplications.find(a => a.type === type && (a.schemeId === itemId || a.schemeName === itemId));

  async function handleApply(
    type: 'scheme' | 'subsidy' | 'insurance',
    itemId: string,
    itemName: string,
    itemType?: string | null,
    eligible?: boolean,
    eligibilityText?: string,
  ) {
    if (!farmer) return;
    const mobile = farmer.mobile ?? state.mobile;
    if (!mobile) return;

    if (eligible === false) {
      const notEligibleTitle = state.lang === 'hi' ? 'पात्र नहीं' : state.lang === 'mr' ? 'अपात्र' : 'Not Eligible';
      const notEligibleMsg = state.lang === 'hi'
        ? `आप "${itemName}" के लिए पात्र नहीं हैं।\n\n${eligibilityText ? `पात्रता शर्त: ${eligibilityText}` : 'आपकी फसल या जमीन इस योजना की शर्तें पूरी नहीं करती।'}`
        : state.lang === 'mr'
        ? `तुम्ही "${itemName}" साठी पात्र नाही.\n\n${eligibilityText ? `पात्रता अट: ${eligibilityText}` : 'तुमची पीक किंवा जमीन या योजनेच्या अटी पूर्ण करत नाही.'}`
        : `You do not meet the eligibility criteria for "${itemName}".\n\n${eligibilityText ? `Eligibility: ${eligibilityText}` : 'Your crop type or land holding does not match the scheme requirements.'}`;
      Alert.alert(notEligibleTitle, notEligibleMsg, [{ text: 'OK' }]);
      return;
    }

    const applyLabel = state.lang === 'hi' ? 'आवेदन करें' : state.lang === 'mr' ? 'अर्ज करा' : 'Apply';
    const confirmMsg = state.lang === 'hi'
      ? `क्या आप "${itemName}" के लिए आवेदन करना चाहते हैं?`
      : state.lang === 'mr'
      ? `तुम्हाला "${itemName}" साठी अर्ज करायचा आहे का?`
      : `Apply for "${itemName}"?`;

    Alert.alert(applyLabel, confirmMsg, [
      { text: state.lang === 'hi' ? 'रद्द करें' : state.lang === 'mr' ? 'रद्द करा' : 'Cancel', style: 'cancel' },
      {
        text: applyLabel,
        onPress: async () => {
          setApplying(itemId);
          try {
            const app = await api.applyForScheme({
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
            });
            setMyApplications(prev => [...prev, app]);
            Alert.alert(
              state.lang === 'hi' ? 'आवेदन सफल!' : state.lang === 'mr' ? 'अर्ज यशस्वी!' : 'Application Submitted!',
              state.lang === 'hi'
                ? `आपका आवेदन "${itemName}" के लिए सफलतापूर्वक जमा किया गया। ID: ${app.applicationId}`
                : state.lang === 'mr'
                ? `"${itemName}" साठी अर्ज यशस्वीरित्या सादर केला गेला. ID: ${app.applicationId}`
                : `Your application for "${itemName}" has been submitted.\nApp ID: ${app.applicationId}`,
              [{ text: 'OK' }],
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed';
            if (msg.includes('Already applied')) {
              Alert.alert(
                state.lang === 'hi' ? 'पहले से आवेदन किया' : state.lang === 'mr' ? 'आधीच अर्ज केला' : 'Already Applied',
                state.lang === 'hi' ? 'आपने पहले से इस योजना के लिए आवेदन किया है।'
                  : state.lang === 'mr' ? 'तुम्ही आधीच या योजनेसाठी अर्ज केला आहे.'
                  : 'You have already applied for this scheme.',
                [{ text: 'OK' }],
              );
              await loadData();
            } else {
              Alert.alert(
                state.lang === 'hi' ? 'त्रुटि' : state.lang === 'mr' ? 'चूक' : 'Error',
                state.lang === 'hi' ? 'आवेदन सबमिट नहीं हो सका। कृपया पुनः प्रयास करें।'
                  : state.lang === 'mr' ? 'अर्ज सादर होऊ शकला नाही. पुन्हा प्रयत्न करा.'
                  : 'Could not submit application. Please try again.',
                [{ text: 'OK' }],
              );
            }
          } finally {
            setApplying(null);
          }
        },
      },
    ]);
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

  const filteredSchemes = schemes.filter((s) => {
    if (filter !== 'ALL' && s.type !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filteredInsurance = insuranceItems.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSubsidies = subsidyItems.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <Text style={styles.countText}>{filteredSchemes.length} {state.lang === 'hi' ? 'योजनाएं' : state.lang === 'mr' ? 'योजना' : 'found'}</Text>
          </View>
        )}
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

                  {item.status === 'Active' && !existingApp && (
                    <TouchableOpacity
                      style={[styles.applyBtn, eligible && styles.applyBtnEligible, !eligible && styles.applyBtnIneligible, isApplyingThis && styles.applyBtnDisabled]}
                      disabled={isApplyingThis}
                      onPress={() => handleApply(appType, item.id, item.name, itemType, eligible, tab === 'schemes' ? formatEligibilityForDisplay((item as Scheme).eligibility) : (item as InsuranceSubsidy).eligibility ?? '')}
                    >
                      {isApplyingThis
                        ? <ActivityIndicator size="small" color={COLORS.white}/>
                        : <Text style={[styles.applyText, !eligible && styles.applyTextIneligible]}>
                            {!eligible
                              ? (state.lang === 'hi' ? 'अपात्र' : state.lang === 'mr' ? 'अपात्र' : 'Check Eligibility')
                              : (state.lang === 'hi' ? 'आवेदन करें' : state.lang === 'mr' ? 'अर्ज करा' : 'Apply Now')}
                          </Text>
                      }
                    </TouchableOpacity>
                  )}

                  {item.status === 'Active' && existingApp && existingApp.status !== 'Rejected' && (
                    <View style={[styles.appliedBtn, { backgroundColor: `${APP_STATUS_COLOR[existingApp.status] ?? '#6B7280'}20` }]}>
                      <Text style={[styles.appliedBtnText, { color: APP_STATUS_COLOR[existingApp.status] ?? '#6B7280' }]}>
                        {APP_STATUS_LABEL[existingApp.status] ?? existingApp.status}
                      </Text>
                    </View>
                  )}

                  {existingApp && existingApp.status === 'Rejected' && item.status === 'Active' && (
                    <TouchableOpacity
                      style={[styles.applyBtn, styles.applyBtnEligible]}
                      onPress={() => handleApply(appType, item.id, item.name, itemType)}
                    >
                      <Text style={styles.applyText}>
                        {state.lang === 'hi' ? 'पुनः आवेदन करें' : state.lang === 'mr' ? 'पुन्हा अर्ज करा' : 'Re-apply'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: { backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 14 },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
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
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  countText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginLeft: 'auto', fontWeight: '600' },
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
});
