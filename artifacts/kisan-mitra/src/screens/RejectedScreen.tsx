import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';

export default function RejectedScreen() {
  const { state, logout, requestReupload, refreshFarmer } = useAuth();

  useEffect(() => {
    const interval = setInterval(async () => {
      try { await refreshFarmer(); } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshFarmer]);
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;
  const farmer = state.farmer;

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

  const reuploadLabel =
    state.lang === 'hi' ? '📤  दस्तावेज़ पुनः अपलोड करें' :
    state.lang === 'mr' ? '📤  कागदपत्रे पुन्हा अपलोड करा' :
    '📤  Re-upload Documents';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>Application Status</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHero}>
          <View style={styles.statusIconRing}>
            <View style={styles.statusIconInner}>
              <Text style={styles.statusEmoji}>❌</Text>
            </View>
          </View>
          <Text style={styles.title}>
            {state.lang === 'hi' ? 'आवेदन अस्वीकृत' : state.lang === 'mr' ? 'अर्ज नाकारला' : 'Profile Rejected'}
          </Text>
          <Text style={styles.subtitle}>
            {state.lang === 'hi'
              ? 'आपका किसान पंजीकरण अनुरोध कृषि अधिकारी द्वारा अस्वीकार कर दिया गया है।'
              : state.lang === 'mr'
              ? 'तुमचा शेतकरी नोंदणी अर्ज कृषी अधिकाऱ्याने नाकारला आहे.'
              : 'Your farmer registration has been rejected by the agriculture officer.'}
          </Text>
        </View>

        {!!farmer?.farmerId && (
          <View style={styles.idCard}>
            <View>
              <Text style={styles.idLabel}>{t('farmerId')}</Text>
              <Text style={styles.idValue}>{farmer.farmerId}</Text>
              <Text style={styles.idMobile}>+91 {state.mobile}</Text>
            </View>
            <View style={styles.idIconBox}>
              <Text style={styles.idIcon}>🪪</Text>
            </View>
          </View>
        )}

        {/* Rejection Reason Card */}
        {!!farmer?.rejectionReason && (
          <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Text style={styles.reasonIcon}>📋</Text>
              <Text style={styles.reasonTitle}>
                {state.lang === 'hi' ? 'अस्वीकृति का कारण' : state.lang === 'mr' ? 'नाकारण्याचे कारण' : 'Reason for Rejection'}
              </Text>
            </View>
            <Text style={styles.reasonText}>{farmer.rejectionReason}</Text>
            <View style={styles.reasonFooter}>
              <Text style={styles.reasonFooterText}>
                {state.lang === 'hi'
                  ? '— कृषि अधिकारी द्वारा'
                  : state.lang === 'mr'
                  ? '— कृषी अधिकाऱ्यांकडून'
                  : '— Agriculture Officer'}
              </Text>
            </View>
          </View>
        )}

        {/* Re-upload CTA */}
        <TouchableOpacity style={styles.reuploadBtn} onPress={requestReupload} activeOpacity={0.85}>
          <Text style={styles.reuploadBtnText}>{reuploadLabel}</Text>
          <Text style={styles.reuploadBtnSub}>
            {state.lang === 'hi'
              ? 'सही किए गए दस्तावेज़ अपलोड करके पुनः समीक्षा के लिए सबमिट करें'
              : state.lang === 'mr'
              ? 'दुरुस्त केलेली कागदपत्रे अपलोड करा आणि पुन्हा पुनरावलोकनासाठी सबमिट करा'
              : 'Upload corrected documents and resubmit for review'}
          </Text>
        </TouchableOpacity>

        <View style={styles.stepsCard}>
          <Text style={styles.cardTitle}>
            {state.lang === 'hi' ? '📋 अगले कदम' : state.lang === 'mr' ? '📋 पुढील पायऱ्या' : '📋 What to do next'}
          </Text>
          {[
            state.lang === 'hi'
              ? 'ऊपर दिए गए कारण को ध्यान से पढ़ें और अपने दस्तावेज़ ठीक करें।'
              : state.lang === 'mr'
              ? 'वरील नाकारण्याचे कारण काळजीपूर्वक वाचा आणि तुमचे कागदपत्र दुरुस्त करा.'
              : 'Read the rejection reason above carefully and correct the mentioned issues.',
            state.lang === 'hi'
              ? '"दस्तावेज़ पुनः अपलोड" बटन दबाएं और सही दस्तावेज़ अपलोड करें।'
              : state.lang === 'mr'
              ? '"कागदपत्रे पुन्हा अपलोड" बटण दाबा आणि योग्य कागदपत्रे अपलोड करा.'
              : 'Tap "Re-upload Documents" above and upload the corrected files.',
            state.lang === 'hi'
              ? 'किसी समस्या के लिए कृषि विभाग हेल्पलाइन से संपर्क करें।'
              : state.lang === 'mr'
              ? 'मदतीसाठी कृषी विभाग हेल्पलाइनशी संपर्क करा.'
              : 'For help, contact the Agriculture Dept. helpline below.',
          ].map((text, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpHeader}>
            <View style={styles.helpIconBox}>
              <Text style={styles.helpIcon}>📞</Text>
            </View>
            <View>
              <Text style={styles.helpTitle}>
                {state.lang === 'hi' ? 'सहायता केंद्र' : state.lang === 'mr' ? 'मदत केंद्र' : 'Help Center'}
              </Text>
              <Text style={styles.helpOrg}>
                {state.lang === 'hi' ? 'महाराष्ट्र कृषि विभाग' : state.lang === 'mr' ? 'महाराष्ट्र कृषी विभाग' : 'Maharashtra Agriculture Dept.'}
              </Text>
            </View>
          </View>
          <View style={styles.helpPhoneRow}>
            <Text style={styles.helpPhone}>1800-233-4000</Text>
            <View style={styles.tollFreeBadge}>
              <Text style={styles.tollFreeText}>Toll Free</Text>
            </View>
          </View>
          <Text style={styles.helpHours}>
            {state.lang === 'hi' ? 'सोम–शनि, सुबह 10 – शाम 5' : state.lang === 'mr' ? 'सोम–शनि, सकाळी 10 – सायं 5' : 'Mon–Sat  •  10:00 AM – 5:00 PM'}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>🚪  {t('logout')}</Text>
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
  },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },
  statusHero: { alignItems: 'center', marginBottom: 20 },
  statusIconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.errorLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.error + '40', ...SHADOW.sm,
  },
  statusIconInner: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  statusEmoji: { fontSize: 40 },
  title: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.error, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  idCard: {
    backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOW.md,
  },
  idLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  idValue: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  idMobile: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  idIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  idIcon: { fontSize: 26 },
  reasonCard: {
    backgroundColor: '#FFF5F5', borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#FCA5A5', ...SHADOW.sm,
  },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reasonIcon: { fontSize: 18 },
  reasonTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.error },
  reasonText: { fontSize: FONT_SIZE.base, color: '#7F1D1D', lineHeight: 22, fontStyle: 'italic' },
  reasonFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#FCA5A5', paddingTop: 8 },
  reasonFooterText: { fontSize: FONT_SIZE.xs, color: '#991B1B', fontWeight: '600' },
  reuploadBtn: {
    backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, alignItems: 'center', ...SHADOW.md,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  reuploadBtnText: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '800', marginBottom: 4 },
  reuploadBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: FONT_SIZE.xs, textAlign: 'center', lineHeight: 16 },
  stepsCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 16, ...SHADOW.sm, gap: 14,
  },
  cardTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '800' },
  stepText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  helpCard: {
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, padding: 18,
    marginBottom: 20, borderWidth: 1.5, borderColor: COLORS.primaryLight, ...SHADOW.sm,
  },
  helpHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  helpIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  helpIcon: { fontSize: 22 },
  helpTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.primaryDark },
  helpOrg: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  helpPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  helpPhone: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.primaryDark },
  tollFreeBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tollFreeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  helpHours: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  logoutBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.error, ...SHADOW.sm,
  },
  logoutText: { color: COLORS.error, fontSize: FONT_SIZE.base, fontWeight: '700' },
});
