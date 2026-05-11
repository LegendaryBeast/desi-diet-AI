export type MedicalCondition = 
  | 'diabetes' 
  | 'hypertension' 
  | 'kidney' 
  | 'obesity' 
  | 'heart' 
  | 'thyroid' 
  | 'gastric' 
  | 'anemia';

export interface UserProfile {
  id: string;
  nameBn: string;
  nameEn: string;
  age: number;
  gender: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  goal: 'weight_loss' | 'weight_gain' | 'maintain';
  conditions: MedicalCondition[];
  preferredFoods: string[];
  dislikedFoods: string[];
}

export interface HealthEntry {
  id: string;
  date: string;
  weightKg?: number;
  bloodPressure?: string;
  bloodSugar?: number;
  notes?: string;
}

export interface FoodItem {
  nameBn: string;
  nameEn: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSlot {
  id: string;
  nameBn: string;
  nameEn: string;
  targetCalories: number;
  foods: FoodItem[];
}

export interface MealPlan {
  date: string;
  slots: MealSlot[];
  totalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}
