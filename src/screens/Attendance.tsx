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

export function ExploreScreen() {
  return (
    <View style={styles.root}>
      {/* Ambient Background Orbs */}
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.container}>
        {/* Header Bento */}
        <View style={[styles.bentoCard, styles.headerSection]}>
          <Text style={styles.heroEyebrow}>Food Tracker</Text>
          <Text style={styles.title}>Food Choice</Text>
          <Text style={styles.sub}>
            Quickly verify each participant's meal preference while checking tickets.
          </Text>
        </View>

        {/* Actions Bento Row (Asymmetrical) */}
        <View style={styles.actionSection}>
          <Pressable style={[styles.bentoCard, styles.actionPrimary]}>
            <Text style={styles.actionPrimaryText}>Scan QR</Text>
          </Pressable>
          <Pressable style={[styles.bentoCard, styles.actionSecondary]}>
            <Text style={styles.actionSecondaryText}>Manual UID</Text>
          </Pressable>
        </View>

        {/* Result Bento */}
        <View style={[styles.bentoCard, styles.resultSection]}>
          <Text style={styles.sectionTitle}>Latest Result</Text>
          <Text style={styles.emptyText}>Scan a participant to see their food choice.</Text>
        </View>

        {/* Counter Bento */}
        <View style={[styles.bentoCard, styles.counterSection]}>
          <Text style={styles.sectionTitle}>Scanned Session</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>0 records</Text>
          </View>
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
    flex: 1.1,
    justifyContent: 'center',
  },
  actionSection: {
    flex: 1.2,
    flexDirection: 'row',
    gap: spacing.md,
    padding: 0, // Reset padding for row
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
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

  // Custom Badge
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: newPalette.surface,
    borderColor: 'rgba(1, 45, 115, 0.12)',
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
});