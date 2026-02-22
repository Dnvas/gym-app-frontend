import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

// Screens
import HomeScreen from '../screens/main/HomeScreen'
import HistoryScreen from '../screens/main/HistoryScreen'
import AnalyticsScreen from '../screens/main/AnalyticsScreen'
import ProfileScreen from '../screens/main/ProfileScreen'

// Types
export type MainTabParamList = {
  Home: undefined
  History: undefined
  Analytics: undefined
  Profile: undefined
}

export type HomeStackParamList = {
  HomeMain: undefined
  TemplateDetail: { templateId: string }
  ActiveWorkout: { workoutId: string }
}

const Tab = createBottomTabNavigator<MainTabParamList>()
const HomeStack = createNativeStackNavigator<HomeStackParamList>()

// Home Stack Navigator (for nested navigation within Home tab)
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      {/* These will be added later:
      <HomeStack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
      <HomeStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      */}
    </HomeStack.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          switch (route.name) {
            case 'Home':
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
        tabBarActiveTintColor: '#1E3A5F',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
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
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
