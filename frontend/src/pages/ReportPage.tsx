import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine
} from 'recharts';
import {
  BarChart2, Flame, Zap, Droplet, Wind, AlertCircle,
  RefreshCw, Scale, Activity, TrendingUp, Target,
  CheckCircle2, ChevronRight, Loader2, Calendar,
  Mail, Download, Heart, Brain, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { reportsApi, type HealthSummaryReport } from '../lib/api';

type Period = 3 | 7 | 10;

const PERIOD_LABELS: Record<Period, string> = {
  3: 'শেষ ৩ দিন',
  7: 'শেষ ৭ দিন',
  10: 'শেষ ১০ দিন',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export const ReportPage = () => {
  const [period, setPeriod] = useState<Period>(7);
  const [weight, setWeight] = useState('');
  const [report, setReport] = useState<HealthSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Email report state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleGenerate = useCallback(async () => {
    const wKg = parseFloat(weight);
    if (!weight || isNaN(wKg) || wKg < 20 || wKg > 300) {
      setError('অনুগ্রহ করে সঠিক ওজন দিন (২০–৩০০ কেজি)');
      return;
    }
    setLoading(true);
    setError(null);
    setEmailSent(false);
    try {
      const data = await reportsApi.healthSummary(period, wKg);
      setReport(data);
      setGenerated(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'রিপোর্ট তৈরিতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [period, weight]);

  const handleSendEmail = async () => {
    if (!email.includes('@')) {
      setEmailError('অনুগ্রহ করে সঠিক ইমেইল দিন');
      return;
    }
    setEmailSending(true);
    setEmailError('');
    try {
      await reportsApi.sendEmail(email, 'bn');
      setEmailSent(true);
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'ইমেইল পাঠাতে সমস্যা হয়েছে');
    } finally {
      setEmailSending(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;

    const activeTargets = report.targets || {
      target_calories: 2000,
      protein_g: 80,
      carbs_g: 250,
      fat_g: 60,
      fiber_g: 25,
    };

    const avgCalories = report.avg_daily_calories || 0;
    const totalProtein = report.macro_summary?.protein_g || 0;
    const totalCarbs = report.macro_summary?.carbs_g || 0;
    const totalFat = report.macro_summary?.fat_g || 0;
    const totalFiber = report.macro_summary?.fiber_g || 0;

    const avgProtein = totalProtein / report.period_days;
    const avgCarbs = totalCarbs / report.period_days;
    const avgFat = totalFat / report.period_days;
    const avgFiber = totalFiber / report.period_days;

    const deficiencies = report.micronutrient_targets || [];

    const isOptimal = (avgVal: number, targetVal: number) => {
      const pct = (avgVal / targetVal) * 100;
      if (pct < 70) return { label: 'ঘাটতি', color: '#C62828', bg: '#FFEBEE' };
      if (pct > 115) return { label: 'অতিরিক্ত', color: '#EF6C00', bg: '#FFF3E0' };
      return { label: 'সঠিক', color: '#2E7D32', bg: '#E8F5E9' };
    };

    const caloriesStatus = isOptimal(avgCalories, activeTargets.target_calories);
    const proteinStatus = isOptimal(avgProtein, activeTargets.protein_g);
    const carbsStatus = isOptimal(avgCarbs, activeTargets.carbs_g);
    const fatStatus = isOptimal(avgFat, activeTargets.fat_g);
    const fiberStatus = isOptimal(avgFiber, activeTargets.fiber_g);

    // Micronutrient groups
    const VITAMIN_NAMES = [
      "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
      "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
      "Pantothenic acid (B5)", "Biotin (B7)"
    ];
    const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Iodine (I)"];
    const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];

    const vitamins = deficiencies.filter(n => VITAMIN_NAMES.includes(n.name));
    const minerals = deficiencies.filter(n => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
    const fatty = deficiencies.filter(n => FATTY_NAMES.includes(n.name));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>DesiDiet Clinical Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1C2123; padding: 30px; line-height: 1.6; }
            .header { border-bottom: 3px solid #A7C924; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 28px; font-weight: bold; color: #8FB41E; letter-spacing: -0.5px; }
            .meta-info { text-align: right; font-size: 12px; color: #7A8487; }
            .user-box { background-color: #FFFDF9; border: 1px solid #EBF0D8; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; }
            h2 { font-size: 16px; color: #1C2123; border-left: 5px solid #A7C924; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
            th { background-color: #EBF0D8; color: #1C2123; padding: 10px 12px; text-align: left; border: 1px solid #DFE3D1; font-weight: bold; }
            td { padding: 10px 12px; border: 1px solid #DFE3D1; }
            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
            .footer { margin-top: 50px; border-top: 1px solid #DFE3D1; padding-top: 15px; font-size: 11px; color: #7A8487; text-align: center; line-height: 1.8; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">DesiDiet</div>
              <div style="font-size: 11px; color: #7A8487; margin-top: 2px;">PushtiAI Clinical Nutrition System</div>
            </div>
            <div class="meta-info">
              <strong>রিপোর্ট আইডি:</strong> DD-${Math.floor(100000 + Math.random() * 900000)}<br>
              <strong>তারিখ:</strong> ${new Date().toLocaleDateString('bn-BD')}<br>
              <strong>রিপোর্ট মেয়াদ:</strong> ${period} দিন
            </div>
          </div>

          <div class="user-box">
            <table style="border: none; margin: 0; width: 100%; box-shadow: none;">
              <tr style="border: none;">
                <td style="border: none; padding: 0; width: 50%;"><strong>সদস্য:</strong> সম্মানিত সদস্য</td>
                <td style="border: none; padding: 0; width: 50%; text-align: right;"><strong>ডায়েট লক্ষ্য:</strong> পুষ্টি পরিমাপ ও সুস্বাস্থ্য</td>
              </tr>
            </table>
          </div>

          ${report.ai_verdict ? `
            <div style="background-color: #FFFDF9; border: 1px dashed #A7C924; padding: 18px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; line-height: 1.6;">
              <div style="font-weight: bold; color: #8FB41E; font-size: 14px; margin-bottom: 6px;">
                📋 এআই ও সামগ্রিক মূল্যায়ন (Clinical AI Assessment & Verdict)
              </div>
              <p style="margin: 0; color: #1C2123; font-style: italic; font-weight: 500;">
                "${report.ai_verdict}"
              </p>
            </div>
          ` : ''}

          <h2>📋 সামগ্রিক স্বাস্থ্যের সারসংক্ষেপ (Overall Health Summary)</h2>
          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th>বিশ্লেষিত দিন</th>
                <th>গড় ক্যালোরি/দিন</th>
                <th>লক্ষ্য ক্যালোরি</th>
                <th>অনুসরণ হার (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${report.days_with_data}/${report.period_days} দিন</strong></td>
                <td><strong>${Math.round(report.avg_daily_calories)} kcal</strong></td>
                <td><strong>${report.target_calories} kcal</strong></td>
                <td><strong>${report.adherence_pct}%</strong></td>
              </tr>
            </tbody>
          </table>

          <h2>📊 ম্যাক্রো পুষ্টি ও ক্যালোরি খতিয়ান (Macronutrient Summary)</h2>
          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th>পুষ্টি উপাদান</th>
                <th>দৈনিক গড় গ্রহণ</th>
                <th>দৈনিক লক্ষ্য</th>
                <th>${report.period_days} দিনের মোট গ্রহণ</th>
                <th>মোট লক্ষ্যমাত্রা</th>
                <th>পূরণ হার (%)</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ক্যালোরি (Calories)</strong></td>
                <td>${Math.round(avgCalories)} kcal</td>
                <td>${activeTargets.target_calories} kcal</td>
                <td>${Math.round(avgCalories * report.days_with_data)} kcal</td>
                <td>${activeTargets.target_calories * report.period_days} kcal</td>
                <td>${Math.round((avgCalories / activeTargets.target_calories) * 100)}%</td>
                <td><span class="status-badge" style="background-color: ${caloriesStatus.bg}; color: ${caloriesStatus.color};">${caloriesStatus.label}</span></td>
              </tr>
              <tr>
                <td><strong>আমিষ (Protein)</strong></td>
                <td>${Math.round(avgProtein)}g</td>
                <td>${activeTargets.protein_g}g</td>
                <td>${Math.round(totalProtein)}g</td>
                <td>${activeTargets.protein_g * report.period_days}g</td>
                <td>${Math.round((avgProtein / activeTargets.protein_g) * 100)}%</td>
                <td><span class="status-badge" style="background-color: ${proteinStatus.bg}; color: ${proteinStatus.color};">${proteinStatus.label}</span></td>
              </tr>
              <tr>
                <td><strong>শর্করা (Carbs)</strong></td>
                <td>${Math.round(avgCarbs)}g</td>
                <td>${activeTargets.carbs_g}g</td>
                <td>${Math.round(totalCarbs)}g</td>
                <td>${activeTargets.carbs_g * report.period_days}g</td>
                <td>${Math.round((avgCarbs / activeTargets.carbs_g) * 100)}%</td>
                <td><span class="status-badge" style="background-color: ${carbsStatus.bg}; color: ${carbsStatus.color};">${carbsStatus.label}</span></td>
              </tr>
              <tr>
                <td><strong>চর্বি (Fat)</strong></td>
                <td>${Math.round(avgFat)}g</td>
                <td>${activeTargets.fat_g}g</td>
                <td>${Math.round(totalFat)}g</td>
                <td>${activeTargets.fat_g * report.period_days}g</td>
                <td>${Math.round((avgFat / activeTargets.fat_g) * 100)}%</td>
                <td><span class="status-badge" style="background-color: ${fatStatus.bg}; color: ${fatStatus.color};">${fatStatus.label}</span></td>
              </tr>
              <tr>
                <td><strong>আঁশ (Fiber)</strong></td>
                <td>${Math.round(avgFiber)}g</td>
                <td>${activeTargets.fiber_g}g</td>
                <td>${Math.round(totalFiber)}g</td>
                <td>${activeTargets.fiber_g * report.period_days}g</td>
                <td>${Math.round((avgFiber / activeTargets.fiber_g) * 100)}%</td>
                <td><span class="status-badge" style="background-color: ${fiberStatus.bg}; color: ${fiberStatus.color};">${fiberStatus.label}</span></td>
              </tr>
            </tbody>
          </table>

          ${report.clinical_insights && report.clinical_insights.length > 0 ? `
            <h2>🩺 ক্লিনিক্যাল পুষ্টি সতর্কবার্তা ও পরামর্শ (Clinical Nutrition Insights)</h2>
            <table style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="width: 25%;">সতর্কবার্তা / উপাদান</th>
                  <th style="width: 55%;">পুষ্টিবিদ মূল্যায়ন ও পরামর্শ</th>
                  <th style="width: 20%;">রেফারেন্স গাইডলাইন</th>
                </tr>
              </thead>
              <tbody>
                ${report.clinical_insights.map(ins => {
                  const badgeColor = ins.type === 'error' ? '#C62828' : '#EF6C00';
                  const badgeBg = ins.type === 'error' ? '#FFEBEE' : '#FFF3E0';
                  return `
                    <tr>
                      <td>
                        <span class="status-badge" style="background-color: ${badgeBg}; color: ${badgeColor}; margin-bottom: 4px;">${ins.title}</span>
                        ${ins.disease ? `<br><small style="color: #7A8487; font-size: 10px;">শারীরিক অবস্থা: ${ins.disease}</small>` : ''}
                      </td>
                      <td>${ins.message}</td>
                      <td><em style="color: #7A8487; font-size: 11px;">${ins.reference || 'Bangladesh Dietary Guidelines'}</em></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          ${report.calorie_history && report.calorie_history.length > 0 ? `
            <h2>📅 প্রতিদিনের ক্যালোরি বিবরণী (Daily Calorie Consumption Log)</h2>
            <table style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>ক্যালোরি গ্রহণ</th>
                  <th>পরিকল্পিত ক্যালোরি</th>
                  <th>পূরণ হার (%)</th>
                </tr>
              </thead>
              <tbody>
                ${report.calorie_history.map(day => {
                  const pct = day.calories_target > 0 ? Math.round((day.calories_consumed / day.calories_target) * 100) : 100;
                  return `
                    <tr>
                      <td>${day.date}</td>
                      <td>${day.calories_consumed} kcal</td>
                      <td>${day.calories_target} kcal</td>
                      <td>${pct}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          ${report.weight_history && report.weight_history.length > 0 ? `
            <h2>⚖️ ওজন পরিবর্তনের ইতিহাস (Weight Tracking History)</h2>
            <table style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>ওজন (কেজি)</th>
                </tr>
              </thead>
              <tbody>
                ${report.weight_history.map(log => `
                  <tr>
                    <td>${log.date}</td>
                    <td>${log.weight_kg} kg</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <h2>🩺 ভিটামিন ও খনিজ খতিয়ান (Micronutrient Tracker)</h2>
          
          ${vitamins.length > 0 ? `
            <h3 style="margin-top: 15px; margin-bottom: 5px; color: #8FB41E; font-size: 14px;">🍊 ভিটামিন (Vitamins)</h3>
            <table style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>ভিটামিন</th>
                  <th>গড় দৈনিক গ্রহণ</th>
                  <th>লক্ষ্যমাত্রা</th>
                  <th>পূরণ হার (%)</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                ${vitamins.map(nut => {
                  const status = isOptimal(nut.consumed, nut.target);
                  return `
                    <tr>
                      <td><strong>${nut.name_bn || nut.name} (${nut.name})</strong></td>
                      <td>${Math.round(nut.consumed)} ${nut.unit}</td>
                      <td>${Math.round(nut.target)} ${nut.unit}</td>
                      <td>${Math.round(nut.percentage)}%</td>
                      <td><span class="status-badge" style="background-color: ${status.bg}; color: ${status.color};">${status.label}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          ${minerals.length > 0 ? `
            <h3 style="margin-top: 15px; margin-bottom: 5px; color: #3b82f6; font-size: 14px;">💎 খনিজ (Minerals)</h3>
            <table style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>খনিজ</th>
                  <th>গড় দৈনিক গ্রহণ</th>
                  <th>লক্ষ্যমাত্রা</th>
                  <th>পূরণ হার (%)</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                ${minerals.map(nut => {
                  const status = isOptimal(nut.consumed, nut.target);
                  return `
                    <tr>
                      <td><strong>${nut.name_bn || nut.name} (${nut.name})</strong></td>
                      <td>${Math.round(nut.consumed)} ${nut.unit}</td>
                      <td>${Math.round(nut.target)} ${nut.unit}</td>
                      <td>${Math.round(nut.percentage)}%</td>
                      <td><span class="status-badge" style="background-color: ${status.bg}; color: ${status.color};">${status.label}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          ${fatty.length > 0 ? `
            <h3 style="margin-top: 15px; margin-bottom: 5px; color: #10b981; font-size: 14px;">🌱 ফ্যাটি অ্যাসিড (Fatty Acids)</h3>
            <table>
              <thead>
                <tr>
                  <th>ফ্যাটি অ্যাসিড</th>
                  <th>গড় দৈনিক গ্রহণ</th>
                  <th>লক্ষ্যমাত্রা</th>
                  <th>পূরণ হার (%)</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                ${fatty.map(nut => {
                  const status = isOptimal(nut.consumed, nut.target);
                  return `
                    <tr>
                      <td><strong>${nut.name_bn || nut.name} (${nut.name})</strong></td>
                      <td>${Math.round(nut.consumed)} ${nut.unit}</td>
                      <td>${Math.round(nut.target)} ${nut.unit}</td>
                      <td>${Math.round(nut.percentage)}%</td>
                      <td><span class="status-badge" style="background-color: ${status.bg}; color: ${status.color};">${status.label}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="footer">
            এটি একটি এআই-সহায়ক পুষ্টি রিপোর্ট। সুনির্দিষ্ট চিকিৎসা পরামর্শের জন্য অনুগ্রহ করে নিবন্ধিত পুষ্টিবিদ বা ডাক্তারের পরামর্শ নিন।<br>
            © ${new Date().getFullYear()} DesiDiet Inc. All rights reserved.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <DashboardLayout
      title="স্বাস্থ্য রিপোর্ট"
      subtitle="Health Report"
      headerActions={
        generated ? (
          <button onClick={() => { setGenerated(false); setReport(null); }}
            className="p-1.5 bg-cream rounded-lg text-ink-muted hover:bg-accent hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : undefined
      }
    >
      <div className="max-w-6xl w-full mx-auto pb-6 space-y-4">

        {/* ── Weight Input + Period Selector ── */}
        {!generated && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-ink/5 shadow-sm p-4 space-y-3 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="font-display font-black text-sm text-ink leading-none">স্বাস্থ্য রিপোর্ট তৈরি করুন</h2>
                <p className="text-[0.62rem] text-ink-faint font-bn mt-1">আপনার পুষ্টি ও ক্যালোরি গ্রহণের বিস্তারিত বিশ্লেষণ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Period tabs */}
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1.5 font-body">রিপোর্টের সময়কাল</p>
                <div className="flex gap-1.5">
                  {([3, 7, 10] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`flex-1 py-1.5 rounded-lg font-display font-bold text-xs transition-all ${
                        period === p ? 'bg-ink text-cream shadow-sm' : 'bg-cream text-ink hover:bg-ink/5'
                      }`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight input */}
              <div>
                <label className="block text-[0.62rem] font-bold uppercase tracking-wider text-ink-faint mb-1.5 font-body">
                  আজকের ওজন (কেজি) <span className="text-accent">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="যেমন: ৬৮.৫"
                      min={20} max={300} step={0.1}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-lg font-display font-bold text-xs outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !weight}
                    className="px-3.5 py-1.5 bg-accent text-white rounded-lg font-display font-bold text-xs flex items-center gap-1 hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                    রিপোর্ট তৈরি করুন
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bn flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="font-bn text-xs text-ink-muted text-center">
              আপনার স্বাস্থ্য ডেটা বিশ্লেষণ করা হচ্ছে...<br />
              <span className="text-[0.62rem] opacity-60">গত {period} দিনের মিল প্ল্যান ও ওজন তথ্য প্রসেস করছে</span>
            </p>
          </div>
        )}

        {/* ── Report ── */}
        {report && !loading && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Summary Hero */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-ink text-cream p-5 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5">
                  <BarChart2 className="w-40 h-40 absolute -right-5 -top-5" />
                </div>
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: Calendar, label: 'বিশ্লেষিত দিন', val: `${report.days_with_data}/${report.period_days}`, unit: 'দিন', color: 'text-accent' },
                    { icon: Flame, label: 'গড় ক্যালোরি/দিন', val: report.avg_daily_calories.toLocaleString(), unit: 'kcal', color: 'text-amber-400' },
                    { icon: Target, label: 'লক্ষ্য ক্যালোরি', val: report.target_calories.toLocaleString(), unit: 'kcal/দিন', color: 'text-blue-400' },
                    { icon: CheckCircle2, label: 'অনুসরণ হার', val: `${report.adherence_pct}%`, unit: 'adherence', color: 'text-green-400' },
                  ].map((item, i) => (
                    <div key={i} className="font-bn">
                      <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-[0.58rem] font-bold uppercase tracking-wider">{item.label}</span>
                      </div>
                      <div className="font-display text-xl font-black leading-none mt-1">{item.val}</div>
                      <div className={`text-[0.58rem] ${item.color} font-bold mt-0.5`}>{item.unit}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Main Gorgeous 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* Left Columns (Charts and Nutrient Stats) - Takes 2/3 space */}
                <div className="lg:col-span-2 space-y-4">

                  {/* AI Dietitian Verdict Card */}
                  {report.ai_verdict && (
                    <div className="bg-gradient-to-br from-cream/40 via-white to-green-50/20 p-4 rounded-2xl border border-accent/20 shadow-sm space-y-2.5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-bl-full pointer-events-none" />
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-accent/10 text-accent rounded-xl">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bn font-black text-xs text-ink leading-tight">এআই ও সামগ্রিক পুষ্টি মূল্যায়ন (Clinical AI Assessment)</h2>
                          <p className="text-[0.52rem] font-bn text-ink-faint leading-none mt-0.5">PushtiAI™ সিনিয়র ডায়েট পরামর্শক দ্বারা প্রস্তুত</p>
                        </div>
                      </div>
                      <p className="font-bn text-[0.68rem] text-ink/90 leading-relaxed font-medium pl-2 border-l-2 border-accent/40 bg-cream/10 py-1 pr-1.5 rounded italic">
                        "{report.ai_verdict}"
                      </p>
                      <div className="flex items-center justify-between text-[0.52rem] font-bn text-ink-faint pt-1 border-t border-ink/5">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-accent" /> অনুমোদিত ক্লিনিক্যাল পুষ্টি নির্দেশিকা</span>
                        <span className="font-semibold italic">DesiDiet AI Engine</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Side-by-side Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Calorie Intake Chart */}
                    <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-accent rounded-full" />
                        <h2 className="font-bn font-bold text-xs text-ink">ক্যালোরি গ্রহণ (প্রতিদিন)</h2>
                      </div>
                      {report.calorie_history.length > 0 ? (
                        <ResponsiveContainer width="100%" height={150}>
                          <AreaChart data={report.calorie_history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#e05a1c" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#e05a1c" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ece8" />
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                              formatter={(val: number) => [`${val} kcal`, 'ক্যালোরি']}
                            />
                            <ReferenceLine y={report.target_calories} stroke="#3b82f6" strokeDasharray="4 4" />
                            <Area type="monotone" dataKey="calories_consumed" stroke="#e05a1c" strokeWidth={2}
                              fill="url(#calGrad)" dot={{ r: 2.5, fill: '#e05a1c' }} activeDot={{ r: 4 }} name="calories" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[150px] flex items-center justify-center">
                          <p className="font-bn text-ink-faint text-[0.68rem]">কোনো মিল প্ল্যান সম্পন্ন করা হয়নি</p>
                        </div>
                      )}
                    </div>

                    {/* Weight Curve Chart */}
                    <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                        <h2 className="font-bn font-bold text-xs text-ink">ওজনের পরিবর্তন</h2>
                      </div>
                      {report.weight_history.length > 1 ? (
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={report.weight_history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ece8" />
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                              formatter={(val: number) => [`${val} kg`, 'ওজন']}
                            />
                            <Line type="monotone" dataKey="weight_kg" stroke="#3b82f6" strokeWidth={2}
                              dot={{ r: 3, fill: '#3b82f6', stroke: 'white', strokeWidth: 1 }} activeDot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[150px] flex flex-col items-center justify-center gap-1 text-center">
                          <TrendingUp className="w-6 h-6 text-ink/10" />
                          <p className="font-bn text-ink-faint text-[0.68rem]">
                            ওজন লগ করুন পরিবর্তন দেখতে<br />
                            <span className="opacity-60 text-[0.62rem]">আজ: {report.current_weight_kg} কেজি</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Macro Row: Pie + Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pie Chart */}
                    <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
                        <h2 className="font-bn font-bold text-xs text-ink">ম্যাক্রো বিভাজন</h2>
                      </div>
                      {report.pie_data.length > 0 ? (
                        <>
                          <div className="h-[120px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={report.pie_data} cx="50%" cy="50%" outerRadius={50}
                                  dataKey="value" labelLine={false} label={renderCustomLabel}>
                                  {report.pie_data.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                  formatter={(val: number, _: string, props: any) => [
                                    `${val}% (${props.payload.grams}g)`,
                                    props.payload.name
                                  ]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-3 flex-wrap mt-1">
                            {report.pie_data.map((d, i) => (
                              <div key={i} className="flex items-center gap-1 text-[0.62rem] font-bn">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                <span className="font-bold text-ink">{d.name}</span>
                                <span className="text-ink-faint">{d.grams}g</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-[140px] flex items-center justify-center">
                          <p className="font-bn text-ink-faint text-[0.68rem]">পর্যাপ্ত ডেটা নেই</p>
                        </div>
                      )}
                    </div>

                    {/* Macro vs Target Bar & Table */}
                    <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-green-500 rounded-full" />
                        <h2 className="font-bn font-bold text-xs text-ink">ম্যাক্রো পুষ্টি খতিয়ান (Macros Summary)</h2>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'আমিষ (Protein)', consumed: report.macro_summary.protein_g, target: report.macro_summary.target_protein_g, color: 'bg-emerald-500', unit: 'g' },
                          { label: 'শর্করা (Carbs)', consumed: report.macro_summary.carbs_g, target: report.macro_summary.target_carbs_g, color: 'bg-blue-500', unit: 'g' },
                          { label: 'চর্বি (Fat)', consumed: report.macro_summary.fat_g, target: report.macro_summary.target_fat_g, color: 'bg-amber-500', unit: 'g' },
                          { label: 'আঁশ (Fiber)', consumed: report.macro_summary.fiber_g, target: report.period_days * 30, color: 'bg-purple-500', unit: 'g' },
                        ].map((m, i) => {
                          const pct = m.target > 0 ? Math.round((m.consumed / m.target) * 100) : 0;
                          const avgDaily = m.consumed / report.period_days;
                          const targetDaily = m.target / report.period_days;
                          
                          let statusLabel = 'সঠিক';
                          let statusColor = 'text-green-600 bg-green-50';
                          if (pct < 70) {
                            statusLabel = 'ঘাটতি';
                            statusColor = 'text-red-600 bg-red-50';
                          } else if (pct > 115) {
                            statusLabel = 'অতিরিক্ত';
                            statusColor = 'text-amber-600 bg-amber-50';
                          }

                          return (
                            <div key={i} className="font-bn border-b border-ink/5 pb-2.5 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-center text-[0.68rem] mb-1">
                                <span className="font-bold text-ink">{m.label}</span>
                                <span className={`text-[0.52rem] font-bold px-1.5 py-0.5 rounded ${statusColor}`}>
                                  {statusLabel} ({pct}%)
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-[0.62rem] text-ink-muted mb-1.5">
                                <div>
                                  <span className="text-[0.52rem] text-ink-faint block">দৈনিক গড় গ্রহণ</span>
                                  <strong className="text-ink font-display">{avgDaily.toFixed(1)}{m.unit}</strong>
                                </div>
                                <div>
                                  <span className="text-[0.52rem] text-ink-faint block">দৈনিক লক্ষ্য</span>
                                  <strong className="text-ink font-display">{targetDaily.toFixed(1)}{m.unit}</strong>
                                </div>
                                <div>
                                  <span className="text-[0.52rem] text-ink-faint block">{report.period_days} দিনের মোট</span>
                                  <strong className="text-ink font-display">{m.consumed.toFixed(0)}{m.unit} / {m.target.toFixed(0)}{m.unit}</strong>
                                </div>
                              </div>

                              <div className="h-1.5 bg-cream rounded-full overflow-hidden">
                                <div className={`h-full ${m.color} rounded-full transition-all duration-700`}
                                  style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Insights Section */}
                  {report.clinical_insights && report.clinical_insights.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3.5 bg-rose-500 rounded-full" />
                        <h2 className="font-bn font-black text-xs text-ink">🩺 ক্লিনিক্যাল পুষ্টি সতর্কবার্তা ও পরামর্শ (Clinical AI Insights)</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.clinical_insights.map((ins, i) => {
                          const isError = ins.type === 'error';
                          return (
                            <div key={i} className={`p-3 rounded-xl border flex flex-col justify-between font-bn transition-all hover:shadow ${
                              isError 
                                ? 'bg-red-50/20 border-red-100 text-red-950' 
                                : 'bg-amber-50/10 border-amber-100 text-amber-950'
                            }`}>
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-1.5">
                                  <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isError ? 'text-red-500' : 'text-amber-500'}`} />
                                  <div>
                                    <h3 className="font-bold text-[0.68rem] leading-snug">{ins.title}</h3>
                                    {ins.disease && (
                                      <span className={`inline-block text-[0.48rem] font-bold px-1 py-0.2 rounded mt-0.5 ${
                                        isError ? 'bg-red-100/60 text-red-700' : 'bg-amber-100/60 text-amber-700'
                                      }`}>
                                        শারীরিক অবস্থা: {ins.disease}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[0.62rem] text-ink-muted leading-relaxed font-medium">
                                  {ins.message}
                                </p>
                              </div>
                              {ins.reference && (
                                <div className="mt-2 pt-1.5 border-t border-ink/5 flex items-center justify-between text-[0.48rem] text-ink-faint leading-none">
                                  <span>রেফারেন্স:</span>
                                  <span className="font-bold italic text-accent">{ins.reference}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Micronutrient Tracker */}
                  {report.micronutrient_targets.length > 0 && (() => {
                    const VITAMIN_NAMES = [
                      "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
                      "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
                      "Pantothenic acid (B5)", "Biotin (B7)"
                    ];
                    const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Iodine (I)"];
                    const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];
                    const all = report.micronutrient_targets;
                    const vitamins = all.filter(n => VITAMIN_NAMES.includes(n.name));
                    const minerals = all.filter(n => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
                    const fatty = all.filter(n => FATTY_NAMES.includes(n.name));
                    const groups = [
                      { id: 'v', label: 'ভিটামিন', items: vitamins, color: 'bg-amber-500' },
                      { id: 'm', label: 'খনিজ', items: minerals, color: 'bg-blue-500' },
                      { id: 'f', label: 'ফ্যাটি অ্যাসিড', items: fatty, color: 'bg-green-500' },
                    ];
                    return (
                      <div className="bg-white p-4 rounded-2xl border border-ink/5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3.5 bg-purple-500 rounded-full" />
                          <h2 className="font-bn font-bold text-xs text-ink">মাইক্রোনিউট্রিয়েন্ট ট্র্যাকার</h2>
                        </div>
                        {groups.map(g => g.items.length > 0 && (
                          <div key={g.id} className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${g.color}`} />
                              <h3 className="font-bn font-bold text-[0.68rem] text-ink">{g.label}</h3>
                              <div className="flex-1 h-px bg-ink/5" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {g.items.map((nut, i) => {
                                let barColor = g.color;
                                if (nut.percentage >= 100) barColor = 'bg-green-500';
                                else if (nut.percentage >= 50) barColor = 'bg-amber-500';
                                return (
                                  <div key={i} className="bg-cream/30 p-2.5 rounded-xl border border-ink/5 space-y-2 flex flex-col justify-between hover:shadow transition-all duration-300">
                                    <div className="flex justify-between items-start gap-1">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bn font-bold text-[0.62rem] text-ink leading-tight truncate">{nut.name_bn}</p>
                                        <p className="text-[0.52rem] text-ink-faint uppercase truncate leading-none mt-0.5">{nut.name}</p>
                                      </div>
                                      <span className={`text-[0.58rem] font-bold shrink-0 px-1.5 py-0.5 rounded ${
                                        nut.percentage >= 100 ? 'text-green-700 bg-green-50' : nut.percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-ink-muted bg-cream'
                                      }`}>{nut.percentage}%</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="h-1 bg-cream rounded-full overflow-hidden">
                                        <div className={`h-full ${barColor} transition-all duration-700 rounded-full`}
                                          style={{ width: `${Math.min(100, nut.percentage)}%` }} />
                                      </div>
                                      <div className="flex justify-between text-[0.52rem] font-bn text-ink-faint leading-none">
                                        <span>{Math.round(nut.consumed)} {nut.unit}</span>
                                        <span>{Math.round(nut.target)} {nut.unit}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </div>

                {/* Right Columns (Clinical Insights & Actions) - Takes 1/3 space */}
                <div className="space-y-4">
                  
                  {/* Download PDF Card */}
                  <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-accent animate-bounce" />
                      <h3 className="font-display font-black text-sm text-ink">স্বাস্থ্য রিপোর্ট ডাউনলোড</h3>
                    </div>
                    <p className="font-bn text-xs text-ink-muted leading-relaxed">
                      আপনার {period} দিনের পুষ্টি, এআই ও ক্লিনিক্যাল পরামর্শ সংবলিত একটি প্রফেশনাল পিডিএফ রিপোর্ট ডাউনলোড করুন।
                    </p>
                    <button
                      onClick={handlePrint}
                      className="w-full py-2.5 bg-accent hover:opacity-90 text-white rounded-xl font-bn font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      পিডিএফ রিপোর্ট প্রিন্ট / সেভ
                    </button>
                  </div>

                  {/* Email Report Form */}
                  <div className="bg-white p-5 rounded-2xl border border-ink/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-accent" />
                      <h3 className="font-display font-black text-sm text-ink">ইমেইলে রিপোর্ট পাঠান</h3>
                    </div>
                    <p className="font-bn text-xs text-ink-muted leading-relaxed">
                      আপনার এই স্বাস্থ্য রিপোর্টের সারসংক্ষেপটি সরাসরি আপনার ইমেইলে পাঠিয়ে রাখুন।
                    </p>

                    {emailSent ? (
                      <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-center justify-center gap-2 font-bn text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" /> রিপোর্ট সফলভাবে ইমেইলে পাঠানো হয়েছে!
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="আপনার ইমেইল ঠিকানা"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                          className="flex-1 px-3 py-2 bg-cream/40 border border-ink/10 focus:border-accent/30 rounded-xl font-display text-xs outline-none transition-all"
                        />
                        <button
                          onClick={handleSendEmail}
                          disabled={emailSending || !email.includes('@')}
                          className="px-4 py-2 bg-ink text-cream hover:bg-accent rounded-xl font-display font-bold text-xs transition-all disabled:opacity-50 shrink-0"
                        >
                          {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'পাঠান'}
                        </button>
                      </div>
                    )}
                    {emailError && (
                      <p className="text-[0.68rem] text-red-500 font-bn mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {emailError}
                      </p>
                    )}
                  </div>

                </div>

              </div>

              {/* Regenerate button */}
              <div className="flex justify-center pt-2">
                <button onClick={() => { setGenerated(false); setReport(null); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 border border-ink/10 rounded-xl font-bn text-xs text-ink-muted hover:border-accent/30 hover:text-accent hover:bg-cream transition-all shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" /> নতুন রিপোর্ট তৈরি করুন
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </DashboardLayout>
  );
};

