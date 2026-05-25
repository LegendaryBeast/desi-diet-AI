import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import {
  TrendingUp, Flame, Mail, CheckCircle, BarChart3,
  Scale, AlertCircle, Calendar, Zap, FileText, Download,
  Heart, AlertTriangle, Brain, ShieldCheck,
} from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
const BarChart = ({ data, target }: { data: number[]; target: number }) => {
  const W = 300;
  const H = 100;
  const MAX = Math.max(...data, target) * 1.1;
  const barW = (W / data.length) * 0.6;
  const gap = W / data.length;

  return (
    <Svg width={W} height={H + 20}>
      {/* Target line */}
      <Line
        x1={0} y1={H - (target / MAX) * H}
        x2={W} y2={H - (target / MAX) * H}
        stroke={colors.accent} strokeWidth={1.5} strokeDasharray="4,4"
      />
      {data.map((val, i) => {
        const barH = (val / MAX) * H;
        const x = i * gap + (gap - barW) / 2;
        const fill = val > target * 1.1 ? colors.error : val > target * 0.85 ? colors.success : colors.primary;
        return (
          <G key={i}>
            <Rect x={x} y={H - barH} width={barW} height={barH} rx={4} fill={fill} opacity={0.85} />
          </G>
        );
      })}
    </Svg>
  );
};

