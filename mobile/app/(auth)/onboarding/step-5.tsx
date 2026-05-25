import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useOnboardingStore } from '../../../store/onboarding-store';
import { colors, fonts, spacing, radius } from '../../../lib/theme';
import { ArrowRight, Check, Search, X } from 'lucide-react-native';

const ALL_DISEASES = [
  { id: 'Diabetes', labelBn: 'ডায়াবেটিস', labelEn: 'Diabetes' },
  { id: 'Hypertension', labelBn: 'উচ্চ রক্তচাপ', labelEn: 'Hypertension' },
  { id: 'Obesity', labelBn: 'স্থূলতা', labelEn: 'Obesity' },
  { id: 'Gastric', labelBn: 'গ্যাস্ট্রিক', labelEn: 'Gastric' },
  { id: 'Thyroid Disorders', labelBn: 'থাইরয়েড সমস্যা', labelEn: 'Thyroid Disorders' },
  { id: 'Anemia', labelBn: 'রক্তশূন্যতা', labelEn: 'Anemia' },
  { id: 'Kidney Disease', labelBn: 'কিডনি রোগ', labelEn: 'Kidney Disease' },
  { id: 'Arthritis', labelBn: 'বাতের ব্যথা', labelEn: 'Arthritis' },
  { id: 'Asthma', labelBn: 'অ্যাজমা', labelEn: 'Asthma' },
  { id: 'Migraine', labelBn: 'মাইগ্রেন', labelEn: 'Migraine' },
  { id: 'Depression', labelBn: 'হতাশা', labelEn: 'Depression' },
  { id: 'Anxiety', labelBn: 'দুশ্চিন্তা', labelEn: 'Anxiety' },
  { id: 'Insomnia', labelBn: 'অনিদ্রা', labelEn: 'Insomnia' },
  { id: 'Tonsillitis', labelBn: 'টনসিল', labelEn: 'Tonsillitis' },
  { id: 'Common Cold', labelBn: 'সর্দি-কাশি', labelEn: 'Common Cold' },
  { id: 'Flu', labelBn: 'ইনফ্লুয়েঞ্জা', labelEn: 'Flu' },
  { id: 'COVID-19', labelBn: 'কোভিড-১৯', labelEn: 'COVID-19' },
  { id: 'Sinusitis', labelBn: 'সাইনাস', labelEn: 'Sinusitis' },
  { id: 'Strep Throat', labelBn: 'গলা ব্যথা', labelEn: 'Strep Throat' },
  { id: 'Diarrhea', labelBn: 'ডায়রিয়া', labelEn: 'Diarrhea' },
  { id: 'Constipation', labelBn: 'কোষ্ঠকাঠিন্য', labelEn: 'Constipation' },
  { id: 'Urinary Tract Infection (UTI)', labelBn: 'ইউটিআই', labelEn: 'UTI' },
  { id: 'Malaria', labelBn: 'ম্যালেরিয়া', labelEn: 'Malaria' },
  { id: 'Dengue Fever', labelBn: 'ডেঙ্গু জ্বর', labelEn: 'Dengue Fever' },
  { id: 'Typhoid', labelBn: 'টাইফয়েড', labelEn: 'Typhoid' },
  { id: 'Gastroenteritis', labelBn: 'গ্যাস্ট্রোএন্টারাইটিস', labelEn: 'Gastroenteritis' },
  { id: 'Food Poisoning', labelBn: 'ফুড পয়জনিং', labelEn: 'Food Poisoning' },
  { id: 'Allergies (food/seasonal)', labelBn: 'অ্যালার্জি', labelEn: 'Allergies' },
  { id: 'Bronchitis', labelBn: 'ব্রঙ্কাইটিস', labelEn: 'Bronchitis' },
  { id: 'Pneumonia', labelBn: 'নিউমোনিয়া', labelEn: 'Pneumonia' },
  { id: 'Meningitis', labelBn: 'মেনিনজাইটিস', labelEn: 'Meningitis' },
  { id: 'Hepatitis A', labelBn: 'হেপাটাইটিস এ', labelEn: 'Hepatitis A' },
  { id: 'Hepatitis B', labelBn: 'হেপাটাইটিস বি', labelEn: 'Hepatitis B' },
  { id: 'Chickenpox', labelBn: 'জলবসন্ত', labelEn: 'Chickenpox' },
  { id: 'Measles', labelBn: 'হাম', labelEn: 'Measles' },
  { id: 'Mumps', labelBn: 'মাম্পস', labelEn: 'Mumps' },
  { id: 'Skin Infection', labelBn: 'ত্বকের ইনফেকশন', labelEn: 'Skin Infection' },
  { id: 'Ringworm', labelBn: 'দাদ', labelEn: 'Ringworm' },
  { id: 'Scabies', labelBn: 'পাঁচড়া', labelEn: 'Scabies' },
  { id: 'Eczema', labelBn: 'একজিমা', labelEn: 'Eczema' },
  { id: 'Psoriasis', labelBn: 'সোরিয়াসিস', labelEn: 'Psoriasis' },
  { id: 'Osteoporosis', labelBn: 'অস্টিওপরোসিস', labelEn: 'Osteoporosis' },
  { id: 'Tuberculosis (TB)', labelBn: 'যক্ষ্মা', labelEn: 'Tuberculosis' },
  { id: 'Leprosy', labelBn: 'কুষ্ঠরোগ', labelEn: 'Leprosy' },
  { id: 'Filariasis', labelBn: 'ফাইলেরিয়াসিস', labelEn: 'Filariasis' },
  { id: 'Cholera', labelBn: 'কলেরা', labelEn: 'Cholera' },
  { id: 'Dysentery', labelBn: 'আমাশয়', labelEn: 'Dysentery' },
  { id: 'Heat Stroke', labelBn: 'হিট স্ট্রোক', labelEn: 'Heat Stroke' },
  { id: 'Dehydration', labelBn: 'পানিশূন্যতা', labelEn: 'Dehydration' },
  { id: 'Snake Bite', labelBn: 'সাপের কামড়', labelEn: 'Snake Bite' },
  { id: 'Scorpion Sting', labelBn: 'বিচ্ছুর হুল', labelEn: 'Scorpion Sting' },
  { id: 'Insect Bite Allergy', labelBn: 'পোকার কামড় অ্যালার্জি', labelEn: 'Insect Bite Allergy' },
  { id: 'Burns', labelBn: 'পুড়ে যাওয়া', labelEn: 'Burns' },
  { id: 'Wounds', labelBn: 'ক্ষত', labelEn: 'Wounds' },
  { id: 'Sprains', labelBn: 'মচকানো', labelEn: 'Sprains' },
  { id: 'Fractures', labelBn: 'হাড় ভাঙা', labelEn: 'Fractures' },
  { id: 'Headache', labelBn: 'মাথা ব্যথা', labelEn: 'Headache' },
  { id: 'Epilepsy', labelBn: 'মৃগীরোগ', labelEn: 'Epilepsy' },
  { id: 'Stroke', labelBn: 'স্ট্রোক', labelEn: 'Stroke' },
  { id: 'Parkinson’s Disease', labelBn: 'পারকিনসন্স', labelEn: 'Parkinson’s Disease' },
  { id: 'Alzheimer’s Disease', labelBn: 'আলঝেইমার্স', labelEn: 'Alzheimer’s Disease' },
  { id: 'Schizophrenia', labelBn: 'সিজোফ্রেনিয়া', labelEn: 'Schizophrenia' },
  { id: 'Malnutrition', labelBn: 'অপুষ্টি', labelEn: 'Malnutrition' },
  { id: 'Goiter', labelBn: 'গলগণ্ড', labelEn: 'Goiter' },
  { id: 'Night Blindness', labelBn: 'রাতকানা', labelEn: 'Night Blindness' },
  { id: 'Scurvy', labelBn: 'স্কার্ভি', labelEn: 'Scurvy' },
  { id: 'Rickets', labelBn: 'রিকেটস', labelEn: 'Rickets' },
  { id: 'Osteomalacia', labelBn: 'অস্টিওম্যালাশিয়া', labelEn: 'Osteomalacia' },
  { id: 'Beriberi', labelBn: 'বেরিবেরি', labelEn: 'Beriberi' },
  { id: 'Pellagra', labelBn: 'পেলাগ্রা', labelEn: 'Pellagra' },
  { id: 'Kwashiorkor', labelBn: 'কোয়াশিয়রকর', labelEn: 'Kwashiorkor' },
  { id: 'Marasmus', labelBn: 'ম্যারাসমাস', labelEn: 'Marasmus' },
];

