import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { healthLogApi } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import {
  ArrowLeft,
  Plus,
  History as HistoryIcon,
  Activity,
  Calendar,
  Scale,
  HeartPulse,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Custom SVG Chart Component for React Native
function HealthTrendChart({
  data,
  color,
  gradientId,
  unit,
}: {
  data: { label: string; value: number }[];
  color: string;
  gradientId: string;
  unit: string;
}) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>পর্যাপ্ত ডাটা নেই</Text>
      </View>
    );
  }

  const chartHeight = 120;
  const chartWidth = width - 72; // Padding container adjusted
  const paddingX = 20;
  const paddingY = 15;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) * 0.95; // 5% buffer below min
  const maxVal = Math.max(...values) * 1.05; // 5% buffer above max
  const valRange = maxVal - minVal || 1;

  // Calculate points
  const points = data.map((d, index) => {
    const x =
      paddingX +
      (index / (data.length - 1 || 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight -
      paddingY -
      ((d.value - minVal) / valRange) * (chartHeight - paddingY * 2);
    return { x, y, value: d.value, label: d.label };
  });

  // Construct SVG Path (smooth curve or straight lines)
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }

    // Closed path for filled area
    areaPath =
      linePath +
      ` L ${points[points.length - 1].x} ${chartHeight - paddingY}` +
      ` L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <View style={styles.chartWrapper}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Fill Area */}
        {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}

        {/* Chart Line */}
        {linePath ? (
          <Path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        ) : null}

        {/* Data points */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r="5" fill={color} />
            <Circle cx={p.x} cy={p.y} r="2" fill={colors.white} />
          </React.Fragment>
        ))}
      </Svg>

      {/* X Axis Labels */}
      <View style={styles.chartLabelsRow}>
        {points.map((p, i) => {
          // Show only start, middle, and end labels to avoid overlap
          const showLabel =
            i === 0 || i === points.length - 1 || (points.length > 2 && i === Math.floor(points.length / 2));
          if (!showLabel) return <View key={i} style={{ flex: 1 }} />;
          return (
            <Text key={i} style={styles.chartAxisLabel} numberOfLines={1}>
              {p.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export default function HealthLogScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'trends'>('log');

  // Form State
  const [weightKg, setWeightKg] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [notes, setNotes] = useState('');

  // Notifications state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API Queries
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['health_logs'],
    queryFn: async () => (await healthLogApi.list()).data,
    enabled: activeTab === 'history',
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['health_trends'],
    queryFn: async () => (await healthLogApi.trends()).data,
    enabled: activeTab === 'trends',
  });

  // Log save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => (await healthLogApi.create(data)).data,
    onSuccess: () => {
      haptics.success();
      setSuccessMsg('স্বাস্থ্য লগ সফলভাবে সংরক্ষিত হয়েছে!');
      setWeightKg('');
      setBloodSugar('');
      setBloodPressure('');
      setHba1c('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['health_logs'] });
      queryClient.invalidateQueries({ queryKey: ['health_trends'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition_report'] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      haptics.error();
      setErrorMsg(err?.response?.data?.detail || 'সংরক্ষণ করতে সমস্যা হয়েছে');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  const handleSave = () => {
    if (!weightKg && !bloodSugar && !bloodPressure && !hba1c && !notes) {
      Alert.alert('সতর্কতা', 'অনুগ্রহ করে অন্তত একটি ফিল্ড পূরণ করুন');
      return;
    }

    saveMutation.mutate({
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      blood_sugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
      blood_pressure: bloodPressure || undefined,
      hba1c: hba1c ? parseFloat(hba1c) : undefined,
      notes: notes || undefined,
    });
  };

  const today = new Date().toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Prepare chart data from trends
  const weightChartData = (trendsData?.weight_trend?.history || [])
    .map(([date, val]: [string, number]) => ({
      label: new Date(date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
      value: val,
    }))
    .slice(-6); // Limit to last 6 entries for mobile readability

  const sugarChartData = (trendsData?.blood_sugar_trend?.history || [])
    .map(([date, val]: [string, number]) => ({
      label: new Date(date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
      value: val,
    }))
    .slice(-6);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { haptics.light(); router.back(); }}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>স্বাস্থ্য ট্র্যাকার</Text>
          <Text style={styles.headerSubtitle}>{today}</Text>
        </View>
      </View>

      {/* TABS CONTAINER */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsGroup}>
          {[
            { id: 'log' as const, label: 'আজকের লগ', icon: Plus },
            { id: 'history' as const, label: 'ইতিহাস', icon: HistoryIcon },
            { id: 'trends' as const, label: 'ট্রেন্ডস', icon: Activity },
          ].map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => { haptics.light(); setActiveTab(t.id); }}
              >
                <Icon size={14} color={active ? colors.white : colors.textSecondary} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* NOTIFICATION MSGS */}
      {successMsg && (
        <View style={styles.successAlert}>
          <CheckCircle2 size={16} color={colors.success} />
          <Text style={styles.successAlertText}>{successMsg}</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorAlert}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorAlertText}>{errorMsg}</Text>
        </View>
      )}

      {/* SCROLLABLE CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'log' && (
          <View style={styles.logCard}>
            <Text style={styles.sectionTitle}>আজকের নতুন এন্ট্রি</Text>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>ওজন (কেজি)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="যেমন: ৭০.৫"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={weightKg}
                onChangeText={setWeightKg}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>রক্তে শর্করা / ব্লাড সুগার (mmol/L)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="যেমন: ৬.৫"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={bloodSugar}
                onChangeText={setBloodSugar}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>রক্তচাপ / ব্লাড প্রেসার (BP)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="যেমন: ১২০/৮০"
                placeholderTextColor={colors.textSecondary}
                value={bloodPressure}
                onChangeText={setBloodPressure}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>HbA1c (%)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="যেমন: ৫.৭"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={hba1c}
                onChangeText={setHba1c}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>বিশেষ মন্তব্য বা নোট</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="আজকের কেমন অনুভব করছেন বা কোনো উপসর্গ থাকলে লিখুন..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>লগ সংরক্ষণ করুন</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>স্বাস্থ্য এন্ট্রি ইতিহাস</Text>
            {logsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            ) : !logsData || logsData.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>কোনো স্বাস্থ্য রেকর্ড পাওয়া যায়নি</Text>
              </View>
            ) : (
              logsData.map((log: any, idx: number) => {
                const logDate = new Date(log.created_at || new Date()).toLocaleDateString('bn-BD', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View key={log.id || idx} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Calendar size={14} color={colors.primary} />
                      <Text style={styles.historyDate}>{logDate}</Text>
                    </View>

                    <View style={styles.historyMetricsGrid}>
                      {log.weight_kg ? (
                        <View style={styles.historyMetricItem}>
                          <Scale size={14} color={colors.textSecondary} />
                          <Text style={styles.historyMetricLabel}>ওজন: <Text style={styles.historyMetricValue}>{log.weight_kg} কেজি</Text></Text>
                        </View>
                      ) : null}

                      {log.blood_sugar ? (
                        <View style={styles.historyMetricItem}>
                          <HeartPulse size={14} color={colors.accent} />
                          <Text style={styles.historyMetricLabel}>সুগার: <Text style={styles.historyMetricValue}>{log.blood_sugar} mmol/L</Text></Text>
                        </View>
                      ) : null}

                      {log.blood_pressure ? (
                        <View style={styles.historyMetricItem}>
                          <TrendingUp size={14} color={colors.success} />
                          <Text style={styles.historyMetricLabel}>প্রেসার: <Text style={styles.historyMetricValue}>{log.blood_pressure}</Text></Text>
                        </View>
                      ) : null}

                      {log.hba1c ? (
                        <View style={styles.historyMetricItem}>
                          <FileText size={14} color={colors.primary} />
                          <Text style={styles.historyMetricLabel}>HbA1c: <Text style={styles.historyMetricValue}>{log.hba1c}%</Text></Text>
                        </View>
                      ) : null}
                    </View>

                    {log.notes ? (
                      <View style={styles.historyNotesBox}>
                        <Text style={styles.historyNotesText}>নোট: {log.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'trends' && (
          <View style={styles.trendsContainer}>
            {trendsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <>
                {/* Weight Trend Card */}
                <View style={styles.trendCard}>
                  <View style={styles.trendCardHeader}>
                    <Scale size={18} color={colors.primary} />
                    <Text style={styles.trendTitle}>ওজন পরিবর্তনের ট্রেন্ড (কেজি)</Text>
                  </View>
                  <HealthTrendChart
                    data={weightChartData}
                    color={colors.primary}
                    gradientId="weightGrad"
                    unit="kg"
                  />
                </View>

                {/* Blood Sugar Trend Card */}
                <View style={styles.trendCard}>
                  <View style={styles.trendCardHeader}>
                    <HeartPulse size={18} color={colors.accent} />
                    <Text style={styles.trendTitle}>ব্লাড সুগার লেভেল ট্রেন্ড (mmol/L)</Text>
                  </View>
                  <HealthTrendChart
                    data={sugarChartData}
                    color={colors.accent}
                    gradientId="sugarGrad"
                    unit="mmol/L"
                  />
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
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

  tabsWrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 201, 36, 0.1)',
  },
  tabsGroup: {
    flexDirection: 'row',
    backgroundColor: '#F0F3E6',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  tabLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Log Form Card (Cream theme with highly glossy glass card borders)
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: '#FAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.white,
  },

  // Alerts
  successAlert: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#34A85350',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  successAlertText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: '#137333',
  },
  errorAlert: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE8E6',
    borderWidth: 1,
    borderColor: '#EA433550',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  errorAlertText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: '#C5221F',
  },

  // History List
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 201, 36, 0.1)',
    paddingBottom: 8,
    marginBottom: 10,
  },
  historyDate: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  historyMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: '45%',
  },
  historyMetricLabel: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyMetricValue: {
    fontFamily: fonts.bnBold,
    color: colors.textPrimary,
  },
  historyNotesBox: {
    marginTop: 8,
    backgroundColor: '#FAFBF7',
    padding: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(167, 201, 36, 0.1)',
  },
  historyNotesText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Trends
  trendsContainer: {
    gap: 16,
  },
  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  trendCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trendTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  chartAxisLabel: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.1)',
  },
  emptyText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
