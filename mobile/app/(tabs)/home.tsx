import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions, TextInput, ImageBackground } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, mealPlanApi, mealTrackingApi, profileApi } from '../../lib/api';
import { fonts } from '../../lib/theme';
import { Search, Crown, Play, ChevronLeft, ChevronRight, Check, Flame } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { HomeScreenSkeleton } from '../../components/SkeletonLoader';
import { useHaptics } from '../../hooks/useHaptics';

const { width } = Dimensions.get('window');

// Exact colors from the design
const design = {
  bg: '#EAF3F5',
  cardWhite: '#FFFFFF',
  textBlack: '#1C2123',
  textGray: '#8C979A',
  lime: '#A7C924',
  lightLime: '#EAF0D1',
  blue: '#7ABDD1',
  darkBlue: '#2A6678',
  blackBtn: '#000000',
  yellow: '#E4EB26'
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
    queryKey: ['daily_plan'],
    queryFn: async () => (await mealPlanApi.daily('bn')).data,
  });

  const { data: trackingData, refetch: refetchTracking } = useQuery({
    queryKey: ['daily_tracking'],
    queryFn: async () => (await mealTrackingApi.today()).data,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchReport(), refetchPlan(), refetchTracking(), refetchProfile()]);
    setRefreshing(false);
  }, []);

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

  const plannedMeals = planData?.plan_data?.meals || [];
  const completedSlots = (planData?.completed_slots && typeof planData.completed_slots === 'string' 
    ? JSON.parse(planData.completed_slots) 
    : planData?.completed_slots) || [];
    
  plannedMeals.forEach((meal: any) => {
    if (completedSlots.includes(meal.slot)) {
      consumedCals += meal.target_calories || 0;
      consumedProtein += (meal.target_calories * 0.2) / 4;
      consumedCarbs += (meal.target_calories * 0.5) / 4;
      consumedFat += (meal.target_calories * 0.3) / 9;
    }
  });

  const targetCals = reportData?.targets?.target_calories || 2350;
  
  if (isProfilePending || isReportPending) return <HomeScreenSkeleton />;

  const userName = profileData?.profile?.name_en || profileData?.profile?.name_bn || 'Andreas';
  const weight = profileData?.profile?.weight_kg || 82;
  const height = profileData?.profile?.height_cm || 188;

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
          <View style={styles.searchBar}>
            <Search size={16} color={design.textGray} />
            <TextInput 
              placeholder="Search for healthy metrics" 
              placeholderTextColor={design.textGray}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Crown size={14} color={design.yellow} />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* HERO CARD */}
      <TouchableOpacity activeOpacity={0.9} style={styles.heroCard}>
        {/* Placeholder for background image with gradient overlay */}
        <View style={styles.heroGradient}>
          <Text style={styles.heroTitle}>Your Diet Plan{'\n'}Starts Here!</Text>
          
          <View style={styles.playBtnContainer}>
            <View style={styles.playBtn}>
              <Play fill={design.cardWhite} color={design.cardWhite} size={16} />
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
            <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/(tabs)/diet-plan')}>
              <Text style={styles.startBtnText}>Start Free Trial</Text>
              <View style={styles.startBtnArrow}>
                <ChevronRight size={16} color={design.blackBtn} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* TWO COLUMN GRID FOR CARDS */}
      <View style={styles.grid}>
        
        {/* HYDRATION CARD (Right in design, putting it here for mobile) */}
        <View style={[styles.card, styles.hydrationCard]}>
          <Text style={styles.hydrationTitle}>Hydration Status:</Text>
          <Text style={styles.hydrationSub}>Drinking enough water daily boosts your energy and sharpens your focus.</Text>
          
          <View style={styles.cupsContainer}>
            {Array.from({length: 21}).map((_, i) => (
              <View key={i} style={[styles.cup, { backgroundColor: i < 14 ? design.darkBlue : '#FFFFFF40' }]} />
            ))}
          </View>

          <View style={styles.wellDoneBadge}>
            <Text style={styles.wellDoneText}>Well Done 👍</Text>
          </View>

          <View style={styles.hydrationFooter}>
            <View style={styles.toggleGroup}>
              <View style={[styles.toggleBtn, styles.toggleActive]}><Text style={styles.toggleTextActive}>D</Text></View>
              <View style={styles.toggleBtn}><Text style={styles.toggleText}>W</Text></View>
              <View style={styles.toggleBtn}><Text style={styles.toggleText}>M</Text></View>
            </View>
            <View>
              <Text style={styles.hydrationAmount}>2.15L</Text>
              <Text style={styles.hydrationUnit}>/Day</Text>
            </View>
          </View>
        </View>

        {/* CALORIES CARD */}
        <View style={[styles.card, styles.whiteCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconWrapperBlack}>
                <Flame size={12} color={design.cardWhite} fill={design.cardWhite} />
              </View>
              <Text style={styles.cardTitle}>Calories</Text>
            </View>
            <Text style={styles.cardValueLarge}>{targetCals.toLocaleString()} <Text style={styles.cardUnit}>Kcal</Text></Text>
          </View>

          <View style={styles.cardSubHeader}>
            <Text style={styles.cardSubText}>Lack of physical activity</Text>
            <Text style={styles.cardSubText}>Daily dose</Text>
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
              <Text style={styles.macroVal}>{Math.round(consumedCarbs)} <Text style={styles.macroUnit}>Gram</Text></Text>
              <Text style={styles.macroName}>Carbohydrates</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(consumedProtein)} <Text style={styles.macroUnit}>Gram</Text></Text>
              <Text style={styles.macroName}>Proteins</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{Math.round(consumedFat)} <Text style={styles.macroUnit}>Gram</Text></Text>
              <Text style={styles.macroName}>Fats</Text>
            </View>
          </View>
        </View>

        {/* WEIGHT CARD */}
        <View style={[styles.card, styles.whiteCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconWrapperBlack}>
                <Text style={{color: design.cardWhite, fontSize: 10, fontWeight: 'bold'}}>↔</Text>
              </View>
              <Text style={styles.cardTitle}>Weight</Text>
            </View>
            <Text style={styles.cardValueLarge}>{height} <Text style={styles.cardUnit}>Cm</Text></Text>
          </View>

          <View style={styles.cardSubHeader}>
            <Text style={styles.cardSubText}>Healthy weight is 68 Kg - 84 Kg</Text>
            <Text style={styles.cardSubText}>Tall body</Text>
          </View>

          <WaveChart />

          <View style={styles.weightFooter}>
            <Text style={styles.currentWeight}>{weight}<Text style={styles.weightUnit}>kg</Text></Text>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.weightNote}>Of the weekly</Text>
              <Text style={styles.weightNote}>plan completed</Text>
              <Text style={styles.keepItUp}>Keep it up!</Text>
            </View>
          </View>
        </View>

        {/* SLEEP CARD */}
        <View style={[styles.card, styles.whiteCard]}>
          <View style={styles.sleepAvatars}>
             <View style={[styles.avatarSm, { backgroundColor: '#FFD1DC' }]} />
             <View style={[styles.avatarSm, { backgroundColor: '#B2F5EA', marginLeft: -8 }]} />
             <View style={[styles.avatarSm, { backgroundColor: '#FEEBC8', marginLeft: -8 }]} />
          </View>
          <Text style={styles.sleepTitle}>Experience the Goodness{'\n'}of Deep Sleep</Text>
          
          <View style={styles.deepSleepBadge}>
            <Text style={{color: '#FFF', fontSize: 10}}>🌙</Text>
            <Text style={styles.deepSleepText}>Deep sleep</Text>
          </View>

          <Text style={styles.sleepDesc}>Discover tips and techniques for better, deeper sleep. Wake up refreshed and experience the true benefits of restful nights.</Text>
          
          <View style={styles.sleepFooter}>
            <Text style={styles.sleepProgress}>2<Text style={styles.sleepProgressTotal}>/5</Text></Text>
            <View style={styles.sleepArrows}>
              <TouchableOpacity style={styles.arrowBtn}><ChevronLeft size={14} color={design.textBlack} /></TouchableOpacity>
              <TouchableOpacity style={styles.arrowBtn}><ChevronRight size={14} color={design.textBlack} /></TouchableOpacity>
            </View>
          </View>
        </View>

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
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: design.cardWhite, 
    borderRadius: 30, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 
  },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.body, fontSize: 14, color: design.textBlack },
  upgradeBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: design.blackBtn, 
    borderRadius: 30, paddingHorizontal: 16, gap: 6 
  },
  upgradeText: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 13 },

  heroCard: { 
    backgroundColor: '#A8C9C4', borderRadius: 28, overflow: 'hidden', marginBottom: 20,
    height: 300, padding: 24, justifyContent: 'space-between'
  },
  heroGradient: { flex: 1, justifyContent: 'space-between' },
  heroTitle: { fontFamily: fonts.body, fontSize: 36, color: design.cardWhite, lineHeight: 40, letterSpacing: -1 },
  playBtnContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  playText: { color: design.cardWhite, fontFamily: fonts.body, fontSize: 16 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroFooterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: fonts.body, marginBottom: 6 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#A8C9C4' },
  membersCount: { marginLeft: 8 },
  membersText: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 18 },
  membersLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: fonts.body },
  startBtn: { backgroundColor: design.blackBtn, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6, paddingVertical: 6, gap: 12 },
  startBtnText: { color: design.cardWhite, fontFamily: fonts.bodyMedium, fontSize: 14 },
  startBtnArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: design.cardWhite, alignItems: 'center', justifyContent: 'center' },

  grid: { gap: 20 },
  card: { borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  whiteCard: { backgroundColor: design.cardWhite },
  
  hydrationCard: { backgroundColor: design.blue },
  hydrationTitle: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 14, opacity: 0.9 },
  hydrationSub: { color: design.cardWhite, fontFamily: fonts.body, fontSize: 11, opacity: 0.7, marginTop: 4, maxWidth: '70%' },
  cupsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20, maxWidth: 200 },
  cup: { width: 14, height: 18, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  wellDoneBadge: { backgroundColor: design.yellow, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 20 },
  wellDoneText: { color: design.textBlack, fontFamily: fonts.bodyBold, fontSize: 12 },
  hydrationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24 },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: design.cardWhite },
  toggleText: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 14 },
  toggleTextActive: { color: design.textBlack, fontFamily: fonts.bodyBold, fontSize: 14 },
  hydrationAmount: { color: design.cardWhite, fontFamily: fonts.body, fontSize: 36, lineHeight: 40, textAlign: 'right' },
  hydrationUnit: { color: design.cardWhite, fontFamily: fonts.body, fontSize: 14, textAlign: 'right', opacity: 0.8 },

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

  sleepAvatars: { flexDirection: 'row', marginBottom: 16 },
  avatarSm: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: design.cardWhite },
  sleepTitle: { fontFamily: fonts.body, fontSize: 22, color: design.textBlack, lineHeight: 28 },
  deepSleepBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: design.blackBtn, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6, marginTop: 16 },
  deepSleepText: { color: design.cardWhite, fontFamily: fonts.bodyBold, fontSize: 11 },
  sleepDesc: { fontFamily: fonts.body, fontSize: 12, color: design.textGray, lineHeight: 18, marginTop: 16 },
  sleepFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  sleepProgress: { fontFamily: fonts.body, fontSize: 24, color: design.textBlack },
  sleepProgressTotal: { fontSize: 14, color: design.textGray },
  sleepArrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }
});
