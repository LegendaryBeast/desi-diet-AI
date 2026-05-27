import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions, ImageBackground, Image, Switch } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, mealPlanApi, mealTrackingApi, profileApi, medicineApi } from '../../lib/api';
import { fonts, colors } from '../../lib/theme';
import { Search, Crown, Play, ChevronLeft, ChevronRight, Check, Flame, Apple, Activity, Pill, Shield, Bot, ArrowLeft, Clock, Bell, ChefHat, ShoppingCart } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { HomeScreenSkeleton } from '../../components/SkeletonLoader';
import { useHaptics } from '../../hooks/useHaptics';
import { useSettingsStore } from '../../store/settings-store';
import ProModal from '../../components/ui/ProModal';
import { useTranslation } from '../../lib/translations';
import { useSubscription } from '../../context/SubscriptionContext';

const { width } = Dimensions.get('window');

// Dynamic colors bound to central theme
const design = {
  bg: colors.background,
  cardWhite: colors.surface,
  textBlack: colors.textPrimary,
  textGray: colors.textSecondary,
  lime: colors.primary,
  lightLime: '#EBF0D8',
  blue: colors.accent,
  darkBlue: '#4A8D9E',
  blackBtn: '#1C2123',
  yellow: '#FFD700'
};

const CustomBarChart = ({ consumed, target }: { consumed: number; target: number }) => {
  const bars = 24;
  const progressBars = Math.floor((consumed / target) * bars);
  
  return (
    <View style={styles.barChartContainer}>
      {Array.from({ length: bars }).map((_, i) => (
        <View 
          key={i} 
          style={[
            styles.bar, 
            { backgroundColor: i < progressBars ? design.lime : '#F0F0F0' }
          ]} 
        />
      ))}
    </View>
  );
};

