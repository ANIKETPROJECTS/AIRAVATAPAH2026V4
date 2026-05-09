import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE } from '../api';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, T } from '../constants';
import { REQUIRED_DOCUMENTS, DocUploadState, DocUploadStatus, DocumentTypeId } from '../types';

interface Props {
  isReupload?: boolean;
  onCancelReupload?: () => void;
}

export default function DocumentUploadScreen({ isReupload, onCancelReupload }: Props) {
  const { state, updateFarmer, logout } = useAuth();
  const t = (k: string) => (T[state.lang] ?? T['en'])[k] ?? k;

  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  function addDebugLog(msg: string) {
    const ts = new Date().toISOString().substring(11, 23);
    setDebugLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 30));
    setShowDebug(true);
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

  const [docStates, setDocStates] = useState<Record<DocumentTypeId, DocUploadState>>({
    aadhar: { status: 'idle' },
    bank_passbook: { status: 'idle' },
    form7: { status: 'idle' },
    form12: { status: 'idle' },
    form8a: { status: 'idle' },
  });
  const [submitting, setSubmitting] = useState(false);

  function setDoc(id: DocumentTypeId, patch: Partial<DocUploadState>) {
    setDocStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const mobile = state.mobile ?? '';

  const allDone = REQUIRED_DOCUMENTS.every((d) => docStates[d.id].status === 'done');
  const doneCount = REQUIRED_DOCUMENTS.filter((d) => docStates[d.id].status === 'done').length;
  const canSubmit = doneCount >= 1;

  async function pollUntilDone(docId: DocumentTypeId, requestId: string) {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const result = await api.pollExtraction(requestId);
        if (result.status === 'complete') {
          setDoc(docId, { status: 'done' });
          return;
        }
        if (result.status === 'error') {
          setDoc(docId, { status: 'error', error: result.error ?? 'Processing failed' });
          return;
        }
      } catch {
        // keep polling
      }
    }
    setDoc(docId, { status: 'error', error: 'Processing timed out. Please re-upload.' });
  }

  async function pickAndUpload(docId: DocumentTypeId) {
    if (!mobile) { Alert.alert('Error', 'Session expired. Please login again.'); return; }
    setDoc(docId, { status: 'picking', error: undefined });
    try {
      let fileUri = '';
      let fileName = `${docId}.pdf`;
      let fileMime = 'application/pdf';

      addDebugLog(`Platform: ${Platform.OS} | API: ${API_BASE}`);

      if (Platform.OS === 'web') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: false,
        });
        if (result.canceled || !result.assets?.[0]) { setDoc(docId, { status: 'idle' }); return; }
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileName = asset.name ?? fileName;
        fileMime = asset.mimeType ?? fileMime;
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Please allow access to your photos to upload documents.');
          setDoc(docId, { status: 'idle' });
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          allowsMultipleSelection: false,
        });
        if (result.canceled || !result.assets?.[0]) { setDoc(docId, { status: 'idle' }); return; }
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileName = `${docId}.jpg`;
        fileMime = 'image/jpeg';
      }

      addDebugLog(`Uploading ${docId}: ${fileName} (${fileMime})`);
      addDebugLog(`URI starts with: ${fileUri.substring(0, 40)}`);

      setDoc(docId, { status: 'uploading', fileName });
      const submitResult = await api.uploadDocument(fileUri, fileName, fileMime, docId, mobile);
      const requestId = submitResult.request_id;
      addDebugLog(`Upload OK → requestId: ${requestId}`);
      setDoc(docId, { status: 'processing', requestId });
      pollUntilDone(docId, requestId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      addDebugLog(`ERROR: ${errMsg}`);
      setDoc(docId, { status: 'error', error: errMsg });
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const farmer = await api.submitRegistration(mobile);
      updateFarmer(farmer);
    } catch {
      updateFarmer({
        farmerId: '',
        mobile,
        name: '—',
        status: 'Pending',
        addedAt: new Date().toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function statusInfo(s: DocUploadStatus): { label: string; color: string; bg: string } {
    switch (s) {
      case 'done': return { label: t('uploaded'), color: COLORS.primary, bg: COLORS.primaryBg };
      case 'uploading': return { label: 'Uploading…', color: COLORS.info, bg: COLORS.infoLight };
      case 'processing': return { label: t('processing'), color: COLORS.gold, bg: COLORS.goldLight };
      case 'error': return { label: t('failed'), color: COLORS.error, bg: COLORS.errorLight };
      case 'picking': return { label: 'Selecting…', color: COLORS.textMuted, bg: COLORS.borderLight };
      default: return { label: 'Not uploaded', color: COLORS.textMuted, bg: '#F1F5F9' };
    }
  }

  const docLabel = (d: typeof REQUIRED_DOCUMENTS[0]) =>
    state.lang === 'hi' ? d.labelHi : state.lang === 'mr' ? d.labelMr : d.label;

  const pct = (doneCount / REQUIRED_DOCUMENTS.length) * 100;

  const reuploadTitle =
    state.lang === 'hi' ? 'दस्तावेज़ पुनः अपलोड करें' :
    state.lang === 'mr' ? 'कागदपत्रे पुन्हा अपलोड करा' :
    'Re-upload Documents';

  const reuploadSub =
    state.lang === 'hi' ? 'अस्वीकृति का कारण पढ़ें और सही दस्तावेज़ अपलोड करें।' :
    state.lang === 'mr' ? 'नाकारण्याचे कारण वाचा आणि योग्य कागदपत्रे अपलोड करा.' :
    'Review the rejection reason and upload the corrected documents.';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>कृषी सुविधा</Text>
          <Text style={styles.topBarSub}>
            {isReupload
              ? (state.lang === 'hi' ? 'दस्तावेज़ पुनः अपलोड'
                : state.lang === 'mr' ? 'कागदपत्रे पुन्हा अपलोड'
                : 'Document Re-upload')
              : 'Farmer Registration'}
          </Text>
        </View>
        {isReupload && onCancelReupload ? (
          <TouchableOpacity style={styles.backTopBtn} onPress={onCancelReupload}>
            <Text style={styles.backTopText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutTopBtn} onPress={handleLogout}>
            <Text style={styles.logoutTopText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Reupload banner */}
        {isReupload && (
          <View style={styles.reuploadBanner}>
            <Text style={styles.reuploadBannerIcon}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reuploadBannerTitle}>{reuploadTitle}</Text>
              <Text style={styles.reuploadBannerSub}>{reuploadSub}</Text>
            </View>
          </View>
        )}

        {!isReupload && (
          <View style={styles.heroBox}>
            <View style={styles.heroIconBox}>
              <Text style={styles.heroIcon}>📑</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{t('registerTitle')}</Text>
              <Text style={styles.heroSub}>{t('registerSubtitle')}</Text>
            </View>
          </View>
        )}

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{t('uploadDocs')}</Text>
            <Text style={styles.progressCount}>{doneCount}<Text style={styles.progressTotal}> / {REQUIRED_DOCUMENTS.length}</Text></Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <View style={styles.progressSegments}>
            {REQUIRED_DOCUMENTS.map((d, i) => (
              <View key={d.id} style={[
                styles.progressSegment,
                i < doneCount ? styles.progressSegmentDone : {}
              ]} />
            ))}
          </View>
        </View>

        <View style={styles.docList}>
          {REQUIRED_DOCUMENTS.map((doc) => {
            const ds = docStates[doc.id];
            const si = statusInfo(ds.status);
            const isBusy = ds.status === 'uploading' || ds.status === 'processing' || ds.status === 'picking';
            const isDone = ds.status === 'done';

            return (
              <View key={doc.id} style={[styles.docCard, isDone && styles.docCardDone]}>
                <View style={[styles.docIconBox, { backgroundColor: isDone ? COLORS.primaryBg : '#F8FAFC', borderColor: isDone ? COLORS.primaryLight : COLORS.border }]}>
                  <Text style={styles.docIcon}>{doc.icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{docLabel(doc)}</Text>
                  <Text style={styles.docDesc} numberOfLines={1}>{doc.description}</Text>
                  <View style={[styles.statusChip, { backgroundColor: si.bg }]}>
                    <Text style={[styles.statusChipText, { color: si.color }]}>{si.label}</Text>
                  </View>
                  {ds.status === 'error' && ds.error && (
                    <Text style={styles.errorText}>{ds.error}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    isDone && styles.uploadBtnDone,
                    isBusy && styles.uploadBtnBusy,
                  ]}
                  onPress={() => pickAndUpload(doc.id)}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  {isBusy
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={styles.uploadBtnIcon}>
                        {isDone ? '✓' : ds.status === 'error' ? '↻' : '↑'}
                      </Text>
                  }
                  <Text style={styles.uploadBtnLabel}>
                    {isBusy ? '...' : isDone ? t('reUpload') : t('uploadDoc')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {!canSubmit && (
          <View style={styles.tipBox}>
            <Text style={styles.tipIcon}>📌</Text>
            <Text style={styles.tipText}>
              {isReupload
                ? 'Upload at least one corrected document, then tap Submit to resubmit for review.'
                : 'Upload at least one document to submit your registration. Accepted formats: JPG, PNG, PDF.'}
            </Text>
          </View>
        )}

        {canSubmit && !allDone && (
          <View style={[styles.tipBox, { backgroundColor: '#FEF9C3', borderColor: '#FDE047' }]}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              {`${doneCount} of ${REQUIRED_DOCUMENTS.length} documents uploaded. You can submit now or upload more before submitting.`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitBtnText}>
                {`✅  ${isReupload ? 'Resubmit for Review' : t('submitReg')}${!allDone ? ` (${doneCount}/${REQUIRED_DOCUMENTS.length})` : ''}`}
              </Text>}
        </TouchableOpacity>

        {isReupload && onCancelReupload && (
          <TouchableOpacity style={styles.cancelReuploadBtn} onPress={onCancelReupload}>
            <Text style={styles.cancelReuploadText}>← Back to Status</Text>
          </TouchableOpacity>
        )}

        {/* Debug Log Panel — shows after first upload attempt */}
        {debugLog.length > 0 && (
          <View style={styles.debugPanel}>
            <TouchableOpacity
              style={styles.debugHeader}
              onPress={() => setShowDebug(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.debugTitle}>🔧 Debug Log ({debugLog.length})</Text>
              <Text style={styles.debugToggle}>{showDebug ? '▲ Hide' : '▼ Show'}</Text>
            </TouchableOpacity>
            {showDebug && (
              <View style={styles.debugBody}>
                {debugLog.map((line, i) => (
                  <Text key={i} style={styles.debugLine}>{line}</Text>
                ))}
              </View>
            )}
          </View>
        )}

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
  logoutTopBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  logoutTopText: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  backTopBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  backTopText: { color: COLORS.gold, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },
  reuploadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF7ED', borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#FED7AA',
    ...SHADOW.sm,
  },
  reuploadBannerIcon: { fontSize: 28, marginTop: 2 },
  reuploadBannerTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: '#9A3412', marginBottom: 4 },
  reuploadBannerSub: { fontSize: FONT_SIZE.sm, color: '#C2410C', lineHeight: 20 },
  heroBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 16, ...SHADOW.sm,
  },
  heroIconBox: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
  },
  heroIcon: { fontSize: 26 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 4 },
  heroSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  progressCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 20, ...SHADOW.sm,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  progressCount: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: COLORS.primary },
  progressTotal: { fontSize: FONT_SIZE.base, color: COLORS.textMuted },
  progressTrack: { height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.border, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  progressSegments: { flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
  },
  progressSegmentDone: { backgroundColor: COLORS.primary },
  docList: { gap: 12, marginBottom: 16 },
  docCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW.sm,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  docCardDone: { borderColor: COLORS.primary },
  docIconBox: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  docIcon: { fontSize: 24 },
  docInfo: { flex: 1, gap: 4 },
  docName: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  docDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  statusChip: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: RADIUS.full, marginTop: 2,
  },
  statusChipText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: 2 },
  uploadBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 64, gap: 2,
  },
  uploadBtnDone: { backgroundColor: COLORS.primaryMid },
  uploadBtnBusy: { backgroundColor: COLORS.gold },
  uploadBtnIcon: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '800' },
  uploadBtnLabel: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  tipBox: {
    padding: 14, backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 16,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  tipIcon: { fontSize: 16 },
  tipText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primaryMid, lineHeight: 20 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 18, alignItems: 'center', ...SHADOW.md,
  },
  submitBtnDisabled: { backgroundColor: COLORS.textMuted + '60' },
  submitBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: '800' },
  cancelReuploadBtn: {
    marginTop: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelReuploadText: { color: COLORS.textMuted, fontSize: FONT_SIZE.base, fontWeight: '600' },
  debugPanel: {
    marginTop: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#1E293B',
  },
  debugTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  debugToggle: { fontSize: 11, color: '#64748B' },
  debugBody: { padding: 10, gap: 2 },
  debugLine: { fontSize: 10, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
});
