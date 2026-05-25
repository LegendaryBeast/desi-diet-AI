import { Stack, usePathname, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../../lib/theme';
import { ArrowLeft } from 'lucide-react-native';

const TOTAL_STEPS = 6;

export default function OnboardingLayout() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Extract step number from path (e.g., /onboarding/step-1 -> 1)
  const match = pathname.match(/step-(\d+)/);
  const currentStepRaw = match ? parseInt(match[1], 10) : 1;
  // Step 7 acts as step 6 visually in the progress bar
  const currentStep = currentStepRaw === 7 ? 6 : currentStepRaw;
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {currentStep > 1 && currentStep < 6 && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="step-1" />
        <Stack.Screen name="step-2" />
        <Stack.Screen name="step-3" />
        <Stack.Screen name="step-4" />
        <Stack.Screen name="step-5" />
        <Stack.Screen name="step-7" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'column',
    gap: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
