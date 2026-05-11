import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Scale, 
  Activity, 
  Flame, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Button } from '../ui/Button';
import { MedicalCondition } from '../../types';

const steps = [
  { id: 'intro', q: 'চলুন আপনার প্রোফাইল তৈরি করি', sub: 'আপনার সঠিক তথ্য আমাদের সঠিক পরামর্শ দিতে সাহায্য করবে' },
  { id: 'name', q: 'আপনার নাম কি?', sub: 'আমরা আপনাকে কী নামে ডাকব?' },
  { id: 'gender', q: 'আপনার লিঙ্গ নির্বাচন করুন', sub: 'ক্যালোরি গণনায় এটি গুরুত্বপূর্ণ' },
  { id: 'age', q: 'আপনার বয়স কত?', sub: 'আপনার বিপাকীয় হার (BMR) জানতে এটি প্রয়োজন' },
  { id: 'stats', q: 'আপনার উচ্চতা ও ওজন', sub: 'BMI এবং আদর্শ ওজন নির্ধারণের জন্য' },
  { id: 'activity', q: 'আপনার দৈনিক পরিশ্রম কেমন?', sub: 'ব্যায়াম এবং দৈনন্দিন কাজের ধরন' },
  { id: 'conditions', q: 'কোনো শারীরিক সমস্যা আছে?', sub: 'যেমন ডায়াবেটিস বা উচ্চ রক্তচাপ' },
  { id: 'result', q: 'আপনার স্বাস্থ্য প্রোফাইল প্রস্তুত!', sub: 'আমাদের এআই আপনার জন্য একটি বিশেষ ডায়েট প্ল্যান তৈরি করেছে' },
];

