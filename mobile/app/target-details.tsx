import * as React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Dimensions, Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { mealPlanApi, profileApi, mealTrackingApi } from '../lib/api';
import { colors, fonts, spacing, radius } from '../lib/theme';
import { ArrowLeft, Flame, Zap, Utensils, Droplet, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTranslation } from '../lib/translations';

const { width } = Dimensions.get('window');

const NUTRIENT_METADATA: Record<string, { desc: string; foods: string[]; category: string }> = {
  "Vitamin A": {
    desc: "দৃষ্টিশক্তি ভালো রাখে, রোগ প্রতিরোধ ক্ষমতা বাড়ায় এবং ত্বক সুস্থ রাখে।",
    foods: ["গাজর", "মিষ্টি আলু", "পালং শাক", "পাকা আম", "ডিমের কুসুম", "মলা-ঢেলা মাছ"],
    category: "ভিটামিন"
  },
  "Ascorbic acids (C)": {
    desc: "ত্বক ও হাড়ের গঠনে সাহায্য করে, ক্ষত নিরাময় করে এবং রোগ প্রতিরোধ ক্ষমতা বাড়ায়।",
    foods: ["আমলকী", "পেয়ারা", "লেবু", "কমলা", "কাঁচামরিচ", "টমেটো"],
    category: "ভিটামিন"
  },
  "Vitamin D": {
    desc: "ক্যালসিয়াম শোষণে সাহায্য করে, হাড় ও দাঁত মজবুত করে।",
    foods: ["ডিমের কুসুম", "সামুদ্রিক মাছ", "দুধ", "মাশরুম", "সূর্যালোক"],
    category: "ভিটামিন"
  },
  "Vitamin E": {
    desc: "শক্তিশালী অ্যান্টিঅক্সিডেন্ট যা কোষকে ক্ষতি থেকে রক্ষা করে এবং ত্বক ভালো রাখে।",
    foods: ["কাঠবাদাম", "সূর্যমুখীর বীজ", "পালং শাক", "ব্রকলি", "সবজি তেল"],
    category: "ভিটামিন"
  },
  "Vitamin K": {
    desc: "রক্ত জমাট বাঁধতে সাহায্য করে এবং হাড়ের স্বাস্থ্য ভালো রাখে।",
    foods: ["বাঁধাকপি", "ব্রকলি", "পালং শাক", "সরিষা শাক", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Thiamine (B1)": {
    desc: "কার্বোহাইড্রেট থেকে শক্তি উৎপাদনে সাহায্য করে এবং স্নায়ুতন্ত্র সচল রাখে।",
    foods: ["লাল চালের ভাত", "ঢেঁকি ছাঁটা চাল", "আস্ত গম", "ডাল", "বাদাম"],
    category: "ভিটামিন"
  },
  "Riboflavin (B2)": {
    desc: "শক্তি উৎপাদন, কোষের বৃদ্ধি এবং লাল রক্তকণিকা তৈরিতে সাহায্য করে।",
    foods: ["দুধ", "দই", "ডিম", "কলিজা", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Niacin (B3)": {
    desc: "হজম প্রক্রিয়া উন্নত করে, ত্বক ভালো রাখে এবং স্নায়ুতন্ত্রের কার্যকারিতা বজায় রাখে।",
    foods: ["মুরগির মাংস", "মাছ", "বাদাম", "আস্ত শস্যদানা", "ডাল"],
    category: "ভিটামিন"
  },
  "Total B6": {
    desc: "মস্তিষ্কের বিকাশ, হরমোন নিয়ন্ত্রণ এবং হিমোগ্লোবিন তৈরিতে সাহায্য করে।",
    foods: ["কলা", "আলু", "মুরগির মাংস", "মাছ", "লাল চাল"],
    category: "ভিটামিন"
  },
  "Folate (total)": {
    desc: "ডিএনএ তৈরি এবং নতুন কোষ গঠনে অত্যন্ত গুরুত্বপূর্ণ, বিশেষ করে গর্ভবতী নারীদের জন্য।",
    foods: ["পালং শাক", "ডাল", "কমলা", "ব্রকলি", "ডিম", "সবুজ শাকসবজি"],
    category: "ভিটামিন"
  },
  "Pantothenic acid (B5)": {
    desc: "হরমোন ও কোলেস্টেরল তৈরিতে এবং খাদ্য থেকে শক্তি রূপান্তরে সাহায্য করে।",
    foods: ["ডিম", "মুরগির মাংস", "মাশরুম", "মিষ্টি আলু", "বাদাম"],
    category: "ভিটামিন"
  },
  "Biotin (B7)": {
    desc: "চুল, নখ এবং ত্বকের স্বাস্থ্য রক্ষায় ও শক্তি বিপাকে ভূমিকা রাখে।",
    foods: ["ডিমের কুসুম", "বাদাম", "মিষ্টি আলু", "ফুলকপি", "কলা"],
    category: "ভিটামিন"
  },
  "Calcium (Ca)": {
    desc: "হাড় ও দাঁত শক্ত করে এবং পেশী ও স্নায়ুর সঠিক কার্যকারিতা নিয়ন্ত্রণ করে।",
    foods: ["দুধ", "দই", "পনির", "ছোট মাছ (কাঁটাসহ)", "পালং শাক", "বাদাম"],
    category: "খনিজ"
  },
  "Iron (Fe)": {
    desc: "হিমোগ্লোবিন তৈরিতে সাহায্য করে যা সারা শরীরে অক্সিজেন বহন করে।",
    foods: ["কলিজা", "লাল মাংস", "কচু শাক", "পালং শাক", "ডাল", "আনার (বেদানা)"],
    category: "খনিজ"
  },
  "Magnesium (Mg)": {
    desc: "৩০০টিরও বেশি এনজাইম বিক্রিয়া নিয়ন্ত্রণ করে এবং স্নায়ু ও পেশীর শক্তি জোগায়।",
    foods: ["কাঠবাদাম", "পালং শাক", "কাজুবাদাম", "লাল চালের ভাত", "কলা"],
    category: "খনিজ"
  },
  "Phosphorus (P)": {
    desc: "হাড়ের গঠন মজবুত করে এবং শরীরের কোষ ও কলা মেরামতে সাহায্য করে।",
    foods: ["মাছ", "মুরগির মাংস", "দুধ", "ডিম", "বাদাম", "গম"],
    category: "খনিজ"
  },
  "Potassium (K)": {
    desc: "রক্তচাপ নিয়ন্ত্রণ করে, হৃদযন্ত্র সুস্থ রাখে এবং তরলের ভারসাম্য বজায় রাখে।",
    foods: ["ডাবের পানি", "কলা", "মিষ্টি আলু", "পালং শাক", "টমেটো", "ডাল"],
    category: "খনিজ"
  },
  "Sodium (Na)": {
    desc: "শরীরে তরলের ভারসাম্য বজায় রাখে এবং পেশী ও স্নায়ুর সংকোচন-প্রসারণ নিয়ন্ত্রণ করে।",
    foods: ["খাবার লবণ", "দুধ", "বিট শাক", "সামুদ্রিক মাছ"],
    category: "খনিজ"
  },
  "Zinc (Zn)": {
    desc: "রোগ প্রতিরোধ ক্ষমতা শক্তিশালী করে, ক্ষত নিরাময় ত্বরান্বিত করে এবং কোষ বিভাজনে সাহায্য করে।",
    foods: ["লাল মাংস", "মুরগির মাংস", "ডাল", "বাদাম", "আস্ত শস্যদানা"],
    category: "খনিজ"
  },
  "Copper (Cu)": {
    desc: "লোহা শোষণে, রক্তনালী ও স্নায়ুতন্ত্রের স্বাস্থ্য বজায় রাখতে ভূমিকা রাখে।",
    foods: ["কলিজা", "বাদাম", "আস্ত শস্যদানা", "সবুজ শাকসবজি", "ডার্ক চকলেট"],
    category: "খনিজ"
  },
  "Manganese (Mn)": {
    desc: "হাড়ের গঠনে, অ্যামিনো অ্যাসিড ও কার্বোহাইড্রেট বিপাকে সাহায্য করে।",
    foods: ["বাদাম", "ডাল", "আস্ত শস্যদানা", "সবুজ চা", "সবুজ শাকসবজি"],
    category: "খনিজ"
  },
  "Selenium (Se)": {
    desc: "কোষকে জারণ ক্ষতি থেকে রক্ষা করে এবং থাইরয়েড গ্রন্থির কার্যকারিতা সচল রাখে।",
    foods: ["সামুদ্রিক মাছ", "ডিম", "মুরগির মাংস", "লাল চালের ভাত", "বাদাম"],
    category: "খনিজ"
  },
  "Cis ω-6 Fatty acids": {
    desc: "মস্তিষ্কের সঠিক কার্যকারিতা বজায় রাখতে এবং কোষের বৃদ্ধিতে সাহায্য করে।",
    foods: ["সূর্যমুখী তেল", "সয়াবিন তেল", "বাদাম", "তিল তেল"],
    category: "ফ্যাটি অ্যাসিড"
  },
  "Cis ω-3 Fatty acids": {
    desc: "হৃদযন্ত্রের সুরক্ষা দেয়, কোলেস্টেরল কমায় এবং প্রদাহ দূর করতে সাহায্য করে।",
    foods: ["ইলিশ মাছ", "রুই মাছ", "তিসির তেল", "আখরোট", "চিয়া সিড"],
    category: "ফ্যাটি অ্যাসিড"
  },
  "Choline": {
    desc: "কোষের গঠন বজায় রাখতে, চর্বি বিপাক করতে এবং স্মৃতিশক্তি ও স্নায়ুতন্ত্রের কার্যকারিতা সচল রাখতে সাহায্য করে।",
    foods: ["ডিম", "গরুর কলিজা", "মুরগির মাংস", "ফুলকপি", "ব্রকলি", "সয়াবিন"],
    category: "ভিটামিন"
  },
  "Vitamin B12": {
    desc: "লাল রক্তকণিকা গঠনে, ডিএনএ সংশ্লেষণে এবং স্নায়ুতন্ত্রের কার্যকারিতা বজায় রাখতে অত্যন্ত গুরুত্বপূর্ণ ভূমিকা পালন করে।",
    foods: ["গরুর কলিজা", "সামুদ্রিক মাছ", "দুধ", "দই", "পনির", "ডিম", "মুরগির মাংস"],
    category: "ভিটামিন"
  },
  "Chloride (Cl)": {
    desc: "শরীরে তরল ও electrolytes এর ভারসাম্য বজায় রাখতে এবং পাকস্থলীতে হজমকারী অ্যাসিড (HCl) তৈরিতে সাহায্য করে।",
    foods: ["খাবার লবণ", "টমেটো", "লেটুস পাতা", "সবুজ শাকসবজি", "সামুদ্রিক মাছ"],
    category: "খনিজ"
  },
  "Iodine (I)": {
    desc: "থাইরয়েড হরমোন তৈরি করতে সাহায্য করে যা মেটাবলিজম, শারীরিক ও মানসিক বিকাশ এবং শক্তি নিয়ন্ত্রণ করে।",
    foods: ["আয়োডিনযুক্ত লবণ", "সামুদ্রিক মাছ", "চিংড়ি", "দুধ", "দই", "ডিম"],
    category: "খনিজ"
  }
};

const NUTRIENT_METADATA_EN: Record<string, { desc: string; foods: string[]; category: string }> = {
  "Vitamin A": {
    desc: "Maintains good vision, boosts immunity, and keeps skin healthy.",
    foods: ["Carrot", "Sweet Potato", "Spinach", "Ripe Mango", "Egg Yolk", "Mola/Dhela Fish"],
    category: "Vitamin"
  },
  "Ascorbic acids (C)": {
    desc: "Helps skin and bone formation, heals wounds, and boosts immunity.",
    foods: ["Amla", "Guava", "Lemon", "Orange", "Green Chili", "Tomato"],
    category: "Vitamin"
  },
  "Vitamin D": {
    desc: "Helps calcium absorption, strengthens bones and teeth.",
    foods: ["Egg Yolk", "Marine Fish", "Milk", "Mushroom", "Sunlight"],
    category: "Vitamin"
  },
  "Vitamin E": {
    desc: "A powerful antioxidant that protects cells from damage and keeps skin healthy.",
    foods: ["Almond", "Sunflower Seeds", "Spinach", "Broccoli", "Vegetable Oil"],
    category: "Vitamin"
  },
  "Vitamin K": {
    desc: "Helps blood clotting and maintains good bone health.",
    foods: ["Cabbage", "Broccoli", "Spinach", "Mustard Greens", "Green Leafy Vegetables"],
    category: "Vitamin"
  },
  "Thiamine (B1)": {
    desc: "Helps produce energy from carbohydrates and keeps the nervous system active.",
    foods: ["Brown Rice", "Hand-crushed Rice", "Whole Wheat", "Lentil", "Nut"],
    category: "Vitamin"
  },
  "Riboflavin (B2)": {
    desc: "Helps energy production, cell growth, and red blood cell formation.",
    foods: ["Milk", "Yogurt", "Egg", "Liver", "Green Leafy Vegetables"],
    category: "Vitamin"
  },
  "Niacin (B3)": {
    desc: "Improves digestion, keeps skin healthy, and maintains nervous system function.",
    foods: ["Chicken", "Fish", "Nut", "Whole Grain", "Lentil"],
    category: "Vitamin"
  },
  "Total B6": {
    desc: "Helps brain development, hormone regulation, and hemoglobin synthesis.",
    foods: ["Banana", "Potato", "Chicken", "Fish", "Brown Rice"],
    category: "Vitamin"
  },
  "Folate (total)": {
    desc: "Crucial for DNA synthesis and new cell formation, especially for pregnant women.",
    foods: ["Spinach", "Lentil", "Orange", "Broccoli", "Egg", "Green Leafy Vegetables"],
    category: "Vitamin"
  },
  "Pantothenic acid (B5)": {
    desc: "Helps hormone and cholesterol synthesis, and converts food to energy.",
    foods: ["Egg", "Chicken", "Mushroom", "Sweet Potato", "Nut"],
    category: "Vitamin"
  },
  "Biotin (B7)": {
    desc: "Plays a role in hair, nail, and skin health, and energy metabolism.",
    foods: ["Egg Yolk", "Nut", "Sweet Potato", "Cauliflower", "Banana"],
    category: "Vitamin"
  },
  "Calcium (Ca)": {
    desc: "Strengthens bones and teeth, and regulates proper muscle and nerve function.",
    foods: ["Milk", "Yogurt", "Cheese", "Small Fish (with bones)", "Spinach", "Nut"],
    category: "Mineral"
  },
  "Iron (Fe)": {
    desc: "Helps produce hemoglobin, which carries oxygen throughout the body.",
    foods: ["Liver", "Red Meat", "Colocasia Leaves", "Spinach", "Lentil", "Pomegranate"],
    category: "Mineral"
  },
  "Magnesium (Mg)": {
    desc: "Regulates more than 300 enzyme reactions and provides energy to nerves and muscles.",
    foods: ["Almond", "Spinach", "Cashew", "Brown Rice", "Banana"],
    category: "Mineral"
  },
  "Phosphorus (P)": {
    desc: "Strengthens bone structure and helps repair body cells and tissues.",
    foods: ["Fish", "Chicken", "Milk", "Egg", "Nut", "Wheat"],
    category: "Mineral"
  },
  "Potassium (K)": {
    desc: "Regulates blood pressure, keeps the heart healthy, and maintains fluid balance.",
    foods: ["Coconut Water", "Banana", "Sweet Potato", "Spinach", "Tomato", "Lentil"],
    category: "Mineral"
  },
  "Sodium (Na)": {
    desc: "Maintains fluid balance and regulates muscle and nerve contraction/relaxation.",
    foods: ["Table Salt", "Milk", "Beet Greens", "Marine Fish"],
    category: "Mineral"
  },
  "Zinc (Zn)": {
    desc: "Strengthens immunity, accelerates wound healing, and helps in cell division.",
    foods: ["Red Meat", "Chicken", "Lentil", "Nut", "Whole Grain"],
    category: "Mineral"
  },
  "Copper (Cu)": {
    desc: "Plays a role in iron absorption, maintaining blood vessel and nervous system health.",
    foods: ["Liver", "Nut", "Whole Grain", "Green Leafy Vegetables", "Dark Chocolate"],
    category: "Mineral"
  },
  "Manganese (Mn)": {
    desc: "Helps in bone formation, amino acid, and carbohydrate metabolism.",
    foods: ["Nut", "Lentil", "Whole Grain", "Green Tea", "Green Leafy Vegetables"],
    category: "Mineral"
  },
  "Selenium (Se)": {
    desc: "Protects cells from oxidative damage and keeps thyroid function healthy.",
    foods: ["Marine Fish", "Egg", "Chicken", "Brown Rice", "Nut"],
    category: "Mineral"
  },
  "Cis ω-6 Fatty acids": {
    desc: "Helps maintain proper brain function and cell growth.",
    foods: ["Sunflower Oil", "Soybean Oil", "Nut", "Sesame Oil"],
    category: "Fatty Acid"
  },
  "Cis ω-3 Fatty acids": {
    desc: "Protects the heart, reduces cholesterol, and helps eliminate inflammation.",
    foods: ["Hilsa Fish", "Rohu Fish", "Flaxseed Oil", "Walnut", "Chia Seeds"],
    category: "Fatty Acid"
  },
  "Choline": {
    desc: "Helps maintain cell structure, metabolize fat, and keep memory and nervous system active.",
    foods: ["Egg", "Beef Liver", "Chicken", "Cauliflower", "Broccoli", "Soybean"],
    category: "Vitamin"
  },
  "Vitamin B12": {
    desc: "Plays an extremely important role in red blood cell formation, DNA synthesis, and maintaining nervous system health.",
    foods: ["Beef Liver", "Marine Fish", "Milk", "Yogurt", "Cheese", "Egg", "Chicken"],
    category: "Vitamin"
  },
  "Chloride (Cl)": {
    desc: "Helps maintain fluid and electrolyte balance, and produce digestive acid (HCl) in the stomach.",
    foods: ["Table Salt", "Tomato", "Lettuce", "Green Leafy Vegetables", "Marine Fish"],
    category: "Mineral"
  },
  "Iodine (I)": {
    desc: "Helps produce thyroid hormones which regulate metabolism, physical and mental development, and energy.",
    foods: ["Iodized Salt", "Marine Fish", "Shrimp", "Milk", "Yogurt", "Egg"],
    category: "Mineral"
  }
};

const SOURCES = [
  { name: 'Shwapno', nameBn: 'স্বপ্ন', color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA', abbr: 'SW' },
  { name: 'Chaldal', nameBn: 'চালডাল', color: '#16A34A', bgColor: '#F0FDF4', borderColor: '#BBF7D0', abbr: 'CD' },
  { name: 'Pran', nameBn: 'প্রাণ', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA', abbr: 'PR' },
  { name: 'Foodpanda', nameBn: 'ফুডপান্ডা', color: '#DB2777', bgColor: '#FDF2F8', borderColor: '#FBCFE8', abbr: 'FP' },
  { name: 'Gorerbazarbd', nameBn: 'ঘরের বাজার', color: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', abbr: 'GB' },
  { name: 'Meena Bazaar', nameBn: 'মীনা বাজার', color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0', abbr: 'MB' }
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSourcesForFood(foodName: string, count: number = 3) {
  const hash = hashString(foodName);
  const shuffled = [...SOURCES].sort((a, b) => {
    const ha = hashString(foodName + a.name);
    const hb = hashString(foodName + b.name);
    return ha - hb;
  });
  return shuffled.slice(0, Math.min(count, SOURCES.length));
}

export default function TargetDetailsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const [selectedNutrient, setSelectedNutrient] = React.useState<any>(null);
  const { language } = useTranslation();

  // Queries (loads from react-query cache instantly)
  const dailyQ = useQuery({
    queryKey: ['daily_plan', 0, language],
    queryFn: async () => (await mealPlanApi.daily(language, false, 0)).data,
  });

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await profileApi.get()).data,
  });

  const trackingQ = useQuery({
    queryKey: ['today_tracking'],
    queryFn: async () => (await mealTrackingApi.today()).data,
    retry: false,
  });

  const isLoading = dailyQ.isLoading || profileQ.isLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{language === 'bn' ? 'পুষ্টির তথ্য লোড হচ্ছে...' : 'Loading nutritional information...'}</Text>
      </View>
    );
  }

  // Parse plan data
  const plan = dailyQ.data;
  const planData = plan?.plan_data;
  const rawCompleted = plan?.completed_slots;
  let completedSlots: string[] = [];
  if (rawCompleted) {
    try {
      completedSlots = typeof rawCompleted === 'string' ? JSON.parse(rawCompleted) : rawCompleted;
    } catch {
      completedSlots = [];
    }
  }

  const profile = profileQ.data?.profile;
  const tracking = trackingQ.data;

  // 1. Calculate Calorie and Macro Totals
  const meals = planData?.meals || [];

  // Sum macros and calories from completed plan slots
  const slotTotals = meals
    .filter((m: any) => completedSlots.includes(m.slot))
    .reduce((acc: any, m: any) => {
      const mealCals = (m.items || []).reduce((sum: number, item: any) => sum + (item.calories || 0), 0) || m.target_calories || 0;
      acc.calories += mealCals;
      // Since planned foods inside planData do not store macro fields individually, we calculate 
      // the slot's macros using clinical target ratios matching daily target distribution.
      acc.protein += (mealCals * 0.25) / 4;
      acc.carbs += (mealCals * 0.50) / 4;
      acc.fat += (mealCals * 0.25) / 9;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Add tracked (logged) macros
  const trackedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (Array.isArray(tracking)) {
    tracking.forEach((log: any) => {
      trackedTotals.calories += log.total_calories || 0;
      trackedTotals.protein += log.macros?.protein_g || 0;
      trackedTotals.carbs += log.macros?.carbs_g || 0;
      trackedTotals.fat += log.macros?.fat_g || 0;
    });
  }

  const consumed = {
    calories: Math.round(slotTotals.calories + trackedTotals.calories),
    protein: Math.round(slotTotals.protein + trackedTotals.protein),
    carbs: Math.round(slotTotals.carbs + trackedTotals.carbs),
    fat: Math.round(slotTotals.fat + trackedTotals.fat),
  };

  // Targets
  const targetCal = plan?.calorie_target || planData?.target_calories || profile?.target_calories || 2000;
  const targets = profile?.targets || {
    carbs_g: Math.round((targetCal * 0.5) / 4),
    protein_g: Math.round((targetCal * 0.25) / 4),
    fat_g: Math.round((targetCal * 0.25) / 9),
  };

  const progressCal = targetCal > 0 ? Math.min(1, consumed.calories / targetCal) : 0;
  const progressCarbs = targets.carbs_g > 0 ? Math.min(1, consumed.carbs / targets.carbs_g) : 0;
  const progressProtein = targets.protein_g > 0 ? Math.min(1, consumed.protein / targets.protein_g) : 0;
  const progressFat = targets.fat_g > 0 ? Math.min(1, consumed.fat / targets.fat_g) : 0;

  // Svg circular values
  const circleSize = 130;
  const strokeWidth = 10;
  const radiusCircle = (circleSize - strokeWidth) / 2;
  const circumference = radiusCircle * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressCal * circumference);

  // Micronutrients
  const microTargets = planData?.micronutrient_targets || [];
  const microCompletedCount = microTargets.filter((n: any) => n.percentage >= 100).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'bn' ? 'পুষ্টি বিশ্লেষণ' : 'Nutritional Analysis'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Modern Interactive Calorie Ring Hero Card */}
        <View style={styles.calCard}>
          <View style={styles.calCardHeader}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.calCardTitle}>{language === 'bn' ? 'আজকের ক্যালোরি বাজেট' : 'Today\'s Calorie Budget'}</Text>
          </View>

          <View style={styles.calRow}>
            {/* SVG Progress Ring */}
            <View style={styles.ringWrapper}>
              <Svg width={circleSize} height={circleSize}>
                <Defs>
                  <LinearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#A7C924" />
                    <Stop offset="100%" stopColor="#43A047" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radiusCircle}
                  stroke={colors.border}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radiusCircle}
                  stroke="url(#calGrad)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                />
              </Svg>
              <View style={styles.ringCenterText}>
                <Text style={styles.consumedCalVal}>{consumed.calories}</Text>
                <Text style={styles.consumedCalLbl}>kcal</Text>
              </View>
            </View>

            {/* Quick stats on the right side of Ring */}
            <View style={styles.calStatsRight}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{language === 'bn' ? 'সর্বমোট লক্ষ্য' : 'Daily Target'}</Text>
                <Text style={styles.statVal}>{targetCal} kcal</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{language === 'bn' ? 'বাকি আছে' : 'Remaining'}</Text>
                <Text style={[styles.statVal, { color: colors.warning }]}>
                  {Math.max(0, targetCal - consumed.calories)} kcal
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{language === 'bn' ? 'অগ্রগতি' : 'Progress'}</Text>
                <Text style={[styles.statVal, { color: colors.success }]}>
                  {Math.round(progressCal * 100)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Macros Bento Grid Section */}
        <Text style={styles.sectionTitle}>{language === 'bn' ? 'ম্যাক্রো পুষ্টির অনুপাত' : 'Macronutrient Ratios'}</Text>
        <View style={styles.bentoGrid}>
          {/* Card 1: Carbs */}
          <View style={styles.bentoCard}>
            <View style={[styles.macroIconCircle, { backgroundColor: colors.accent + '15' }]}>
              <Zap size={16} color={colors.accent} />
            </View>
            <Text style={styles.bentoCardLabel}>{language === 'bn' ? 'শর্করা (Carbs)' : 'Carbs'}</Text>
            <Text style={styles.bentoCardVal}>{consumed.carbs}g</Text>
            <Text style={styles.bentoCardTarget}>
              {language === 'bn' ? 'লক্ষ্য: ' : 'Target: '}<Text style={styles.bentoCardTargetNum}>{targets.carbs_g}g</Text>
            </Text>
            <View style={styles.bentoProgressBarBg}>
              <Svg width="100%" height="4">
                <Defs>
                  <LinearGradient id="carbsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#7ABDD1" />
                    <Stop offset="100%" stopColor="#3A90A7" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="4" rx="2" fill={colors.border} />
                <Rect width={`${progressCarbs * 100}%`} height="4" rx="2" fill="url(#carbsGrad)" />
              </Svg>
            </View>
          </View>

          {/* Card 2: Protein */}
          <View style={styles.bentoCard}>
            <View style={[styles.macroIconCircle, { backgroundColor: '#43A04715' }]}>
              <Utensils size={16} color="#43A047" />
            </View>
            <Text style={styles.bentoCardLabel}>{language === 'bn' ? 'প্রোটিন (Protein)' : 'Protein'}</Text>
            <Text style={styles.bentoCardVal}>{consumed.protein}g</Text>
            <Text style={styles.bentoCardTarget}>
              {language === 'bn' ? 'লক্ষ্য: ' : 'Target: '}<Text style={styles.bentoCardTargetNum}>{targets.protein_g}g</Text>
            </Text>
            <View style={styles.bentoProgressBarBg}>
              <Svg width="100%" height="4">
                <Defs>
                  <LinearGradient id="proteinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#8FB41E" />
                    <Stop offset="100%" stopColor="#43A047" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="4" rx="2" fill={colors.border} />
                <Rect width={`${progressProtein * 100}%`} height="4" rx="2" fill="url(#proteinGrad)" />
              </Svg>
            </View>
          </View>

          {/* Card 3: Fat */}
          <View style={styles.bentoCard}>
            <View style={[styles.macroIconCircle, { backgroundColor: '#FF8F0015' }]}>
              <Droplet size={16} color="#FF8F00" />
            </View>
            <Text style={styles.bentoCardLabel}>{language === 'bn' ? 'চর্বি (Fat)' : 'Fat'}</Text>
            <Text style={styles.bentoCardVal}>{consumed.fat}g</Text>
            <Text style={styles.bentoCardTarget}>
              {language === 'bn' ? 'লক্ষ্য: ' : 'Target: '}<Text style={styles.bentoCardTargetNum}>{targets.fat_g}g</Text>
            </Text>
            <View style={styles.bentoProgressBarBg}>
              <Svg width="100%" height="4">
                <Defs>
                  <LinearGradient id="fatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#FFB300" />
                    <Stop offset="100%" stopColor="#FF8F00" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="4" rx="2" fill={colors.border} />
                <Rect width={`${progressFat * 100}%`} height="4" rx="2" fill="url(#fatGrad)" />
              </Svg>
            </View>
          </View>
        </View>

        {/* Micronutrients Section Header */}
        <View style={styles.microHeaderRow}>
          <Text style={styles.sectionTitle}>{language === 'bn' ? 'ভিটামিন ও খনিজ লক্ষ্যমাত্রা' : 'Vitamin & Mineral Targets'}</Text>
          {microTargets.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.microCompletedBadge}>
                {language === 'bn' ? `${microCompletedCount}/${microTargets.length} সম্পন্ন` : `${microCompletedCount}/${microTargets.length} Completed`}
              </Text>
            </View>
          )}
        </View>

        {microTargets.length === 0 ? (
          <View style={styles.emptyMicroBox}>
            <Text style={styles.emptyMicroText}>
              {language === 'bn'
                ? 'আজকের ডায়েট পরিকল্পনা অনুযায়ী কোন ভিটামিন বা মিনারেল লক্ষ্যমাত্রা সংজ্ঞায়িত নেই। বিস্তারিত ট্র্যাকিং পেতে এআই দিয়ে মিল প্ল্যান তৈরি করুন।'
                : 'No vitamin or mineral targets are defined for today\'s meal plan. Generate an AI meal plan for detailed tracking.'}
            </Text>
          </View>
        ) : (
          <View style={styles.microGrid}>
            {microTargets.map((item: any, idx: number) => {
              const displayPct = Math.min(100, Math.round(item.percentage || 0));
              const isCompleted = item.percentage >= 100;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.microCard, isCompleted && styles.microCardCompleted]}
                  onPress={() => {
                    haptics.light();
                    setSelectedNutrient(item);
                  }}
                  activeOpacity={0.7}
                >
                  {/* Top: Name and check status */}
                  <View style={styles.microCardHeader}>
                    <View style={styles.microCardNameGroup}>
                      <Text style={styles.microCardNameBn} numberOfLines={1}>{language === 'bn' ? (item.name_bn || item.name) : item.name}</Text>
                      <Text style={styles.microCardNameEn} numberOfLines={1}>{item.name}</Text>
                    </View>
                    {isCompleted && (
                      <CheckCircle2 size={13} color={colors.success} style={{ marginTop: 2 }} />
                    )}
                  </View>

                  {/* Mid: Consumed target and percentage badge */}
                  <View style={styles.microCardMetrics}>
                    <Text style={styles.microCardValue} numberOfLines={1}>
                      {Math.round(item.consumed)}/{item.target}{item.unit}
                    </Text>
                    <View style={[styles.microBadge, isCompleted ? styles.microBadgeCompleted : styles.microBadgePending]}>
                      <Text style={[styles.microBadgeText, isCompleted ? styles.microBadgeTextCompleted : styles.microBadgeTextPending]}>
                        {displayPct}%
                      </Text>
                    </View>
                  </View>

                  {/* Bottom: SVG gradient progress bar */}
                  <View style={styles.microCardProgressBg}>
                    <Svg width="100%" height="4">
                      <Defs>
                        <LinearGradient id={`microGrad_${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor={isCompleted ? '#8FB41E' : '#BEE3ED'} />
                          <Stop offset="100%" stopColor={isCompleted ? '#43A047' : '#7ABDD1'} />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="4" rx="2" fill={colors.border} />
                      <Rect width={`${displayPct}%`} height="4" rx="2" fill={`url(#microGrad_${idx})`} />
                    </Svg>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Premium Nutrient Detail Modal */}
      <Modal
        visible={!!selectedNutrient}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNutrient(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setSelectedNutrient(null)}
          />
          <View style={styles.modalContent}>
            {selectedNutrient && (() => {
              const meta = language === 'bn' ? NUTRIENT_METADATA[selectedNutrient.name] : NUTRIENT_METADATA_EN[selectedNutrient.name];
              const displayPct = Math.min(100, Math.round(selectedNutrient.percentage || 0));
              const isCompleted = selectedNutrient.percentage >= 100;
              
              return (
                <View style={styles.modalInner}>
                  {/* Top Bar Indicator */}
                  <View style={styles.modalHandle} />
                  
                  {/* Title & Category Badge */}
                  <View style={styles.modalHeaderRow}>
                    <View style={styles.modalTitleGroup}>
                      <Text style={styles.modalTitleBn}>{language === 'bn' ? (selectedNutrient.name_bn || selectedNutrient.name) : selectedNutrient.name}</Text>
                      <Text style={styles.modalTitleEn}>{selectedNutrient.name}</Text>
                    </View>
                    {meta?.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{meta.category}</Text>
                      </View>
                    )}
                  </View>

                  {/* Consumed / Target Metrics Box */}
                  <View style={styles.metricsBox}>
                    <View>
                      <Text style={styles.metricLabel}>{language === 'bn' ? 'গৃহীত / লক্ষ্যমাত্রা' : 'Consumed / Target'}</Text>
                      <Text style={styles.metricValue}>
                        {Math.round(selectedNutrient.consumed)} {selectedNutrient.unit}
                        <Text style={styles.metricSlash}> / </Text>
                        {selectedNutrient.target} {selectedNutrient.unit}
                      </Text>
                    </View>
                    <View style={[styles.modalPctBadge, isCompleted ? styles.microBadgeCompleted : styles.microBadgePending]}>
                      <Text style={[styles.microBadgeText, isCompleted ? styles.microBadgeTextCompleted : styles.microBadgeTextPending]}>
                        {language === 'bn' ? `${displayPct}% সম্পন্ন` : `${displayPct}% Completed`}
                      </Text>
                    </View>
                  </View>

                  {/* কেন এটি প্রয়োজন? (Why is it needed?) */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionSubTitle}>{language === 'bn' ? 'কেন এটি প্রয়োজন?' : 'Why is it needed?'}</Text>
                    <Text style={styles.sectionDesc}>
                      {meta?.desc || (language === 'bn' ? "শরীরের বিভিন্ন শারীরিক প্রক্রিয়া সুষ্ঠুভাবে পরিচালনা করতে এবং সুস্বাস্থ্যের জন্য এটি অত্যন্ত প্রয়োজনীয়।" : "This is essential for various physical processes and overall good health.")}
                    </Text>
                  </View>

                  {/* সেরা খাদ্য উৎস (দেশী খাবার) (Recommended sources) */}
                  {meta?.foods && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionSubTitle}>{language === 'bn' ? 'সেরা খাদ্য উৎস (দেশী খাবার)' : 'Recommended Sources (Desi Foods)'}</Text>
                      <View style={styles.sourcesGrid}>
                        {meta.foods.map((food: string, i: number) => (
                          <View key={i} style={styles.sourcePill}>
                            <View style={styles.sourceDot} />
                            <Text style={styles.sourceText}>{food}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {/* কোথায় পাবেন (শপিং সোর্স / Where to get) */}
                  {meta?.foods && (() => {
                    const shoppingSources = getSourcesForFood(selectedNutrient.name, 3);
                    return (
                      <View style={styles.infoSection}>
                        <Text style={styles.sectionSubTitle}>{language === 'bn' ? 'কোথায় পাবেন (শপিং সোর্স)' : 'Where to Buy (Shopping Sources)'}</Text>
                        <View style={styles.shoppingSourcesRow}>
                          {shoppingSources.map((src: any, i: number) => (
                            <View
                              key={i}
                              style={[
                                styles.shoppingSourceBadge,
                                {
                                  backgroundColor: src.bgColor,
                                  borderColor: src.borderColor,
                                }
                              ]}
                            >
                              <View style={[styles.miniAbbrCircle, { backgroundColor: src.color }]}>
                                <Text style={styles.miniAbbrText}>{src.abbr}</Text>
                              </View>
                              <Text style={[styles.shoppingSourceName, { color: src.color }]}>
                                {language === 'bn' ? src.nameBn : src.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Close Button */}
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => {
                      haptics.light();
                      setSelectedNutrient(null);
                    }}
                  >
                    <Text style={styles.closeBtnText}>{language === 'bn' ? 'ঠিক আছে' : 'OK'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    fontFamily: fonts.bn,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  calCard: {
    backgroundColor: colors.glass,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 201, 36, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  calCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  calCardTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrapper: {
    width: 130,
    height: 130,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedCalVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  consumedCalLbl: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -2,
  },
  calStatsRight: {
    flex: 1,
    marginLeft: spacing.lg,
    gap: spacing.sm,
  },
  statBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + '40',
    paddingLeft: spacing.sm,
  },
  statLabel: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  statVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  bentoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: spacing.sm + 2,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  macroIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bentoCardLabel: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  bentoCardVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bentoCardTarget: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bentoCardTargetNum: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  bentoProgressBarBg: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  microHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badgeContainer: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  microCompletedBadge: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.success,
    backgroundColor: colors.success + '15',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  emptyMicroBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyMicroText: {
    fontFamily: fonts.bn,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  microCard: {
    width: (width - spacing.md * 2 - spacing.sm) / 2,
    backgroundColor: colors.glass,
    borderRadius: 18,
    padding: spacing.sm + 2,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.2)',
    justifyContent: 'space-between',
    minHeight: 102,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  microCardCompleted: {
    borderColor: colors.success + '20',
    backgroundColor: colors.success + '03',
  },
  microCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  microCardNameGroup: {
    flex: 1,
    marginRight: 4,
  },
  microCardNameBn: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  microCardNameEn: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  microCardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm - 2,
  },
  microCardValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 4,
  },
  microBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  microBadgeCompleted: {
    backgroundColor: colors.success + '15',
  },
  microBadgePending: {
    backgroundColor: colors.accent + '15',
  },
  microBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
  },
  microBadgeTextCompleted: {
    color: colors.success,
  },
  microBadgeTextPending: {
    color: colors.accent,
  },
  microCardProgressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  // Modal Overlay & Layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  modalInner: {
    alignItems: 'stretch',
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  modalTitleBn: {
    fontFamily: fonts.bnBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  modalTitleEn: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  categoryBadgeText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  metricLabel: {
    fontFamily: fonts.bn,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  metricSlash: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  modalPctBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionSubTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 14.5,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  sourceText: {
    fontFamily: fonts.bnBold,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  shoppingSourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shoppingSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniAbbrCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  miniAbbrText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.white,
    lineHeight: 11,
  },
  shoppingSourceName: {
    fontFamily: fonts.bnBold,
    fontSize: 11.5,
  },
  closeBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.white,
  },
});
