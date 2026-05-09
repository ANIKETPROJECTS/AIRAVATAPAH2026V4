import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Switch, Alert, Platform, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import type { Lang } from '../types';

const LANG_OPTIONS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🌾' },
];

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon, label, subtitle, rightEl, onPress, isLast = false,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  rightEl?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.row, isLast && s.rowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={s.rowIcon}>
        <Text style={s.rowIconText}>{icon}</Text>
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {rightEl ?? (onPress ? <Text style={s.rowChevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { state, setLang } = useAuth();
  const lang = state.lang;
  const t = (k: string) => (T[lang] ?? T['en'])[k] ?? k;

  const langLabels: Record<string, string> = {
    settings: { en: 'Settings', hi: 'सेटिंग्स', mr: 'सेटिंग्ज' }[lang] ?? 'Settings',
    language: { en: 'Language', hi: 'भाषा', mr: 'भाषा' }[lang] ?? 'Language',
    appLanguage: { en: 'App Language', hi: 'ऐप भाषा', mr: 'ऐप भाषा' }[lang] ?? 'App Language',
    selectLangSub: { en: 'Choose your preferred language', hi: 'अपनी पसंदीदा भाषा चुनें', mr: 'तुमची आवडती भाषा निवडा' }[lang] ?? 'Choose your preferred language',
    support: { en: 'Help & Support', hi: 'सहायता', mr: 'मदत' }[lang] ?? 'Help & Support',
    helpline: { en: 'Kisan Helpline', hi: 'किसान हेल्पलाइन', mr: 'शेतकरी हेल्पलाइन' }[lang] ?? 'Kisan Helpline',
    helplineSub: { en: 'Call 1800-180-1551 (Free)', hi: '1800-180-1551 पर कॉल करें (मुफ़्त)', mr: '1800-180-1551 वर कॉल करा (मोफत)' }[lang] ?? 'Call 1800-180-1551 (Free)',
    faq: { en: 'FAQ', hi: 'अक्सर पूछे जाने वाले प्रश्न', mr: 'वारंवार विचारले प्रश्न' }[lang] ?? 'FAQ',
    faqSub: { en: 'Common questions answered', hi: 'सामान्य प्रश्नों के उत्तर', mr: 'सामान्य प्रश्नांची उत्तरे' }[lang] ?? 'Common questions answered',
    about: { en: 'About', hi: 'जानकारी', mr: 'माहिती' }[lang] ?? 'About',
    aboutApp: { en: 'About App', hi: 'ऐप के बारे में', mr: 'ऐप बद्दल' }[lang] ?? 'About App',
    aboutSub: { en: 'Krushi Suvidha v1.0.0', hi: 'कृषी सुविधा v1.0.0', mr: 'कृषी सुविधा v1.0.0' }[lang] ?? 'Krushi Suvidha v1.0.0',
    privacy: { en: 'Privacy Policy', hi: 'गोपनीयता नीति', mr: 'गोपनीयता धोरण' }[lang] ?? 'Privacy Policy',
    terms: { en: 'Terms of Use', hi: 'उपयोग की शर्तें', mr: 'वापर अटी' }[lang] ?? 'Terms of Use',
    govDept: { en: 'Govt. of Maharashtra', hi: 'महाराष्ट्र सरकार', mr: 'महाराष्ट्र शासन' }[lang] ?? 'Govt. of Maharashtra',
    govSub: { en: 'Agriculture & Farmers Welfare Dept.', hi: 'कृषि और किसान कल्याण विभाग', mr: 'कृषी व शेतकरी कल्याण विभाग' }[lang] ?? 'Agriculture & Farmers Welfare Dept.',
    dataUsage: { en: 'Data & Privacy', hi: 'डेटा और गोपनीयता', mr: 'डेटा आणि गोपनीयता' }[lang] ?? 'Data & Privacy',
    dataSub: { en: 'Your data is encrypted & secure', hi: 'आपका डेटा एन्क्रिप्टेड और सुरक्षित है', mr: 'तुमचा डेटा एन्क्रिप्टेड आणि सुरक्षित आहे' }[lang] ?? 'Your data is encrypted & secure',
  };

  function handleHelpline() {
    if (Platform.OS === 'web') {
      Alert.alert('Kisan Helpline', '1800-180-1551 (Toll Free)\n24×7 Available');
    } else {
      Linking.openURL('tel:18001801551');
    }
  }

  function handleAbout() {
    Alert.alert(
      'कृषी सुविधा',
      'Version 1.0.0\n\nDeveloped by Airavata Technologies\nfor Govt. of Maharashtra\n\nAgriculture & Farmers Welfare Department',
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.topBarCenter}>
          <Text style={s.topBarTitle}>कृषी सुविधा</Text>
          <Text style={s.topBarSub}>{langLabels.settings}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <SettingsSection title={langLabels.language}>
          <View style={s.langRow}>
            {LANG_OPTIONS.map((opt, i) => {
              const isSelected = lang === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[s.langChip, isSelected && s.langChipActive]}
                  onPress={() => setLang(opt.code)}
                  activeOpacity={0.75}
                >
                  <Text style={s.langFlag}>{opt.flag}</Text>
                  <Text style={[s.langLabel, isSelected && s.langLabelActive]}>{opt.native}</Text>
                  {isSelected && <Text style={s.langCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.langHint}>{langLabels.selectLangSub}</Text>
        </SettingsSection>

        <SettingsSection title={langLabels.support}>
          <SettingsRow
            icon="📞"
            label={langLabels.helpline}
            subtitle={langLabels.helplineSub}
            onPress={handleHelpline}
          />
          <SettingsRow
            icon="❓"
            label={langLabels.faq}
            subtitle={langLabels.faqSub}
            isLast
            onPress={() =>
              Alert.alert(
                'FAQ',
                'Q: How long does registration take?\nA: 2–3 working days.\n\nQ: What documents are needed?\nA: Aadhaar, Bank Passbook, Form 7, Form 12, Form 8A.\n\nQ: How will I know when verified?\nA: You will receive a notification in the app.',
              )
            }
          />
        </SettingsSection>

        <SettingsSection title={langLabels.about}>
          <SettingsRow
            icon="ℹ️"
            label={langLabels.aboutApp}
            subtitle={langLabels.aboutSub}
            onPress={handleAbout}
          />
          <SettingsRow
            icon="🔒"
            label={langLabels.privacy}
            subtitle={langLabels.dataSub}
            onPress={() =>
              Alert.alert(
                langLabels.privacy,
                'Your personal data is encrypted and stored securely. It is only accessible to authorised government officials for verification purposes.',
              )
            }
          />
          <SettingsRow
            icon="📜"
            label={langLabels.terms}
            isLast
            onPress={() =>
              Alert.alert(
                langLabels.terms,
                'This app is for official use by farmers registered under the Govt. of Maharashtra Agriculture & Farmers Welfare Department. Misuse is punishable under applicable law.',
              )
            }
          />
        </SettingsSection>

        <View style={s.footer}>
          <Text style={s.footerEmoji}>🌾</Text>
          <Text style={s.footerTitle}>कृषी सुविधा</Text>
          <Text style={s.footerGov}>{langLabels.govDept}</Text>
          <Text style={s.footerDept}>{langLabels.govSub}</Text>
          <Text style={s.footerVersion}>v1.0.0  •  Airavata Technologies</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primaryDark, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 26, color: COLORS.white, fontWeight: '300', lineHeight: 30 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.gold },
  topBarSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    overflow: 'hidden', ...SHADOW.sm,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowIconText: { fontSize: 20 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  rowChevron: { fontSize: 22, color: COLORS.textMuted, fontWeight: '300' },

  langRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  langChip: {
    flex: 1, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: COLORS.borderLight, backgroundColor: COLORS.background,
  },
  langChipActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg,
  },
  langFlag: { fontSize: 24 },
  langLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  langLabelActive: { color: COLORS.primaryDark, fontWeight: '800' },
  langCheck: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '800' },
  langHint: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
    textAlign: 'center', paddingBottom: 14, paddingHorizontal: 16,
  },

  footer: { alignItems: 'center', gap: 4, paddingTop: 12 },
  footerEmoji: { fontSize: 32, marginBottom: 4 },
  footerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.primaryDark },
  footerGov: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  footerDept: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center' },
  footerVersion: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 6 },
});
