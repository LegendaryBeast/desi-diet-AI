import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  User,
  Activity,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  Scale,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { FaMale, FaFemale } from 'react-icons/fa';
import { Button } from '../ui/Button';
import { profileApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const steps = [
  {
    id: 'intro',
    qBn: 'চলুন আপনার প্রোফাইল তৈরি করি',
    qEn: "Let's build your profile",
    subBn: 'আপনার সঠিক তথ্য আমাদের সঠিক পরামর্শ দিতে সাহায্য করবে',
    subEn: 'Accurate details help us provide personalized recommendations',
  },
  {
    id: 'name',
    qBn: 'আপনার নাম কি?',
    qEn: "What is your name?",
    subBn: 'আমরা আপনাকে কী নামে ডাকব?',
    subEn: "How should we address you?",
  },
  {
    id: 'gender',
    qBn: 'আপনার লিঙ্গ নির্বাচন করুন',
    qEn: 'Select your biological sex',
    subBn: 'ক্যালোরি গণনায় এটি গুরুত্বপূর্ণ',
    subEn: 'Crucial for accurate metabolic calculations',
  },
  {
    id: 'age',
    qBn: 'আপনার বয়স কত?',
    qEn: 'How old are you?',
    subBn: 'আপনার বিপাকীয় হার (BMR) জানতে এটি প্রয়োজন',
    subEn: 'Needed to calculate your basal metabolic rate (BMR)',
  },
  {
    id: 'stats',
    qBn: 'আপনার উচ্চতা ও ওজন',
    qEn: 'Height & Weight',
    subBn: 'BMI এবং আদর্শ ওজন নির্ধারণের জন্য',
    subEn: 'Used to calculate BMI and ideal body weight',
  },
  {
    id: 'activity',
    qBn: 'আপনার দৈনিক পরিশ্রম কেমন?',
    qEn: 'Daily Activity Level',
    subBn: 'ব্যায়াম এবং দৈনন্দিন কাজের ধরন',
    subEn: 'Your everyday exercise and work movement',
  },
  {
    id: 'goal',
    qBn: 'আপনার লক্ষ্য কি?',
    qEn: 'What is your health goal?',
    subBn: 'ডায়েট পরিকল্পনার জন্য',
    subEn: 'Tailors your daily calorie and macro targets',
  },
  {
    id: 'conditions',
    qBn: 'কোনো শারীরিক সমস্যা আছে?',
    qEn: 'Any health conditions?',
    subBn: 'যেমন ডায়াবেটিস বা উচ্চ রক্তচাপ',
    subEn: 'Such as diabetes, hypertension, or gastric issues',
  },
  {
    id: 'result',
    qBn: 'প্রোফাইল সংরক্ষণ হচ্ছে...',
    qEn: 'Saving profile...',
    subBn: 'আমাদের এআই আপনার জন্য বিশ্লেষণ করছে',
    subEn: 'Our AI is tailoring your personalized nutrition plan',
  },
];

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

interface ProfileFormData {
  nameBn: string;
  nameEn: string;
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goal: string;
  conditions: string[];
}

export const ProfileWizard = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const { refreshProfile, profileData } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const existingProfile = profileData?.profile;

  const [form, setForm] = useState<ProfileFormData>({
    nameBn: existingProfile?.name_bn || '',
    nameEn: existingProfile?.name_en || '',
    gender: (existingProfile?.gender as 'male' | 'female') || 'male',
    age: existingProfile?.age || 30,
    heightCm: existingProfile?.height_cm || 165,
    weightKg: existingProfile?.weight_kg || 65,
    activityLevel: existingProfile?.activity_level || 'moderate',
    goal: existingProfile?.goal || 'maintain',
    conditions: existingProfile?.medical_conditions || [],
  });

  const update = (updates: Partial<ProfileFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name_bn: form.nameBn,
        name_en: form.nameEn,
        age: form.age,
        gender: form.gender,
        weight_kg: form.weightKg,
        height_cm: form.heightCm,
        activity_level: form.activityLevel,
        goal: form.goal,
        medical_conditions: form.conditions,
      };

      if (existingProfile) {
        await profileApi.update(payload);
      } else {
        await profileApi.create(payload);
      }
      await refreshProfile();
      window.dispatchEvent(new Event('data:refresh'));
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isBn ? 'প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to save profile'));
      setSaving(false);
    }
  };

  const next = () => {
    if (currentStep === steps.length - 2) {
      setCurrentStep(steps.length - 1);
      saveProfile();
      return;
    }
    if (currentStep === steps.length - 1) {
      navigate('/dashboard');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const back = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'intro':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center text-accent shadow-lg rotate-3 shrink-0">
              <User size={24} />
            </div>
            <p className={`${isBn ? 'font-bn' : ''} text-ink-muted text-center max-w-xs text-xs`}>
              {isBn
                ? 'দেশিডায়েট এআই আপনার ব্যক্তিগত পুষ্টিবিদ হিসেবে কাজ করবে। সঠিক তথ্য দিয়ে সাহায্য করুন।'
                : 'DesiDiet AI works as your personal clinical dietitian. Please provide accurate information to get the best meal plan.'}
            </p>
            {existingProfile && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1.5" />
                <p className={`${isBn ? 'font-bn' : ''} text-xs text-green-700 font-bold`}>
                  {isBn ? 'আপনার প্রোফাইল ইতিমধ্যে আছে' : 'You already have an existing profile'}
                </p>
                <p className={`${isBn ? 'font-bn' : ''} text-[0.62rem] text-green-600 mt-0.5`}>
                  {isBn ? 'এখানে আপডেট করতে পারবেন' : 'You can review and update your values here'}
                </p>
              </div>
            )}
          </div>
        );

      case 'name':
        return (
          <div className="w-full max-w-xs mx-auto space-y-3">
            <input
              type="text"
              value={form.nameBn}
              onChange={(e) => update({ nameBn: e.target.value })}
              placeholder={isBn ? "বাংলায় নাম লিখুন..." : "Name in Bengali (optional)..."}
              className={`w-full bg-cream border border-ink/10 focus:border-accent/30 rounded-lg p-2.5 text-center ${isBn ? 'font-bn' : ''} text-sm outline-none transition-all`}
              autoFocus
            />
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => update({ nameEn: e.target.value })}
              placeholder="Name in English..."
              className="w-full bg-cream border border-ink/10 focus:border-accent/30 rounded-lg p-2.5 text-center font-body text-sm outline-none transition-all"
            />
          </div>
        );

      case 'gender':
        return (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
            {[
              { id: 'male', label: isBn ? 'পুরুষ' : 'Male', icon: <FaMale className="w-8 h-8" /> },
              { id: 'female', label: isBn ? 'নারী' : 'Female', icon: <FaFemale className="w-8 h-8" /> },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => { update({ gender: g.id as 'male' | 'female' }); next(); }}
                className={`p-4 rounded-xl border transition-all group ${
                  form.gender === g.id
                    ? 'border-accent bg-accent/5 text-accent shadow-md'
                    : 'border-ink/5 bg-white text-ink-muted hover:border-accent/20'
                }`}
              >
                <div className="flex justify-center mb-2">{g.icon}</div>
                <div className={`${isBn ? 'font-bn' : ''} font-bold text-xs`}>{g.label}</div>
              </button>
            ))}
          </div>
        );

      case 'age':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="text-3xl font-black font-display text-ink leading-none">
              {form.age} <span className="text-xs text-ink-faint">{isBn ? 'বছর' : 'years'}</span>
            </div>
            <input
              type="range" min="15" max="100"
              value={form.age}
              onChange={(e) => update({ age: parseInt(e.target.value) })}
              className="w-full max-w-xs accent-accent"
            />
          </div>
        );

      case 'stats':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm mx-auto">
            <div className="bg-white p-3.5 rounded-xl border border-ink/5 shadow-sm">
              <label className={`block ${isBn ? 'font-bn' : ''} text-[0.62rem] font-bold text-ink-faint mb-2 uppercase tracking-wider`}>
                {isBn ? 'উচ্চতা (সেমি)' : 'Height (cm)'}
              </label>
              <input
                type="number"
                value={form.heightCm}
                onChange={(e) => update({ heightCm: parseInt(e.target.value) })}
                className="w-full text-xl font-bold font-display bg-transparent outline-none border-b border-accent/20 focus:border-accent pb-1"
              />
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-ink/5 shadow-sm">
              <label className={`block ${isBn ? 'font-bn' : ''} text-[0.62rem] font-bold text-ink-faint mb-2 uppercase tracking-wider`}>
                {isBn ? 'ওজন (কেজি)' : 'Weight (kg)'}
              </label>
              <input
                type="number"
                value={form.weightKg}
                onChange={(e) => update({ weightKg: parseInt(e.target.value) })}
                className="w-full text-xl font-bold font-display bg-transparent outline-none border-b border-accent/20 focus:border-accent pb-1"
              />
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md mx-auto">
            {[
              { id: 'sedentary', label: isBn ? 'বসে কাজ' : 'Sedentary', sub: isBn ? 'ব্যায়াম কম করা হয়' : 'Desk job, little or no exercise' },
              { id: 'light', label: isBn ? 'হালকা পরিশ্রম' : 'Lightly Active', sub: isBn ? 'সপ্তাহে ১-২ দিন' : 'Exercise 1-2 days/week' },
              { id: 'moderate', label: isBn ? 'মাঝারি পরিশ্রম' : 'Moderately Active', sub: isBn ? 'সপ্তাহে ৩-৫ দিন ব্যায়াম' : 'Exercise 3-5 days/week' },
              { id: 'active', label: isBn ? 'খুব পরিশ্রমী' : 'Very Active', sub: isBn ? 'প্রতিদিন ভারী কাজ বা ব্যায়াম' : 'Heavy workout or physical job' },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => { update({ activityLevel: a.id }); next(); }}
                className={`p-3 rounded-lg border text-left transition-all group ${
                  form.activityLevel === a.id
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-ink/5 bg-white hover:border-accent/20 shadow-sm'
                }`}
              >
                <div className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink mb-0.5`}>{a.label}</div>
                <div className={`${isBn ? 'font-bn' : ''} text-[0.58rem] text-ink-muted opacity-60 leading-none`}>{a.sub}</div>
              </button>
            ))}
          </div>
        );

      case 'goal':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-md mx-auto">
            {[
              { id: 'weight_loss', label: isBn ? 'ওজন কমানো' : 'Weight Loss', icon: <TrendingDown className="w-5 h-5" />, sub: isBn ? '-৫০০ kcal/দিন' : '-500 kcal/day' },
              { id: 'maintain', label: isBn ? 'ওজন ধরে রাখা' : 'Maintain Weight', icon: <Scale className="w-5 h-5" />, sub: isBn ? 'বর্তমান ক্যালোরি' : 'Baseline calories' },
              { id: 'weight_gain', label: isBn ? 'ওজন বাড়ানো' : 'Weight Gain', icon: <TrendingUp className="w-5 h-5" />, sub: isBn ? '+৫০০ kcal/দিন' : '+500 kcal/day' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => { update({ goal: g.id }); next(); }}
                className={`p-3 rounded-lg border text-center transition-all group ${
                  form.goal === g.id
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-ink/5 bg-white hover:border-accent/20 shadow-sm'
                }`}
              >
                <div className={`flex justify-center mb-1.5 transition-colors ${
                  form.goal === g.id ? 'text-accent' : 'text-ink-muted'
                }`}>
                  {g.icon}
                </div>
                <div className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink mb-0.5`}>{g.label}</div>
                <div className={`${isBn ? 'font-bn' : ''} text-[0.58rem] text-ink-muted opacity-60 leading-none`}>{g.sub}</div>
              </button>
            ))}
          </div>
        );

      case 'conditions': {
        const popularDiseases = [
          { id: 'Diabetes', labelBn: 'ডায়াবেটিস', labelEn: 'Diabetes' },
          { id: 'Hypertension', labelBn: 'উচ্চ রক্তচাপ', labelEn: 'Hypertension' },
          { id: 'Obesity', labelBn: 'স্থূলতা', labelEn: 'Obesity' },
          { id: 'Gastric', labelBn: 'গ্যাস্ট্রিক', labelEn: 'Gastric' },
          { id: 'Thyroid Disorders', labelBn: 'থাইরয়েড', labelEn: 'Thyroid' },
          { id: 'Anemia', labelBn: 'রক্তশূন্যতা', labelEn: 'Anemia' },
        ];

        const filteredDiseases = ALL_DISEASES.filter(
          (d) =>
            d.labelBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.labelEn.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="w-full max-w-md mx-auto space-y-4">
            {/* Selected Conditions Tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 bg-white/70 rounded-xl border border-ink/5">
              {form.conditions.length === 0 ? (
                <span className={`text-ink-faint text-xs py-1 px-1 ${isBn ? 'font-bn' : ''}`}>
                  {isBn ? 'কোনো সমস্যা নির্বাচিত করা হয়নি' : 'No conditions selected'}
                </span>
              ) : (
                form.conditions.map((condId) => {
                  const cond = ALL_DISEASES.find((d) => d.id === condId) || {
                    labelBn: condId,
                    labelEn: condId,
                  };
                  return (
                    <span
                      key={condId}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-accent text-cream rounded-full text-xs font-bold shadow-sm ${isBn ? 'font-bn' : ''}`}
                    >
                      {isBn ? cond.labelBn : cond.labelEn}
                      <button
                        type="button"
                        onClick={() => {
                          const newConditions = form.conditions.filter((x) => x !== condId);
                          update({ conditions: newConditions });
                        }}
                        className="hover:text-red-300 transition-colors font-sans text-xs ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder={isBn ? "সমস্যা খুঁজুন (যেমন: মাইগ্রেন, হাঁপানি)..." : "Search health condition (e.g. Migraine, Asthma)..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className={`w-full bg-white border border-ink/10 focus:border-accent/40 rounded-xl p-2.5 text-center ${isBn ? 'font-bn' : ''} text-xs outline-none shadow-sm transition-all`}
              />

              {isDropdownOpen && searchQuery.trim() !== '' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-ink/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredDiseases.length === 0 ? (
                    <div className={`p-3 text-center text-xs text-ink-faint ${isBn ? 'font-bn' : ''}`}>
                      {isBn ? 'কোনো রোগ খুঁজে পাওয়া যায়নি' : 'No health condition found'}
                    </div>
                  ) : (
                    filteredDiseases.map((d) => {
                      const isSelected = form.conditions.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            const newConditions = isSelected
                              ? form.conditions.filter((x) => x !== d.id)
                              : [...form.conditions, d.id];
                            update({ conditions: newConditions });
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs border-b border-ink/5 hover:bg-accent/5 flex justify-between items-center transition-colors ${
                            isSelected ? 'bg-accent/5 font-bold text-accent' : 'text-ink'
                          }`}
                        >
                          <div>
                            <span className={`${isBn ? 'font-bn' : ''} font-bold`}>{isBn ? d.labelBn : d.labelEn}</span>
                            <span className="text-[0.65rem] text-ink-faint ml-2">({isBn ? d.labelEn : d.labelBn})</span>
                          </div>
                          {isSelected && <span className="text-[10px] text-accent font-sans">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <label className={`block text-[0.62rem] font-bold text-ink-faint uppercase tracking-wider ${isBn ? 'font-bn' : ''}`}>
                {isBn ? 'জনপ্রিয় রোগসমূহ (Quick Select)' : 'Popular Conditions (Quick Select)'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {popularDiseases.map((c) => {
                  const isSelected = form.conditions.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const newConditions = isSelected
                          ? form.conditions.filter((x) => x !== c.id)
                          : [...form.conditions, c.id];
                        update({ conditions: newConditions });
                      }}
                      className={`p-2 rounded-lg border text-center transition-all text-[11px] font-bold ${isBn ? 'font-bn' : ''} ${
                        isSelected
                          ? 'border-accent bg-accent text-cream shadow-sm'
                          : 'border-ink/5 bg-white text-ink-muted hover:border-accent/20'
                      }`}
                    >
                      {isBn ? c.labelBn : c.labelEn}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    update({ conditions: [] });
                    next();
                  }}
                  className={`p-2 rounded-lg border text-center transition-all text-[11px] font-bold border-ink/10 bg-cream text-ink-muted hover:border-ink/20 ${isBn ? 'font-bn' : ''}`}
                >
                  {isBn ? 'কিছুই নেই (None)' : 'None'}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'result':
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-ink/5 max-w-sm mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Activity size={80} />
            </div>
            <div className="relative z-10 text-center">
              {saving ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-3" />
                  <div className={`${isBn ? 'font-bn' : ''} text-base font-bold text-ink mb-1`}>
                    {isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving profile...'}
                  </div>
                  <div className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted`}>
                    {isBn ? 'AI আপনার পুষ্টি লক্ষ্যমাত্রা গণনা করছে' : 'AI is tailoring your personalized nutrition targets'}
                  </div>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                  <div className={`${isBn ? 'font-bn' : ''} text-sm font-bold text-red-500 mb-2.5`}>{error}</div>
                  <button onClick={() => { setCurrentStep(steps.length - 2); setError(null); }}
                    className={`mt-2 px-4 py-2 bg-ink text-cream rounded-lg font-bold ${isBn ? 'font-bn' : ''} text-xs hover:bg-accent transition-all`}
                  >
                    {isBn ? 'পুনরায় চেষ্টা করুন' : 'Try Again'}
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <div className={`${isBn ? 'font-bn' : ''} text-base font-bold text-ink mb-1`}>
                    {isBn ? 'প্রোফাইল সংরক্ষিত!' : 'Profile Saved!'}
                  </div>
                  <div className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted mb-4`}>
                    {isBn ? 'আপনার ব্যক্তিগতকৃত ডায়েট প্ল্যান প্রস্তুত' : 'Your personalized diet plan is ready'}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 bg-cream/40 p-2.5 rounded-lg border border-ink/5">
                    <CheckCircle2 size={14} className="text-forest" />
                    <span className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted font-medium`}>
                      {isBn ? 'আপনার জন্য ডায়েট প্ল্যান তৈরি করা হয়েছে' : 'Diet plan calibrated for your profile'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-cream flex flex-col relative overflow-hidden ${isBn ? 'font-bn' : ''}`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-ink/5 z-50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          className="h-full bg-accent"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-6 md:mb-8">
                <div className="text-[0.58rem] tracking-[0.2em] uppercase text-ink-faint mb-2 font-body font-black">
                  Step {currentStep + 1} of {steps.length}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-ink mb-1.5 tracking-tight">
                  {isBn ? steps[currentStep].qBn : steps[currentStep].qEn}
                </h2>
                <p className="text-ink-muted opacity-70 text-xs">
                  {isBn ? steps[currentStep].subBn : steps[currentStep].subEn}
                </p>
              </div>

              <div className="w-full mb-8">
                {renderStepContent()}
              </div>

              {currentStep !== steps.length - 1 && (
                <div className="flex items-center gap-4">
                  {currentStep > 0 && (
                    <button
                      onClick={back}
                      className="p-2 rounded-lg bg-white border border-ink/5 text-ink-muted hover:border-accent hover:text-accent transition-all shadow-sm group interactive"
                    >
                      <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                  )}
                  <Button
                    onClick={next}
                    className="px-6 py-2.5 bg-ink text-cream hover:bg-accent text-xs font-bold shadow-md flex items-center gap-2 group interactive min-w-[120px]"
                  >
                    {isBn ? 'পরবর্তী ধাপ' : 'Next Step'}
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 font-display text-[10vw] font-black text-ink opacity-[0.01] pointer-events-none select-none uppercase tracking-tighter">
        DesiDiet
      </div>
    </div>
  );
};