const WaveChart = () => {
  return (
    <View style={styles.waveContainer}>
      <Svg height="60" width="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
        {/* Shadow/Light wave behind */}
        <Path 
          d="M0,40 Q25,10 50,30 T100,20 T150,40 T200,20 L200,60 L0,60 Z" 
          fill="none" 
          stroke={design.blue} 
          strokeWidth="1.5" 
          strokeOpacity="0.3"
        />
        {/* Main wave */}
        <Path 
          d="M0,35 Q25,15 50,35 T100,25 T150,45 T200,25" 
          fill="none" 
          stroke={design.blue} 
          strokeWidth="3" 
        />
        {/* Data point dot */}
        <Circle cx="50" cy="35" r="5" fill={design.blue} />
        <Circle cx="50" cy="35" r="2" fill={design.cardWhite} />
      </Svg>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const { strictMode, setStrictMode } = useSettingsStore();
  const { t, language } = useTranslation();
  const { isPro } = useSubscription();

  const { data: profileData, isPending: isProfilePending, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await profileApi.get()).data,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const { data: reportData, isPending: isReportPending, refetch: refetchReport } = useQuery({
    queryKey: ['nutrition_report'],
    queryFn: async () => (await reportsApi.nutrition()).data,
    retry: false,
  });

  const { data: planData, refetch: refetchPlan } = useQuery({
    queryKey: ['daily_plan', 0],
    queryFn: async () => (await mealPlanApi.daily(language, false, 0)).data,
  });

  const { data: trackingData, refetch: refetchTracking } = useQuery({
    queryKey: ['daily_tracking'],
    queryFn: async () => (await mealTrackingApi.today()).data,
  });

  const { data: medicineData, refetch: refetchMedicine } = useQuery({
    queryKey: ['medicine_reminders'],
    queryFn: async () => (await medicineApi.list()).data,
    retry: false,
  });

  // Refetch home dashboard data on screen focus to ensure logged meals update in real-time
  useFocusEffect(
    useCallback(() => {
      refetchReport();
      refetchPlan();
      refetchTracking();
      refetchProfile();
      refetchMedicine();
    }, [refetchReport, refetchPlan, refetchTracking, refetchProfile, refetchMedicine])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchReport(), refetchPlan(), refetchTracking(), refetchProfile(), refetchMedicine()]);
    setRefreshing(false);
  }, []);

  const medicines: any[] = Array.isArray(medicineData) ? medicineData : [];

  let consumedCals = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (Array.isArray(trackingData)) {
    trackingData.forEach((log: any) => {
      consumedCals += log.total_calories || 0;
      consumedProtein += log.macros?.protein_g || 0;
      consumedCarbs += log.macros?.carbs_g || 0;
      consumedFat += log.macros?.fat_g || 0;
    });
  }

  // No double-counting: consumed calories and macros are purely calculated from actual logged trackingData logs

  const targetCals = reportData?.targets?.target_calories || 2350;
  const userName = profileData?.profile?.name_en || profileData?.profile?.name_bn || 'Andreas';
  const weight = profileData?.profile?.weight_kg || 82;
  const height = profileData?.profile?.height_cm || 188;
  
  if (isProfilePending || isReportPending) return <HomeScreenSkeleton />;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={design.lime} />}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting}>Hi, {userName}!</Text>
          <Text style={styles.subGreeting}>Let's look at your daily activity overview.</Text>
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={styles.searchBar} 
            onPress={() => { haptics.light(); router.push('/foods'); }}
          >
            <Search size={16} color={design.textGray} />
            <Text style={[styles.searchBarText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('searchPlaceholder')}</Text>
          </TouchableOpacity>
          {!isPro && (
            <TouchableOpacity 
              style={styles.upgradeBtn}
              onPress={() => { haptics.light(); setShowProModal(true); }}
            >
              <Crown size={14} color={design.yellow} />
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* STRICT MODE UNIVERSAL TOGGLE REMOVED - ALWAYS ON GRAPH-RAG BY DEFAULT */}
      </View>

      {/* HERO CARD */}
      <TouchableOpacity activeOpacity={0.9} style={styles.heroCard} onPress={() => { haptics.light(); router.push('/(tabs)/meals'); }}>
        <View style={styles.heroGradient}>
          <Text style={styles.heroTitle}>Your Diet Plan{'\n'}Starts Here!</Text>
          
          <View style={styles.playBtnContainer}>
            <View style={styles.playBtn}>
              <Play fill={colors.primary} color={colors.primary} size={16} />
            </View>
            <Text style={styles.playText}>Explore Now</Text>
          </View>

          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLabel}>Join program with:</Text>
              <View style={styles.avatarsRow}>
                <View style={[styles.avatar, { backgroundColor: '#FFD1DC' }]} />
                <View style={[styles.avatar, { backgroundColor: '#B2F5EA', marginLeft: -10 }]} />
                <View style={[styles.avatar, { backgroundColor: '#FEEBC8', marginLeft: -10 }]} />
                <View style={styles.membersCount}>
                  <Text style={styles.membersText}>5.8k+</Text>
                  <Text style={styles.membersLabel}>Members</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={() => { haptics.light(); router.push('/(tabs)/meals'); }}>
              <Text style={styles.startBtnText}>{t('freeTrial')}</Text>
              <View style={styles.startBtnArrow}>
                <ChevronRight size={16} color={design.blackBtn} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* QUICK ACTIONS ROW */}
      <View style={styles.quickActionsContainer}>
        {[
          { label: t('foods'), icon: Apple, route: '/foods', bg: '#EBF0D8', color: colors.primary },
          { label: t('healthLog'), icon: Activity, route: '/health-log', bg: '#E2F2F5', color: colors.accent },
          { label: t('medicine'), icon: Pill, route: '/medicine', bg: '#FFF7E6', color: '#B06000' },
          { label: t('micros'), icon: Shield, route: '/target-details', bg: '#EAF7EE', color: colors.success },
          { label: language === 'bn' ? 'রান্নাঘর' : 'Cooker', icon: ChefHat, route: '/personal-cooker', bg: '#F0F8E2', color: '#3B7A2F' },
          { label: language === 'bn' ? 'কেনাকাটা' : 'Grocery', icon: ShoppingCart, route: '/grocery', bg: '#FFF0F5', color: '#C2185B' }
        ].map((act, i) => {
          const Icon = act.icon;
          return (
            <TouchableOpacity 
              key={i} 
              style={styles.quickActionBtn}
              onPress={() => { haptics.light(); router.push(act.route as any); }}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: act.bg }]}>
                <Icon size={18} color={act.color} />
              </View>
              <Text style={styles.quickActionLabel}>{act.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TWO COLUMN GRID FOR CARDS */}
      <View style={styles.grid}>
        
        {/* PUSTI AI COMPANION CARD */}
        <TouchableOpacity 
          activeOpacity={0.9}
          style={[styles.card, styles.pustiCard]}
          onPress={() => { haptics.light(); router.push('/(tabs)/chat'); }}
        >
          <View style={styles.pustiHeader}>
            <View style={styles.pustiIconBox}>
              <Bot size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.pustiTitle}>{t('pustiAi')}</Text>
              <Text style={[styles.pustiSub, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('companionTitle')}</Text>
            </View>
          </View>

          <Text style={[styles.pustiDesc, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>
            {t('companionDesc')}
          </Text>

          {/* Transparent theme illustration */}
          <View style={styles.pustiIllustrationContainer}>
            <Image 
              source={require('../../assets/pusti_bot.png')} 
              style={styles.pustiIllustrationImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.pustiInputBox}>
            <Text style={[styles.pustiInputPlaceholder, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('companionPlaceholder')}</Text>
            <View style={styles.pustiSendBtn}>
              <ChevronRight size={16} color={colors.white} />
            </View>
          </View>
        </TouchableOpacity>

        {/* CALORIES CARD */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.card, styles.whiteCard]}
          onPress={() => { haptics.light(); router.push('/target-details'); }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconWrapperBlack}>
                <Flame size={12} color={design.cardWhite} fill={design.cardWhite} />
              </View>
              <Text style={[styles.cardTitle, { fontFamily: language === 'bn' ? fonts.bnBold : fonts.bodyBold }]}>{t('calories')}</Text>
            </View>
            <Text style={styles.cardValueLarge}>{targetCals.toLocaleString()} <Text style={styles.cardUnit}>Kcal</Text></Text>
          </View>

          <View style={styles.cardSubHeader}>
            <Text style={[styles.cardSubText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('lackActivity')}</Text>
            <Text style={[styles.cardSubText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('dailyDose')}</Text>
          </View>

          <View style={styles.currentCalsContainer}>
            <Text style={styles.currentCals}>{Math.round(consumedCals).toLocaleString()}</Text>
            <Text style={styles.currentCalsUnit}> /Kcal</Text>
          </View>

          <View style={styles.barChartLabels}>
            <Text style={styles.barChartLabel}>0</Text>
            <Text style={styles.barChartLabel}>{targetCals.toLocaleString()}</Text>
          </View>
          <CustomBarChart consumed={consumedCals} target={targetCals} />

          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(consumedCarbs)} <Text style={[styles.macroUnit, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('gram')}</Text></Text>
              <Text style={[styles.macroName, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('carbs')}</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(consumedProtein)} <Text style={[styles.macroUnit, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('gram')}</Text></Text>
              <Text style={[styles.macroName, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('proteins')}</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(consumedFat)} <Text style={[styles.macroUnit, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('gram')}</Text></Text>
              <Text style={[styles.macroName, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('fats')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* WEIGHT CARD */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.card, styles.whiteCard]}
          onPress={() => { haptics.light(); router.push('/health-log'); }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconWrapperBlack}>
                <Text style={{color: design.cardWhite, fontSize: 10, fontWeight: 'bold'}}>↔</Text>
              </View>
              <Text style={[styles.cardTitle, { fontFamily: language === 'bn' ? fonts.bnBold : fonts.bodyBold }]}>{t('weight')}</Text>
            </View>
            <Text style={styles.cardValueLarge}>{height} <Text style={styles.cardUnit}>Cm</Text></Text>
          </View>

          <View style={styles.cardSubHeader}>
            <Text style={[styles.cardSubText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('weightTarget')}</Text>
            <Text style={[styles.cardSubText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('tallBody')}</Text>
          </View>

          <WaveChart />

          <View style={styles.weightFooter}>
            <Text style={styles.currentWeight}>{weight}<Text style={styles.weightUnit}>kg</Text></Text>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={[styles.weightNote, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('ofWeekly')}</Text>
              <Text style={[styles.weightNote, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('completed')}</Text>
              <Text style={[styles.keepItUp, { fontFamily: language === 'bn' ? fonts.bnBold : fonts.bodyBold }]}>{t('keepItUp')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* MEDICINE REMINDER CARD */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, styles.medicineCard]}
          onPress={() => { haptics.light(); router.push('/medicine'); }}
        >
          {/* Card Header */}
          <View style={styles.medicineCardHeader}>
            <View style={styles.medicineHeaderLeft}>
              <View style={styles.medicineIconBox}>
                <Pill size={18} color='#B06000' />
              </View>
              <View>
                <Text style={[styles.medicineCardTitle, { fontFamily: language === 'bn' ? fonts.bnBold : fonts.bodyBold }]}>{t('medReminderTitle')}</Text>
                <Text style={styles.medicineCardSubtitle}>{t('medReminderSub')}</Text>
              </View>
            </View>
            <View style={styles.medicineBadge}>
              <Text style={styles.medicineBadgeText}>{medicines.length}</Text>
            </View>
          </View>

          {/* Medicine List */}
          {medicines.length === 0 ? (
            <View style={styles.medicineEmpty}>
              <Pill size={28} color={colors.textSecondary} />
              <Text style={[styles.medicineEmptyText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('noMedAdded')}</Text>
              <Text style={[styles.medicineEmptyAdd, { fontFamily: language === 'bn' ? fonts.bnBold : fonts.bodyBold }]}>{t('addMed')}</Text>
            </View>
          ) : (
            <View style={styles.medicineList}>
              {medicines.slice(0, 3).map((med: any, idx: number) => (
                <View key={med.id || idx} style={styles.medicineItem}>
                  <View style={styles.medicineItemLeft}>
                    <View style={styles.medicineDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medicineName} numberOfLines={1}>
                        {med.name}{med.dose ? ` — ${med.dose}` : ''}
                      </Text>
                      {med.with_food !== undefined && (
                        <Text style={[styles.medicineInstruction, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>
                          {med.with_food ? t('withFood') : t('emptyStomach')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.medicineTimesRow}>
                    {(Array.isArray(med.times) ? med.times : []).slice(0, 2).map((t: string, ti: number) => (
                      <View key={ti} style={styles.medicineTimeBadge}>
                        <Clock size={9} color='#B06000' />
                        <Text style={styles.medicineTimeBadgeText}>{t}</Text>
                      </View>
                    ))}
                    {Array.isArray(med.times) && med.times.length > 2 && (
                      <View style={styles.medicineTimeBadge}>
                        <Text style={styles.medicineTimeBadgeText}>+{med.times.length - 2}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {medicines.length > 3 && (
                <Text style={[styles.medicineMoreText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>
                  +{medicines.length - 3} {t('moreMeds')}
                </Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.medicineFooter}>
            <Bell size={12} color='#B06000' />
            <Text style={[styles.medicineFooterText, { fontFamily: language === 'bn' ? fonts.bn : fonts.body }]}>{t('manageMed')}</Text>
            <ChevronRight size={14} color='#B06000' />
          </View>
        </TouchableOpacity>

        <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: design.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  
  header: { marginBottom: 24 },
  headerTitleContainer: { marginBottom: 16 },
  greeting: { fontFamily: fonts.bodyBold, fontSize: 32, color: design.textBlack, letterSpacing: -0.5 },
  subGreeting: { fontFamily: fonts.body, fontSize: 14, color: design.textGray, marginTop: 4 },
  
  headerControls: { flexDirection: 'row', gap: 12 },
  searchBar: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, 
    borderRadius: 30, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', shadowColor: colors.primary, 
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 
  },
  searchBarText: { flex: 1, marginLeft: 8, fontFamily: fonts.bn, fontSize: 12, color: design.textGray },
  upgradeBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: design.blackBtn, 
    borderRadius: 30, paddingHorizontal: 16, gap: 6 
  },
  upgradeText: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 13 },

  heroCard: { 
    backgroundColor: colors.glass, borderRadius: 28, overflow: 'hidden', marginBottom: 20,
    height: 300, padding: 24, justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: 'rgba(167, 201, 36, 0.4)',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5
  },
  heroGradient: { flex: 1, justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.bodyBold, fontSize: 36, color: colors.textPrimary, lineHeight: 40, letterSpacing: -1 },
  playBtnContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(167, 201, 36, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167, 201, 36, 0.3)' },
  playText: { color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 16 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroFooterLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body, marginBottom: 6 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(167, 201, 36, 0.2)' },
  membersCount: { marginLeft: 8 },
  membersText: { color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 18 },
  membersLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.body },
  startBtn: { backgroundColor: colors.primary, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6, paddingVertical: 6, gap: 12 },
  startBtnText: { color: design.cardWhite, fontFamily: fonts.bodyMedium, fontSize: 14 },
  startBtnArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: design.cardWhite, alignItems: 'center', justifyContent: 'center' },

  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.2)',
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  quickActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 10,
    color: colors.textPrimary,
  },

  grid: { gap: 20 },
  card: { borderRadius: 28, padding: 24, borderWidth: 1.5, borderColor: 'rgba(167, 201, 36, 0.3)', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  whiteCard: { backgroundColor: colors.glass },
  
  pustiCard: {
    backgroundColor: 'rgba(167, 201, 36, 0.05)',
    borderColor: 'rgba(167, 201, 36, 0.35)',
  },
  pustiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pustiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  pustiTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  pustiSub: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pustiDesc: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
    opacity: 0.85,
    marginBottom: 16,
  },
  pustiIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 16,
    opacity: 0.9,
  },
  pustiIllustrationImage: {
    width: 100,
    height: 100,
  },
  pustiInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
  },
  pustiInputPlaceholder: {
    flex: 1,
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pustiSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrapperBlack: { width: 24, height: 24, borderRadius: 12, backgroundColor: design.blackBtn, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.body, fontSize: 18, color: design.textBlack },
  cardValueLarge: { fontFamily: fonts.bodyBold, fontSize: 18, color: design.textBlack },
  cardUnit: { fontSize: 12, fontFamily: fonts.body },
  
  cardSubHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cardSubText: { fontFamily: fonts.body, fontSize: 11, color: design.textGray },
  
  currentCalsContainer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 16 },
  currentCals: { fontFamily: fonts.body, fontSize: 44, color: design.textBlack, lineHeight: 48, letterSpacing: -1 },
  currentCalsUnit: { fontFamily: fonts.body, fontSize: 16, color: design.textGray, marginBottom: 8 },
  
  barChartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  barChartLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: design.textBlack },
  barChartContainer: { flexDirection: 'row', gap: 3, height: 40 },
  bar: { flex: 1, borderRadius: 2 },
  
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  macroItem: {},
  macroVal: { fontFamily: fonts.bodyBold, fontSize: 18, color: design.textBlack },
  macroUnit: { fontSize: 11, color: design.textGray, fontFamily: fonts.body },
  macroName: { fontSize: 11, color: design.textBlack, fontFamily: fonts.body, marginTop: 2 },

  waveContainer: { height: 80, marginTop: 20 },
  weightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -10 },
  currentWeight: { fontFamily: fonts.body, fontSize: 56, color: design.textBlack, lineHeight: 60, letterSpacing: -2 },
  weightUnit: { fontSize: 20, fontFamily: fonts.body },
  weightNote: { fontFamily: fonts.body, fontSize: 10, color: design.textGray, textAlign: 'right' },
  keepItUp: { fontFamily: fonts.bodyBold, fontSize: 12, color: design.textBlack, marginTop: 2 },

  strictModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 14,
    marginBottom: 8,
  },
  strictModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  strictModeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strictModeIconBoxActive: {
    backgroundColor: colors.primary,
  },
  strictModeTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  strictModeSubtitle: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Medicine Card ───────────────────────────────────────────────────────────
  medicineCard: {
    backgroundColor: '#FFF7E6',
    borderColor: 'rgba(176, 96, 0, 0.25)',
  },
  medicineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  medicineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medicineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(176, 96, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(176, 96, 0, 0.2)',
  },
  medicineCardTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  medicineCardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  medicineBadge: {
    backgroundColor: '#B06000',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  medicineBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  medicineEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  medicineEmptyText: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
  },
  medicineEmptyAdd: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: '#B06000',
  },
  medicineList: {
    gap: 10,
    marginBottom: 14,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(176, 96, 0, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(176, 96, 0, 0.12)',
  },
  medicineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  medicineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B06000',
    flexShrink: 0,
  },
  medicineName: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  medicineInstruction: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  medicineTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  medicineTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(176, 96, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(176, 96, 0, 0.2)',
  },
  medicineTimeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#B06000',
  },
  medicineMoreText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: '#B06000',
    textAlign: 'center',
    marginTop: 4,
  },
  medicineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(176, 96, 0, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(176, 96, 0, 0.15)',
  },
  medicineFooterText: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: '#B06000',
  },

});
