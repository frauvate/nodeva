import React from 'react';
import { createStackNavigator } from 'react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import BoardScreen from '../screens/BoardScreen';

export type RootStackParamList = {
  Home: undefined;
  Board: { boardId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FAFAFA',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Nodeva Boards' }} />
      <Stack.Screen name="Board" component={BoardScreen} options={({ route }) => ({ title: 'Board' })} />
    </Stack.Navigator>
  );
};
