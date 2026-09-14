import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProfileWizard } from '../components/profile/ProfileWizard';
import {
  User, Weight, Ruler, Activity, Target, Flame, Beef,
  Wheat, Droplets, HeartPulse, Edit3, Settings
} from 'lucide-react';

export const Profile = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const { profileData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // If there's no profile data yet, show wizard by default
  if (!profileData || !profileData.profile) {
    return <ProfileWizard />;
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-md mx-auto pt-4 px-4 flex justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className={`text-ink-muted hover:text-ink ${isBn ? 'font-bn' : ''} font-bold text-sm bg-white px-3 py-1.5 rounded-lg shadow-sm border border-ink/10`}
          >
            {isBn ? 'বাতিল করুন (Cancel)' : 'Cancel'}
          </button>
        </div>
        <ProfileWizard />
      </div>
    );
  }

  const { profile, targets } = profileData;

  const statCards = [
    { label: isBn ? 'ওজন' : 'Weight', value: `${profile.weight_kg} kg`, icon: Weight, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: isBn ? 'উচ্চতা' : 'Height', value: `${profile.height_cm} cm`, icon: Ruler, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: isBn ? 'বয়স' : 'Age', value: `${profile.age} ${isBn ? 'বছর' : 'yrs'}`, icon: User, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: isBn ? 'অ্যাক্টিভিটি' : 'Activity', value: profile.activity_level, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const macroCards = [
    { label: isBn ? 'ক্যালোরি' : 'Calories', value: `${targets.target_calories} kcal`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: isBn ? 'প্রোটিন' : 'Protein', value: `${targets.protein_g}g`, icon: Beef, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: isBn ? 'কার্বস' : 'Carbs', value: `${targets.carbs_g}g`, icon: Wheat, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: isBn ? 'ফ্যাট' : 'Fat', value: `${targets.fat_g}g`, icon: Droplets, color: 'text-teal-500', bg: 'bg-teal-50' },
  ];

  return (
    <DashboardLayout
      title={isBn ? 'আমার প্রোফাইল' : 'My Profile'}
      subtitle={isBn ? 'ব্যক্তিগত তথ্য ও লক্ষ্যমাত্রা' : 'Personal info & nutritional targets'}
      headerActions={
        <button
          onClick={() => setIsEditing(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-ink text-cream rounded-xl ${isBn ? 'font-bn' : ''} text-xs font-bold hover:bg-accent transition-all shadow-sm`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isBn ? 'এডিট করুন' : 'Edit Profile'}
        </button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        
        {/* Header / Identity */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 bg-ink rounded-2xl flex items-center justify-center text-cream shrink-0 shadow-md transform rotate-3">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`${isBn ? 'font-bn' : ''} font-black text-2xl text-ink leading-none mb-1.5`}>
                  {isBn ? (profile.name_bn || profile.name_en || 'ব্যবহারকারী') : (profile.name_en || profile.name_bn || 'User')}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink-muted`}>
                    {profile.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : profile.gender === 'female' ? (isBn ? 'নারী' : 'Female') : (isBn ? 'অন্যান্য' : 'Other')}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/20" />
                  <span className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-accent`}>
                    {targets.bmi_category}
                  </span>
                </div>
              </div>

              {/* BMI & KCAL display badges with small icons */}
              <div className="flex items-center gap-3 bg-cream/35 border border-ink/5 p-3 rounded-2xl shrink-0 self-start sm:self-center">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-bold">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-[0.55rem] text-ink-faint leading-none uppercase font-body">BMI</span>
                    <span className="text-ink text-sm font-mono mt-0.5">
                      {targets?.bmi ? targets.bmi.toFixed(1) : ((profile.weight_kg && profile.height_cm) ? (profile.weight_kg / ((profile.height_cm / 100) * (profile.height_cm / 100))).toFixed(1) : '--')}
                    </span>
                  </div>
                </div>
                <div className="w-px h-6 bg-ink/10" />
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-bold">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div className="flex flex-col">
                    <span className="text-[0.55rem] text-ink-faint leading-none uppercase font-body">KCAL Target</span>
                    <span className="text-ink text-sm font-mono mt-0.5">{targets.target_calories}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-faint mt-3 pt-2 border-t border-ink/5`}>
              {isBn ? 'লক্ষ্য: ' : 'Goal: '}<span className="font-bold text-ink-muted">{profile.goal}</span>
            </p>
          </div>
        </div>

        {/* Basic Stats */}
        <div>
          <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink mb-3 flex items-center gap-2`}>
            <Settings className="w-4 h-4 text-accent" /> {isBn ? 'সাধারণ তথ্য' : 'Basic Stats'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-ink/5 p-4 shadow-sm flex flex-col items-center justify-center text-center">
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="font-bold text-lg text-ink leading-tight">{stat.value}</div>
                <div className={`${isBn ? 'font-bn' : ''} text-[0.65rem] uppercase tracking-wider text-ink-faint font-bold mt-0.5`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Macros / Targets */}
        <div>
          <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink mb-3 flex items-center gap-2`}>
            <Target className="w-4 h-4 text-accent" /> {isBn ? 'দৈনিক পুষ্টি লক্ষ্য' : 'Daily Nutritional Targets'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {macroCards.map((macro, i) => (
              <div key={i} className={`${macro.bg} border border-ink/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                <macro.icon className={`w-5 h-5 ${macro.color} mb-2`} />
                <div className="font-bold text-xl text-ink leading-tight">{macro.value}</div>
                <div className={`${isBn ? 'font-bn' : ''} text-[0.65rem] uppercase tracking-wider text-ink-faint font-bold mt-0.5`}>{macro.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Conditions */}
        <div>
          <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink mb-3 flex items-center gap-2`}>
            <HeartPulse className="w-4 h-4 text-accent" /> {isBn ? 'শারীরিক অবস্থা (Medical Conditions)' : 'Medical Conditions'}
          </h3>
          <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-5">
            {profile.medical_conditions && profile.medical_conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.medical_conditions.map((condition, i) => (
                  <span key={i} className={`px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl ${isBn ? 'font-bn' : ''} font-bold text-xs`}>
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <HeartPulse className="w-8 h-8 mx-auto text-ink/10 mb-2" />
                <p className={`${isBn ? 'font-bn' : ''} font-bold text-ink-muted text-sm`}>
                  {isBn ? 'কোনো বিশেষ শারীরিক অবস্থা নেই' : 'No medical conditions logged'}
                </p>
                <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-faint mt-1`}>
                  {isBn ? 'সবকিছু স্বাভাবিক আছে' : 'Everything looks optimal'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

