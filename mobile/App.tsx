import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';

import DashboardScreen from './src/screens/DashboardScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CustomerFormScreen from './src/screens/CustomerFormScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import OrderFormScreen from './src/screens/OrderFormScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import { COLORS, paperTheme } from './src/lib/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="OrderForm"   component={OrderFormScreen}   options={{ title: 'New order' }} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CustomersList" component={CustomersScreen}    options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerForm"  component={CustomerFormScreen} options={{ title: 'New customer' }} />
    </Stack.Navigator>
  );
}

function TicketsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="TicketsList" component={TicketsScreen}      options={{ title: 'Tickets' }} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket' }} />
    </Stack.Navigator>
  );
}

const screenOptions = {
  headerStyle:    { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.black,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17, color: COLORS.black },
};

const tabIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap) => (
  { color }: { color: string }
) => <MaterialCommunityIcons name={name} color={color} size={20} />;

const navTheme = {
  dark: false,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: '#ffffff',
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: COLORS.primary,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
              tabBarStyle: {
                borderTopColor: COLORS.border,
                height: 66,
                paddingTop: 8,
                backgroundColor: '#ffffff',
              },
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: true, ...screenOptions, tabBarIcon: tabIcon('view-dashboard-outline') }}
            />
            <Tab.Screen name="Orders"    component={OrdersStack}    options={{ tabBarIcon: tabIcon('clipboard-text-outline') }} />
            <Tab.Screen name="Tickets"   component={TicketsStack}   options={{ tabBarIcon: tabIcon('ticket-outline') }} />
            <Tab.Screen name="Customers" component={CustomersStack} options={{ tabBarIcon: tabIcon('account-group-outline') }} />
          </Tab.Navigator>
          <StatusBar style="dark" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
