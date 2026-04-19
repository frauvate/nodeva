import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import BoardScreen from '../screens/BoardScreen';
import LoginScreen from '../screens/LoginScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Board: { boardId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { user, isLoading, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={toggleTheme} 
              style={{ padding: 8, marginRight: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24, textAlign: 'center' }}>
                {isDark ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity 
                onPress={logout} 
                style={{ padding: 8, marginRight: 16 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🚪</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      }}
    >
      {!user ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Nodeva Boards' }} />
          <Stack.Screen name="Board" component={BoardScreen} options={() => ({ title: 'Board' })} />
        </>
      )}
    </Stack.Navigator>
  );
};
