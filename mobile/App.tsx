import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import { View } from 'react-native';

import DashboardScreen    from './src/screens/DashboardScreen';
import CustomersScreen    from './src/screens/CustomersScreen';
import CustomerFormScreen from './src/screens/CustomerFormScreen';
import OrdersScreen       from './src/screens/OrdersScreen';
import OrderDetailScreen  from './src/screens/OrderDetailScreen';
import OrderFormScreen    from './src/screens/OrderFormScreen';
import TicketsScreen      from './src/screens/TicketsScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import MaterialsScreen    from './src/screens/MaterialsScreen';
import MaterialFormScreen from './src/screens/MaterialFormScreen';
import { COLORS, paperTheme } from './src/lib/theme';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle:      { backgroundColor: COLORS.gradStart },
  headerTintColor:  COLORS.text,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17, color: COLORS.text },
  headerShadowVisible: false,
};

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="OrdersList"  component={OrdersScreen}      options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen}  options={{ title: 'Order detail' }} />
      <Stack.Screen name="OrderForm"   component={OrderFormScreen}    options={{ title: 'New order' }} />
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
      <Stack.Screen name="TicketsList"  component={TicketsScreen}      options={{ title: 'Tickets' }} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket detail' }} />
    </Stack.Navigator>
  );
}

function MaterialsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MaterialsList" component={MaterialsScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="MaterialForm"  component={MaterialFormScreen}  options={{ title: 'Material' }} />
    </Stack.Navigator>
  );
}

// Custom dark pill tab bar icon wrapper
function TabIcon(name: keyof typeof MaterialCommunityIcons.glyphMap) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: focused ? 'rgba(255,255,255,0.18)' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={name} color={focused ? '#fff' : COLORS.darkMuted} size={22} />
    </View>
  );
}

const navTheme = {
  dark: false,
  colors: {
    primary:      COLORS.primary,
    background:   COLORS.background,
    card:         '#ffffff',
    text:         COLORS.text,
    border:       COLORS.border,
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
              headerShown:          false,
              tabBarActiveTintColor:   '#fff',
              tabBarInactiveTintColor: COLORS.darkMuted,
              tabBarLabelStyle: { fontWeight: '700', fontSize: 11, marginBottom: 4 },
              tabBarStyle: {
                backgroundColor:  COLORS.dark,
                borderTopWidth:   0,
                height:           70,
                paddingTop:       6,
                paddingBottom:    8,
                borderRadius:     0,
              },
              tabBarItemStyle: { borderRadius: 0 },
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerShown:  true,
                ...screenOptions,
                tabBarIcon: TabIcon('view-dashboard-outline'),
              }}
            />
            <Tab.Screen
              name="Orders"
              component={OrdersStack}
              options={{ tabBarIcon: TabIcon('clipboard-text-outline') }}
            />
            <Tab.Screen
              name="Tickets"
              component={TicketsStack}
              options={{ tabBarIcon: TabIcon('ticket-outline') }}
            />
            <Tab.Screen
              name="Materials"
              component={MaterialsStack}
              options={{ tabBarIcon: TabIcon('package-variant-closed') }}
            />
            <Tab.Screen
              name="Customers"
              component={CustomersStack}
              options={{ tabBarIcon: TabIcon('account-group-outline') }}
            />
          </Tab.Navigator>
          <StatusBar style="dark" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
