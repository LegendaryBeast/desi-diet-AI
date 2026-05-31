import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProfileWizard } from '../components/profile/ProfileWizard';
import {
  User, Weight, Ruler, Activity, Target, Flame, Beef,
  Wheat, Droplets, HeartPulse, Edit3, Settings
} from 'lucide-react';

export const Profile = () => {
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
            className="text-ink-muted hover:text-ink font-bn font-bold text-sm bg-white px-3 py-1.5 rounded-lg shadow-sm border border-ink/10"
          >
            বাতিল করুন (Cancel)
          </button>
        </div>
        <ProfileWizard />
      </div>
    );
  }

  const { profile, targets } = profileData;

  const statCards = [
    { label: 'ওজন', value: `${profile.weight_kg} kg`, icon: Weight, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'উচ্চতা', value: `${profile.height_cm} cm`, icon: Ruler, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'বয়স', value: `${profile.age} বছর`, icon: User, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'অ্যাক্টিভিটি', value: profile.activity_level, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  const macroCards = [
    { label: 'ক্যালোরি', value: `${targets.target_calories} kcal`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'প্রোটিন', value: `${targets.protein_g}g`, icon: Beef, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'কার্বস', value: `${targets.carbs_g}g`, icon: Wheat, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'ফ্যাট', value: `${targets.fat_g}g`, icon: Droplets, color: 'text-teal-500', bg: 'bg-teal-50' },
  ];

  return (
    <DashboardLayout
      title="আমার প্রোফাইল"
      subtitle="My Profile & Targets"
      headerActions={
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-cream rounded-xl font-bn text-xs font-bold hover:bg-accent transition-all shadow-sm"
        >
          <Edit3 className="w-3.5 h-3.5" />
          এডিট করুন
        </button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        
        {/* Header / Identity */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-6 flex items-center gap-5">
          <div className="w-20 h-20 bg-ink rounded-2xl flex items-center justify-center text-cream shrink-0 shadow-md transform rotate-3">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-bn font-black text-2xl text-ink leading-none mb-1">
              {profile.name_bn || profile.name_en || 'ব্যবহারকারী'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-bn font-bold text-sm text-ink-muted">
                {profile.gender === 'male' ? 'পুরুষ' : profile.gender === 'female' ? 'নারী' : 'অন্যান্য'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-ink/20" />
              <span className="font-bn font-bold text-sm text-accent">
                {targets.bmi_category}
              </span>
            </div>
            <p className="font-bn text-xs text-ink-faint mt-2">
              লক্ষ্য: <span className="font-bold text-ink-muted">{profile.goal}</span>
            </p>
          </div>
        </div>

        {/* Basic Stats */}
        <div>
          <h3 className="font-bn font-bold text-sm text-ink mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" /> সাধারণ তথ্য
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-ink/5 p-4 shadow-sm flex flex-col items-center justify-center text-center">
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="font-bold text-lg text-ink leading-tight">{stat.value}</div>
                <div className="font-bn text-[0.65rem] uppercase tracking-wider text-ink-faint font-bold mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Macros / Targets */}
        <div>
          <h3 className="font-bn font-bold text-sm text-ink mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" /> দৈনিক পুষ্টি লক্ষ্য
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {macroCards.map((macro, i) => (
              <div key={i} className={`${macro.bg} border border-ink/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                <macro.icon className={`w-5 h-5 ${macro.color} mb-2`} />
                <div className="font-bold text-xl text-ink leading-tight">{macro.value}</div>
                <div className="font-bn text-[0.65rem] uppercase tracking-wider text-ink-faint font-bold mt-0.5">{macro.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Conditions */}
        <div>
          <h3 className="font-bn font-bold text-sm text-ink mb-3 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-accent" /> শারীরিক অবস্থা (Medical Conditions)
          </h3>
          <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-5">
            {profile.medical_conditions && profile.medical_conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.medical_conditions.map((condition, i) => (
                  <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bn font-bold text-xs">
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <HeartPulse className="w-8 h-8 mx-auto text-ink/10 mb-2" />
                <p className="font-bn font-bold text-ink-muted text-sm">কোনো বিশেষ শারীরিক অবস্থা নেই</p>
                <p className="font-bn text-xs text-ink-faint mt-1">সবকিছু স্বাভাবিক আছে</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
