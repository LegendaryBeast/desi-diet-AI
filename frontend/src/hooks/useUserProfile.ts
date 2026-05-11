import { useState, useEffect } from 'react';
import { UserProfile, MedicalCondition } from '../types';
import { calculateNutrition, NutritionTargets } from '../lib/calorieEngine';

const DEFAULT_PROFILE: UserProfile = {
  id: '1',
  nameBn: 'অতিথি',
  nameEn: 'Guest',
  age: 30,
  gender: 'male',
  weightKg: 70,
  heightCm: 170,
  activityLevel: 'moderate',
  goal: 'maintain',
  conditions: [],
  preferredFoods: [],
  dislikedFoods: []
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('desidiet_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [targets, setTargets] = useState<NutritionTargets>(() => 
    calculateNutrition(
      profile.gender,
      profile.weightKg,
      profile.heightCm,
      profile.age,
      profile.activityLevel,
      profile.goal
    )
  );

  useEffect(() => {
    localStorage.setItem('desidiet_profile', JSON.stringify(profile));
    setTargets(
      calculateNutrition(
        profile.gender,
        profile.weightKg,
        profile.heightCm,
        profile.age,
        profile.activityLevel,
        profile.goal
      )
    );
  }, [profile]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const addCondition = (condition: MedicalCondition) => {
    if (!profile.conditions.includes(condition)) {
      setProfile(prev => ({
        ...prev,
        conditions: [...prev.conditions, condition]
      }));
    }
  };

  const removeCondition = (condition: MedicalCondition) => {
    setProfile(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c !== condition)
    }));
  };

  return {
    profile,
    targets,
    updateProfile,
    addCondition,
    removeCondition
  };
};
