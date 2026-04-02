import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {spacing, typography} from '../tokens';

const newPalette = {
  bg: '#F7F8FC',
  card: '#FFFFFF',
  accent: '#012D73',
  muted: '#A0B3C1',
  surface: '#EDF1F6',
  text: '#012D73',
  buttonText: '#FFFFFF',
};

export function ProfileScreen() {
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
        <View style={styles.actionRowSection}>
          <Pressable style={[styles.bentoCard, styles.actionPrimary]}>
            <Text style={styles.actionPrimaryText}>Start Scan</Text>
          </Pressable>
          <Pressable style={[styles.bentoCard, styles.actionSecondary]}>
            <Text style={styles.actionSecondaryText}>Switch Cam</Text>
          </Pressable>
        </View>

        {/* Secondary Action Bento */}
        <Pressable style={[styles.bentoCard, styles.actionTertiary]}>
          <Text style={styles.actionTertiaryText}>Manual UID Input</Text>
        </Pressable>

        {/* Result Bento */}
        <View style={[styles.bentoCard, styles.resultSection]}>
          <Text style={styles.sectionTitle}>Last Bundle Result</Text>
          <Text style={styles.emptyText}>No participant scanned yet.</Text>
        </View>
      </View>
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
    backgroundColor: 'rgba(1, 45, 115, 0.08)',
    top: -70,
    right: -40,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(1, 45, 115, 0.05)',
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
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#1a2f60',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
    padding: spacing.xl,
  },

  // Flex Layout Sections
  headerSection: {
    flex: 1.2,
    justifyContent: 'center',
  },
  actionRowSection: {
    flex: 1.1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionTertiary: {
    flex: 0.6,
    backgroundColor: newPalette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  resultSection: {
    flex: 1.1,
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
    backgroundColor: newPalette.card, // White background for secondary
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
  actionTertiaryText: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontWeight: '700',
    fontSize: 16,
  },
});