export const ProfileWizard = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, targets } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep === steps.length - 1) {
      navigate('/chat');
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
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-cream rounded-[2.5rem] flex items-center justify-center text-accent shadow-2xl rotate-3">
              <User size={40} />
            </div>
            <p className="font-bn text-ink-muted text-center max-w-sm">
              দেশিডায়েট এআই আপনার ব্যক্তিগত পুষ্টিবিদ হিসেবে কাজ করবে। সঠিক তথ্য দিয়ে সাহায্য করুন।
            </p>
          </div>
        );

      case 'name':
        return (
          <div className="w-full max-w-sm mx-auto">
            <input 
              type="text" 
              value={profile.nameBn}
              onChange={(e) => updateProfile({ nameBn: e.target.value })}
              placeholder="আপনার নাম লিখুন..."
              className="w-full bg-cream border-2 border-transparent focus:border-accent/20 rounded-2xl p-5 text-center font-bn text-2xl outline-none transition-all shadow-sm"
              autoFocus
            />
          </div>
        );

      case 'gender':
        return (
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
            {['male', 'female'].map((g) => (
              <button
                key={g}
                onClick={() => { updateProfile({ gender: g as any }); next(); }}
                className={`p-8 rounded-[2.5rem] border-2 transition-all group ${
                  profile.gender === g 
                    ? 'border-accent bg-accent/5 text-accent shadow-xl' 
                    : 'border-ink/5 bg-white text-ink-muted hover:border-accent/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${
                  profile.gender === g ? 'bg-accent text-cream' : 'bg-cream group-hover:bg-accent/10'
                }`}>
                  <User size={24} />
                </div>
                <div className="font-bn font-bold text-lg">{g === 'male' ? 'পুরুষ' : 'নারী'}</div>
              </button>
            ))}
          </div>
        );

      case 'age':
        return (
          <div className="flex flex-col items-center gap-8">
            <div className="text-6xl font-black font-display text-ink">{profile.age} <span className="text-xl text-ink-faint">বছর</span></div>
            <input 
              type="range" min="15" max="100" 
              value={profile.age}
              onChange={(e) => updateProfile({ age: parseInt(e.target.value) })}
              className="w-full max-w-md accent-accent"
            />
          </div>
        );

      case 'stats':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg mx-auto">
            <div className="bg-white p-8 rounded-[2.5rem] border border-ink/5 shadow-sm">
              <label className="block font-bn text-sm font-bold text-ink-faint mb-4 uppercase tracking-widest">উচ্চতা (সেমি)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  value={profile.heightCm}
                  onChange={(e) => updateProfile({ heightCm: parseInt(e.target.value) })}
                  className="w-full text-3xl font-bold font-display bg-transparent outline-none border-b-2 border-accent/20 focus:border-accent pb-2"
                />
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-ink/5 shadow-sm">
              <label className="block font-bn text-sm font-bold text-ink-faint mb-4 uppercase tracking-widest">ওজন (কেজি)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  value={profile.weightKg}
                  onChange={(e) => updateProfile({ weightKg: parseInt(e.target.value) })}
                  className="w-full text-3xl font-bold font-display bg-transparent outline-none border-b-2 border-accent/20 focus:border-accent pb-2"
                />
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
            {[
              { id: 'sedentary', label: 'বসে কাজ', sub: 'ব্যায়াম কম করা হয়' },
              { id: 'moderate', label: 'মাঝারি পরিশ্রম', sub: 'সপ্তাহে ৩-৫ দিন ব্যায়াম' },
              { id: 'active', label: 'খুব পরিশ্রমী', sub: 'প্রতিদিন ভারী কাজ বা ব্যায়াম' },
              { id: 'athlete', label: 'এথলেট', sub: 'পেশাদার খেলোয়াড়' },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => { updateProfile({ activityLevel: a.id as any }); next(); }}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all group ${
                  profile.activityLevel === a.id 
                    ? 'border-accent bg-accent/5 shadow-lg' 
                    : 'border-ink/5 bg-white hover:border-accent/20 shadow-sm'
                }`}
              >
                <div className="font-bn font-bold text-lg text-ink mb-1">{a.label}</div>
                <div className="font-bn text-xs text-ink-muted opacity-60">{a.sub}</div>
              </button>
            ))}
          </div>
        );

      case 'conditions':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
            {[
              { id: 'diabetes', label: 'ডায়াবেটিস' },
              { id: 'hypertension', label: 'উচ্চ রক্তচাপ' },
              { id: 'kidney', label: 'কিডনি রোগ' },
              { id: 'heart', label: 'হৃদরোগ' },
              { id: 'gastric', label: 'গ্যাস্ট্রিক' },
              { id: 'none', label: 'কিছুই নেই' },
            ].map((c) => {
              const isSelected = profile.conditions.includes(c.id as MedicalCondition);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id === 'none') {
                      updateProfile({ conditions: [] });
                      next();
                    } else {
                      const newConditions = isSelected 
                        ? profile.conditions.filter(x => x !== c.id)
                        : [...profile.conditions, c.id as MedicalCondition];
                      updateProfile({ conditions: newConditions });
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all font-bn text-sm font-bold ${
                    isSelected 
                      ? 'border-accent bg-accent text-cream' 
                      : 'border-ink/5 bg-white text-ink-muted hover:border-accent/20'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        );

      case 'result':
        return (
          <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-ink/5 max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={120} />
            </div>
            <div className="relative z-10 text-center">
              <div className="text-6xl md:text-7xl font-display font-black text-ink leading-none mb-3">
                {targets.targetCalories}
              </div>
              <div className="font-bn text-accent text-xl font-bold mb-10 tracking-wide uppercase">দৈনিক ক্যালোরি লক্ষ্যমাত্রা</div>
              
              <div className="grid grid-cols-3 gap-8 py-8 border-y border-ink/5">
                <div>
                  <div className="text-2xl font-bold text-ink mb-1">{targets.bmi}</div>
                  <div className="text-[0.6rem] uppercase tracking-widest font-body text-ink-faint font-bold">BMI</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink mb-1">{targets.ibwKg}kg</div>
                  <div className="text-[0.6rem] uppercase tracking-widest font-body text-ink-faint font-bold">আদর্শ ওজন</div>
                </div>
                <div>
                  <div className="text-lg font-bn font-bold text-ink leading-tight">{targets.bmiCategory}</div>
                  <div className="text-[0.6rem] uppercase tracking-widest font-body text-ink-faint font-bold">অবস্থা</div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-3 bg-cream/50 p-4 rounded-2xl border border-ink/5">
                <CheckCircle2 size={18} className="text-forest" />
                <span className="font-bn text-sm text-ink-muted font-medium">আপনার জন্য ডায়েট প্ল্যান তৈরি করা হয়েছে</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col relative overflow-hidden font-bn">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-ink/5 z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          className="h-full bg-accent"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <div className="max-w-4xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-12 md:mb-16">
                <div className="text-[0.65rem] tracking-[0.2em] uppercase text-ink-faint mb-4 font-body font-black">
                  Step {currentStep + 1} of {steps.length}
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 tracking-tight">
                  {steps[currentStep].q}
                </h2>
                <p className="text-ink-muted opacity-70 text-lg">
                  {steps[currentStep].sub}
                </p>
              </div>

              <div className="w-full mb-16">
                {renderStepContent()}
              </div>

              <div className="flex items-center gap-6">
                {currentStep > 0 && (
                  <button 
                    onClick={back} 
                    className="p-4 rounded-2xl bg-white border border-ink/5 text-ink-muted hover:border-accent hover:text-accent transition-all shadow-sm group interactive"
                  >
                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}
                <Button 
                  onClick={next} 
                  className="px-12 py-5 bg-ink text-cream hover:bg-accent text-xl font-bold shadow-2xl flex items-center gap-4 group interactive min-w-[200px]"
                >
                  {currentStep === steps.length - 1 ? 'চ্যাট শুরু করুন' : 'পরবর্তী ধাপ'}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Background Watermark */}
      <div className="absolute bottom-10 left-10 font-display text-[15vw] font-black text-ink opacity-[0.02] pointer-events-none select-none uppercase tracking-tighter">
        DesiDiet
      </div>
    </div>
  );
};
