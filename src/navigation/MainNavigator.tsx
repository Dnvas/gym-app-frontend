// src/navigation/MainNavigator.tsx
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

// Screens
import HomeScreen from '../screens/main/HomeScreen'
import TemplateDetailScreen from '../screens/main/TemplateDetailScreen'
import TemplateFormScreen from '../screens/main/TemplateFormScreen'
import ActiveWorkoutScreen from '../screens/main/ActiveWorkoutScreen'
import WorkoutSummaryScreen from '../screens/main/WorkoutSummaryScreen'
import HistoryScreen from '../screens/main/HistoryScreen'
import WorkoutDetailScreen from '../screens/main/WorkoutDetailScreen'
import AnalyticsScreen from '../screens/main/AnalyticsScreen'
import ProfileScreen from '../screens/main/ProfileScreen'
import { colors } from '../theme'

// Types
export type MainTabParamList = {
  HomeTab: undefined
  History: undefined
  Analytics: undefined
  Profile: undefined
}

export type HomeStackParamList = {
  HomeMain: undefined
  TemplateDetail: { templateId: string }
  TemplateForm: { templateId?: string }
  ActiveWorkout: { workoutId: string }
  WorkoutSummary: { workoutId: string }
}

export type HistoryStackParamList = {
  HistoryMain: undefined
  WorkoutDetail: { workoutId: string }
}

const Tab = createBottomTabNavigator<MainTabParamList>()
const HomeStack = createNativeStackNavigator<HomeStackParamList>()
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>()

// Home Stack Navigator (for nested navigation within Home tab)
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
      <HomeStack.Screen name="TemplateForm" component={TemplateFormScreen} />
      <HomeStack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          gestureEnabled: false, // Prevent swipe back during workout
        }}
      />
      <HomeStack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{
          gestureEnabled: false, // Prevent swipe back to active workout
        }}
      />
    </HomeStack.Navigator>
  )
}

// History Stack Navigator (for nested navigation within History tab)
function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HistoryStack.Screen name="HistoryMain" component={HistoryScreen} />
      <HistoryStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </HistoryStack.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline'
              break
            case 'History':
              iconName = focused ? 'calendar' : 'calendar-outline'
              break
            case 'Analytics':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline'
              break
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline'
              break
            default:
              iconName = 'help-outline'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="History" component={HistoryStackNavigator} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