export default function Step5Screen() {
  const router = useRouter();
  const { data, updateData } = useOnboardingStore();
  const [search, setSearch] = useState('');

  const medicalConditions = data.medical_conditions || [];

  const toggleCondition = (val: string) => {
    if (medicalConditions.includes(val)) {
      updateData({ medical_conditions: medicalConditions.filter((c) => c !== val) });
    } else {
      updateData({ medical_conditions: [...medicalConditions, val] });
    }
  };

  const selectedDiseases = ALL_DISEASES.filter((d) => medicalConditions.includes(d.id));
  const filteredDiseases = ALL_DISEASES.filter(
    (d) =>
      d.labelBn.toLowerCase().includes(search.toLowerCase()) ||
      d.labelEn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>স্বাস্থ্য অবস্থা</Text>
        <Text style={styles.subtitle}>প্রযোজ্য ক্ষেত্রে এক বা একাধিক নির্বাচন করুন (ঐচ্ছিক)</Text>

        {/* Selected Conditions Badges */}
        {selectedDiseases.length > 0 && (
          <View style={styles.selectedWrapper}>
            <Text style={styles.sectionLabel}>নির্বাচিত সমস্যাসমূহ ({selectedDiseases.length}):</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.badgesList}
            >
              {selectedDiseases.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.badge}
                  onPress={() => toggleCondition(c.id)}
                >
                  <Text style={styles.badgeText}>{c.labelBn}</Text>
                  <X size={14} color={colors.white} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="সমস্যা খুঁজুন (যেমন: ডায়াবেটিস, Obesity...)"
            placeholderTextColor={colors.textSecondary}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List of Conditions */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredDiseases.length > 0 ? (
            filteredDiseases.map((c) => {
              const isSelected = medicalConditions.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.card, isSelected && styles.cardActive]}
                  onPress={() => toggleCondition(c.id)}
                >
                  <View>
                    <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]}>
                      {c.labelBn}
                    </Text>
                    <Text style={styles.cardSubtitle}>{c.labelEn}</Text>
                  </View>
                  {isSelected && <Check size={20} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyText}>কোনো রোগ খুঁজে পাওয়া যায়নি</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={styles.nextBtn} 
          onPress={() => router.push('/(auth)/onboarding/step-6')}
        >
          <Text style={styles.nextBtnText}>পরবর্তী ধাপ</Text>
          <ArrowRight size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: 40 },
  title: { fontFamily: fonts.bnBold, fontSize: 30, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.bn, fontSize: 15, color: colors.textSecondary, marginBottom: spacing.md },
  
  selectedWrapper: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  badgesList: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  badge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 4,
  },
  badgeText: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.white,
  },

  searchWrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.bn,
    fontSize: 15,
    color: colors.textPrimary,
  },

  list: { flex: 1 },
  card: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  cardTitle: { fontFamily: fonts.bn, fontSize: 17, color: colors.textPrimary },
  cardSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardTitleActive: { fontFamily: fonts.bnBold, color: colors.primary },
  
  emptyWrapper: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
  },

  nextBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.md,
  },
  nextBtnText: { fontFamily: fonts.bnBold, fontSize: 18, color: colors.white },
});
