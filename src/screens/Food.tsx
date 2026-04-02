import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {spacing, typography} from '../tokens';

// Colors inferred from the PACSMin logo
const newPalette = {
  bg: '#F7F8FC', // General background
  card: '#FFFFFF', // Card background
  accent: '#012D73', // Main dark blue from the logo
  muted: '#A0B3C1', // Muted light blue for labels/subtext
  surface: '#EDF1F6', // Surface color for alternative cards/buttons
  text: '#012D73', // Primary text
  buttonText: '#FFFFFF', // Button text
};

export function HomeScreen() {
  return (
    <View style={styles.root}>
      {/* Ambient Background Orbs - Tinted Blue */}
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.container}>
        {/* Bento Block 1: Header */}
        <View style={[styles.bentoCard, styles.headerSection]}>
          <Text style={styles.heroEyebrow}>PACSMin Admin</Text>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.sub}>
            Scan participant QR codes and sync live updates to your dashboard.
          </Text>
        </View>

        {/* Bento Block 2: Main Actions (Asymmetrical Row) */}
        <View style={styles.actionSection}>
          <Pressable style={[styles.bentoCard, styles.actionPrimary]}>
            <Text style={styles.actionPrimaryText}>Start Scan</Text>
          </Pressable>
          <Pressable style={[styles.bentoCard, styles.actionSecondary]}>
            <Text style={styles.actionSecondaryText}>Enter UID</Text>
          </Pressable>
        </View>

        {/* Bento Block 3: Stats Grid (2x2 Flex Matrix) */}
        <View style={styles.statSection}>
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.statCard, styles.statCardHighlight]}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Absent</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Morning</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={[styles.bentoCard, styles.statCard]}>
              <Text style={styles.statLabel}>Afternoon</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
        </View>

        {/* Bento Block 4: Recent List */}
        <View style={[styles.bentoCard, styles.listSection]}>
          <Text style={styles.listTitle}>Recent Scans</Text>
          <Text style={styles.emptyText}>No scan data yet.</Text>
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
  // Ambient Orbs
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

  // Base Bento Card Style
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
  },
  bentoRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Section Layouts (Flex weights balance the vertical screen space)
  headerSection: {
    flex: 1.1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionSection: {
    flex: 1.2,
    flexDirection: 'row',
    gap: spacing.md,
  },
  statSection: {
    flex: 1.6,
    gap: spacing.md,
  },
  listSection: {
    flex: 0.8,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Header Details
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

  // Action Buttons
  actionPrimary: {
    flex: 1.3, // Asymmetrical width
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

  // Stats Grid
  statCard: {
    flex: 1,
    backgroundColor: newPalette.surface,
    borderColor: 'rgba(1, 45, 115, 0.12)', // Light blue border mapping
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardHighlight: {
    backgroundColor: newPalette.card, // White background to pop
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

  // List Text
  listTitle: {
    color: newPalette.text,
    fontFamily: typography.serif,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    color: newPalette.muted,
    fontFamily: typography.serif,
    fontSize: 14,
  },
});