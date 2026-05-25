import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { medicineApi } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import {
  ArrowLeft,
  Pill,
  Plus,
  Trash2,
  Clock,
  Utensils,
  AlertCircle,
  CheckCircle2,
  Mic,
  List,
} from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

const EXAMPLES = [
  'সকালে ও রাতে মেটফরমিন ৫০০ mg খাবারের পরে নিতে হবে',
  'রাতে ঘুমানোর আগে ইনসুলিন নিতে হবে',
  'সকালে ৮টায় আমলোডিপিন ৫mg এবং বিকেলে ৪টায় লিসিনোপ্রিল ১০mg',
];

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [input, setInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: reminders, isLoading: listLoading } = useQuery({
    queryKey: ['medicine_reminders'],
    queryFn: async () => (await medicineApi.list()).data,
  });

  // Mutation to add medicine
  const addMutation = useMutation({
    mutationFn: async (text: string) => (await medicineApi.add(text, 'bn')).data,
    onSuccess: (data) => {
      haptics.success();
      setSuccessMsg(data.confirmation || 'ওষুধ সফলভাবে যোগ করা হয়েছে!');
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['medicine_reminders'] });
      setTab('list');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      haptics.error();
      setErrorMsg(err?.response?.data?.detail || 'ওষুধ যোগ করতে সমস্যা হয়েছে');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Mutation to delete medicine
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await medicineApi.delete(id)).data,
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['medicine_reminders'] });
    },
    onError: () => {
      haptics.error();
      Alert.alert('ত্রুটি', 'মুছতে সমস্যা হয়েছে');
    },
  });

  const handleAdd = () => {
    if (!input.trim()) return;
    addMutation.mutate(input);
  };

  const handleDelete = (id: string, name: string) => {
    haptics.light();
    Alert.alert('রিমাইন্ডার মুছুন', `${name} রিমাইন্ডারটি কি মুছে ফেলতে চান?`, [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছে ফেলুন',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>ওষুধের সময়সূচী</Text>
          <Text style={styles.headerSubtitle}>মেডিসিন রিমাইন্ডার এবং পুশ বিজ্ঞপ্তি</Text>
        </View>
      </View>

      {/* TABS CONTROL */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsGroup}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setTab('list');
            }}
          >
            <List size={14} color={tab === 'list' ? colors.white : colors.textSecondary} />
            <Text style={[styles.tabLabel, tab === 'list' && styles.tabLabelActive]}>রিমাইন্ডার সমূহ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'add' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setTab('add');
            }}
          >
            <Plus size={14} color={tab === 'add' ? colors.white : colors.textSecondary} />
            <Text style={[styles.tabLabel, tab === 'add' && styles.tabLabelActive]}>নতুন ওষুধ যোগ করুন</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ALERTS */}
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

      {/* SCROLL CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'list' && (
          <View style={{ gap: 12 }}>
            {listLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            ) : !reminders || reminders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Pill size={36} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyText}>কোনো ওষুধ যোগ করা হয়নি</Text>
                <TouchableOpacity style={styles.quickAddBtn} onPress={() => setTab('add')}>
                  <Text style={styles.quickAddBtnText}>নতুন ওষুধ যোগ করুন</Text>
                </TouchableOpacity>
              </View>
            ) : (
              reminders.map((rem: any) => (
                <View key={rem.id} style={styles.medCard}>
                  <View style={styles.medIconBox}>
                    <Pill size={18} color={colors.accent} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>
                      {rem.name}{' '}
                      <Text style={styles.medDose}>{rem.dose ? `— ${rem.dose}` : ''}</Text>
                    </Text>

                    <View style={styles.metaRow}>
                      <Clock size={12} color={colors.textSecondary} />
                      <Text style={styles.medSchedule}>
                        {Array.isArray(rem.times) ? rem.times.join(', ') : rem.times || 'সময় নেই'}
                      </Text>
                    </View>

                    {rem.with_food !== undefined ? (
                      <View style={styles.metaRow}>
                        <Utensils size={12} color={colors.textSecondary} />
                        <Text style={styles.medNote}>
                          {rem.with_food ? 'খাবারের সাথে' : 'খালি পেটে'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(rem.id, rem.name)}
                  >
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'add' && (
          <View style={styles.addFormContainer}>
            <View style={styles.formIconBox}>
              <Mic size={20} color={colors.white} />
            </View>
            <Text style={styles.addTitle}>AI দিয়ে ওষুধ যোগ করুন</Text>
            <Text style={styles.addSubTitle}>বাংলায় বলুন বা টাইপ করুন কোন ওষুধ কখন খেতে হবে</Text>

            <TextInput
              style={styles.textArea}
              placeholder="যেমন: সকালে মেটফরমিন ৫০০ mg খাবারের পর এবং রাতে গ্লিমেপিরাইড ২mg..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={input}
              onChangeText={setInput}
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!input.trim() || addMutation.isPending) && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={!input.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>রিমাইন্ডার তৈরি করুন</Text>
              )}
            </TouchableOpacity>

            {/* Quick Examples */}
            <View style={styles.examplesWrapper}>
              <Text style={styles.examplesLabel}>উদাহরণ সমূহ:</Text>
              {EXAMPLES.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.exampleItem}
                  onPress={() => {
                    haptics.light();
                    setInput(ex);
                  }}
                >
                  <Text style={styles.exampleText}>"{ex}"</Text>
                </TouchableOpacity>
              ))}
            </View>
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
    flex: 1,
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
    flex: 1,
  },

  // Med Card (cream glossy design)
  medCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  medIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE8CC',
  },
  medName: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  medDose: {
    fontFamily: fonts.bnBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  medSchedule: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },
  medNote: {
    fontFamily: fonts.bnBold,
    fontSize: 10,
    color: colors.accent,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FCE8E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add Medication Card
  addFormContainer: {
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
    alignItems: 'center',
  },
  formIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  addSubTitle: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  textArea: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#FAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    borderRadius: 14,
    padding: 16,
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.white,
  },

  examplesWrapper: {
    width: '100%',
    marginTop: 20,
    gap: 8,
  },
  examplesLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  exampleItem: {
    backgroundColor: '#FAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.08)',
    borderRadius: 10,
    padding: 10,
  },
  exampleText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(167, 201, 36, 0.15)',
  },
  quickAddBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
});