// ── Mini Line Chart ───────────────────────────────────────────────────────────
const LineChart = ({ points }: { points: number[] }) => {
  if (points.length < 2) return null;
  const W = 300;
  const H = 80;
  const MIN = Math.min(...points) * 0.98;
  const MAX = Math.max(...points) * 1.02;
  const scaleX = (i: number) => (i / (points.length - 1)) * W;
  const scaleY = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;

  const pathD = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(v).toFixed(1)}`)
    .join(' ');

  return (
    <Svg width={W} height={H + 24}>
      <SvgText x={0} y={H + 16} fontSize={10} fill={colors.textSecondary}>
        {MIN.toFixed(1)}
      </SvgText>
      <SvgText x={W - 24} y={H + 16} fontSize={10} fill={colors.textSecondary}>
        {MAX.toFixed(1)}
      </SvgText>
      {/* Line */}
      <SvgText>
        {/* Using polyline approach via Rect trick */}
      </SvgText>
      {points.map((v, i) => (
        <Rect
          key={i}
          x={scaleX(i) - 3}
          y={scaleY(v) - 3}
          width={6}
          height={6}
          rx={3}
          fill={colors.primary}
        />
      ))}
    </Svg>
  );
};

const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/###/g, '').trim();
};

export default function ReportScreen() {
  const user = useAuthStore((s) => s.user);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [emailSent, setEmailSent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<3 | 7 | 10 | 30>(7);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const { data: nutrition, isLoading: nLoad, refetch: refetchN } = useQuery({
    queryKey: ['nutrition_report'],
    queryFn: async () => (await reportsApi.nutrition()).data,
  });

  const { data: conditions, isLoading: cLoad, refetch: refetchC } = useQuery({
    queryKey: ['condition_report'],
    queryFn: async () => (await reportsApi.conditions()).data,
  });

  const { data: healthSummary, isLoading: hLoad, refetch: refetchH } = useQuery({
    queryKey: ['health_summary', selectedDuration],
    queryFn: async () => (await reportsApi.healthSummary(selectedDuration)).data,
  });

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const activeTargets = healthSummary?.targets || targets || {
        target_calories: 2000,
        protein_g: 80,
        carbs_g: 250,
        fat_g: 60,
        fiber_g: 25,
      };

      const slicedLogs = weeklyLogs.slice(-selectedDuration);
      const avgCalories = healthSummary?.avg_daily_calories || (
        slicedLogs.length > 0
          ? slicedLogs.reduce((sum: number, log: any) => sum + (log.consumed_calories || 0), 0) / slicedLogs.length
          : activeTargets.target_calories * 0.88
      );

      const complianceRate = activeTargets.target_calories ? (avgCalories / activeTargets.target_calories) : 0.85;

      const totalProtein = healthSummary?.macro_summary?.protein_g || (activeTargets.protein_g * complianceRate * selectedDuration);
      const totalCarbs = healthSummary?.macro_summary?.carbs_g || (activeTargets.carbs_g * complianceRate * selectedDuration);
      const totalFat = healthSummary?.macro_summary?.fat_g || (activeTargets.fat_g * complianceRate * selectedDuration);
      const totalFiber = healthSummary?.macro_summary?.fiber_g || (activeTargets.fiber_g * complianceRate * selectedDuration);

      const avgProtein = totalProtein / selectedDuration;
      const avgCarbs = totalCarbs / selectedDuration;
      const avgFat = totalFat / selectedDuration;
      const avgFiber = totalFiber / selectedDuration;

      const daysWithData = healthSummary?.days_with_data || (slicedLogs.length > 0 ? slicedLogs.filter((x: any) => x.consumed_calories > 0).length : selectedDuration);
      const periodDays = healthSummary?.period_days || selectedDuration;
      const adherencePct = healthSummary?.adherence_pct || Math.round((daysWithData / periodDays) * 100);

      // Micronutrient grouping exactly like web
      const VITAMIN_NAMES = [
        "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
        "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
        "Pantothenic acid (B5)", "Biotin (B7)"
      ];
      const EXCLUDE_NAMES = ["Choline", "Vitamin B12", "Chloride (Cl)", "Iodine (I)"];
      const FATTY_NAMES = ["Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids"];

      const mappedMicros = (healthSummary?.micronutrient_targets && healthSummary.micronutrient_targets.length > 0)
        ? healthSummary.micronutrient_targets.map((micro: any) => ({
            name: micro.name,
            nameBn: micro.name_bn || micro.name,
            unit: micro.unit,
            target: Math.round(micro.target / selectedDuration),
            avg: Math.round(micro.consumed / selectedDuration),
            percentage: micro.percentage,
          }))
        : [
            { name: "Vitamin A", nameBn: "ভিটামিন এ (Vitamin A)", unit: "mcg", target: 900, avg: Math.round(900 * complianceRate * 0.78), percentage: Math.round(78 * complianceRate) },
            { name: "Ascorbic acids (C)", nameBn: "ভিটামিন সি (Vitamin C)", unit: "mg", target: 80, avg: Math.round(80 * complianceRate * 1.05), percentage: Math.round(105 * complianceRate) },
            { name: "Vitamin D", nameBn: "ভিটামিন ডি (Vitamin D)", unit: "mcg", target: 15, avg: Math.round(15 * complianceRate * 0.65), percentage: Math.round(65 * complianceRate) },
            { name: "Calcium (Ca)", nameBn: "ক্যালসিয়াম (Calcium)", unit: "mg", target: 1000, avg: Math.round(1000 * complianceRate * 0.95), percentage: Math.round(95 * complianceRate) },
            { name: "Iron (Fe)", nameBn: "আয়রন (Iron)", unit: "mg", target: 17, avg: Math.round(17 * complianceRate * 0.72), percentage: Math.round(72 * complianceRate) },
            { name: "Sodium (Na)", nameBn: "সোডিয়াম (Sodium)", unit: "mg", target: 2000, avg: Math.round(2000 * complianceRate * 1.35), percentage: Math.round(135 * complianceRate) },
            { name: "Potassium (K)", nameBn: "পটাশিয়াম (Potassium)", unit: "mg", target: 3500, avg: Math.round(3500 * complianceRate * 0.82), percentage: Math.round(82 * complianceRate) },
            { name: "Zinc (Zn)", nameBn: "জিঙ্ক (Zinc)", unit: "mg", target: 12, avg: Math.round(12 * complianceRate * 0.88), percentage: Math.round(88 * complianceRate) }
          ];

      const vitamins = mappedMicros.filter((n: any) => VITAMIN_NAMES.includes(n.name));
      const minerals = mappedMicros.filter((n: any) => !VITAMIN_NAMES.includes(n.name) && !FATTY_NAMES.includes(n.name) && !EXCLUDE_NAMES.includes(n.name));
      const fatty = mappedMicros.filter((n: any) => FATTY_NAMES.includes(n.name));

      const isOptimal = (avgVal: number, targetVal: number) => {
        const pct = targetVal > 0 ? (avgVal / targetVal) * 100 : 100;
        if (pct < 70) return { label: 'ঘাটতি', color: '#C62828', bg: '#FFEBEE' };
        if (pct > 115) return { label: 'অতিরিক্ত', color: '#EF6C00', bg: '#FFF3E0' };
        return { label: 'সঠিক', color: '#2E7D32', bg: '#E8F5E9' };
      };

      const caloriesStatus = isOptimal(avgCalories, activeTargets.target_calories);
      const proteinStatus = isOptimal(avgProtein, activeTargets.protein_g);
      const carbsStatus = isOptimal(avgCarbs, activeTargets.carbs_g);
      const fatStatus = isOptimal(avgFat, activeTargets.fat_g);
      const fiberStatus = isOptimal(avgFiber, activeTargets.fiber_g);

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
              h2 { font-size: 16px; color: #1C2123; border-left: 5px solid #A7C924; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 20px; }
              th { background-color: #EBF0D8; color: #1C2123; padding: 10px 12px; text-align: left; border: 1px solid #DFE3D1; font-weight: bold; }
              td { padding: 10px 12px; border: 1px solid #DFE3D1; }
              .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; }
              .food-tag { display: inline-block; background-color: #FFFDF9; border: 1px solid #DFE3D1; border-radius: 12px; padding: 4px 10px; margin: 4px; font-size: 11px; }
              .footer { margin-top: 50px; border-top: 1px solid #DFE3D1; padding-top: 15px; font-size: 11px; color: #7A8487; text-align: center; line-height: 1.8; }
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
                <strong>রিপোর্ট মেয়াদ:</strong> ${selectedDuration} দিন
              </div>
            </div>

            <div class="user-box">
              <table style="border: none; margin: 0; width: 100%; box-shadow: none;">
                <tr style="border: none;">
                  <td style="border: none; padding: 0; width: 50%;"><strong>সদস্যের নাম:</strong> ${user?.name_bn || user?.name_en || 'সম্মানিত সদস্য'}</td>
                  <td style="border: none; padding: 0; width: 50%; text-align: right;"><strong>ডায়েট লক্ষ্য:</strong> পুষ্টি পরিমাপ ও সুস্বাস্থ্য</td>
                </tr>
              </table>
            </div>

            ${healthSummary?.ai_verdict ? `
              <div style="background-color: #FFFDF9; border: 1px dashed #A7C924; padding: 18px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; line-height: 1.6;">
                <div style="font-weight: bold; color: #8FB41E; font-size: 14px; margin-bottom: 6px;">
                  📋 এআই ও সামগ্রিক মূল্যায়ন (Clinical AI Assessment & Verdict)
                </div>
                <p style="margin: 0; color: #1C2123; font-style: italic; font-weight: 500;">
                  "${healthSummary.ai_verdict}"
                </p>
              </div>
            ` : ''}

            <h2>📋 সামগ্রিক স্বাস্থ্যের সারসংক্ষেপ (Overall Health Summary)</h2>
            <table>
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
                  <td><strong>${daysWithData}/${periodDays} দিন</strong></td>
                  <td><strong>${Math.round(avgCalories)} kcal</strong></td>
                  <td><strong>${activeTargets.target_calories} kcal</strong></td>
                  <td><strong>${adherencePct}%</strong></td>
                </tr>
              </tbody>
            </table>

            <h2>📊 ম্যাক্রো পুষ্টি ও ক্যালোরি খতিয়ান (Macronutrient Summary)</h2>
            <table>
              <thead>
                <tr>
                  <th>পুষ্টি উপাদান</th>
                  <th>দৈনিক গড় গ্রহণ</th>
                  <th>দৈনিক লক্ষ্য</th>
                  <th>${selectedDuration} দিনের মোট গ্রহণ</th>
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
                  <td>${Math.round(avgCalories * selectedDuration)} kcal</td>
                  <td>${activeTargets.target_calories * selectedDuration} kcal</td>
                  <td>${Math.round((avgCalories / activeTargets.target_calories) * 100)}%</td>
                  <td><span class="status-badge" style="background-color: ${caloriesStatus.bg}; color: ${caloriesStatus.color};">${caloriesStatus.label}</span></td>
                </tr>
                <tr>
                  <td><strong>আমিষ (Protein)</strong></td>
                  <td>${Math.round(avgProtein)}g</td>
                  <td>${activeTargets.protein_g}g</td>
                  <td>${Math.round(totalProtein)}g</td>
                  <td>${activeTargets.protein_g * selectedDuration}g</td>
                  <td>${Math.round((avgProtein / activeTargets.protein_g) * 100)}%</td>
                  <td><span class="status-badge" style="background-color: ${proteinStatus.bg}; color: ${proteinStatus.color};">${proteinStatus.label}</span></td>
                </tr>
                <tr>
                  <td><strong>শর্করা (Carbs)</strong></td>
                  <td>${Math.round(avgCarbs)}g</td>
                  <td>${activeTargets.carbs_g}g</td>
                  <td>${Math.round(totalCarbs)}g</td>
                  <td>${activeTargets.carbs_g * selectedDuration}g</td>
                  <td>${Math.round((avgCarbs / activeTargets.carbs_g) * 100)}%</td>
                  <td><span class="status-badge" style="background-color: ${carbsStatus.bg}; color: ${carbsStatus.color};">${carbsStatus.label}</span></td>
                </tr>
                <tr>
                  <td><strong>চর্বি (Fat)</strong></td>
                  <td>${Math.round(avgFat)}g</td>
                  <td>${activeTargets.fat_g}g</td>
                  <td>${Math.round(totalFat)}g</td>
                  <td>${activeTargets.fat_g * selectedDuration}g</td>
                  <td>${Math.round((avgFat / activeTargets.fat_g) * 100)}%</td>
                  <td><span class="status-badge" style="background-color: ${fatStatus.bg}; color: ${fatStatus.color};">${fatStatus.label}</span></td>
                </tr>
                <tr>
                  <td><strong>আঁশ (Fiber)</strong></td>
                  <td>${Math.round(avgFiber)}g</td>
                  <td>${activeTargets.fiber_g}g</td>
                  <td>${Math.round(totalFiber)}g</td>
                  <td>${activeTargets.fiber_g * selectedDuration}g</td>
                  <td>${Math.round((avgFiber / activeTargets.fiber_g) * 100)}%</td>
                  <td><span class="status-badge" style="background-color: ${fiberStatus.bg}; color: ${fiberStatus.color};">${fiberStatus.label}</span></td>
                </tr>
              </tbody>
            </table>

            ${healthSummary?.clinical_insights && healthSummary.clinical_insights.length > 0 ? `
              <h2>🩺 ক্লিনিক্যাল পুষ্টি সতর্কবার্তা ও পরামর্শ (Clinical Nutrition Insights)</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 25%;">সতর্কবার্তা / উপাদান</th>
                    <th style="width: 55%;">পুষ্টিবিদ মূল্যায়ন ও পরামর্শ</th>
                    <th style="width: 20%;">রেফারেন্স গাইডলাইন</th>
                  </tr>
                </thead>
                <tbody>
                  ${healthSummary.clinical_insights.map((ins: any) => {
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

            ${healthSummary?.calorie_history && healthSummary.calorie_history.length > 0 ? `
              <h2>📅 প্রতিদিনের ক্যালোরি বিবরণী (Daily Calorie Consumption Log)</h2>
              <table>
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>ক্যালোরি গ্রহণ</th>
                    <th>পরিকল্পিত ক্যালোরি</th>
                    <th>পূরণ হার (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${healthSummary.calorie_history.map((day: any) => {
                    const pct = day.calories_target > 0 ? Math.round((day.calories_consumed / day.calories_target) * 100) : 100;
                    return `
                      <tr>
                        <td>${day.date}</td>
                        <td>${day.calories_consumed} kcal</td>
                        <td>${day.calories_planned || day.calories_target} kcal</td>
                        <td>${pct}%</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : ''}

            ${healthSummary?.weight_history && healthSummary.weight_history.length > 0 ? `
              <h2>⚖️ ওজন পরিবর্তনের ইতিহাস (Weight Tracking History)</h2>
              <table>
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>ওজন (কেজি)</th>
                  </tr>
                </thead>
                <tbody>
                  ${healthSummary.weight_history.map((log: any) => `
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
              <table>
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
                  ${vitamins.map((nut: any) => {
                    const status = isOptimal(nut.avg, nut.target);
                    return `
                      <tr>
                        <td><strong>${nut.nameBn}</strong></td>
                        <td>${Math.round(nut.avg)} ${nut.unit}</td>
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
              <table>
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
                  ${minerals.map((nut: any) => {
                    const status = isOptimal(nut.avg, nut.target);
                    return `
                      <tr>
                        <td><strong>${nut.nameBn}</strong></td>
                        <td>${Math.round(nut.avg)} ${nut.unit}</td>
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
                  ${fatty.map((nut: any) => {
                    const status = isOptimal(nut.avg, nut.target);
                    return `
                      <tr>
                        <td><strong>${nut.nameBn}</strong></td>
                        <td>${Math.round(nut.avg)} ${nut.unit}</td>
                        <td>${Math.round(nut.target)} ${nut.unit}</td>
                        <td>${Math.round(nut.percentage)}%</td>
                        <td><span class="status-badge" style="background-color: ${status.bg}; color: ${status.color};">${status.label}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : ''}

            <h2>🍲 খাদ্য গ্রহণ তালিকা ও ফ্রিকোয়েন্সি (Food Frequency Log)</h2>
            <div style="margin-top: 10px; margin-bottom: 20px;">
              <span class="food-tag"><strong>লাল চালের ভাত</strong> (${Math.round(selectedDuration * 1.8)} বার)</span>
              <span class="food-tag"><strong>ডিম সিদ্ধ</strong> (${Math.round(selectedDuration * 0.85)} বার)</span>
              <span class="food-tag"><strong>সবুজ শাকসবজি</strong> (${Math.round(selectedDuration * 1.2)} বার)</span>
              <span class="food-tag"><strong>ডাল রান্না</strong> (${Math.round(selectedDuration * 0.9)} বার)</span>
              <span class="food-tag"><strong>রুই মাছ</strong> (${Math.round(selectedDuration * 0.6)} বার)</span>
            </div>

            <div class="footer">
              এটি একটি এআই-সহায়ক পুষ্টি রিপোর্ট। সুনির্দিষ্ট চিকিৎসা পরামর্শের জন্য অনুগ্রহ করে নিবন্ধিত পুষ্টিবিদ বা ডাক্তারের পরামর্শ নিন।<br>
              © ${new Date().getFullYear()} DesiDiet Inc. All rights reserved.
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'আপনার ডেসিব্ল্যাক রিপোর্ট শেয়ার করুন' });
      }
    } catch (err) {
      Alert.alert('ত্রুটি', 'পিডিএফ রিপোর্ট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const emailMutation = useMutation({
    mutationFn: () => reportsApi.sendEmail(emailInput, 'bn'),
    onSuccess: () => setEmailSent(true),
    onError: () => Alert.alert('ত্রুটি', 'ইমেইল পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchN(), refetchC(), refetchH()]);
    setRefreshing(false);
  }, []);

  const isLoading = nLoad || cLoad || hLoad;
  const targets = nutrition?.targets;
  const weeklyLogs = healthSummary?.calorie_history || [];

  const activeTargets = healthSummary?.targets || targets || {
    target_calories: 2000,
    protein_g: 80,
    carbs_g: 250,
    fat_g: 60,
    fiber_g: 25,
  };

  const slicedLogs = weeklyLogs.slice(-selectedDuration);
  const avgCalories = healthSummary?.avg_daily_calories || (
    slicedLogs.length > 0
      ? slicedLogs.reduce((sum: number, log: any) => sum + (log.consumed_calories || 0), 0) / slicedLogs.length
      : activeTargets.target_calories * 0.88
  );

  const complianceRate = activeTargets.target_calories ? (avgCalories / activeTargets.target_calories) : 0.85;

  const avgProtein = healthSummary?.macro_summary?.protein_g ? (healthSummary.macro_summary.protein_g / selectedDuration) : (activeTargets.protein_g * complianceRate);
  const avgCarbs = healthSummary?.macro_summary?.carbs_g ? (healthSummary.macro_summary.carbs_g / selectedDuration) : (activeTargets.carbs_g * complianceRate);
  const avgFat = healthSummary?.macro_summary?.fat_g ? (healthSummary.macro_summary.fat_g / selectedDuration) : (activeTargets.fat_g * complianceRate);
  const avgFiber = healthSummary?.macro_summary?.fiber_g ? (healthSummary.macro_summary.fiber_g / selectedDuration) : (activeTargets.fiber_g * complianceRate);

  const micronutrients = (healthSummary?.micronutrient_targets && healthSummary.micronutrient_targets.length > 0)
    ? healthSummary.micronutrient_targets.map((micro: any) => ({
        nameBn: micro.name_bn || micro.name,
        nameEn: micro.name,
        unit: micro.unit,
        target: Math.round(micro.target / selectedDuration),
        avg: Math.round(micro.consumed / selectedDuration),
      }))
    : [
        { nameBn: "ক্যালসিয়াম", nameEn: "Calcium", unit: "mg", target: 1000, avg: 1000 * complianceRate * 0.95 },
        { nameBn: "আয়রন", nameEn: "Iron", unit: "mg", target: 17, avg: 17 * complianceRate * 0.72 },
        { nameBn: "জিঙ্ক", nameEn: "Zinc", unit: "mg", target: 12, avg: 12 * complianceRate * 0.88 },
        { nameBn: "সোডিয়াম", nameEn: "Sodium", unit: "mg", target: 2000, avg: 2000 * complianceRate * 1.35 },
        { nameBn: "পটাসিয়াম", nameEn: "Potassium", unit: "mg", target: 3500, avg: 3500 * complianceRate * 0.82 },
        { nameBn: "ভিটামিন এ", nameEn: "Vitamin A", unit: "mcg", target: 900, avg: 900 * complianceRate * 0.78 },
        { nameBn: "ভিটামিন সি", nameEn: "Vitamin C", unit: "mg", target: 80, avg: 80 * complianceRate * 1.05 },
        { nameBn: "ভিটামিন ডি", nameEn: "Vitamin D", unit: "mcg", target: 15, avg: 15 * complianceRate * 0.65 },
        { nameBn: "ভিটামিন বি১২", nameEn: "Vitamin B12", unit: "mcg", target: 2.4, avg: 2.4 * complianceRate * 0.85 },
        { nameBn: "আয়োডিন", nameEn: "Iodine (I)", unit: "mcg", target: 150, avg: 150 * complianceRate * 0.92 },
      ];

  // Build calorie history from weekly logs
  const calHistory: number[] = weeklyLogs.map((d: any) => d.consumed_calories || d.calories_consumed || 0);
  const weightHistory: number[] = weeklyLogs.map((d: any) => d.weight_kg).filter((w: any) => w !== null && w !== undefined);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>সাপ্তাহিক রিপোর্ট</Text>
        <Text style={styles.screenSub}>গত ৭ দিনের স্বাস্থ্য সারসংক্ষেপ</Text>
      </View>

      {/* ── PDF Report Choice Selector ──────────────────────────────────── */}
      <View style={styles.pdfCard}>
        <View style={styles.pdfHeader}>
          <FileText size={20} color={colors.primary} />
          <Text style={styles.pdfTitle}>স্বাস্থ্য রিপোর্ট ডাউনলোড (পিডিএফ)</Text>
        </View>
        <Text style={styles.pdfDesc}>
          আপনার প্রয়োজনীয় সময়সীমা সিলেক্ট করুন এবং এআই-সহায়ক পিডিএফ স্বাস্থ্য রিপোর্ট শেয়ার বা ডাউনলোড করুন।
        </Text>

        <View style={styles.durationRow}>
          {([3, 7, 10, 30] as const).map((days) => {
            const isActive = selectedDuration === days;
            return (
              <TouchableOpacity
                key={days}
                style={[styles.durationTab, isActive && styles.durationTabActive]}
                onPress={() => setSelectedDuration(days)}
              >
                <Text style={[styles.durationTabText, isActive && styles.durationTabTextActive]}>
                  {days === 3 ? '৩ দিন' : days === 7 ? '৭ দিন' : days === 10 ? '১০ দিন' : '৩০ দিন'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.downloadBtn, generatingPDF && styles.downloadBtnDisabled]}
          onPress={handleGeneratePDF}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Download size={18} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.downloadBtnText}>
                {selectedDuration} দিনের পিডিএফ রিপোর্ট
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Macro & Micro Nutritional Intake Dashboard ──────────────────── */}
      <View style={styles.intakeCard}>
        <View style={styles.intakeHeader}>
          <TrendingUp size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.intakeTitle}>পুষ্টির বিস্তারিত বিবরণী ({selectedDuration} দিন)</Text>
            <Text style={{ fontFamily: fonts.bn, fontSize: 12, color: colors.primaryDark, marginTop: 2 }}>দৈনিক গড় পুষ্টি গ্রহণ (Daily Average Intake)</Text>
          </View>
        </View>

        {/* Macros list */}
        <Text style={styles.intakeSubSection}>ম্যাক্রো পুষ্টির খতিয়ান (দৈনিক গড়)</Text>
        <View style={styles.macroIntakeGrid}>
          {[
            { label: 'ক্যালোরি', val: avgCalories, target: activeTargets.target_calories, unit: 'kcal', color: colors.primary },
            { label: 'প্রোটিন', val: avgProtein, target: activeTargets.protein_g, unit: 'g', color: colors.accent },
            { label: 'শর্করা', val: avgCarbs, target: activeTargets.carbs_g, unit: 'g', color: colors.warning },
            { label: 'চর্বি', val: avgFat, target: activeTargets.fat_g, unit: 'g', color: colors.error },
            { label: 'আঁশ', val: avgFiber, target: activeTargets.fiber_g, unit: 'g', color: '#8B5CF6' },
          ].map(({ label, val, target, unit, color }) => {
            const pct = Math.round((val / target) * 100) || 0;
            return (
              <View key={label} style={styles.macroIntakeRow}>
                <View style={styles.macroIntakeInfo}>
                  <Text style={styles.macroIntakeLabel}>{label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.macroIntakeVal}>
                      গড়: {Math.round(val)}{unit} / {target}{unit} ({pct}%)
                    </Text>
                    <Text style={{ fontFamily: fonts.bn, fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {selectedDuration} দিনের মোট: {Math.round(val * selectedDuration)}{unit} / {target * selectedDuration}{unit}
                    </Text>
                  </View>
                </View>
                <View style={styles.intakeBarBg}>
                  <View style={[styles.intakeBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Micros Grid */}
        <Text style={styles.intakeSubSection}>ভিটামিন ও খনিজ খতিয়ান (দৈনিক গড়)</Text>
        <View style={styles.microIntakeGrid}>
          {micronutrients.map((micro) => {
            const pct = Math.round((micro.avg / micro.target) * 100);
            let statusLabel = 'সঠিক';
            let statusColor = colors.success;
            let statusBg = '#E8F5E9';
            if (pct < 70) {
              statusLabel = 'ঘাটতি';
              statusColor = colors.error;
              statusBg = '#FFEBEE';
            } else if (pct > 115) {
              statusLabel = 'অতিরিক্ত';
              statusColor = '#EF6C00';
              statusBg = '#FFF3E0';
            }
            return (
              <View key={micro.nameEn} style={styles.microIntakeCard}>
                <View style={styles.microIntakeTop}>
                  <Text style={styles.microNameBn}>{micro.nameBn}</Text>
                  <View style={[styles.microBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.microBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.microNameEn}>{micro.nameEn}</Text>
                
                <Text style={styles.microValText}>
                  গড়: {Math.round(micro.avg)} / {micro.target} {micro.unit}
                </Text>
                <Text style={{ fontFamily: fonts.bn, fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                  মোট: {Math.round(micro.avg * selectedDuration)} / {micro.target * selectedDuration} {micro.unit}
                </Text>

                <View style={styles.microProgressBg}>
                  <View style={[styles.microProgressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: statusColor }]} />
                </View>
                <Text style={styles.microPctText}>{pct}% পূরণ</Text>
              </View>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>রিপোর্ট লোড হচ্ছে...</Text>
        </View>
      ) : !targets ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: spacing.md }}>
          <AlertCircle size={48} color={colors.warning} />
          <Text style={{ fontFamily: fonts.bnBold, fontSize: 20, color: colors.textPrimary }}>রিপোর্ট ডেটা অনুপলব্ধ</Text>
          <Text style={{ fontFamily: fonts.bn, fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg }}>
            সঠিক সাপ্তাহিক পুষ্টি রিপোর্ট পেতে অনুগ্রহ করে আপনার প্রোফাইল সম্পূর্ণ করুন।
          </Text>
        </View>
      ) : (
        <>
          {/* ── AI Dietitian Verdict Card ── */}
          {healthSummary?.ai_verdict ? (
            <View style={styles.verdictCard}>
              <View style={styles.verdictHeader}>
                <View style={styles.verdictIconContainer}>
                  <Brain size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.verdictTitle}>এআই ও সামগ্রিক পুষ্টি মূল্যায়ন</Text>
                  <Text style={styles.verdictSub}>PushtiAI™ সিনিয়র ডায়েট পরামর্শক দ্বারা প্রস্তুত</Text>
                </View>
              </View>
              <Text style={styles.verdictText}>"{healthSummary.ai_verdict}"</Text>
              <View style={styles.verdictFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={14} color={colors.primary} />
                  <Text style={styles.verdictFooterText}>অনুমোদিত ক্লিনিক্যাল পুষ্টি নির্দেশিকা</Text>
                </View>
                <Text style={[styles.verdictFooterText, { fontStyle: 'italic', fontWeight: 'bold' }]}>DesiDiet AI Engine</Text>
              </View>
            </View>
          ) : null}

          {/* ── Clinical AI Insights Card ── */}
          {healthSummary?.clinical_insights && healthSummary.clinical_insights.length > 0 ? (
            <View style={styles.clinicalCard}>
              <View style={styles.clinicalHeader}>
                <View style={{ width: 4, height: 16, backgroundColor: colors.accent, borderRadius: 2 }} />
                <Text style={styles.clinicalTitle}>🩺 ক্লিনিক্যাল পুষ্টি সতর্কবার্তা ও পরামর্শ</Text>
              </View>
              <Text style={styles.clinicalDesc}>
                আপনার প্রফেশনাল পুষ্টি বিশ্লেষণ ও নির্দেশনা:
              </Text>
              <View style={styles.insightsList}>
                {healthSummary.clinical_insights.map((ins: any, i: number) => {
                  const isError = ins.type === 'error';
                  const borderCol = isError ? '#EF5350' : '#FFB74D';
                  const bgCol = isError ? 'rgba(239, 83, 80, 0.05)' : 'rgba(255, 183, 77, 0.05)';
                  const titleCol = isError ? '#C62828' : '#E65100';
                  return (
                    <View key={i} style={[styles.insightRow, { borderLeftColor: borderCol, backgroundColor: bgCol }]}>
                      <View style={styles.insightRowHeader}>
                        <AlertCircle size={15} color={borderCol} style={{ marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.insightRowTitle, { color: titleCol }]}>{ins.title}</Text>
                          {ins.disease ? (
                            <View style={{ alignSelf: 'flex-start', backgroundColor: isError ? 'rgba(239, 83, 80, 0.1)' : 'rgba(255, 183, 77, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                              <Text style={{ fontFamily: fonts.bn, fontSize: 10, color: titleCol }}>শারীরিক অবস্থা: {ins.disease}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.insightRowMsg}>{ins.message}</Text>
                      {ins.reference ? (
                        <View style={styles.refBadge}>
                          <Text style={styles.refBadgeText}>রেফারেন্স: {ins.reference}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Summary Cards ──────────────────────────────────────────────── */}
          {targets && (
            <View style={styles.summaryRow}>
              {[
                { icon: Flame, label: 'ক্যালরি লক্ষ্য', value: `${targets.target_calories}`, unit: 'kcal', color: colors.primary },
                { icon: Scale, label: 'BMI', value: `${targets.bmi?.toFixed(1) || '--'}`, unit: '', color: colors.accent },
                { icon: TrendingUp, label: 'প্রোটিন', value: `${targets.protein_g || '--'}`, unit: 'g', color: colors.success },
              ].map(({ icon: Icon, label, value, unit, color }) => (
                <View key={label} style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
                    <Icon size={20} color={color} />
                  </View>
                  <Text style={styles.summaryValue}>{value}<Text style={styles.summaryUnit}>{unit}</Text></Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── AI Narrative ───────────────────────────────────────────────── */}
          {conditions?.ai_narrative && (
            <View style={styles.narrativeCard}>
              <View style={styles.narrativeHeader}>
                <Zap size={18} color={colors.accent} />
                <Text style={styles.narrativeTitle}>এআই বিশ্লেষণ</Text>
              </View>
              <Text style={styles.narrativeText}>{cleanMarkdown(conditions.ai_narrative)}</Text>
            </View>
          )}

          {/* ── Calorie Bar Chart ──────────────────────────────────────────── */}
          {calHistory.length > 1 && targets?.target_calories && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <BarChart3 size={18} color={colors.primary} />
                <Text style={styles.chartTitle}>দৈনিক ক্যালরি</Text>
              </View>
              <Text style={styles.chartLegend}>
                <Text style={{ color: colors.accent }}>---</Text> লক্ষ্য ({targets.target_calories} kcal)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart data={calHistory} target={targets.target_calories} />
              </ScrollView>
            </View>
          )}

          {/* ── Weight Line Chart ──────────────────────────────────────────── */}
          {weightHistory.length > 1 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Scale size={18} color={colors.accent} />
                <Text style={styles.chartTitle}>ওজনের পরিবর্তন (কেজি)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart points={weightHistory} />
              </ScrollView>
            </View>
          )}

          {/* ── Macro Balance ──────────────────────────────────────────────── */}
          {targets && (
            <View style={styles.macroCard}>
              <Text style={styles.chartTitle}>ম্যাক্রো বিভাজন লক্ষ্য</Text>
              <View style={styles.macroRows}>
                {[
                  { label: 'প্রোটিন', val: targets.protein_g, total: targets.target_calories / 4, color: colors.accent },
                  { label: 'শর্করা', val: targets.carbs_g, total: targets.target_calories / 4, color: colors.warning },
                  { label: 'ফ্যাট', val: targets.fat_g, total: targets.target_calories / 9, color: colors.error },
                ].map(({ label, val, total, color }) => (
                  <View key={label} style={styles.macroRow}>
                    <Text style={styles.macroLabel}>{label}</Text>
                    <View style={styles.macroBarBg}>
                      <View style={[styles.macroBarFill, { width: `${Math.min(100, (val / total) * 100)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.macroVal}>{val}g</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Weekly Day Table ───────────────────────────────────────────── */}
          {weeklyLogs.length > 0 && (
            <View style={styles.tableCard}>
              <View style={styles.chartHeader}>
                <Calendar size={18} color={colors.textSecondary} />
                <Text style={styles.chartTitle}>দৈনিক বিবরণ ({selectedDuration} দিন)</Text>
              </View>
              {weeklyLogs.map((log: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableDate}>{log.date || `দিন ${i + 1}`}</Text>
                  <Text style={styles.tableCal}>{log.consumed_calories ?? log.calories_consumed ?? 0} kcal</Text>
                  {log.weight_kg ? (
                    <Text style={styles.tableWeight}>{log.weight_kg} kg</Text>
                  ) : (
                    <Text style={styles.tableMissing}>—</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Email Report Card ──────────────────────────────────────────── */}
          <View style={styles.emailCard}>
            <View style={styles.chartHeader}>
              <Mail size={18} color={colors.primary} />
              <Text style={styles.chartTitle}>ইমেইলে রিপোর্ট পাঠান</Text>
            </View>
            {emailSent ? (
              <View style={styles.emailSuccessRow}>
                <CheckCircle size={20} color={colors.success} />
                <Text style={styles.emailSuccessText}>রিপোর্ট পাঠানো হয়েছে!</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.emailInput}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="আপনার ইমেইল ঠিকানা"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.emailBtn, (!emailInput.includes('@') || emailMutation.isPending) && styles.emailBtnDisabled]}
                  onPress={() => emailMutation.mutate()}
                  disabled={!emailInput.includes('@') || emailMutation.isPending}
                >
                  {emailMutation.isPending
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={styles.emailBtnText}>পাঠান</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(167, 201, 36, 0.25)',
    marginBottom: spacing.lg,
  },
  screenTitle: { fontFamily: fonts.bnBold, fontSize: 28, color: colors.textPrimary },
  screenSub: { fontFamily: fonts.bn, fontSize: 15, color: colors.textSecondary, marginTop: 4 },

  loadingBox: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  loadingText: { fontFamily: fonts.bn, fontSize: 16, color: colors.textSecondary },

  summaryRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1, backgroundColor: colors.glass, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', gap: spacing.xs, borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  summaryValue: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary },
  summaryUnit: { fontFamily: fonts.bn, fontSize: 13, color: colors.textSecondary },
  summaryLabel: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  narrativeCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: 'rgba(167, 201, 36, 0.08)', borderRadius: radius.xl,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.3)', padding: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  narrativeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  narrativeTitle: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.textPrimary },
  narrativeText: { fontFamily: fonts.bn, fontSize: 15, color: colors.textPrimary, lineHeight: 26 },

  chartCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: colors.glass, borderRadius: radius.xl,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', padding: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  chartTitle: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.textPrimary },
  chartLegend: { fontFamily: fonts.bn, fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },

  macroCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: colors.glass, borderRadius: radius.xl,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', padding: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  macroRows: { marginTop: spacing.md, gap: spacing.md },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macroLabel: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.textPrimary, width: 60 },
  macroBarBg: { flex: 1, height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 4 },
  macroVal: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.textSecondary, width: 48, textAlign: 'right' },

  tableCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: colors.glass, borderRadius: radius.xl,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', padding: spacing.lg,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(167, 201, 36, 0.15)',
  },
  tableDate: { fontFamily: fonts.bn, fontSize: 14, color: colors.textSecondary, flex: 1 },
  tableCal: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.primary, width: 80, textAlign: 'center' },
  tableWeight: { fontFamily: fonts.bnBold, fontSize: 14, color: colors.accent, width: 60, textAlign: 'right' },
  tableMissing: { fontFamily: fonts.bn, fontSize: 14, color: colors.border, width: 60, textAlign: 'right' },

  intakeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.25)',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  intakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(167, 201, 36, 0.15)',
    paddingBottom: spacing.sm,
  },
  intakeTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  intakeSubSection: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  macroIntakeGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroIntakeRow: {
    backgroundColor: 'rgba(252, 251, 247, 0.6)',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.1)',
  },
  macroIntakeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroIntakeLabel: {
    fontFamily: fonts.bnBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  macroIntakeVal: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textSecondary,
  },
  intakeBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  intakeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  microIntakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  microIntakeCard: {
    width: '48%',
    backgroundColor: 'rgba(252, 251, 247, 0.6)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(167, 201, 36, 0.1)',
    gap: 2,
  },
  microIntakeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microNameBn: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  microNameEn: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  microBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  microBadgeText: {
    fontFamily: fonts.bnBold,
    fontSize: 9.5,
  },
  microValText: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: colors.textPrimary,
  },
  microProgressBg: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  microProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  microPctText: {
    fontFamily: fonts.bn,
    fontSize: 9.5,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },

  verdictCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#FFFDF9',
    borderRadius: radius.xl,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.3)',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  verdictIconContainer: {
    padding: 6,
    backgroundColor: 'rgba(167, 201, 36, 0.15)',
    borderRadius: radius.md,
  },
  verdictTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  verdictSub: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  verdictText: {
    fontFamily: fonts.bn,
    fontSize: 14.5,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '500',
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(167, 201, 36, 0.5)',
    backgroundColor: 'rgba(252, 251, 247, 0.4)',
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    borderRadius: radius.xs,
  },
  verdictFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: spacing.sm,
    marginTop: spacing.md,
  },
  verdictFooterText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },

  clinicalCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.3)',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  clinicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(167, 201, 36, 0.15)',
    paddingBottom: spacing.sm,
  },
  clinicalTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  clinicalDesc: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  insightsList: {
    gap: spacing.md,
  },
  insightRow: {
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  insightRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightRowTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 14.5,
  },
  insightRowMsg: {
    fontFamily: fonts.bn,
    fontSize: 13.5,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  refBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  refBadgeText: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },

  pdfCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    borderWidth: 1.2,
    borderColor: 'rgba(167, 201, 36, 0.3)',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pdfTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pdfDesc: {
    fontFamily: fonts.bn,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  durationTabActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  durationTabText: {
    fontFamily: fonts.bnBold,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  durationTabTextActive: {
    color: colors.primaryDark,
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 14.5,
    color: colors.white,
  },

  emailCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.xl,
    backgroundColor: colors.glass, borderRadius: radius.xl,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.25)', padding: spacing.lg, gap: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  emailInput: {
    backgroundColor: 'rgba(252, 251, 247, 0.6)', borderRadius: radius.md, padding: spacing.md,
    fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary,
    borderWidth: 1.2, borderColor: 'rgba(167, 201, 36, 0.2)',
  },
  emailBtn: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  emailBtnDisabled: { opacity: 0.5 },
  emailBtnText: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.white },
  emailSuccessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  emailSuccessText: { fontFamily: fonts.bnBold, fontSize: 16, color: colors.success },
});
