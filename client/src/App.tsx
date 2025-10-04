import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import OppSearch from './screens/OppSearch';
import Game from './screens/Game';
import "../global.css";
import { NakamaProvider } from "../contexts/nakamaContext";

export type RootStackParamList = {
  Home: undefined;
  OppSearch: { playerName: string , gameMode: string, action: string};
  Game: undefined
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NakamaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="OppSearch" component={OppSearch} />
          <Stack.Screen name="Game" component={Game} />
        </Stack.Navigator>
      </NavigationContainer>
    </NakamaProvider>
  );
}


