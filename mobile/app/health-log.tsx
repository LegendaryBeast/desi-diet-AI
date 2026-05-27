import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fonts } from '../lib/theme';
import { healthLogApi } from '../lib/api';
import { useTranslation } from '../lib/translations';
import {
  ArrowLeft,
  Plus,
  Activity,
  Heart,
  Droplets,
  Scale,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Save,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

export default function HealthLogScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const isBn = language === 'bn';

  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [sugar, setSugar] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['health_logs'],
    queryFn: async () => (await healthLogApi.list()).data,
  });

  const { data: trends } = useQuery({
    queryKey: ['health_trends'],
    queryFn: async () => (await healthLogApi.trends()).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await healthLogApi.create(data)).data,
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['health_logs'] });
      queryClient.invalidateQueries({ queryKey: ['health_trends'] });
      setShowForm(false);
      setWeight('');
      setBpSys('');
      setBpDia('');
      setSugar('');
      setHba1c('');
      setSymptoms('');
      setNotes('');
    },
  });

  const handleSave = () => {
    const data: any = {};
    if (weight.trim()) data.weight_kg = parseFloat(weight);
    if (bpSys.trim() && bpDia.trim()) data.blood_pressure = `${bpSys}/${bpDia}`;
    if (sugar.trim()) data.blood_sugar = parseFloat(sugar);
    if (hba1c.trim()) data.hba1c = parseFloat(hba1c);
    if (symptoms.trim()) data.symptoms = symptoms.split(',').map((s) => s.trim()).filter(Boolean);
    if (notes.trim()) data.notes = notes;

    if (Object.keys(data).length === 0) return;
    createMutation.mutate(data);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const weightChange = trends?.weight_trend?.change_kg;
  const weightTrendIcon = weightChange === null ? null : weightChange > 0 ? <TrendingUp size={14} color={colors.error} /> : weightChange < 0 ? <TrendingDown size={14} color={colors.success} /> : <Minus size={14} color={colors.textSecondary} />;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { haptics.light(); router.back(); }}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{isBn ? 'স্বাস্থ্য ট্র্যাকার' : 'Health Tracker'}</Text>
          <Text style={styles.headerSubtitle}>{isBn ? 'ওজন, ব্লাড প্রেসার, শর্করা ট্র্যাক করুন' : 'Track weight, BP, sugar levels'}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { haptics.light(); setShowForm(!showForm); }}
        >
          {showForm ? <ChevronUp size={18} color={colors.white} /> : <Plus size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Trends summary */}
        {trends && (
          <View style={styles.trendsRow}>
            <View style={[styles.trendCard, { backgroundColor: '#E8F5E9' }]}>
              <Scale size={18} color={colors.primary} />
              <Text style={styles.trendValue}>{trends.weight_trend?.latest_kg ?? '--'} kg</Text>
              <Text style={styles.trendLabel}>{isBn ? 'সর্বশেষ ওজন' : 'Latest Weight'}</Text>
              {weightTrendIcon && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {weightTrendIcon}
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: fonts.body }}>
                    {weightChange > 0 ? '+' : ''}{weightChange} kg
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.trendCard, { backgroundColor: '#FFF3E0' }]}>
              <Droplets size={18} color="#FF9800" />
              <Text style={styles.trendValue}>{trends.blood_sugar_trend?.data_points ?? 0}</Text>
              <Text style={styles.trendLabel}>{isBn ? 'শর্করা রেকর্ড' : 'Sugar Records'}</Text>
            </View>
            <View style={[styles.trendCard, { backgroundColor: '#FCE4EC' }]}>
              <Heart size={18} color="#E91E63" />
              <Text style={styles.trendValue}>{logs?.length ?? 0}</Text>
              <Text style={styles.trendLabel}>{isBn ? 'মোট এন্ট্রি' : 'Total Entries'}</Text>
            </View>
          </View>
        )}

        {/* Add Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isBn ? 'নতুন রেকর্ড যোগ করুন' : 'Add New Record'}</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{isBn ? 'ওজন (kg)' : 'Weight (kg)'}</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  placeholder="70.5"
                  value={weight}
                  onChangeText={setWeight}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{isBn ? 'রক্তে শর্করা' : 'Blood Sugar'}</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  placeholder="120"
                  value={sugar}
                  onChangeText={setSugar}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{isBn ? 'ব্লাড প্রেসার (Sys)' : 'BP Systolic'}</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  placeholder="120"
                  value={bpSys}
                  onChangeText={setBpSys}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{isBn ? 'ব্লাড প্রেসার (Dia)' : 'BP Diastolic'}</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  placeholder="80"
                  value={bpDia}
                  onChangeText={setBpDia}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isBn ? 'HbA1c (%)' : 'HbA1c (%)'}</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="decimal-pad"
                placeholder="5.7"
                value={hba1c}
                onChangeText={setHba1c}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isBn ? 'লক্ষণ (কমা দিয়ে আলাদা)' : 'Symptoms (comma separated)'}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={isBn ? 'যেমন: মাথাব্যথা, ক্লান্তি' : 'e.g. headache, fatigue'}
                value={symptoms}
                onChangeText={setSymptoms}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isBn ? 'নোট' : 'Notes'}</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 60 }]}
                multiline
                placeholder={isBn ? 'অতিরিক্ত তথ্য...' : 'Additional notes...'}
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, createMutation.isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Save size={16} color={colors.white} />
                  <Text style={styles.saveBtnText}>{isBn ? 'সংরক্ষণ করুন' : 'Save Record'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logs List */}
        <Text style={styles.sectionTitle}>{isBn ? 'সম্প্রতি রেকর্ড' : 'Recent Records'}</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : !logs || logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardList size={36} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>{isBn ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}</Text>
            <Text style={styles.emptySub}>{isBn ? 'প্রথম রেকর্ড যোগ করতে + বোতাম টিপুন' : 'Tap the + button to add your first record'}</Text>
          </View>
        ) : (
          logs.map((log: any) => (
            <View key={log.log_id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Activity size={14} color={colors.primary} />
                <Text style={styles.logDate}>{formatDate(log.log_date)}</Text>
              </View>

              <View style={styles.metricsRow}>
                {log.weight_kg !== null && (
                  <View style={styles.metricChip}>
                    <Scale size={12} color={colors.primary} />
                    <Text style={styles.metricText}>{log.weight_kg} kg</Text>
                  </View>
                )}
                {log.blood_pressure && (
                  <View style={[styles.metricChip, { backgroundColor: '#FCE4EC' }]}>
                    <Heart size={12} color="#E91E63" />
                    <Text style={[styles.metricText, { color: '#E91E63' }]}>{log.blood_pressure}</Text>
                  </View>
                )}
                {log.blood_sugar !== null && (
                  <View style={[styles.metricChip, { backgroundColor: '#FFF3E0' }]}>
                    <Droplets size={12} color="#FF9800" />
                    <Text style={[styles.metricText, { color: '#FF9800' }]}>{log.blood_sugar}</Text>
                  </View>
                )}
                {log.hba1c !== null && (
                  <View style={[styles.metricChip, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.metricText, { color: '#2196F3' }]}>HbA1c {log.hba1c}%</Text>
                  </View>
                )}
              </View>

              {log.symptoms && log.symptoms.length > 0 && (
                <Text style={styles.symptomsText}>
                  {isBn ? 'লক্ষণ: ' : 'Symptoms: '}{log.symptoms.join(', ')}
                </Text>
              )}
              {log.notes && (
                <Text style={styles.notesText}>{log.notes}</Text>
              )}
            </View>
          ))
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
  addBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },

  trendsRow: { flexDirection: 'row', gap: 10 },
  trendCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  trendValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  trendLabel: { fontFamily: fonts.bn, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    gap: 12,
  },
  formTitle: { fontFamily: fonts.bnBold, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { gap: 4 },
  inputLabel: { fontFamily: fonts.bnBold, fontSize: 11, color: colors.textSecondary },
  textInput: {
    backgroundColor: '#F5F8E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.white },

  sectionTitle: { fontFamily: fonts.bnBold, fontSize: 15, color: colors.textPrimary, marginTop: 4 },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    gap: 8,
  },
  emptyText: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  emptySub: { fontFamily: fonts.bn, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    gap: 10,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logDate: { fontFamily: fonts.bnBold, fontSize: 12, color: colors.textPrimary },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metricText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  symptomsText: { fontFamily: fonts.bn, fontSize: 11, color: colors.textSecondary },
  notesText: { fontFamily: fonts.bn, fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
});
