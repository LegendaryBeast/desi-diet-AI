import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  User, Utensils, HeartPulse, Pill, Search, FileBarChart,
  CheckCircle2, XCircle, AlertCircle, ChefHat,
} from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';

interface ToolResultCardProps {
  result: Record<string, any>;
  isBn?: boolean;
}

export const ToolResultCard = ({ result, isBn = true }: ToolResultCardProps) => {
  const tool = String(result.tool || '');
  const data = (result.result || {}) as Record<string, any>;
  const success = data.success !== false;

  if (!success && data.error) {
    return (
      <View style={[styles.cardBase, styles.errorCard]}>
        <XCircle size={14} color={colors.error} />
        <Text style={styles.errorText}>{String(data.error)}</Text>
      </View>
    );
  }

  switch (tool) {
    case 'get_profile':
      return <ProfileCard data={data} isBn={isBn} />;
    case 'get_meal_plan':
      return <MealPlanCard data={data} isBn={isBn} />;
    case 'log_health':
      return (
        <View style={[styles.cardBase, styles.successCard]}>
          <HeartPulse size={14} color={colors.success} />
          <Text style={styles.successText}>
            {isBn ? 'স্বাস্থ্য তথ্য সংরক্ষিত হয়েছে' : 'Health data saved'}
          </Text>
        </View>
      );
    case 'get_health_logs':
      return <HealthLogCard data={data} isBn={isBn} />;
    case 'get_medicine_reminders':
      return <MedicineListCard data={data} isBn={isBn} />;
    case 'add_medicine_reminder':
      return (
        <View style={[styles.cardBase, styles.infoCard]}>
          <Pill size={14} color={colors.accent} />
          <Text style={styles.infoText}>
            {isBn ? `⏰ ${data.name} যোগ করা হয়েছে` : `⏰ ${data.name} added`}
          </Text>
        </View>
      );
    case 'delete_medicine_reminder':
      return (
        <View style={[styles.cardBase, styles.infoCard]}>
          <Pill size={14} color={colors.accent} />
          <Text style={styles.infoText}>
            {isBn ? '💊 রিমাইন্ডার মুছে ফেলা হয়েছে' : '💊 Reminder deleted'}
          </Text>
        </View>
      );
    case 'search_food':
      return <FoodSearchCard data={data} isBn={isBn} />;
    case 'get_food_safety':
      return <FoodSafetyCard data={data} isBn={isBn} />;
    case 'get_health_report':
      return <HealthReportCard data={data} isBn={isBn} />;
    case 'mark_meal_complete':
      return (
        <View style={[styles.cardBase, styles.successCard]}>
          <CheckCircle2 size={14} color={colors.success} />
          <Text style={styles.successText}>
            {isBn
              ? `${data.slot === 'breakfast' ? 'সকালের নাস্তা' : data.slot === 'lunch' ? 'দুপুরের খাবার' : data.slot === 'dinner' ? 'রাতের খাবার' : 'স্ন্যাক'} ${data.completed ? 'সম্পূর্ণ হয়েছে' : 'আনমার্ক করা হয়েছে'}`
              : `${data.slot} ${data.completed ? 'marked complete' : 'unmarked'}`}
          </Text>
        </View>
      );
    case 'update_profile':
      return (
        <View style={[styles.cardBase, styles.infoCard]}>
          <CheckCircle2 size={14} color={colors.accent} />
          <Text style={styles.infoText}>
            {isBn ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated'}
          </Text>
        </View>
      );
    case 'personal_cooker_chat':
      return <PersonalCookerCard data={data} isBn={isBn} />;
    default:
      return null;
  }
};

/* ── Profile Card ─────────────────────────────────────────────── */

const ProfileCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const profile = data as Record<string, any>;
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent + '18' }]}>
          <User size={14} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>{isBn ? 'প্রোফাইল তথ্য' : 'Profile Info'}</Text>
      </View>
      <View style={styles.profileGrid}>
        {profile.age != null && (
          <View style={styles.profileChip}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'বয়স:' : 'Age:'}</Text> {String(profile.age)}
            </Text>
          </View>
        )}
        {profile.gender != null && (
          <View style={styles.profileChip}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'লিঙ্গ:' : 'Gender:'}</Text> {String(profile.gender)}
            </Text>
          </View>
        )}
        {profile.weight_kg != null && (
          <View style={styles.profileChip}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'ওজন:' : 'Weight:'}</Text> {String(profile.weight_kg)}kg
            </Text>
          </View>
        )}
        {profile.height_cm != null && (
          <View style={styles.profileChip}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'উচ্চতা:' : 'Height:'}</Text> {String(profile.height_cm)}cm
            </Text>
          </View>
        )}
        {profile.goal != null && (
          <View style={[styles.profileChip, { width: '100%' }]}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'লক্ষ্য:' : 'Goal:'}</Text> {String(profile.goal)}
            </Text>
          </View>
        )}
        {profile.medical_conditions != null && Array.isArray(profile.medical_conditions) && profile.medical_conditions.length > 0 && (
          <View style={[styles.profileChip, { width: '100%' }]}>
            <Text style={styles.chipText}>
              <Text style={styles.chipLabel}>{isBn ? 'রোগ:' : 'Conditions:'}</Text>{' '}
              {profile.medical_conditions.map(String).join(', ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/* ── Meal Plan Card ───────────────────────────────────────────── */

const MealPlanCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const meals = (data.meals || []) as Array<Record<string, any>>;
  const targetCal = data.target_calories as number;

  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#FFF8E1' }]}>
          <Utensils size={14} color="#FF8F00" />
        </View>
        <Text style={styles.cardTitle}>
          {isBn ? `আজকের খাবার (${targetCal} ক্যালোরি)` : `Today's Plan (${targetCal} kcal)`}
        </Text>
      </View>
      {meals.map((meal, idx) => {
        const slot = String(meal.slot || '');
        const items = (meal.items || []) as Array<Record<string, any>>;
        const slotLabel = slot === 'breakfast' ? (isBn ? 'সকাল' : 'Breakfast')
          : slot === 'lunch' ? (isBn ? 'দুপুর' : 'Lunch')
          : slot === 'dinner' ? (isBn ? 'রাত' : 'Dinner')
          : (isBn ? 'স্ন্যাক' : 'Snack');
        return (
          <View key={idx} style={styles.mealSlot}>
            <Text style={styles.mealSlotLabel}>{slotLabel}</Text>
            <View style={styles.itemRow}>
              {items.map((item, i) => (
                <View key={i} style={styles.foodBadge}>
                  <Text style={styles.foodBadgeText}>
                    {String(item.emoji || '🍽️')} {String(item.name_bn || item.name_en || '')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

/* ── Health Log Card ──────────────────────────────────────────── */

const HealthLogCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const logs = (data.logs || []) as Array<Record<string, any>>;
  if (!logs.length) return null;
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
          <HeartPulse size={14} color={colors.success} />
        </View>
        <Text style={styles.cardTitle}>{isBn ? 'স্বাস্থ্য ইতিহাস' : 'Health History'}</Text>
      </View>
      {logs.slice(0, 3).map((log, idx) => (
        <View key={idx} style={styles.logRow}>
          <Text style={styles.logDate}>{String(log.date || '')}</Text>
          {log.weight_kg != null && <Text style={styles.logValue}>{String(log.weight_kg)}kg</Text>}
          {log.blood_pressure != null && <Text style={styles.logValue}>BP {String(log.blood_pressure)}</Text>}
          {log.blood_sugar != null && <Text style={styles.logValue}>Sugar {String(log.blood_sugar)}</Text>}
          {log.symptoms != null && <Text style={[styles.logValue, { color: colors.error }]}>⚠️ {String(log.symptoms)}</Text>}
        </View>
      ))}
    </View>
  );
};

/* ── Medicine List Card ───────────────────────────────────────── */

const MedicineListCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const reminders = (data.reminders || []) as Array<Record<string, any>>;
  if (!reminders.length) {
    return (
      <View style={[styles.cardBase, styles.grayCard]}>
        <Text style={styles.grayText}>{isBn ? 'কোনো রিমাইন্ডার নেই' : 'No reminders'}</Text>
      </View>
    );
  }
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
          <Pill size={14} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>{isBn ? 'ঔষধ রিমাইন্ডার' : 'Medicine Reminders'}</Text>
      </View>
      {reminders.map((rem, idx) => (
        <View key={idx} style={styles.medicineRow}>
          <Text style={styles.medicineName}>{String(rem.name)}</Text>
          <Text style={styles.medicineDetail}>
            {String(rem.dose || '')} • {Array.isArray(rem.times) ? rem.times.map(String).join(', ') : ''}{' '}
            {rem.with_food ? (isBn ? '• খাবারের সাথে' : '• With food') : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

/* ── Food Search Card ─────────────────────────────────────────── */

const FoodSearchCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const results = (data.results || []) as Array<Record<string, any>>;
  if (!results.length) return null;
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
          <Search size={14} color="#8E24AA" />
        </View>
        <Text style={styles.cardTitle}>
          {isBn ? `"${data.query}" এর ফলাফল` : `"${data.query}" Results`}
        </Text>
      </View>
      {results.slice(0, 5).map((food, idx) => (
        <View key={idx} style={styles.foodRow}>
          <Text style={styles.foodEmoji}>{String(food.emoji || '🍽️')}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.foodName}>{String(food.name_bn || food.name_en || '')}</Text>
            <Text style={styles.foodGroup}>{String(food.food_group || '')}</Text>
          </View>
          <Text style={styles.foodCal}>{String(food.calories_per_100g || 'N/A')}kcal</Text>
        </View>
      ))}
    </View>
  );
};

/* ── Food Safety Card ─────────────────────────────────────────── */

const FoodSafetyCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const analysis = String(data.safety_analysis || data.insight || '');
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <AlertCircle size={14} color={colors.warning} />
        <Text style={styles.cardTitle}>
          {isBn ? 'খাবারের নিরাপত্তা বিশ্লেষণ' : 'Food Safety Analysis'}
        </Text>
      </View>
      <Text style={styles.safetyText}>{analysis}</Text>
    </View>
  );
};

/* ── Health Report Card ───────────────────────────────────────── */

const HealthReportCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  return (
    <View style={styles.richCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
          <FileBarChart size={14} color={colors.error} />
        </View>
        <Text style={styles.cardTitle}>
          {isBn ? `${data.period_days} দিনের স্বাস্থ্য রিপোর্ট` : `${data.period_days}-Day Health Report`}
        </Text>
      </View>
      <View style={styles.reportGrid}>
        <View style={styles.reportCell}>
          <Text style={styles.reportNumber}>{String(data.avg_daily_calories ?? 0)}</Text>
          <Text style={styles.reportLabel}>{isBn ? 'গড় ক্যালোরি/দিন' : 'Avg kcal/day'}</Text>
        </View>
        <View style={styles.reportCell}>
          <Text style={styles.reportNumber}>{String(data.meals_logged ?? 0)}</Text>
          <Text style={styles.reportLabel}>{isBn ? 'খাবার লগ' : 'Meals Logged'}</Text>
        </View>
        {data.latest_weight_kg != null && (
          <View style={styles.reportCell}>
            <Text style={styles.reportNumber}>{String(data.latest_weight_kg)}kg</Text>
            <Text style={styles.reportLabel}>{isBn ? 'সর্বশেষ ওজন' : 'Latest Weight'}</Text>
          </View>
        )}
        <View style={styles.reportCell}>
          <Text style={styles.reportNumber}>{String(data.health_log_count ?? 0)}</Text>
          <Text style={styles.reportLabel}>{isBn ? 'স্বাস্থ্য লগ' : 'Health Logs'}</Text>
        </View>
      </View>
    </View>
  );
};

/* ── Personal Cooker (NutriSaathi) Card ───────────────────────── */

const PersonalCookerCard = ({ data, isBn }: { data: Record<string, any>; isBn: boolean }) => {
  const reply = String(data.reply || '');
  const condition = String(data.condition || '');

  // Strip markdown bold markers for plain-text rendering
  const cleanReply = reply.replace(/\*\*/g, '');

  return (
    <View style={[styles.richCard, { borderColor: 'rgba(167, 201, 36, 0.35)' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
          <ChefHat size={14} color={colors.success} />
        </View>
        <Text style={styles.cardTitle}>
          {isBn ? 'নুট্রিসাথীর পরামর্শ' : 'NutriSaathi Advice'}
        </Text>
        {condition && condition !== 'None' && (
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionBadgeText}>{condition}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cookerReply}>{cleanReply}</Text>
    </View>
  );
};

/* ── Styles ───────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Base inline mini-cards
  cardBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.error,
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  successText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.success,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#BBDEFB',
  },
  infoText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.accent,
  },
  grayCard: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  grayText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Rich cards
  richCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },

  // Profile
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  profileChip: {
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    minWidth: '48%',
  },
  chipText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },
  chipLabel: {
    fontFamily: fonts.bnBold,
    color: colors.textPrimary,
  },

  // Meal plan
  mealSlot: {
    backgroundColor: '#FFFDF5',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  mealSlotLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  foodBadge: {
    backgroundColor: colors.white,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  foodBadgeText: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Health logs
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  logDate: {
    fontFamily: fonts.bnBold,
    fontSize: 10,
    color: colors.textPrimary,
  },
  logValue: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Medicine
  medicineRow: {
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  medicineName: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  medicineDetail: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Food search
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  foodEmoji: {
    fontSize: 16,
  },
  foodName: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  foodGroup: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },
  foodCal: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },

  // Food safety
  safetyText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Health report
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reportCell: {
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    minWidth: '48%',
    flex: 1,
  },
  reportNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  reportLabel: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Personal cooker
  conditionBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  conditionBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.success,
  },
  cookerReply: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
