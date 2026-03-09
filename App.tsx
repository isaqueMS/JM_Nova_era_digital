
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Platform, TouchableOpacity, Text, Modal, Animated, Dimensions, Easing, Linking, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Home, Receipt, Gauge, MessageSquare, Hammer, Bell, User, LogOut, ChevronRight, X, Phone, LayoutDashboard, Gamepad2 } from 'lucide-react-native';
import InternetGameScreen from './components/InternetGame/InternetGameScreen';
import AccessPortal from './components/AccessPortal';
import Dashboard from './components/Dashboard';
import Finance from './components/Finance';
import Support from './components/Support';
import TechnicianArea from './components/TechnicianArea';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import { MikWebService } from './services/mikweb';
import { Customer, Invoice, AppNotification } from './types';
import { lightTheme, techTheme, TECHNICIAN_IDS } from './utils';
import { Moon, Sun } from 'lucide-react-native';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
// For a better responsive feel on web, we normalize based on width but CAP it.
const layoutWidth = Platform.OS === 'web' ? Math.min(windowWidth, 450) : windowWidth;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isIdentified, setIsIdentified] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const menuAnim = useRef(new Animated.Value(-layoutWidth)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  const isTechnician = TECHNICIAN_IDS.includes(customer?.cpf_cnpj || '');
  const theme = isTechnician ? techTheme : (isDarkMode ? techTheme : lightTheme);

  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'finance', icon: Receipt, label: 'Faturas' },
    { id: 'support', icon: MessageSquare, label: 'Suporte' },
  ];

  if (isTechnician) {
    tabs.push({ id: 'tech', icon: Hammer, label: 'Painel ADM' });
  }

  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    if (activeIndex !== -1) {
      Animated.parallel([
        Animated.spring(tabAnim, {
          toValue: activeIndex,
          useNativeDriver: true,
          tension: 100,
          friction: 6,
        }),
      ]).start();
    }
  }, [activeTab]);

  useEffect(() => {
    menuAnim.setValue(-layoutWidth);

    let interval: NodeJS.Timeout;
    if (isIdentified && customer && !isTechnician) {
      interval = setInterval(async () => {
        const notifs = await MikWebService.getNotifications(customer.id);
        setNotifications(notifs);
      }, 60000);
    }
    return () => interval && clearInterval(interval);
  }, [isIdentified, customer]);

  const toggleMenu = (open: boolean) => {
    setIsMenuOpen(open);
    Animated.timing(menuAnim, {
      toValue: open ? 0 : -layoutWidth,
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  };

  const handleIdentify = async (query: string) => {
    try {
      const customerData = await MikWebService.authenticateByCPF(query);
      if (customerData) {
        setCustomer(customerData);
        const [invoiceData, notifData] = await Promise.all([
          MikWebService.getInvoices(customerData.id),
          MikWebService.getNotifications(customerData.id)
        ]);
        setInvoices(invoiceData);
        setNotifications(notifData);
        setIsIdentified(true);
        if (TECHNICIAN_IDS.includes(customerData.cpf_cnpj || '')) {
          setActiveTab('tech');
        } else {
          setActiveTab('dashboard');
        }
      } else {
        alert("DOCUMENTO NÃO ENCONTRADO.");
      }
    } catch (err) {
      console.error("[App] Erro no login:", err);
      alert("ERRO DE COMUNICAÇÃO.");
    }
  };

  const handleLogout = () => {
    toggleMenu(false);
    setIsIdentified(false);
    setCustomer(null);
    setInvoices([]);
    setActiveTab('dashboard');
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    toggleMenu(false);
  };

  const handleOpenNotifications = async () => {
    setShowNotifications(true);
    if (customer && !isTechnician) {
      try {
        const notifs = await MikWebService.getNotifications(customer.id);
        setNotifications(notifs);
      } catch (e) {
        console.error("Erro ao atualizar notificações:", e);
      }
    }
  };

  const renderContent = () => {
    const unread = notifications.filter(n => !n.isRead).length;
    switch (activeTab) {
      case 'dashboard': return <Dashboard customer={customer} invoices={invoices} theme={theme} onNavigate={navigateTo} onOpenMenu={() => toggleMenu(true)} unreadCount={unread} onOpenNotifications={handleOpenNotifications} />;
      case 'finance': return <Finance invoices={invoices} theme={theme} />;
      case 'support': return <Support customer={customer!} theme={theme} />;
      case 'tech': return <TechnicianArea onLogout={handleLogout} theme={theme} />;
      case 'profile': return <Profile customer={customer!} theme={theme} />;
      case 'internet-game': return <InternetGameScreen theme={theme} onClose={() => navigateTo('dashboard')} customer={customer!} />;
      default: return <Dashboard customer={customer} invoices={invoices} theme={theme} onNavigate={navigateTo} onOpenMenu={() => toggleMenu(true)} unreadCount={unread} onOpenNotifications={handleOpenNotifications} />;
    }
  };

  if (!isIdentified) {
    return <AccessPortal onSearch={handleIdentify} />;
  }

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : theme.primary }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? theme.background : theme.primary} />

        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {renderContent()}

          {isMenuOpen && (
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => toggleMenu(false)}
            />
          )}

          <Animated.View style={[
            styles.sideMenu,
            {
              transform: [{ translateX: menuAnim }],
              width: layoutWidth * 0.85,
              backgroundColor: isWeb ? 'rgba(0, 51, 153, 0.95)' : theme.primary,
              // In production we could use Expo BlurView, but standard RN View with semi-transparency works well too
            }
          ]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuUserBrief}>
                <View style={[styles.menuAvatar, { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }]}>
                  <User color="#003399" size={24} />
                </View>
                <View>
                  <Text style={styles.menuUserName} numberOfLines={1}>{customer?.full_name.split(' ')[0]}</Text>
                  <Text style={styles.menuUserSub}>CLIENTE CONECTADO</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleMenu(false)} style={styles.closeMenuBtn}>
                <X color="#fff" size={26} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSectionTitle}>MINHA CONTA</Text>
              <MenuOption icon={LayoutDashboard} label="Início" onPress={() => navigateTo('dashboard')} />
              <MenuOption icon={User} label="Perfil e Dados" onPress={() => navigateTo('profile')} />
              <MenuOption icon={Receipt} label="Faturas e Boletos" onPress={() => navigateTo('finance')} />

              <MenuOption icon={MessageSquare} label="Suporte Inteligente" onPress={() => navigateTo('support')} />
              <MenuOption icon={Gamepad2} label="Conexão Turbo (Mini-Game)" onPress={() => navigateTo('internet-game')} color="#00d4ff" />
              <MenuOption icon={Phone} label="Suporte no WhatsApp" onPress={openWhatsApp} color="#22c55e" />

              <View style={styles.menuDivider} />
              <Text style={styles.menuSectionTitle}>PREFERÊNCIAS</Text>
              <MenuOption
                icon={isDarkMode ? Sun : Moon}
                label={isDarkMode ? "Modo Claro" : "Modo Black"}
                onPress={() => setIsDarkMode(!isDarkMode)}
              />
            </ScrollView>

            <View style={styles.menuFooter}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut color="#fca5a5" size={20} />
                <Text style={styles.logoutBtnText}>SAIR DA CONTA</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>JM NOVA ERA PREMIUM WEB v1.6</Text>
            </View>
          </Animated.View>
        </View>

        {activeTab !== 'internet-game' && (
          <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: layoutWidth / tabs.length,
                  backgroundColor: theme.primary + '15',
                  transform: [{
                    translateX: tabAnim.interpolate({
                      inputRange: tabs.map((_, i) => i),
                      outputRange: tabs.map((_, i) => (layoutWidth / tabs.length) * i)
                    })
                  }]
                }
              ]}
            />
            <Animated.View
              style={[
                styles.tabBorderTop,
                {
                  width: layoutWidth / tabs.length,
                  backgroundColor: theme.primary,
                  borderRadius: 4,
                  transform: [
                    {
                      translateX: tabAnim.interpolate({
                        inputRange: tabs.map((_, i) => i),
                        outputRange: tabs.map((_, i) => (layoutWidth / tabs.length) * i)
                      })
                    }
                  ]
                }
              ]}
            />
            {tabs.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveTab(item.id)}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <item.icon size={22} color={activeTab === item.id ? theme.primary : theme.textDim} />
                <Text style={[styles.tabLabel, { color: activeTab === item.id ? theme.primary : theme.textDim }, activeTab === item.id && styles.tabLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Modal visible={showNotifications} animationType="slide" transparent={false} onRequestClose={() => setShowNotifications(false)}>
          <Notifications
            notifications={notifications}
            theme={theme}
            onMarkRead={async (id) => {
              setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
              await MikWebService.markNotificationRead(id);
            }}
            onDelete={async (id) => {
              setNotifications(prev => prev.filter(n => n.id !== id));
              await MikWebService.deleteNotification(id);
            }}
            onClearAll={async () => {
              const ids = notifications.map(n => n.id);
              setNotifications([]);
              for (const id of ids) {
                await MikWebService.deleteNotification(id);
              }
            }}
            onClose={() => setShowNotifications(false)}
          />
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );

  function openWhatsApp() {
    const phone = "5571984849751";
    const msg = `Olá, gostaria de suporte para o login: ${customer?.login}`;
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`);
    }
    toggleMenu(false);
  }
}

const MenuOption = ({ icon: Icon, label, onPress, color = '#fff' }: any) => (
  <TouchableOpacity style={styles.menuOption} onPress={onPress}>
    <View style={styles.menuOptionLeft}>
      <Icon size={20} color={color} />
      <Text style={[styles.menuOptionLabel, { color }]}>{label}</Text>
    </View>
    <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#003399' },
  content: { flex: 1, backgroundColor: '#f8fafc', position: 'relative' },
  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1001,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  menuHeader: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  menuUserBrief: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
  menuAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  menuUserName: { color: '#fff', fontSize: 18, fontWeight: '900', maxWidth: 140 },
  menuUserSub: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  closeMenuBtn: { padding: 5 },
  menuItems: { paddingHorizontal: 25 },
  menuSectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginTop: 10 },
  menuOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  menuOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuOptionLabel: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  menuFooter: { padding: 25, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 18, borderRadius: 15 },
  logoutBtnText: { color: '#fca5a5', fontSize: 13, fontWeight: '900' },
  versionText: { color: 'rgba(255,255,255,0.2)', fontSize: 9, textAlign: 'center', marginTop: 15, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', height: 75, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingBottom: 15, position: 'relative' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  tabLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  tabLabelActive: { color: '#003399', fontWeight: '900' },
  tabIndicator: { position: 'absolute', top: 5, bottom: 5, borderRadius: 15 },
  tabBorderTop: { position: 'absolute', top: 0, height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 }
});
