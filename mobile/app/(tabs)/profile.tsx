import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  Alert, Switch, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { profileApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useSettingsStore } from '../../store/settings-store';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import {
  User, Scale, TrendingUp, HeartPulse, LogOut,
  Pill, Bell, ChevronRight, Activity, Shield, Apple, BarChart3,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { language, setLanguage, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await profileApi.get()).data,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProfile();
    setRefreshing(false);
  }, [refetchProfile]);

  const handleLogout = () => {
    Alert.alert('প্রস্থান', 'আপনি কি নিশ্চিত যে প্রস্থান করতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'প্রস্থান', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/welcome'); },
      },
    ]);
  };

  const profile = profileData?.profile;
  const targets = profileData?.targets;

  const GOAL_LABELS: Record<string, string> = {
    weight_loss: 'ওজন কমানো', weight_gain: 'ওজন বাড়ানো',
    maintain: 'ওজন ধরে রাখা', muscle_gain: 'মাংসপেশি বাড়ানো',
  };
  const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: 'কম', light: 'মাঝারি', moderate: 'ভালো', active: 'বেশি',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar & Name ──────────────────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>
            {profile?.name_bn?.[0] || profile?.name_en?.[0] || 'খ'}
          </Text>
        </View>
        <Text style={styles.profileName}>{profile?.name_bn || profile?.name_en || 'ব্যবহারকারী'}</Text>
        <Text style={styles.profileMeta}>
          {profile?.age} বছর · {profile?.gender === 'male' ? 'পুরুষ' : 'নারী'}
        </Text>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push('/(auth)/onboarding/step-1')}
        >
          <Text style={styles.editProfileText}>প্রোফাইল সম্পাদনা করুন</Text>
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      {profile && (
        <View style={styles.statsRow}>
          {[
            { icon: Scale, label: 'ওজন', value: `${profile.weight_kg}`, unit: ' kg', color: colors.primary },
            { icon: TrendingUp, label: 'উচ্চতা', value: `${profile.height_cm}`, unit: ' cm', color: colors.accent },
            { icon: HeartPulse, label: 'ক্যালরি', value: `${targets?.target_calories || '--'}`, unit: '', color: colors.success },
          ].map(({ icon: Icon, label, value, unit, color }) => (
            <View key={label} style={styles.statCard}>
              <Icon size={20} color={color} />
              <Text style={styles.statValue}>{value}<Text style={styles.statUnit}>{unit}</Text></Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Quick Tools Section ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>অ্যাপ টুলস ও সেবাসমূহ</Text>
        <View style={styles.detailsCard}>
          <TouchableOpacity style={styles.toolRow} onPress={() => router.push('/foods')}>
            <View style={styles.toolRowLeft}>
              <View style={[styles.toolIconBox, { backgroundColor: '#EBF0D8' }]}>
                <Apple size={18} color={colors.primary} />
              </View>
              <Text style={styles.toolLabel}>খাবারের ডাটাবেজ (Foods)</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolRow} onPress={() => router.push('/health-log')}>
            <View style={styles.toolRowLeft}>
              <View style={[styles.toolIconBox, { backgroundColor: '#E2F2F5' }]}>
                <Activity size={18} color={colors.accent} />
              </View>
              <Text style={styles.toolLabel}>স্বাস্থ্য ট্র্যাকার (Health Log)</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolRow} onPress={() => router.push('/medicine')}>
            <View style={styles.toolRowLeft}>
              <View style={[styles.toolIconBox, { backgroundColor: '#FFF7E6' }]}>
                <Pill size={18} color="#B06000" />
              </View>
              <Text style={styles.toolLabel}>ওষুধের সময়সূচী (Medicine)</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toolRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/target-details')}>
            <View style={styles.toolRowLeft}>
              <View style={[styles.toolIconBox, { backgroundColor: '#EAF7EE' }]}>
                <Shield size={18} color={colors.success} />
              </View>
              <Text style={styles.toolLabel}>পুষ্টি উপাদানসমূহ (Micronutrients)</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Profile Details ───────────────────────────────────────────────── */}
      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>প্রোফাইল তথ্য</Text>
          <View style={styles.detailsCard}>
            <DetailRow label="লক্ষ্য" value={GOAL_LABELS[profile.goal] || profile.goal} />
            <DetailRow label="কর্ম তৎপরতা" value={ACTIVITY_LABELS[profile.activity_level] || profile.activity_level} />
            <DetailRow
              label="স্বাস্থ্য অবস্থা"
              value={(profile.medical_conditions || []).join(', ') || 'কোনো তথ্য নেই'}
            />
            {targets && (
              <>
                <DetailRow label="BMI" value={targets.bmi?.toFixed(1)} />
                <DetailRow label="BMI অবস্থা" value={targets.bmi_category || ''} last />
              </>
            )}
          </View>
        </View>
      )}

      {/* ── Notifications Settings ────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bell size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>বিজ্ঞপ্তি সেটিংস</Text>
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>খাবারের অনুস্মারক</Text>
              <Text style={styles.switchSub}>পরিকল্পনা অনুযায়ী বিজ্ঞপ্তি পাবেন</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* ── Language Toggle ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ভাষা</Text>
        <View style={styles.langRow}>
          {(['bn', 'en'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langBtn, language === lang && styles.langBtnActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                {lang === 'bn' ? 'বাংলা' : 'English'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Logout ────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={20} color={colors.error} />
        <Text style={styles.logoutText}>প্রস্থান করুন</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },

  avatarSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: spacing.xl,
    backgroundColor: colors.glass,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(167, 201, 36, 0.25)',
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3, borderColor: colors.primary + '40',
  },
  avatarLetter: { fontFamily: fonts.display, fontSize: 36, color: colors.white },
  profileName: { fontFamily: fonts.bnBold, fontSize: 26, color: colors.textPrimary },
  profileMeta: { fontFamily: fonts.bn, fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '18', borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  editProfileText: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.primary },

  statsRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: colors.glass, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary },
  statUnit: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary },
  statLabel: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.sm },

  detailsCard: { 
    backgroundColor: colors.glass, borderRadius: radius.lg, 
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', 
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    overflow: 'hidden' 
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 201, 36, 0.15)',
  },
  detailLabel: { fontFamily: fonts.bn, fontSize: 15, color: colors.textSecondary },
  detailValue: { fontFamily: fonts.bnBold, fontSize: 15, color: colors.textPrimary },

  toolRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 201, 36, 0.15)',
  },
  toolRowLeft: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  toolIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toolLabel: {
    fontFamily: fonts.bnBold, fontSize: 14, color: colors.textPrimary,
  },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  switchLabel: { fontFamily: fonts.bnBold, fontSize: 15, color: colors.textPrimary },
  switchSub: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  langRow: { flexDirection: 'row', gap: spacing.md },
  langBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center', backgroundColor: colors.glass, borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.2)' },
  langBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langText: { fontFamily: fonts.bnBold, fontSize: 15, color: colors.textSecondary },
  langTextActive: { color: colors.white },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.error + '12', borderWidth: 1, borderColor: colors.error + '30',
  },
  logoutText: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.error },
});
