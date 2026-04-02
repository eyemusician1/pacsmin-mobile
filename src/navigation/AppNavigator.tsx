import React from 'react';
import {StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import {HomeScreen}    from '../screens/Food';
import {ExploreScreen} from '../screens/Attendance';
import {ProfileScreen} from '../screens/Bundle';
import {palette, spacing, typography} from '../tokens';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Attendance"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
        tabBarActiveTintColor: palette.terracotta,
        tabBarInactiveTintColor: palette.muted,
      }}>
      <Tab.Screen
        name="Attendance"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color, size, focused}) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({color, size, focused}) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Bundle"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color, size, focused}) => (
            <Ionicons
              name={focused ? 'gift' : 'gift-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: typography.serif,
    fontWeight: '700',
    letterSpacing: 0.25,
    marginBottom: 4,
  },
  tabIcon: {
    marginTop: 2,
  },
});
