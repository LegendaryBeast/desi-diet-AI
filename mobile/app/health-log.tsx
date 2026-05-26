import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../lib/theme';
import { ArrowLeft, Hourglass, Sparkles } from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

export default function HealthLogScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { haptics.light(); router.back(); }}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>স্বাস্থ্য ট্র্যাকার (Health Log)</Text>
          <Text style={styles.headerSubtitle}>পরবর্তী সংস্করণ আসছে</Text>
        </View>
      </View>

      {/* GORGEOUS COMING SOON CARD */}
      <View style={styles.centerWrapper}>
        <View style={styles.comingSoonCard}>
          <View style={styles.iconBackground}>
            <Hourglass size={48} color={colors.primary} strokeWidth={1.5} />
          </View>
          
          <View style={styles.titleRow}>
            <Sparkles size={20} color="#FF6B35" />
            <Text style={styles.titleText}>COMING SOON</Text>
            <Sparkles size={20} color="#FF6B35" />
          </View>
          
          <Text style={styles.mainHeading}>কাজ চলছে!</Text>
          
          <Text style={styles.descriptionBn}>
            খুব শীঘ্রই এই ফিচারটি আপনাদের জন্য উন্মুক্ত করা হবে। এখানে আপনি আপনার দৈনন্দিন ওজন, ব্লাড প্রেসার, রক্তে শর্করা এবং অন্যান্য গুরুত্বপূর্ণ স্বাস্থ্য তথ্য ট্রাক ও বিশ্লেষণ করতে পারবেন। 📊✨
          </Text>

          <Text style={styles.descriptionEn}>
            We are working hard to bring this feature to life! Soon, you'll be able to easily track, analyze, and visualize your daily weight, blood pressure, sugar levels, and overall clinical trends.
          </Text>

          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => { haptics.medium(); router.back(); }}
          >
            <Text style={styles.backHomeText}>ফিরে যান (Go Back)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 201, 36, 0.15)',
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 201, 36, 0.12)',
    marginRight: 12,
  },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontFamily: fonts.bnBold, fontSize: 18, color: colors.textPrimary },
  headerSubtitle: { fontFamily: fonts.bn, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(167, 201, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FF6B35',
    letterSpacing: 2,
  },
  mainHeading: {
    fontFamily: fonts.bnBold,
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  descriptionBn: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  descriptionEn: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.8,
  },
  backHomeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  backHomeText: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.white,
  },
});
