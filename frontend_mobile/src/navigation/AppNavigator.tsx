import React, { useEffect, useState, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import BoardScreen from '../screens/BoardScreen';
import LoginScreen from '../screens/LoginScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { notificationAPI } from '../services/api';
import NotificationsModal from '../components/NotificationsModal';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Board: { boardId: string; template?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

/* ─── Küçük bildirim çanı ikonu ─── */
const NotificationBellIcon: React.FC<{ onPress: () => void; count: number; colors: any }> = ({ onPress, count, colors }) => (
  <TouchableOpacity onPress={onPress} style={{ padding: 8, marginRight: 4 }} activeOpacity={0.7}>
    <Feather name="bell" size={22} color={colors.textPrimary} />
    {count > 0 && (
      <View style={{
        position: 'absolute', top: 4, right: 4,
        backgroundColor: '#ef4444',
        borderRadius: 8, minWidth: 16, height: 16,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5, borderColor: colors.background,
      }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 12 }}>
          {count > 9 ? '9+' : count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

export const AppNavigator = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { user, isLoading, checkAuth, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const notifs = await notificationAPI.getNotifications();
      setUnreadCount(Array.isArray(notifs) ? notifs.filter((n: any) => !n.read).length : 0);
    } catch { /* sessiz */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
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
            {user && (
              <NotificationBellIcon
                count={unreadCount}
                colors={colors}
                onPress={() => setNotifVisible(true)}
              />
            )}
            <TouchableOpacity
              onPress={toggleTheme}
              style={{ padding: 8, marginRight: 8 }}
              activeOpacity={0.7}
            >
              <Feather name={isDark ? "sun" : "moon"} size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                onPress={logout}
                style={{ padding: 8, marginRight: 16 }}
                activeOpacity={0.7}
              >
                <Feather name="log-out" size={20} color={colors.textPrimary} />
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
          <Stack.Screen name="Board" component={BoardScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>

    <NotificationsModal
      visible={notifVisible}
      onClose={() => {
        setNotifVisible(false);
        fetchUnread();
      }}
      onNavigateToBoard={(boardId) => {
        navigation.navigate('Board', { boardId });
      }}
    />
    </>
  );
};
