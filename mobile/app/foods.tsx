import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { foodsApi } from '../lib/api';
import { colors, fonts } from '../lib/theme';
import {
  ArrowLeft,
  Search,
  Apple,
  Shield,
  AlertTriangle,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/###/g, '').trim();
};

const SAFETY_CONFIG = {
  safe: { label: 'নিরাপদ', icon: Shield, color: '#137333', bg: '#E6F4EA', borderColor: '#34A85330' },
  caution: { label: 'সতর্কতা', icon: AlertTriangle, color: '#B06000', bg: '#FEF7E0', borderColor: '#FBBC0430' },
  avoid: { label: 'এড়িয়ে চলুন', icon: XCircle, color: '#C5221F', bg: '#FCE8E6', borderColor: '#EA433530' },
};

function FoodCard({
  food,
  showInsight,
  expandedCode,
  onToggle,
}: {
  food: any;
  showInsight: boolean;
  expandedCode: string | null;
  onToggle: (code: string) => void;
}) {
  const safetyKey = (food.safety as keyof typeof SAFETY_CONFIG) || 'safe';
  const safety = SAFETY_CONFIG[safetyKey] || SAFETY_CONFIG.safe;
  const SafetyIcon = safety.icon;
  const isExpanded = expandedCode === food.code;

  // Calculate macro percentages
  const protein = food.protein || 0;
  const carbs = food.carbs || 0;
  const fat = food.fat || 0;
  const total = protein + carbs + fat;
  const proteinPct = total > 0 ? Math.round((protein / total) * 100) : 0;
  const carbsPct = total > 0 ? Math.round((carbs / total) * 100) : 0;
  const fatPct = total > 0 ? Math.round((fat / total) * 100) : 0;

  // Detail query for selected food rules
  const { data: foodDetail } = useQuery({
    queryKey: ['food_detail', food.code],
    queryFn: async () => (await foodsApi.detail(food.code)).data,
    enabled: isExpanded,
  });

  return (
    <View style={[styles.foodCard, isExpanded && styles.foodCardExpanded]}>
      <TouchableOpacity
        style={styles.foodCardHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle(food.code);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.foodIconBox}>
          <Apple size={16} color={colors.textPrimary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.foodNameBn} numberOfLines={1}>
              {food.name_bn}
            </Text>
            <View style={[styles.safetyBadge, { backgroundColor: safety.bg, borderColor: safety.borderColor }]}>
              <SafetyIcon size={10} color={safety.color} />
              <Text style={[styles.safetyText, { color: safety.color }]}>{safety.label}</Text>
            </View>
          </View>
          <Text style={styles.foodNameEn} numberOfLines={1}>
            {food.name_en}
          </Text>
        </View>

        <View style={styles.caloriesBox}>
          <Text style={styles.caloriesText}>{food.calories ?? '?'}</Text>
          <Text style={styles.caloriesUnit}>kcal / ১০০g</Text>
        </View>

        <View style={{ marginLeft: 6 }}>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={16} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Macros Row */}
          <View style={styles.macrosGrid}>
            {[
              { label: 'প্রোটিন', val: food.protein ?? '--', color: '#137333' },
              { label: 'শর্করা', val: food.carbs ?? '--', color: colors.accent },
              { label: 'চর্বি', val: food.fat ?? '--', color: '#B06000' },
              { label: 'ফাইবার', val: food.fiber ?? '--', color: colors.textSecondary },
            ].map((m, i) => (
              <View key={i} style={styles.macroCard}>
                <Text style={styles.macroCardLabel}>{m.label}</Text>
                <Text style={[styles.macroCardVal, { color: m.color }]}>
                  {m.val !== '--' ? `${m.val}g` : '--'}
                </Text>
              </View>
            ))}
          </View>

          {/* Macro distribution progress bar */}
          {total > 0 && (
            <View style={styles.distBarContainer}>
              <View style={styles.distBarLabels}>
                <Text style={styles.distLabel}>পুষ্টির বিভাজন %</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={[styles.distPctText, { color: '#137333' }]}>P: {proteinPct}%</Text>
                  <Text style={[styles.distPctText, { color: colors.accent }]}>C: {carbsPct}%</Text>
                  <Text style={[styles.distPctText, { color: '#B06000' }]}>F: {fatPct}%</Text>
                </View>
              </View>
              <View style={styles.distBarTrack}>
                {proteinPct > 0 && (
                  <View style={[styles.distBarSegment, { width: `${proteinPct}%`, backgroundColor: '#34A853' }]} />
                )}
                {carbsPct > 0 && (
                  <View style={[styles.distBarSegment, { width: `${carbsPct}%`, backgroundColor: colors.accent }]} />
                )}
                {fatPct > 0 && (
                  <View style={[styles.distBarSegment, { width: `${fatPct}%`, backgroundColor: '#FBBC05' }]} />
                )}
              </View>
            </View>
          )}

          {/* AI Insight */}
          {showInsight && food.ai_insight ? (
            <View style={styles.aiInsightBox}>
              <View style={styles.aiInsightHeader}>
                <Sparkles size={12} color={colors.primary} />
                <Text style={styles.aiInsightTitle}>AI বিশ্লেষণ</Text>
              </View>
              <Text style={styles.aiInsightText}>{cleanMarkdown(food.ai_insight)}</Text>
            </View>
          ) : null}

          {/* Food Details Rules */}
          {foodDetail?.rules && foodDetail.rules.length > 0 && (
            <View style={styles.rulesContainer}>
              {foodDetail.rules.map((rule: any, i: number) => {
                const isAvoid = rule.action === 'AVOID';
                return (
                  <View
                    key={i}
                    style={[
                      styles.ruleCard,
                      {
                        backgroundColor: isAvoid ? '#FCE8E6' : '#E6F4EA',
                        borderColor: isAvoid ? '#EA433530' : '#34A85330',
                      },
                    ]}
                  >
                    <Text style={[styles.ruleTitle, { color: isAvoid ? '#C5221F' : '#137333' }]}>
                      {isAvoid ? '⚠️ এড়িয়ে চলুন' : '✅ পছন্দনীয়'}
                      {rule.condition ? ` (${rule.condition})` : ''}
                    </Text>
                    <Text style={[styles.ruleReason, { color: isAvoid ? '#C5221F' : '#137333' }]}>
                      {rule.reason}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function FoodsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [tab, setTab] = useState<'safe' | 'search'>('safe');
  const [query, setQuery] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Queries
  const { data: safeFoods, isLoading: safeFoodsLoading } = useQuery({
    queryKey: ['safe_foods'],
    queryFn: async () => (await foodsApi.safeFoods()).data,
    enabled: tab === 'safe',
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search_foods', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      return (await foodsApi.searchWithInsight(query)).data;
    },
    enabled: tab === 'search' && query.length >= 2,
  });

  const handleToggle = (code: string) => {
    haptics.light();
    setExpandedCode((prev) => (prev === code ? null : code));
  };

  const handleTabChange = (t: 'safe' | 'search') => {
    haptics.light();
    setTab(t);
    setExpandedCode(null);
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
          <Text style={styles.headerTitle}>খাবারের তালিকা</Text>
          <Text style={styles.headerSubtitle}>খাদ্য তথ্য এবং স্বাস্থ্য সুরক্ষার নির্দেশিকা</Text>
        </View>
      </View>

      {/* TABS CONTROL */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsGroup}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'safe' && styles.tabBtnActive]}
            onPress={() => handleTabChange('safe')}
          >
            <Shield size={14} color={tab === 'safe' ? colors.white : colors.textSecondary} />
            <Text style={[styles.tabLabel, tab === 'safe' && styles.tabLabelActive]}>নিরাপদ খাবার</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'search' && styles.tabBtnActive]}
            onPress={() => handleTabChange('search')}
          >
            <Search size={14} color={tab === 'search' ? colors.white : colors.textSecondary} />
            <Text style={[styles.tabLabel, tab === 'search' && styles.tabLabelActive]}>খাবার খুঁজুন</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH INPUT BAR */}
      {tab === 'search' && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="খাবারের নাম লিখে খুঁজুন (যেমন: গাজর, ভাত)..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>
      )}

      {/* LIST OF FOODS */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'safe' && (
          <>
            {safeFoodsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
            ) : !safeFoods || safeFoods.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>কোনো নিরাপদ খাবার পাওয়া যায়নি</Text>
              </View>
            ) : (
              safeFoods.map((food: any) => (
                <FoodCard
                  key={food.code}
                  food={food}
                  showInsight={false}
                  expandedCode={expandedCode}
                  onToggle={handleToggle}
                />
              ))
            )}
          </>
        )}

        {tab === 'search' && (
          <>
            {searchLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
            ) : query.length < 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>অনুসন্ধান করতে কমপক্ষে ২টি অক্ষর লিখুন</Text>
              </View>
            ) : !searchResults || searchResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>কোনো ফলাফল পাওয়া যায়নি</Text>
              </View>
            ) : (
              searchResults.map((food: any) => (
                <FoodCard
                  key={food.code}
                  food={food}
                  showInsight={true}
                  expandedCode={expandedCode}
                  onToggle={handleToggle}
                />
              ))
            )}
          </>
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

  searchBarContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 201, 36, 0.08)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBF7',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.25)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textPrimary,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Food Card (Highly glossy light cream/green theme card)
  foodCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.18)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  foodCardExpanded: {
    borderColor: 'rgba(167, 201, 36, 0.4)',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  foodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F3E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodNameBn: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textPrimary,
    maxWidth: 120,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 3,
  },
  safetyText: {
    fontFamily: fonts.bnBold,
    fontSize: 9,
  },
  foodNameEn: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  caloriesBox: {
    alignItems: 'flex-end',
  },
  caloriesText: {
    fontFamily: fonts.bnBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  caloriesUnit: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
  },

  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 201, 36, 0.08)',
    paddingTop: 12,
    gap: 12,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#FAFBF7',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.08)',
  },
  macroCardLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  macroCardVal: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
  },

  // Segmented bar
  distBarContainer: {
    gap: 6,
  },
  distBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distLabel: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
  },
  distPctText: {
    fontFamily: fonts.bnBold,
    fontSize: 9,
  },
  distBarTrack: {
    height: 6,
    backgroundColor: '#F0F3E6',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  distBarSegment: {
    height: '100%',
  },

  // AI Insight
  aiInsightBox: {
    backgroundColor: 'rgba(167, 201, 36, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiInsightTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  aiInsightText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Rules
  rulesContainer: {
    gap: 8,
  },
  ruleCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 0.8,
    gap: 2,
  },
  ruleTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
  },
  ruleReason: {
    fontFamily: fonts.bn,
    fontSize: 11,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
