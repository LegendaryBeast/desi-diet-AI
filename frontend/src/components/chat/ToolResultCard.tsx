import { motion } from 'framer-motion';
import {
  User,
  Utensils,
  HeartPulse,
  Pill,
  Search,
  FileBarChart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChefHat,
} from 'lucide-react';

interface ToolResultCardProps {
  result: Record<string, unknown>;
  isBn?: boolean;
}

export const ToolResultCard = ({ result, isBn = true }: ToolResultCardProps) => {
  const tool = String(result.tool || '');
  const data = (result.result || {}) as Record<string, unknown>;
  const success = data.success !== false;

  // Error state
  if (!success && data.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bn"
      >
        <XCircle size={14} />
        <span>{String(data.error)}</span>
      </motion.div>
    );
  }

  switch (tool) {
    case 'get_profile':
      return <ProfileCard data={data} isBn={isBn} />;
    case 'get_meal_plan':
      return <MealPlanCard data={data} isBn={isBn} />;
    case 'log_health':
    case 'get_health_logs':
      return <HealthLogCard data={data} isBn={isBn} tool={tool} />;
    case 'get_medicine_reminders':
    case 'add_medicine_reminder':
    case 'delete_medicine_reminder':
      return <MedicineCard data={data} isBn={isBn} tool={tool} />;
    case 'search_food':
    case 'get_food_safety':
      return <FoodSearchCard data={data} isBn={isBn} tool={tool} />;
    case 'get_health_report':
      return <HealthReportCard data={data} isBn={isBn} />;
    case 'mark_meal_complete':
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2.5 p-2.5 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-700 text-xs font-bn"
        >
          <CheckCircle2 size={14} />
          <span>
            {isBn
              ? `${data.slot === 'breakfast' ? 'সকালের নাস্তা' : data.slot === 'lunch' ? 'দুপুরের খাবার' : data.slot === 'dinner' ? 'রাতের খাবার' : 'স্ন্যাক'} ${data.completed ? 'সম্পূর্ণ হয়েছে' : 'আনমার্ক করা হয়েছে'}`
              : `${data.slot} ${data.completed ? 'marked complete' : 'unmarked'}`}
          </span>
        </motion.div>
      );
    case 'update_profile':
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2.5 p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-bn"
        >
          <CheckCircle2 size={14} />
          <span>{isBn ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated'}</span>
        </motion.div>
      );
    case 'personal_cooker_chat':
      return <PersonalCookerCard data={data} isBn={isBn} />;
    default:
      return null;
  }
};

// ── Profile Card ─────────────────────────────────────────────────────────────

