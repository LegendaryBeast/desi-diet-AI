import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { medicineApi } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import { useTranslation } from '../lib/translations';
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
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

const EXAMPLES = [
  'সকালে ও রাতে মেটফরমিন ৫০০ mg খাবারের পরে নিতে হবে',
  'রাতে ঘুমানোর আগে ইনসুলিন নিতে হবে',
  'সকালে ৮টায় আমলোডিপিন ৫mg এবং বিকেলে ৪টায় লিসিনোপ্রিল ১০mg',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export default function MedicineRemindersScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();

  const triggerAlert = (
    title: string,
    message: string,
    buttons?: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[]
  ) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 0) {
        const destructiveBtn = buttons.find(b => b.style === 'destructive');
        const confirmBtn = buttons.find(b => b.text === 'মুছে ফেলুন' || b.text === 'Delete' || b.text === 'হ্যাঁ' || b.text === 'Yes' || b.text === 'OK');
        const actionBtn = destructiveBtn || confirmBtn || buttons[buttons.length - 1];
        
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed && actionBtn && actionBtn.onPress) {
          actionBtn.onPress();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual form states
  const [manualName, setManualName] = useState('');
  const [manualDose, setManualDose] = useState('');
  const [manualWithFood, setManualWithFood] = useState(true);
  const [manualNotes, setManualNotes] = useState('');
  const [manualTimes, setManualTimes] = useState<string[]>(['08:00']);

  // Custom Time Selection states
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');

  // Notification toggles
  const [enableNotification, setEnableNotification] = useState(true);
  const [enableSound, setEnableSound] = useState(true);

  // Loaded metadata for active alarms
  const [scheduledMeta, setScheduledMeta] = useState<Record<string, { notification: boolean; sound: boolean }>>({});

  useEffect(() => {
    // Set notification handler so foreground notifications appear
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Request permissions on mount
    const requestPerms = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      }
    };
    requestPerms();
    loadAlarmsMeta();
  }, []);

  // Load scheduled notifications meta from AsyncStorage
  const loadAlarmsMeta = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metaKeys = keys.filter(k => k.startsWith('med_meta:'));
      const metaObj: any = {};
      for (const key of metaKeys) {
        const medId = key.replace('med_meta:', '');
        const val = await AsyncStorage.getItem(key);
        if (val) {
          metaObj[medId] = JSON.parse(val);
        }
      }
      setScheduledMeta(metaObj);
    } catch (e) {
      console.error('Failed to load alarms meta', e);
    }
  };

  // Schedule local daily notifications for a reminder
  const scheduleNotifications = async (
    medId: string,
    name: string,
    dose: string,
    times: string[],
    withFood: boolean,
    notes?: string,
    notify = true,
    sound = true
  ) => {
    // Cancel existing first to prevent duplicates
    await cancelNotifications(medId);

    if (!notify) {
      // Save disabled meta
      await AsyncStorage.setItem(`med_meta:${medId}`, JSON.stringify({ notification: false, sound: false }));
      loadAlarmsMeta();
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        triggerAlert('অনুমতি প্রয়োজন', 'পুশ নোটিফিকেশনের জন্য অনুমতি প্রয়োজন। সেটিংস থেকে অনুমতি দিন।');
        return;
      }
    }

    const scheduledIds: string[] = [];
    for (const timeStr of times) {
      try {
        const [hourStr, minuteStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        if (isNaN(hour) || isNaN(minute)) continue;

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ওষুধ খাওয়ার সময় হয়েছে: ${name}`,
            body: `${dose ? `${dose} — ` : ''}${withFood ? 'খাবারের পর' : 'খালি পেটে'} (${notes || 'নিয়মিত ওষুধ সেবন করুন'})`,
            sound: sound,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            hour,
            minute,
            repeats: true,
          },
        });
        scheduledIds.push(identifier);
      } catch (err) {
        console.error('Error scheduling notification:', err);
      }
    }

    if (scheduledIds.length > 0) {
      await AsyncStorage.setItem(`med_notifications:${medId}`, JSON.stringify(scheduledIds));
      await AsyncStorage.setItem(`med_meta:${medId}`, JSON.stringify({ notification: true, sound }));
      loadAlarmsMeta();
    }
  };

  // Cancel local daily notifications
  const cancelNotifications = async (medId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`med_notifications:${medId}`);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        for (const id of ids) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        await AsyncStorage.removeItem(`med_notifications:${medId}`);
      }
      await AsyncStorage.removeItem(`med_meta:${medId}`);
      loadAlarmsMeta();
    } catch (e) {
      console.error('Failed to cancel notifications', e);
    }
  };

  // Queries
  const { data: reminders, isLoading: listLoading, isError, error, refetch: refetchReminders } = useQuery({
    queryKey: ['medicine_reminders'],
    queryFn: async () => (await medicineApi.list()).data,
    retry: false,
  });



  const addManualMutation = useMutation({
    mutationFn: async (data: any) => (await medicineApi.addManual(data)).data,
    onSuccess: (data) => {
      haptics.success();
      setSuccessMsg(t('medAddedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['medicine_reminders'] });

      // Schedule local alarm and notifications based on manual options
      scheduleNotifications(
        data.id,
        data.name,
        data.dose,
        data.times,
        data.with_food,
        data.notes,
        enableNotification,
        enableSound
      );

      // Reset form fields
      setManualName('');
      setManualDose('');
      setManualWithFood(true);
      setManualNotes('');
      setManualTimes(['08:00']);
      setTab('list');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      haptics.error();
      setErrorMsg(err?.response?.data?.detail || t('medAddedError'));
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Mutation to delete medicine
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await medicineApi.delete(id)).data,
    onSuccess: (_, id) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['medicine_reminders'] });
    },
    onError: () => {
      haptics.error();
      triggerAlert(language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete');
    },
  });



  const handleAddManual = () => {
    if (!manualName.trim()) {
      triggerAlert(language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'দয়া করে ওষুধের নাম লিখুন' : 'Please enter medicine name');
      return;
    }
    if (manualTimes.length === 0) {
      triggerAlert(language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'কমপক্ষে একটি সময় নির্বাচন করুন' : 'Select at least one time');
      return;
    }

    addManualMutation.mutate({
      name: manualName.trim(),
      dose: manualDose.trim(),
      times: manualTimes,
      with_food: manualWithFood,
      notes: manualNotes.trim() || undefined,
    });
  };

  const handleDelete = (id: string, name: string) => {
    haptics.light();
    triggerAlert(t('deleteReminder'), language === 'bn' ? `${name} রিমাইন্ডারটি কি মুছে ফেলতে চান?` : `Are you sure you want to delete ${name} reminder?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          cancelNotifications(id);
          cancelNotifications(name);
          deleteMutation.mutate(id);
        },
      },
    ]);
  };

  const handleAddManualTime = () => {
    const formatted = `${selectedHour}:${selectedMinute}`;
    if (!manualTimes.includes(formatted)) {
      setManualTimes([...manualTimes, formatted].sort());
    }
  };

  const handleRemoveManualTime = (timeStr: string) => {
    setManualTimes(manualTimes.filter(t => t !== timeStr));
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
          <Text style={styles.headerTitle}>{t('medSchedule')}</Text>
          <Text style={styles.headerSubtitle}>{t('medSubtitle')}</Text>
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
            <Text style={[styles.tabLabel, tab === 'list' && styles.tabLabelActive]}>{t('remindersList')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'add' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setTab('add');
            }}
          >
            <Plus size={14} color={tab === 'add' ? colors.white : colors.textSecondary} />
            <Text style={[styles.tabLabel, tab === 'add' && styles.tabLabelActive]}>{t('addNewMed')}</Text>
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
            ) : isError ? (
              <View style={styles.emptyContainer}>
                <AlertCircle size={36} color={colors.error} style={{ opacity: 0.8 }} />
                <Text style={styles.errorText}>{t('loadError')}</Text>
                <Text style={styles.errorSubtext}>
                  {error instanceof Error ? error.message : t('loadErrorSub')}
                </Text>
                <TouchableOpacity style={styles.quickAddBtn} onPress={() => refetchReminders()}>
                  <Text style={styles.quickAddBtnText}>{t('tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            ) : !reminders || reminders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Pill size={36} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyText}>{t('noMedAdded')}</Text>
                <TouchableOpacity style={styles.quickAddBtn} onPress={() => setTab('add')}>
                  <Text style={styles.quickAddBtnText}>{t('addNewMed')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              reminders.map((rem: any) => {
                const meta = scheduledMeta[rem.id] || scheduledMeta[rem.name] || { notification: true, sound: true };
                return (
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
                          {Array.isArray(rem.times) ? rem.times.join(', ') : rem.times || (language === 'bn' ? 'সময় নেই' : 'No time')}
                        </Text>
                      </View>

                      {rem.with_food !== undefined ? (
                        <View style={styles.metaRow}>
                          <Utensils size={12} color={colors.textSecondary} />
                          <Text style={styles.medNote}>
                            {rem.with_food ? t('withFood') : t('emptyStomach')}
                          </Text>
                        </View>
                      ) : null}

                      {/* Reminders Alarm Indicators */}
                      <View style={styles.alarmStatusRow}>
                        {meta.notification ? (
                          <View style={[styles.badge, styles.badgeActive]}>
                            <Bell size={10} color={colors.primary} />
                            <Text style={styles.badgeTextActive}>{t('activeNotify')}</Text>
                          </View>
                        ) : (
                          <View style={[styles.badge, styles.badgeInactive]}>
                            <BellOff size={10} color={colors.textSecondary} />
                            <Text style={styles.badgeTextInactive}>{t('inactiveNotify')}</Text>
                          </View>
                        )}

                        {meta.sound ? (
                          <View style={[styles.badge, styles.badgeActive]}>
                            <Volume2 size={10} color={colors.primary} />
                            <Text style={styles.badgeTextActive}>{t('activeAlarm')}</Text>
                          </View>
                        ) : (
                          <View style={[styles.badge, styles.badgeInactive]}>
                            <VolumeX size={10} color={colors.textSecondary} />
                            <Text style={styles.badgeTextInactive}>{t('inactiveAlarm')}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(rem.id, rem.name)}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {tab === 'add' && (
          <View style={styles.addFormContainer}>
            <View style={styles.formIconBox}>
              <Pill size={20} color={colors.white} />
            </View>
            <Text style={styles.addTitle}>{t('addNewMed')}</Text>
            <Text style={styles.addSubTitle}>{language === 'bn' ? 'ওষুধের নাম, ডোজ এবং সময় নির্ধারণ করুন' : 'Set medicine name, dose, and time'}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('inputMedName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={language === 'bn' ? 'যেমন: Metformin, Napa...' : 'e.g. Metformin, Napa...'}
                placeholderTextColor={colors.textSecondary}
                value={manualName}
                onChangeText={setManualName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('inputMedDose')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={language === 'bn' ? 'যেমন: 500mg, ১টি ট্যাবলেট...' : 'e.g. 500mg, 1 tablet...'}
                placeholderTextColor={colors.textSecondary}
                value={manualDose}
                onChangeText={setManualDose}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('inputFoodInst')}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.instructionBtn, manualWithFood && styles.instructionBtnActive]}
                  onPress={() => {
                    haptics.light();
                    setManualWithFood(true);
                  }}
                >
                  <Text style={[styles.instructionLabel, manualWithFood && styles.instructionLabelActive]}>
                    {t('withFood')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.instructionBtn, !manualWithFood && styles.instructionBtnActive]}
                  onPress={() => {
                    haptics.light();
                    setManualWithFood(false);
                  }}
                >
                  <Text style={[styles.instructionLabel, !manualWithFood && styles.instructionLabelActive]}>
                    {t('emptyStomach')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('inputTime')}</Text>
              <View style={styles.timeSelectorRow}>
                <View style={styles.spinnerContainer}>
                  <ScrollView style={styles.spinner} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {HOURS.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.spinnerItem, selectedHour === h && styles.spinnerItemActive]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text style={[styles.spinnerText, selectedHour === h && styles.spinnerTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.spinnerSeparator}>:</Text>
                  <ScrollView style={styles.spinner} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {MINUTES.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.spinnerItem, selectedMinute === m && styles.spinnerItemActive]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.spinnerText, selectedMinute === m && styles.spinnerTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity style={styles.addTimeBtn} onPress={handleAddManualTime}>
                  <Plus size={16} color={colors.white} />
                  <Text style={styles.addTimeBtnText}>{t('add')}</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Times List */}
              {manualTimes.length > 0 && (
                <View style={styles.timeChipsContainer}>
                  {manualTimes.map(t => (
                    <View key={t} style={styles.timeChip}>
                      <Clock size={10} color={colors.textPrimary} />
                      <Text style={styles.timeChipText}>{t}</Text>
                      <TouchableOpacity onPress={() => handleRemoveManualTime(t)} style={styles.timeChipRemove}>
                        <Text style={styles.timeChipRemoveText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Alarm Settings Toggles */}
            <View style={styles.alarmSettingsContainer}>
              <Text style={styles.alarmSettingsTitle}>{t('reminderSettings')}</Text>
              <View style={styles.settingToggleRow}>
                <View>
                  <Text style={styles.toggleText}>{t('pushNotification')}</Text>
                  <Text style={styles.toggleSubText}>{t('pushNotificationSub')}</Text>
                </View>
                <Switch
                  value={enableNotification}
                  onValueChange={setEnableNotification}
                  trackColor={{ false: '#D1D1D1', true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
                />
              </View>

              <View style={styles.settingToggleRow}>
                <View>
                  <Text style={styles.toggleText}>{t('alarmSound')}</Text>
                  <Text style={styles.toggleSubText}>{t('alarmSoundSub')}</Text>
                </View>
                <Switch
                  value={enableSound}
                  onValueChange={setEnableSound}
                  disabled={!enableNotification}
                  trackColor={{ false: '#D1D1D1', true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('specialNote')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={language === 'bn' ? 'যেমন: ডাক্তারের পরামর্শ অনুযায়ী নিতে হবে...' : 'e.g. As directed by doctor...'}
                placeholderTextColor={colors.textSecondary}
                value={manualNotes}
                onChangeText={setManualNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, addManualMutation.isPending && styles.submitBtnDisabled]}
              onPress={handleAddManual}
              disabled={addManualMutation.isPending}
            >
              {addManualMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>{t('save')}</Text>
              )}
            </TouchableOpacity>
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

  // Mode Selection inside Add tab
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: '#FAFBF7',
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: 12,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  modeLabelActive: {
    color: colors.textPrimary,
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

  // Med Card
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
  alarmStatusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  badgeActive: {
    backgroundColor: '#FAFDF2',
    borderColor: 'rgba(167, 201, 36, 0.3)',
  },
  badgeInactive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  badgeTextActive: {
    fontFamily: fonts.bnBold,
    fontSize: 9,
    color: colors.primary,
  },
  badgeTextInactive: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
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
    width: '100%',
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
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
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
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  instructionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    borderRadius: 10,
    backgroundColor: '#FAFBF7',
  },
  instructionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  instructionLabel: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
  instructionLabelActive: {
    fontFamily: fonts.bnBold,
    color: colors.textPrimary,
  },

  // Time selector spinners
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spinnerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 90,
  },
  spinner: {
    flex: 1,
    height: '100%',
  },
  spinnerItem: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerItemActive: {
    backgroundColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: 6,
  },
  spinnerText: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
  },
  spinnerTextActive: {
    fontFamily: fonts.bnBold,
    color: colors.textPrimary,
  },
  spinnerSeparator: {
    fontSize: 16,
    fontFamily: fonts.bnBold,
    color: colors.textPrimary,
    marginHorizontal: 4,
  },
  addTimeBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  addTimeBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.white,
  },
  timeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 201, 36, 0.12)',
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 6,
  },
  timeChipText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  timeChipRemove: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipRemoveText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: 'bold',
    lineHeight: 14,
  },

  // Alarm Toggles
  alarmSettingsContainer: {
    width: '100%',
    backgroundColor: '#FAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  alarmSettingsTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 201, 36, 0.08)',
    paddingBottom: 4,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  toggleSubText: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
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
  errorText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  errorSubtext: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 6,
  },
});
