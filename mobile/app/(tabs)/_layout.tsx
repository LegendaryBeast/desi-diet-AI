import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useAuthStore } from '../../store/auth-store';
import { Home, Utensils, Bot, TrendingUp, User } from 'lucide-react-native';
import { colors, fonts } from '../../lib/theme';

export default function TabLayout() {
  const { accessToken, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: fonts.bnBold,
          fontSize: 10.5,
          marginTop: 2,
          lineHeight: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'হোম',
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'খাবার',
          tabBarIcon: ({ color }) => <Utensils size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'পুষ্টি এআই',
          tabBarIcon: ({ color }) => <Bot size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'রিপোর্ট',
          tabBarIcon: ({ color }) => <TrendingUp size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'প্রোফাইল',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="diet-plan"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
    </Tabs>
  );
}
