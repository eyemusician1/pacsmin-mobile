import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Camera, CameraType} from 'react-native-camera-kit';
import {
  getAttendanceSummary,
  recordAttendanceByUid,
  resolveUidFromScan,
  type AttendanceSummary,
} from '../services/attendance';
import {spacing, typography} from '../tokens';

const newPalette = {
  bg: '#F8F1E8',
  card: '#FFFAF3',
  accent: '#7B111F',
  muted: '#9F7E56',
  surface: '#F4E2C8',
  text: '#4F0D17',
  buttonText: '#FFF8EF',
};

export function ProfileScreen() {
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showUidModal, setShowUidModal] = useState(false);
  const [uidInput, setUidInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [lastScanText, setLastScanText] = useState('No participant scanned yet.');
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalParticipants: 0,
    present: 0,
    absent: 0,
    morning: 0,
    afternoon: 0,
  });

  const scanLockRef = useRef(false);

  const loadSummary = useCallback(async () => {
    try {
      const next = await getAttendanceSummary();
      setSummary(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load records.';
      setLastScanText(message);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const processUid = useCallback(
    async (rawValue: string) => {
      const uid = resolveUidFromScan(rawValue);
      if (!uid || scanLockRef.current) {
        return;
      }

      scanLockRef.current = true;
      setIsRecording(true);

      try {
        const result = await recordAttendanceByUid(uid);
        const label = result.status === 'recorded' ? 'Recorded' : 'Already marked';
        setLastScanText(`${label}: ${result.fullName} (${result.uid})`);
        await loadSummary();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to record UID.';
        setLastScanText(message);
      } finally {
        setIsRecording(false);
        setTimeout(() => {
          scanLockRef.current = false;
        }, 900);
      }
    },
    [loadSummary],
  );

  const openScanner = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setLastScanText('Camera permission denied.');
        return;
      }
    }

    setShowScannerModal(true);
  };

  const submitManualUid = async () => {
    const value = uidInput.trim();
    if (!value) {
      return;
    }

    setShowUidModal(false);
    setUidInput('');
    await processUid(value);
  };

  return (
    <View style={styles.root}>
      {/* Ambient Background Orbs */}
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.container}>
        {/* Header Bento */}
        <View style={[styles.bentoCard, styles.headerSection]}>
          <Text style={styles.heroEyebrow}>Bundle Tracker</Text>
          <Text style={styles.title}>Bundle Choice</Text>
          <Text style={styles.sub}>
            Confirm participant bundle selection with one scan and show live status.
          </Text>
        </View>

        {/* Main Actions Bento Row */}
        <View style={styles.actionSection}>
          <Pressable
            onPress={openScanner}
            disabled={isRecording}
            style={[styles.bentoCard, styles.actionPrimary, isRecording && styles.actionDisabled]}>
            <Text style={styles.actionPrimaryText}>Scan QR</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowUidModal(true)}
            disabled={isRecording}
            style={[styles.bentoCard, styles.actionSecondary, isRecording && styles.actionDisabled]}>
            <Text style={styles.actionSecondaryText}>Enter UID</Text>
          </Pressable>
        </View>

        {/* Result Bento */}
        <View style={[styles.bentoCard, styles.resultSection]}>
          <Text style={styles.sectionTitle}>Last Bundle Result</Text>
          <Text style={styles.emptyText}>{lastScanText}</Text>
        </View>

        {/* Counter Bento (Added to perfectly match the Food Tab layout) */}
        <View style={[styles.bentoCard, styles.counterSection]}>
          <Text style={styles.sectionTitle}>Scanned Session</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{summary.morning + summary.afternoon} records</Text>
          </View>
        </View>
      </View>

      <Modal
        visible={showScannerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScannerModal(false)}>
        <View style={styles.scannerBackdrop}>
          <View style={styles.scannerCard}>
            <View style={styles.scannerTopRow}>
              <Text style={styles.scannerTitle}>Scan QR</Text>
              <Pressable onPress={() => setShowScannerModal(false)} style={styles.scannerCloseBtn}>
                <Text style={styles.scannerCloseIcon}>x</Text>
              </Pressable>
            </View>

            <View style={styles.scannerViewport}>
              <Camera
                style={styles.camera}
                cameraType={CameraType.Back}
                scanBarcode
                showFrame
                frameColor={newPalette.buttonText}
                laserColor={newPalette.buttonText}
                onReadCode={event => {
                  const value = event.nativeEvent.codeStringValue;
                  if (!value) {
                    return;
                  }
                  setShowScannerModal(false);
                  void processUid(value);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUidModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUidModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter UID</Text>
            <TextInput
              value={uidInput}
              onChangeText={setUidInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Type UID"
              placeholderTextColor={newPalette.muted}
              style={styles.uidInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowUidModal(false)}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitManualUid}>
                <Text style={styles.modalBtnPrimaryText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <ActivityIndicator color={newPalette.buttonText} />
          <Text style={styles.recordingIndicatorText}>Saving scan...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: newPalette.bg,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(123, 17, 31, 0.10)',
    top: -70,
    right: -40,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(190, 145, 85, 0.14)',
    bottom: 80,
    left: -50,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  // Base Bento Card
  bentoCard: {
    backgroundColor: newPalette.card,
    borderColor: 'rgba(123, 17, 31, 0.14)',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#5C0F1A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
    padding: spacing.xl,
  },

  // Flex Layout Sections (Matched 1:1 with Food tab)
  headerSection: {
    flex: 1.1,
    justifyContent: 'center',
  },
  actionSection: {
    flex: 1.2,
    flexDirection: 'row',
    gap: spacing.md,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  resultSection: {
    flex: 1.1,
    justifyContent: 'center',
  },
  counterSection: {
    flex: 0.8,
    justifyContent: 'center',
  },

  // Text Styles
  heroEyebrow: {
    color: newPalette.accent,
    fontFamily: typography.serif,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    color: newPalette.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: typography.serif,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sub: {
    color: newPalette.muted,
    fontFamily: typography.serif,
    fontSize: 15,
    lineHeight: 20,
  },
  sectionTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: newPalette.muted,
    fontFamily: typography.serif,
    fontSize: 15,
  },

  // Action Buttons
  actionPrimary: {
    flex: 1.3,
    backgroundColor: newPalette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  actionPrimaryText: {
    color: newPalette.buttonText,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 20,
  },
  actionSecondary: {
    flex: 1,
    backgroundColor: newPalette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  actionSecondaryText: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },

  // Custom Badge for Counter Section
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: newPalette.surface,
    borderColor: 'rgba(123, 17, 31, 0.18)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(79, 13, 23, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: newPalette.card,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.16)',
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 24,
    textAlign: 'center',
  },
  uidInput: {
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.2)',
    borderRadius: 14,
    backgroundColor: newPalette.surface,
    color: newPalette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.serif,
    fontSize: 17,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: newPalette.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.2)',
  },
  modalBtnGhostText: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  modalBtnPrimary: {
    backgroundColor: newPalette.accent,
  },
  modalBtnPrimaryText: {
    color: newPalette.buttonText,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 16,
  },
  scannerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(79, 13, 23, 0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scannerCard: {
    backgroundColor: newPalette.card,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.16)',
    gap: spacing.md,
  },
  scannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 22,
  },
  scannerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: newPalette.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
  },
  scannerCloseIcon: {
    color: newPalette.text,
    fontSize: 18,
    fontFamily: typography.serif,
    fontWeight: '700',
  },
  scannerViewport: {
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: newPalette.accent,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  recordingIndicatorText: {
    color: newPalette.buttonText,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 14,
  },
});