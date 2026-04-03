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
import Ionicons from '@react-native-vector-icons/ionicons';
import {Camera, CameraType} from 'react-native-camera-kit';
import {
  getAttendanceSummary,
  recordAttendanceByUid,
  resolveUidFromScan,
  type AttendanceSummary,
} from '../services/attendance';
import {signOutAdmin} from '../services/auth';
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

const EMPTY_SUMMARY: AttendanceSummary = {
  totalParticipants: 0,
  present: 0,
  absent: 0,
  morning: 0,
  afternoon: 0,
};

export function HomeScreen() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showUidModal, setShowUidModal] = useState(false);
  const [uidInput, setUidInput] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);
  const [lastScanText, setLastScanText] = useState('No scan data yet.');

  const scanLockRef = useRef(false);

  const loadSummary = useCallback(async () => {
    try {
      const next = await getAttendanceSummary();
      setSummary(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load attendance summary.';
      setLastScanText(message);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutAdmin();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

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
        const message = error instanceof Error ? error.message : 'Failed to record attendance.';
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
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.container}>
        <View style={[styles.bentoCard, styles.headerSection]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.heroEyebrow}>PACSMin Admin</Text>
            <Pressable onPress={() => setShowLogoutModal(true)} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color={newPalette.accent} />
            </Pressable>
          </View>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.sub}>Scan participant QR codes and sync live updates to your dashboard.</Text>
        </View>

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

        <View style={styles.statSection}>
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.statCard, styles.statCardHighlight]}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={styles.statValue}>{summary.present}</Text>
            </View>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Absent</Text>
              <Text style={styles.statValue}>{summary.absent}</Text>
            </View>
          </View>
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Morning</Text>
              <Text style={styles.statValue}>{summary.morning}</Text>
            </View>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Afternoon</Text>
              <Text style={styles.statValue}>{summary.afternoon}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.bentoCard, styles.listSection]}>
          <Text style={styles.listTitle}>Recent Scans</Text>
          <Text style={styles.emptyText}>{lastScanText}</Text>
          <Text style={styles.metaText}>Total participants: {summary.totalParticipants}</Text>
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
                <Ionicons name="close" size={20} color={newPalette.text} />
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

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalSub}>End admin session.</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, isLoggingOut && styles.modalBtnDisabled]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}>
                <Text style={styles.modalBtnPrimaryText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
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
  },
  bentoRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerSection: {
    flex: 1.1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: newPalette.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
  },
  actionSection: {
    flex: 1.2,
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  statSection: {
    flex: 1.6,
    gap: spacing.md,
  },
  listSection: {
    flex: 0.8,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
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
  actionPrimary: {
    flex: 1.3,
    backgroundColor: newPalette.accent,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  actionSecondaryText: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: newPalette.surface,
    borderColor: 'rgba(123, 17, 31, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardHighlight: {
    backgroundColor: newPalette.card,
  },
  statLabel: {
    fontSize: 12,
    color: newPalette.muted,
    fontFamily: typography.serif,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 32,
    color: newPalette.text,
    fontWeight: '800',
    fontFamily: typography.serif,
  },
  listTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: newPalette.muted,
    fontFamily: typography.serif,
    fontSize: 14,
  },
  metaText: {
    marginTop: spacing.sm,
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 13,
  },
  scannerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  scannerCard: {
    backgroundColor: newPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
    overflow: 'hidden',
  },
  scannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  scannerTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontSize: 22,
    fontWeight: '800',
  },
  scannerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: newPalette.surface,
  },
  scannerViewport: {
    height: 360,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: newPalette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
    padding: spacing.xl,
  },
  modalTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '800',
    fontSize: 24,
    textAlign: 'center',
  },
  modalSub: {
    marginTop: spacing.xs,
    color: newPalette.muted,
    fontFamily: typography.serif,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  uidInput: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: newPalette.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: newPalette.text,
    fontFamily: typography.serif,
    fontSize: 17,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  modalBtnGhost: {
    backgroundColor: newPalette.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 17, 31, 0.18)',
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
  modalBtnDisabled: {
    opacity: 0.7,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 22,
    left: 22,
    right: 22,
    borderRadius: 14,
    backgroundColor: newPalette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: spacing.sm,
  },
  recordingIndicatorText: {
    color: newPalette.buttonText,
    fontFamily: typography.serif,
    fontWeight: '700',
  },
});
