import React, { useState, useRef, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import DocumentUploadScreen from '../screens/DocumentUploadScreen';
import PendingScreen from '../screens/PendingScreen';
import RejectedScreen from '../screens/RejectedScreen';
import VerifiedScreen from '../screens/VerifiedScreen';
import HomeScreen from '../screens/HomeScreen';
import SchemesScreen from '../screens/SchemesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import GrievanceScreen from '../screens/GrievanceScreen';
import GrievanceDetailScreen from '../screens/GrievanceDetailScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Otp: { mobile: string; devOtp?: string };
  DocumentUpload: undefined;
  Pending: undefined;
  Rejected: undefined;
  Verified: undefined;
  Main: undefined;
  Grievance: undefined;
  GrievanceDetail: { grievanceId: string; editMode?: boolean };
};

export type TabParamList = {
  Home: undefined;
  Schemes: undefined;
  Notifications: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home:          { active: '🏠', inactive: '🏡' },
  Schemes:       { active: '📋', inactive: '📄' },
  Notifications: { active: '🔔', inactive: '🔕' },
  Analytics:     { active: '📊', inactive: '📈' },
  Profile:       { active: '👤', inactive: '👥' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icon = TAB_ICONS[name];
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: -2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>
        {focused ? icon?.active : icon?.inactive}
      </Text>
    </View>
  );
}

function MainTabs({ initialTab }: { initialTab: 'Home' | 'Profile' }) {
  const { state, clearJustLoggedIn } = useAuth();
  const lang = state.lang;

  useEffect(() => {
    clearJustLoggedIn();
  }, [clearJustLoggedIn]);

  const tabLabels: Record<string, Record<string, string>> = {
    en: { Home: 'Home', Schemes: 'Schemes', Notifications: 'Alerts', Analytics: 'Analytics', Profile: 'Profile' },
    hi: { Home: 'होम', Schemes: 'योजनाएं', Notifications: 'सूचनाएं', Analytics: 'विश्लेषण', Profile: 'प्रोफ़ाइल' },
    mr: { Home: 'होम', Schemes: 'योजना', Notifications: 'सूचना', Analytics: 'विश्लेषण', Profile: 'प्रोफाइल' },
  };
  const labels = tabLabels[lang] ?? tabLabels['en'];

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          shadowColor: '#14532D',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarActiveBackgroundColor: COLORS.primaryBg + '00',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: labels['Home'], tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Schemes"
        component={SchemesScreen}
        options={{ title: labels['Schemes'], tabBarIcon: ({ focused }) => <TabIcon name="Schemes" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: labels['Notifications'], tabBarIcon: ({ focused }) => <TabIcon name="Notifications" focused={focused} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: labels['Analytics'], tabBarIcon: ({ focused }) => <TabIcon name="Analytics" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: labels['Profile'], tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { state, clearReupload } = useAuth();
  const [showCongrats, setShowCongrats] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  const farmerStatus = state.farmer?.status;

  useEffect(() => {
    const prev = prevStatusRef.current;
    const isNowVerified = farmerStatus === 'Active' || farmerStatus === 'Verified';
    const wasPending = prev === 'Pending';
    if (wasPending && isNowVerified) {
      setShowCongrats(true);
    }
    prevStatusRef.current = farmerStatus;
  }, [farmerStatus]);

  if (state.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryDark }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>🌾</Text>
        </View>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const isVerified = farmerStatus === 'Active' || farmerStatus === 'Verified';
  const hasDocs = (state.farmer?.docs ?? []).length > 0;

  const isReturningVerifiedLogin = state.justLoggedIn && isVerified && !showCongrats;
  const initialTab: 'Home' | 'Profile' = isReturningVerifiedLogin ? 'Profile' : 'Home';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!state.token ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : isVerified && showCongrats ? (
          <Stack.Screen name="Verified">
            {() => <VerifiedScreen onDone={() => setShowCongrats(false)} />}
          </Stack.Screen>
        ) : isVerified ? (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs initialTab={initialTab} />}
            </Stack.Screen>
            <Stack.Screen name="Grievance" component={GrievanceScreen} />
            <Stack.Screen name="GrievanceDetail" component={GrievanceDetailScreen} />
          </>
        ) : farmerStatus === 'Pending' && state.farmer?.source === 'mobile_ocr' ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : farmerStatus === 'Pending' ? (
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
        ) : (farmerStatus === 'Rejected' || farmerStatus === 'Cancelled') && state.reuploadRequested ? (
          <Stack.Screen name="DocumentUpload">
            {() => <DocumentUploadScreen onCancelReupload={clearReupload} isReupload />}
          </Stack.Screen>
        ) : (farmerStatus === 'Rejected' || farmerStatus === 'Cancelled') ? (
          <Stack.Screen name="Rejected" component={RejectedScreen} />
        ) : hasDocs ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
