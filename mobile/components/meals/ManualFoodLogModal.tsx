import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { useState } from 'react';
import {
  X, Camera, ImagePlus, Utensils, CheckCircle2, AlertCircle,
  ChevronRight, Coffee, Moon, Apple, Sun,
} from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { mealTrackingApi } from '../../lib/api';
import { useHaptics } from '../../hooks/useHaptics';

const getImagePicker = () => {
  if (Platform.OS === 'web') return null;
  return require('expo-image-picker');
};

const SLOTS = [
  { id: 'breakfast', label: 'সকাল', icon: Coffee },
  { id: 'lunch', label: 'দুপুর', icon: Sun },
  { id: 'snack', label: 'স্ন্যাক', icon: Apple },
  { id: 'dinner', label: 'রাত', icon: Moon },
];

const UNITS = ['g', 'ml', 'টুকরো', 'কাপ', 'চামচ'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
  language?: 'bn' | 'en';
}

interface LogResult {
  success: boolean;
  total_calories: number;
  parsed_items: { name: string; amount_g: number; calories: number }[];
  ai_feedback: string;
  notFound: boolean;
}

export default function ManualFoodLogModal({ visible, onClose, onLogged, language = 'bn' }: Props) {
  const haptics = useHaptics();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [mealSlot, setMealSlot] = useState('snack');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LogResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const isBn = language === 'bn';

  const reset = () => {
    setFoodName('');
    setQuantity('');
    setUnit('g');
    setMealSlot('snack');
    setImageUri(null);
    setResult(null);
    setIsConfirmed(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const picker = getImagePicker();
    if (!picker) {
      Alert.alert(isBn ? 'শুধু মোবাইলে' : 'Mobile Only', isBn ? 'ছবি শুধু মোবাইলে কাজ করে।' : 'Image picking only works on mobile.');
      return;
    }
    haptics.light();
    const { status } = await picker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isBn ? 'অনুমতি প্রয়োজন' : 'Permission Required', isBn ? 'গ্যালারি অ্যাক্সেসের অনুমতি দিন।' : 'Grant gallery access permission.');
      return;
    }
    const result = await picker.launchImageLibraryAsync({ mediaTypes: picker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const picker = getImagePicker();
    if (!picker) return;
    haptics.light();
    const { status } = await picker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isBn ? 'অনুমতি প্রয়োজন' : 'Permission Required', isBn ? 'ক্যামেরা অ্যাক্সেসের অনুমতি দিন।' : 'Grant camera access permission.');
      return;
    }
    const res = await picker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
    }
  };

  // Convert unit to grams for the quantity field
  const getQuantityG = (): number | undefined => {
    const num = parseFloat(quantity);
    if (isNaN(num) || num <= 0) return undefined;
    const multipliers: Record<string, number> = { g: 1, ml: 1, টুকরো: 80, কাপ: 200, চামচ: 15 };
    return Math.round(num * (multipliers[unit] || 1));
  };

  const handleSubmit = async (previewMode = true) => {
    if (!foodName.trim() && !imageUri) {
      Alert.alert(isBn ? 'তথ্য দিন' : 'Enter Info', isBn ? 'খাবারের নাম বা ছবি দিন।' : 'Please enter a food name or add a photo.');
      return;
    }
    haptics.medium();
    setLoading(true);
    if (previewMode) {
      setResult(null);
      setIsConfirmed(false);
    }

    try {
      let res: any;
      const quantityG = getQuantityG();

      if (imageUri) {
        res = await mealTrackingApi.logFromImage(imageUri, {
          food_name: foodName.trim() || undefined,
          quantity_g: quantityG,
          meal_slot: mealSlot,
          language,
          preview: previewMode,
        });
      } else {
        // Text-only path — construct a natural language string
        const inputStr = quantityG
          ? `${quantityG}g ${foodName.trim()}`
          : foodName.trim();
        res = await mealTrackingApi.log(inputStr, mealSlot, language, false, previewMode, true);
      }

      const data = res.data;
      const isNotFound = (data.ai_feedback || '').includes('পাওয়া যায়নি') ||
        (data.ai_feedback || '').includes('No data found');

      setResult({
        success: true,
        total_calories: data.total_calories || 0,
        parsed_items: data.parsed_items || [],
        ai_feedback: data.ai_feedback || '',
        notFound: isNotFound,
      });

      haptics.success();
      if (!previewMode) {
        setIsConfirmed(true);
        onLogged(); // refresh parent dashboard list only after confirmation!
      }
    } catch (err: any) {
      haptics.error();
      const msg = err?.response?.data?.detail || (isBn ? 'লগ করতে সমস্যা হয়েছে।' : 'Failed to log food.');
      setResult({
        success: false,
        total_calories: 0,
        parsed_items: [],
        ai_feedback: msg,
        notFound: msg.includes('পাওয়া যায়নি') || msg.includes('No data found'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Utensils size={18} color={colors.white} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{isBn ? 'খাবার যোগ করুন' : 'Add Food'}</Text>
                <Text style={styles.headerSub}>{isBn ? 'পরিকল্পনার বাইরের খাবার' : 'Outside meal plan'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Photo Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{isBn ? '📷 ছবি (ঐচ্ছিক)' : '📷 Photo (Optional)'}</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                    <X size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                    <Camera size={20} color={colors.primary} />
                    <Text style={styles.photoBtnText}>{isBn ? 'ক্যামেরা' : 'Camera'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                    <ImagePlus size={20} color={colors.primary} />
                    <Text style={styles.photoBtnText}>{isBn ? 'গ্যালারি' : 'Gallery'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Food Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{isBn ? '🍛 খাবারের নাম' : '🍛 Food Name'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isBn ? 'যেমন: ভাত, ডাল, মুরগি...' : 'e.g. Rice, Dal, Chicken...'}
                placeholderTextColor={colors.textSecondary}
                value={foodName}
                onChangeText={setFoodName}
                returnKeyType="next"
              />
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{isBn ? '⚖️ পরিমাণ' : '⚖️ Quantity'}</Text>
              <View style={styles.quantityRow}>
                <TextInput
                  style={[styles.input, styles.quantityInput]}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, unit === u && styles.unitChipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Meal Slot */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{isBn ? '🕐 খাবারের সময়' : '🕐 Meal Time'}</Text>
              <View style={styles.slotRow}>
                {SLOTS.map(({ id, label, icon: Icon }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.slotChip, mealSlot === id && styles.slotChipActive]}
                    onPress={() => setMealSlot(id)}
                  >
                    <Icon size={14} color={mealSlot === id ? colors.white : colors.textSecondary} />
                    <Text style={[styles.slotText, mealSlot === id && styles.slotTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Result Card */}
            {result && (
              <View style={[styles.resultCard, result.notFound && styles.resultCardWarning]}>
                {result.notFound ? (
                  <>
                    <View style={styles.resultHeader}>
                      <AlertCircle size={18} color={colors.warning} />
                      <Text style={[styles.resultTitle, { color: colors.warning }]}>
                        {isBn ? 'ডাটাবেজে পাওয়া যায়নি' : 'Not Found in Database'}
                      </Text>
                    </View>
                    <Text style={styles.resultFeedback}>{result.ai_feedback}</Text>
                    <Text style={styles.resultHint}>
                      {isBn ? '💡 ভিন্ন নাম বা ইংরেজিতে চেষ্টা করুন' : '💡 Try a different name or English name'}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.resultHeader}>
                      <CheckCircle2 size={18} color={isConfirmed ? colors.success : colors.primary} />
                      <Text style={[styles.resultTitle, { color: isConfirmed ? colors.success : colors.primary }]}>
                        {isConfirmed
                          ? (isBn ? 'সফলভাবে লগ হয়েছে!' : 'Logged Successfully!')
                          : (isBn ? 'খাবারের বিবরণ (প্রিভিউ)' : 'Food Nutrition (Preview)')
                        }
                      </Text>
                      <View style={styles.calBadge}>
                        <Text style={styles.calBadgeText}>{result.total_calories} kcal</Text>
                      </View>
                    </View>
                    {result.parsed_items.map((item, i) => (
                      <View key={i} style={styles.parsedItem}>
                        <ChevronRight size={12} color={colors.primary} />
                        <Text style={styles.parsedItemText}>
                          {item.name} · {Math.round(item.amount_g)}g · <Text style={{ color: colors.primary }}>{Math.round(item.calories)} kcal</Text>
                        </Text>
                      </View>
                    ))}
                    <Text style={styles.resultFeedback}>{result.ai_feedback}</Text>
                    {!isConfirmed && (
                      <View style={styles.previewAlert}>
                        <CheckCircle2 size={14} color={colors.primary} />
                        <Text style={styles.previewAlertText}>
                          {isBn 
                            ? 'খাবারটি আপনার ডায়েরিতে যোগ করতে নিচের "নিশ্চিত করুন ও যোগ করুন" বোতামে চাপুন।'
                            : 'Press the "Confirm & Add" button below to track this food in your journal.'}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Submit / Action Buttons */}
            <View style={styles.buttonContainer}>
              {loading ? (
                <TouchableOpacity style={[styles.submitBtn, styles.submitBtnDisabled]} disabled>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={styles.submitText}>
                    {result && !isConfirmed
                      ? (isBn ? 'যোগ করা হচ্ছে...' : 'Adding...')
                      : (isBn ? 'খুঁজছি...' : 'Searching...')}
                  </Text>
                </TouchableOpacity>
              ) : result?.success && !result?.notFound ? (
                isConfirmed ? (
                  <View style={styles.rowButtons}>
                    <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={reset}>
                      <Text style={styles.submitText}>{isBn ? '✅ আরও যোগ করুন' : '✅ Add Another'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.submitBtn, styles.closeBtnSecondary]} onPress={handleClose}>
                      <Text style={[styles.submitText, { color: colors.textPrimary }]}>{isBn ? 'বন্ধ করুন' : 'Close'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.rowButtons}>
                    <TouchableOpacity style={[styles.submitBtn, styles.confirmBtn, { flex: 1 }]} onPress={() => handleSubmit(false)}>
                      <CheckCircle2 size={16} color={colors.white} />
                      <Text style={styles.submitText}>{isBn ? 'নিশ্চিত করুন ও যোগ করুন' : 'Confirm & Add'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.submitBtn, styles.cancelBtn]} onPress={reset}>
                      <Text style={[styles.submitText, { color: colors.textPrimary }]}>{isBn ? 'পুনরায় চেষ্টা' : 'Reset'}</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmit(true)}>
                  <Utensils size={18} color={colors.white} />
                  <Text style={styles.submitText}>{isBn ? 'খাবার খুঁজুন ও পুষ্টি দেখুন' : 'Search & View Nutrition'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, paddingTop: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.borderSolid,
    backgroundColor: colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bnBold, fontSize: 18, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary },
  closeBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.borderSolid,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },

  section: { gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.textPrimary },

  photoButtons: { flexDirection: 'row', gap: spacing.md },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary + '50',
  },
  photoBtnText: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.primary },

  imagePreviewContainer: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, borderRadius: radius.lg },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  input: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSolid,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontFamily: fonts.bn, fontSize: 16, color: colors.textPrimary,
  },
  quantityRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  quantityInput: { flex: 0, width: 100 },
  unitScroll: { flex: 1 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, marginRight: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSolid,
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontFamily: fonts.bnBold, fontSize: 13, color: colors.textSecondary },
  unitTextActive: { color: colors.white },

  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSolid,
  },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontFamily: fonts.bnBold, fontSize: 13, color: colors.textSecondary },
  slotTextActive: { color: colors.white },

  resultCard: {
    backgroundColor: colors.success + '10', borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.success + '40',
    padding: spacing.lg, gap: spacing.sm,
  },
  resultCardWarning: {
    backgroundColor: colors.warning + '10', borderColor: colors.warning + '40',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultTitle: { fontFamily: fonts.bnBold, fontSize: 15, flex: 1 },
  calBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  calBadgeText: { fontFamily: fonts.bnBold, fontSize: 12, color: colors.white },
  parsedItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  parsedItemText: { fontFamily: fonts.bn, fontSize: 13, color: colors.textPrimary, flex: 1 },
  resultFeedback: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  resultHint: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: spacing.md + 4, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontFamily: fonts.bnBold, fontSize: 17, color: colors.white },
  
  buttonContainer: { gap: spacing.md, marginTop: spacing.md },
  rowButtons: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  confirmBtn: { backgroundColor: colors.success, shadowColor: colors.success },
  cancelBtn: { 
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSolid,
    shadowColor: 'transparent', elevation: 0,
  },
  closeBtnSecondary: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSolid,
    shadowColor: 'transparent', elevation: 0,
  },
  previewAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.sm, padding: 8, borderRadius: radius.md,
    backgroundColor: 'rgba(167, 201, 36, 0.08)', borderWidth: 1, borderColor: colors.border,
  },
  previewAlertText: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary, flex: 1 },
});