const ProfileCard = ({ data, isBn }: { data: Record<string, unknown>; isBn: boolean }) => {
  const profile = data as Record<string, unknown>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
          <User size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? 'প্রোফাইল তথ্য' : 'Profile Info'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[0.6rem] text-ink-muted font-bn">
        {profile.age != null && (
          <div className="bg-cream rounded-lg px-2 py-1">
            <span className="font-bold">{isBn ? 'বয়স:' : 'Age:'}</span> {String(profile.age)}
          </div>
        )}
        {profile.gender != null && (
          <div className="bg-cream rounded-lg px-2 py-1">
            <span className="font-bold">{isBn ? 'লিঙ্গ:' : 'Gender:'}</span> {String(profile.gender)}
          </div>
        )}
        {profile.weight_kg != null && (
          <div className="bg-cream rounded-lg px-2 py-1">
            <span className="font-bold">{isBn ? 'ওজন:' : 'Weight:'}</span> {String(profile.weight_kg)}kg
          </div>
        )}
        {profile.height_cm != null && (
          <div className="bg-cream rounded-lg px-2 py-1">
            <span className="font-bold">{isBn ? 'উচ্চতা:' : 'Height:'}</span> {String(profile.height_cm)}cm
          </div>
        )}
        {profile.goal != null && (
          <div className="bg-cream rounded-lg px-2 py-1 col-span-2">
            <span className="font-bold">{isBn ? 'লক্ষ্য:' : 'Goal:'}</span> {String(profile.goal)}
          </div>
        )}
        {profile.medical_conditions != null && Array.isArray(profile.medical_conditions) && profile.medical_conditions.length > 0 && (
          <div className="bg-cream rounded-lg px-2 py-1 col-span-2">
            <span className="font-bold">{isBn ? 'রোগ:' : 'Conditions:'}</span>{' '}
            {profile.medical_conditions.map(String).join(', ')}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Meal Plan Card ───────────────────────────────────────────────────────────

const MealPlanCard = ({ data, isBn }: { data: Record<string, unknown>; isBn: boolean }) => {
  const meals = (data.meals || []) as Array<Record<string, unknown>>;
  const targetCal = data.target_calories as number;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
          <Utensils size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? `আজকের খাবার (${targetCal} ক্যালোরি)` : `Today's Plan (${targetCal} kcal)`}
        </span>
      </div>
      <div className="space-y-1.5">
        {meals.map((meal, idx) => {
          const slot = String(meal.slot || '');
          const items = (meal.items || []) as Array<Record<string, unknown>>;
          const slotLabel = slot === 'breakfast' ? (isBn ? 'সকাল' : 'Breakfast')
            : slot === 'lunch' ? (isBn ? 'দুপুর' : 'Lunch')
            : slot === 'dinner' ? (isBn ? 'রাত' : 'Dinner')
            : (isBn ? 'স্ন্যাক' : 'Snack');
          return (
            <div key={idx} className="bg-cream rounded-lg px-2.5 py-1.5">
              <div className="text-[0.6rem] font-bold text-ink font-bn mb-0.5">{slotLabel}</div>
              <div className="flex flex-wrap gap-1">
                {items.map((item, i) => (
                  <span key={i} className="text-[0.55rem] text-ink-muted font-bn bg-white px-1.5 py-0.5 rounded border border-ink/5">
                    {String((item as Record<string, unknown>).emoji || '🍽️')} {String((item as Record<string, unknown>).name_bn || (item as Record<string, unknown>).name_en || '')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Health Log Card ──────────────────────────────────────────────────────────

const HealthLogCard = ({ data, isBn, tool }: { data: Record<string, unknown>; isBn: boolean; tool: string }) => {
  if (tool === 'log_health') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bn"
      >
        <HeartPulse size={14} />
        <span>{isBn ? 'স্বাস্থ্য তথ্য সংরক্ষিত হয়েছে' : 'Health data saved'}</span>
      </motion.div>
    );
  }
  const logs = (data.logs || []) as Array<Record<string, unknown>>;
  if (!logs.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
          <HeartPulse size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? 'স্বাস্থ্য ইতিহাস' : 'Health History'}
        </span>
      </div>
      <div className="space-y-1">
        {logs.slice(0, 3).map((log, idx) => {
          const l = log as Record<string, unknown>;
          return (
            <div key={idx} className="flex items-center gap-2 text-[0.6rem] text-ink-muted font-bn bg-cream rounded-lg px-2 py-1">
              <span className="font-bold text-ink">{String(l.date || '')}</span>
              {l.weight_kg != null && <span>{String(l.weight_kg)}kg</span>}
              {l.blood_pressure != null && <span>BP {String(l.blood_pressure)}</span>}
              {l.blood_sugar != null && <span>Sugar {String(l.blood_sugar)}</span>}
              {l.symptoms != null && <span className="text-red-500">⚠️ {String(l.symptoms)}</span>}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Medicine Card ────────────────────────────────────────────────────────────

const MedicineCard = ({ data, isBn, tool }: { data: Record<string, unknown>; isBn: boolean; tool: string }) => {
  if (tool === 'add_medicine_reminder' || tool === 'delete_medicine_reminder') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-bn"
      >
        <Pill size={14} />
        <span>
          {tool === 'add_medicine_reminder'
            ? (isBn ? `⏰ ${data.name} যোগ করা হয়েছে` : `⏰ ${data.name} added`)
            : (isBn ? '💊 রিমাইন্ডার মুছে ফেলা হয়েছে' : '💊 Reminder deleted')}
        </span>
      </motion.div>
    );
  }
  const reminders = (data.reminders || []) as Array<Record<string, unknown>>;
  if (!reminders.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 text-xs font-bn"
      >
        {isBn ? 'কোনো রিমাইন্ডার নেই' : 'No reminders'}
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
          <Pill size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? 'ঔষধ রিমাইন্ডার' : 'Medicine Reminders'}
        </span>
      </div>
      <div className="space-y-1">
        {reminders.map((r, idx) => {
          const rem = r as Record<string, unknown>;
          return (
            <div key={idx} className="flex items-center justify-between bg-cream rounded-lg px-2.5 py-1.5">
              <div>
                <div className="text-[0.65rem] font-bold text-ink font-bn">{String(rem.name)}</div>
                <div className="text-[0.55rem] text-ink-muted">
                  {String(rem.dose || '')} • {Array.isArray(rem.times) ? rem.times.map(String).join(', ') : ''} {rem.with_food ? (isBn ? '• খাবারের সাথে' : '• With food') : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Food Search Card ─────────────────────────────────────────────────────────

const FoodSearchCard = ({ data, isBn, tool }: { data: Record<string, unknown>; isBn: boolean; tool: string }) => {
  if (tool === 'get_food_safety') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <AlertCircle size={14} className="text-accent" />
          <span className="text-[0.72rem] font-bold text-ink font-bn">
            {isBn ? 'খাবারের নিরাপত্তা বিশ্লেষণ' : 'Food Safety Analysis'}
          </span>
        </div>
        <div className="text-[0.6rem] text-ink-muted font-bn leading-relaxed whitespace-pre-wrap">
          {String((data as Record<string, unknown>).safety_analysis || (data as Record<string, unknown>).insight || '')}
        </div>
      </motion.div>
    );
  }
  const results = (data.results || []) as Array<Record<string, unknown>>;
  if (!results.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600">
          <Search size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? `"${data.query}" এর ফলাফল` : `"${data.query}" Results`}
        </span>
      </div>
      <div className="space-y-1">
        {results.slice(0, 5).map((food, idx) => {
          const f = food as Record<string, unknown>;
          return (
            <div key={idx} className="flex items-center justify-between bg-cream rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{String(f.emoji || '🍽️')}</span>
                <div>
                  <div className="text-[0.65rem] font-bold text-ink font-bn">{String(f.name_bn || f.name_en || '')}</div>
                  <div className="text-[0.55rem] text-ink-muted">{String(f.food_group || '')}</div>
                </div>
              </div>
              <div className="text-[0.6rem] font-bold text-accent">{String(f.calories_per_100g || 'N/A')}kcal</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Health Report Card ───────────────────────────────────────────────────────

const HealthReportCard = ({ data, isBn }: { data: Record<string, unknown>; isBn: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
          <FileBarChart size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? `${data.period_days} দিনের স্বাস্থ্য রিপোর্ট` : `${data.period_days}-Day Health Report`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-cream rounded-lg px-2 py-1.5 text-center">
          <div className="text-[0.7rem] font-black text-ink">{String(data.avg_daily_calories ?? 0)}</div>
          <div className="text-[0.5rem] text-ink-muted font-bn">{isBn ? 'গড় ক্যালোরি/দিন' : 'Avg kcal/day'}</div>
        </div>
        <div className="bg-cream rounded-lg px-2 py-1.5 text-center">
          <div className="text-[0.7rem] font-black text-ink">{String(data.meals_logged ?? 0)}</div>
          <div className="text-[0.5rem] text-ink-muted font-bn">{isBn ? 'খাবার লগ' : 'Meals Logged'}</div>
        </div>
        {data.latest_weight_kg != null && (
          <div className="bg-cream rounded-lg px-2 py-1.5 text-center">
            <div className="text-[0.7rem] font-black text-ink">{String(data.latest_weight_kg)}kg</div>
            <div className="text-[0.5rem] text-ink-muted font-bn">{isBn ? 'সর্বশেষ ওজন' : 'Latest Weight'}</div>
          </div>
        )}
        <div className="bg-cream rounded-lg px-2 py-1.5 text-center">
          <div className="text-[0.7rem] font-black text-ink">{String(data.health_log_count ?? 0)}</div>
          <div className="text-[0.5rem] text-ink-muted font-bn">{isBn ? 'স্বাস্থ্য লগ' : 'Health Logs'}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Personal Cooker (NutriSaathi) Card ──────────────────────────────────────

const PersonalCookerCard = ({ data, isBn }: { data: Record<string, unknown>; isBn: boolean }) => {
  const reply = String(data.reply || '');
  const condition = String(data.condition || '');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5 p-3.5 bg-white border border-ink/5 rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
          <ChefHat size={14} />
        </div>
        <span className="text-[0.72rem] font-bold text-ink font-bn">
          {isBn ? 'রাঁধুনি AI এর পরামর্শ' : 'Radhuni AI Advice'}
        </span>
        {condition && condition !== 'None' && (
          <span className="text-[0.55rem] font-bold px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full">
            {condition}
          </span>
        )}
      </div>
      <div
        className="text-[0.65rem] text-ink-muted font-bn leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: reply
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-ink">$1</strong>')
            .replace(/\n/g, '<br/>'),
        }}
      />
    </motion.div>
  );
};
