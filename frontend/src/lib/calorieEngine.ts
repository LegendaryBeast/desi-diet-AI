export interface NutritionTargets {
  targetCalories: number;
  ibwKg: number;
  bmi: number;
  bmiCategory: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterL: number;
}

export const calculateNutrition = (
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active',
  goal: 'weight_loss' | 'weight_gain' | 'maintain'
): NutritionTargets => {
  // Safety check for invalid/missing inputs
  if (!weightKg || !heightCm || !age) {
    return {
      targetCalories: 0,
      ibwKg: 0,
      bmi: 0,
      bmiCategory: '---',
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      waterL: 0
    };
  }

  // 1. Calculate IBW (Ideal Body Weight) using Devine Formula
  // height in inches
  const heightInches = heightCm / 2.54;
  let ibwKg = 0;
  if (gender === 'male') {
    ibwKg = 50 + 2.3 * (heightInches - 60);
  } else {
    ibwKg = 45.5 + 2.3 * (heightInches - 60);
  }

  // 2. Calculate BMI (Body Mass Index)
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);

  // 3. BMI Category (South Asian cutoffs)
  // <18.5 Underweight, 18.5-22.9 Normal, 23-24.9 Overweight (At Risk), 25-29.9 Moderate Risk, >=30 Obese
  let bmiCategory = '';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi < 23) bmiCategory = 'Normal';
  else if (bmi < 25) bmiCategory = 'Overweight (At Risk)';
  else if (bmi < 30) bmiCategory = 'Moderate Risk';
  else bmiCategory = 'Obese';

  // 4. Calculate Daily Calorie Target
  // Based on Activity Level and BMI Category (Simplified version of NDG 2025 logic)
  let factor = 30; // Default factor (Normal BMI, Sedentary)
  
  if (bmiCategory === 'Underweight') {
    factor = activityLevel === 'sedentary' ? 35 : activityLevel === 'moderate' ? 40 : 45;
  } else if (bmiCategory === 'Normal') {
    factor = activityLevel === 'sedentary' ? 30 : activityLevel === 'moderate' ? 35 : 40;
  } else {
    // Overweight or Obese
    factor = activityLevel === 'sedentary' ? 20 : activityLevel === 'moderate' ? 25 : 30;
  }

  let targetCalories = ibwKg * factor;

  // Adjust for Goal
  if (goal === 'weight_loss') targetCalories -= 500;
  if (goal === 'weight_gain') targetCalories += 500;

  // Floor at 1200 for safety
  targetCalories = Math.max(1200, targetCalories);

  // 5. Macro Distribution (NDG 2025: 15% Protein, 55% Carbs, 30% Fat)
  const proteinG = (targetCalories * 0.15) / 4;
  const carbsG = (targetCalories * 0.55) / 4;
  const fatG = (targetCalories * 0.30) / 9;

  // 6. Others
  const fiberG = (targetCalories / 1000) * 14;
  const waterL = (weightKg * 35) / 1000; // 35ml per kg

  return {
    targetCalories: Math.round(targetCalories),
    ibwKg: Math.round(ibwKg * 10) / 10,
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    fiberG: Math.round(fiberG),
    waterL: Math.round(waterL * 10) / 10
  };
};
