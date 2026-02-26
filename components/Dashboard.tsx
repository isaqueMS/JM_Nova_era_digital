
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Dimensions,
  RefreshControl,
  Linking
} from 'react-native';
import { Customer, Invoice } from '../types';
import { MikWebService } from '../services/mikweb';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  Menu,
  Lock,
  MessageSquare,
  Briefcase,
  Rocket,
  Gift,
  X,
  LayoutGrid,
  UserPlus,
  Phone,
  MapPin,
  CheckCircle2,
  Fingerprint,
  ShieldCheck,
  Building,
  Mail,
  Instagram,
  Facebook,
  Download,
  Bell
} from 'lucide-react-native';
import { MIKWEB_TOKEN } from '../services/mikweb';

const { width, height } = Dimensions.get('window');

import { formatDateBR, Theme } from '../utils';
import { LinearGradient } from 'expo-linear-gradient';

interface DashboardProps {
  customer: Customer | null;
  invoices: Invoice[];
  theme: Theme;
  onNavigate: (tab: string) => void;
  onOpenMenu: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia,';
  if (hour >= 12 && hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
};

const Dashboard: React.FC<DashboardProps> = ({ customer, invoices, theme, onNavigate, onOpenMenu, unreadCount = 0, onOpenNotifications }) => {
  const styles = createStyles(theme);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Form states
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [friendNeighborhood, setFriendNeighborhood] = useState('');

  // Quick Menu Modal states
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [isRequestingPlan, setIsRequestingPlan] = useState(false);

  // Animation refs
  const successScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef([...Array(12)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    checkBiometricSetup();
  }, []);

  const checkBiometricSetup = async () => {
    // Não oferecer biometria para conta demo
    if (customer?.cpf_cnpj === '00000000000') return;

    try {
      const savedDoc = await SecureStore.getItemAsync('user_document');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!savedDoc && hasHardware && isEnrolled) {
        setTimeout(() => setShowBiometricSetup(true), 1500);
      }
    } catch (e) {
      console.warn('Erro ao verificar biometria:', e);
    }
  };

  const handleRegisterBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ative o acesso rápido por biometria',
      });

      if (result.success && customer?.cpf_cnpj) {
        await SecureStore.setItemAsync('user_document', customer.cpf_cnpj);
        Alert.alert("Sucesso!", "Acesso por biometria ativado com segurança.");
        setShowBiometricSetup(false);
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível cadastrar a biometria.");
    }
  };

  const pendingInvoice = invoices.find(inv => inv.status !== 'P');
  const value = pendingInvoice ? parseFloat(pendingInvoice.value).toFixed(2) : "0,00";
  const dueDate = pendingInvoice ? formatDateBR(pendingInvoice.vencimento) : "---";

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const resetForm = () => {
    setFriendName('');
    setFriendPhone('');
    setFriendNeighborhood('');
    setIsSuccess(false);
    successScale.setValue(0);
    confettiAnims.forEach(anim => anim.setValue(0));
  };

  const handleReferSubmit = async () => {
    if (!friendName || !friendPhone || !friendNeighborhood) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await MikWebService.sendIndication(customer?.id || 0, {
        name: friendName, phone: friendPhone, neighborhood: friendNeighborhood
      });
      if (success) {
        setIsSuccess(true);
        startSuccessAnimation();
      } else {
        Alert.alert("Erro", "Falha ao enviar indicação.");
      }
    } catch (e) {
      Alert.alert("Erro", "Falha na conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startSuccessAnimation = () => {
    Animated.spring(successScale, { toValue: 1, tension: 50, friction: 4, useNativeDriver: true }).start();
    const animations = confettiAnims.map((anim, i) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 1500 + (Math.random() * 1000),
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      });
    });
    Animated.parallel(animations).start();
  };

  const handlePlanChangeRequest = (plan: { title: string, speed: string, price: string }) => {
    Alert.alert(
      "Confirmar Alteração",
      `Deseja solicitar a alteração para o plano ${plan.title} (${plan.speed}MB) por R$ ${plan.price},00/mês?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setIsRequestingPlan(true);
            try {
              const success = await MikWebService.requestPlanChange(customer?.id || 0, plan);
              if (success) {
                Alert.alert("Solicitação Enviada", "Seu pedido de alteração de plano foi recebido. Nossa equipe entrará em contato em breve.");
                setShowPlansModal(false);
              } else {
                Alert.alert("Erro", "Não foi possível enviar sua solicitação no momento.");
              }
            } catch {
              Alert.alert("Erro", "Falha na conexão com o system.");
            } finally {
              setIsRequestingPlan(false);
            }
          }
        }
      ]
    );
  };

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      let openUrl = inv.link_boleto || '';

      try {
        const response = await fetch(`https://api.mikweb.com.br/v1/admin/billings/${inv.id}`, {
          headers: {
            'Authorization': `Bearer ${MIKWEB_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const b = data.billing;
          openUrl = b.integration_link || b.pdf || b.link || openUrl;
        }
      } catch { /* usa link mapeado */ }

      if (openUrl && openUrl.startsWith('http')) {
        Linking.openURL(openUrl);
      } else {
        Alert.alert("Indisponível", "Esta fatura não possui link disponível para visualização.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <LinearGradient colors={[theme.primary, theme.accent]} style={styles.headerArea}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onOpenMenu} style={styles.menuIcon}>
              <Menu color="#fff" size={28} />
            </TouchableOpacity>
            <View style={styles.logoCenter}>
              <Text style={styles.logoText}>JM NOVA ERA</Text>
              <Text style={styles.logoSub}>INTERNET FIBRA ÓPTICA</Text>
            </View>
            <TouchableOpacity style={styles.bellIconBox} onPress={onOpenNotifications}>
              <Bell color="#fff" size={24} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.gSub}>{getGreeting()}</Text>
            <Text style={styles.gText}>{customer?.full_name.split(' ')[0]}</Text>
          </View>

          <View style={styles.iCard}>
            <Text style={styles.iLabel}>VALOR ATUAL EM ABERTO</Text>
            <View style={styles.iRow}>
              <Text style={styles.iValue}>R$ {invoices[0]?.value || '0,00'}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {invoices[0] && (
                  <TouchableOpacity
                    style={[styles.iBtn, { backgroundColor: theme.secondary }]}
                    onPress={() => handleDownload(invoices[0])}
                    disabled={!!downloadingId}
                  >
                    {downloadingId ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Download color="#fff" size={16} />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.iBtn} onPress={() => onNavigate('finance')}>
                  <Text style={styles.iBtnText}>VER TUDO</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.iDate}>Vence em: {formatDateBR(invoices[0]?.vencimento)}</Text>
          </View>

          <View style={styles.bannerPos}>
            <TouchableOpacity style={styles.banner} onPress={() => setShowReferModal(true)}>
              <View style={styles.bText}>
                <View style={styles.badge}><Rocket size={10} color="#fff" /><Text style={styles.badgeT}>INDICAÇÃO JM</Text></View>
                <Text style={styles.bTitle}>Ganha um Amigo, Ganha um Desconto!</Text>
                <Text style={styles.bSub}>Indique e ganhe R$ 20,00 na próxima fatura.</Text>
              </View>
              <Image source={{ uri: 'https://img.freepik.com/free-photo/young-man-pointing-up-surprised-celebrating-success_1187-57321.jpg' }} style={styles.bImg} resizeMode="cover" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sHead}><LayoutGrid size={16} color={theme.primary} /><Text style={styles.sTitle}>MENU RÁPIDO</Text></View>
          <View style={styles.grid}>
            <QuickLink icon={ShieldCheck} label="Confiança" color="#f59e0b" theme={theme} onPress={() => setShowConfidenceModal(true)} />
            <QuickLink icon={MessageSquare} label="Suporte" color={theme.secondary} theme={theme} onPress={() => onNavigate('support')} />
            <QuickLink icon={Building} label="Contatos" color={theme.primary} theme={theme} onPress={() => setShowContactsModal(true)} />
            <QuickLink icon={Rocket} label="Planos" color="#a855f7" theme={theme} onPress={() => setShowPlansModal(true)} />
          </View>

          {!showBiometricSetup && customer?.cpf_cnpj !== '00000000000' && (
            <View style={styles.biometricStatusCard}>
              <ShieldCheck color={theme.success} size={20} />
              <Text style={styles.biometricStatusText}>Sua conta está protegida por criptografia de ponta.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Indicação */}
      <Modal visible={showReferModal} transparent animationType="slide">
        <View style={styles.mBack}>
          <View style={styles.mContent}>
            {!isSuccess ? (
              <>
                <View style={styles.mHead}>
                  <View>
                    <Text style={styles.mTitle}>INDIQUE UM AMIGO</Text>
                    <Text style={styles.mSubText}>Preencha os dados abaixo</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowReferModal(false)}><X color={theme.textDim} size={24} /></TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}><UserPlus size={18} color={theme.primary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Nome do Amigo" value={friendName} onChangeText={setFriendName} placeholderTextColor={theme.textDim} /></View>
                  <View style={styles.inputWrapper}><Phone size={18} color={theme.primary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="WhatsApp" value={friendPhone} onChangeText={setFriendPhone} keyboardType="phone-pad" placeholderTextColor={theme.textDim} /></View>
                  <View style={styles.inputWrapper}><MapPin size={18} color={theme.primary} style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Bairro do Amigo" value={friendNeighborhood} onChangeText={setFriendNeighborhood} placeholderTextColor={theme.textDim} /></View>
                </View>

                <TouchableOpacity style={[styles.btn, isSubmitting && { opacity: 0.7 }]} onPress={handleReferSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <><Rocket color="#fff" size={20} /><Text style={styles.btnT}>ENVIAR INDICAÇÃO</Text></>}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successArea}>
                {confettiAnims.map((anim, i) => (
                  <Animated.View key={i} style={[styles.confetti, { backgroundColor: [theme.secondary, theme.primary, theme.warning, theme.error][i % 4], transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos((i / confettiAnims.length) * Math.PI * 2) * 150] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin((i / confettiAnims.length) * Math.PI * 2) * 150] }) }, { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 0] }) }] }]} />
                ))}
                <Animated.View style={{ transform: [{ scale: successScale }] }}><CheckCircle2 size={100} color={theme.success} strokeWidth={2.5} /></Animated.View>
                <Text style={styles.successTitle}>PARABÉNS!</Text>
                <TouchableOpacity style={styles.closeSuccessBtn} onPress={() => { setShowReferModal(false); setTimeout(resetForm, 500); }}><Text style={styles.closeSuccessBtnText}>CONCLUÍDO</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Configuração de Biometria */}
      <Modal visible={showBiometricSetup} transparent animationType="fade">
        <View style={styles.mBack}>
          <View style={[styles.mContent, { alignItems: 'center', paddingVertical: 40 }]}>
            <View style={styles.bioIconContainer}>
              <Fingerprint color={theme.primary} size={50} />
            </View>
            <Text style={styles.mTitle}>ACELERE SEU ACESSO</Text>
            <Text style={styles.bioDesc}>Deseja ativar o login por Biometria ou FaceID para não precisar digitar seu CPF todas as vezes?</Text>

            <TouchableOpacity style={styles.btn} onPress={handleRegisterBiometrics}>
              <Text style={styles.btnT}>ATIVAR AGORA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={() => setShowBiometricSetup(false)}>
              <Text style={styles.laterBtnT}>AGORA NÃO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confiança */}
      <Modal visible={showConfidenceModal} transparent animationType="fade">
        <View style={styles.mBack}>
          <View style={styles.mContent}>
            <View style={[styles.mHead, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 15 }]}>
              <View style={styles.mIconCircle}><ShieldCheck color={theme.warning} size={30} /></View>
              <Text style={styles.mTitle}>NOSSO COMPROMISSO</Text>
              <TouchableOpacity onPress={() => setShowConfidenceModal(false)}><X color={theme.textDim} size={24} /></TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 25 }}>
              <Text style={styles.confText}>
                Na <Text style={{ color: theme.primary, fontWeight: '900' }}>JM NOVA ERA</Text>, nosso maior compromisso é com você.{'\n\n'}
                Investimos continuamente em infraestrutura de ponta e protocolos de segurança rigorosos para garantir que sua conexão seja estável, rápida e seus dados permaneçam sempre protegidos.{'\n\n'}
                Sua confiança move nossa inovação. Conte conosco para estar sempre conectado ao que importa.
              </Text>
              <View style={styles.confSignature}>
                <CheckCircle2 color={theme.success} size={16} />
                <Text style={styles.confSigText}>DISPONIBILIDADE • SEGURANÇA • ÉTICA</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => setShowConfidenceModal(false)}>
              <Text style={styles.btnT}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Contatos */}
      <Modal visible={showContactsModal} transparent animationType="slide">
        <View style={styles.mBack}>
          <View style={styles.mContent}>
            <View style={styles.mHead}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeT}>JM</Text>
              </View>
              <TouchableOpacity onPress={() => setShowContactsModal(false)}><X color={theme.textDim} size={24} /></TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 25 }}>
              <Text style={styles.contactsTitle}>JM NOVA ERA DIGITAL</Text>
              <Text style={styles.contactsSub}>Sempre pronta para te atender</Text>
            </View>

            <View style={styles.contactList}>
              <View style={styles.contactItem}>
                <MapPin color={theme.primary} size={20} />
                <View>
                  <Text style={styles.contactLabel}>ENDEREÇO</Text>
                  <Text style={styles.contactValue}>Av. Principal, 1000 - Salvador, BA</Text>
                </View>
              </View>
              <View style={styles.contactItem}>
                <Phone color={theme.primary} size={20} />
                <View>
                  <Text style={styles.contactLabel}>TELEFONE / WHATSAPP</Text>
                  <Text style={styles.contactValue}>(71) 98484-9751</Text>
                </View>
              </View>
              <View style={styles.contactItem}>
                <Mail color={theme.primary} size={20} />
                <View>
                  <Text style={styles.contactLabel}>E-MAIL</Text>
                  <Text style={styles.contactValue}>Jmlinkdigital@gmail.com</Text>
                </View>
              </View>
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}><Instagram color={theme.primary} size={22} /></TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}><Facebook color={theme.primary} size={22} /></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btn} onPress={() => setShowContactsModal(false)}>
              <Text style={styles.btnT}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Planos */}
      <Modal visible={showPlansModal} transparent animationType="slide">
        <View style={styles.mBack}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.mContent}>
              <View style={styles.mHead}>
                <Text style={styles.mTitle}>NOSSOS PLANOS</Text>
                <TouchableOpacity onPress={() => setShowPlansModal(false)}><X color={theme.textDim} size={24} /></TouchableOpacity>
              </View>

              <View style={styles.plansContainer}>
                <PlanCard
                  title="BRONZE"
                  speed="50"
                  price="50"
                  theme={theme}
                  color="#cd7f32"
                  features={['Fibra Óptica', 'Wi-Fi Grátis', 'Suporte Standard']}
                  onPress={() => handlePlanChangeRequest({ title: 'BRONZE', speed: '50', price: '60' })}
                  loading={isRequestingPlan}
                />
                <PlanCard
                  title="BRONZE"
                  speed="60"
                  price="60"
                  theme={theme}
                  color="#cd7f32"
                  features={['Fibra Óptica', 'Wi-Fi Grátis', 'Suporte Standard']}
                  onPress={() => handlePlanChangeRequest({ title: 'BRONZE', speed: '60', price: '60' })}
                  loading={isRequestingPlan}
                />
                <PlanCard
                  title="SILVER"
                  speed="80"
                  price="65"
                  theme={theme}
                  color="#94a3b8"
                  features={['Fibra Óptica', 'Wi-Fi Dual Band', 'Suporte Prioritário']}
                  highlighted
                  onPress={() => handlePlanChangeRequest({ title: 'SILVER', speed: '80', price: '65' })}
                  loading={isRequestingPlan}
                />
                <PlanCard
                  title="GOLD"
                  speed="100"
                  price="80"
                  theme={theme}
                  color="#f59e0b"
                  features={['Ultra Velocidade', 'Wi-Fi 6 Ready', 'Suporte VIP 24h']}
                  onPress={() => handlePlanChangeRequest({ title: 'GOLD', speed: '100', price: '80' })}
                  loading={isRequestingPlan}
                />

                <PlanCard
                  title="GOLD"
                  speed="150"
                  price="100"
                  theme={theme}
                  color="#f59e0b"
                  features={['Ultra Velocidade', 'Wi-Fi 6 Ready', 'Suporte VIP 24h']}
                  onPress={() => handlePlanChangeRequest({ title: 'GOLD', speed: '150', price: '100' })}
                  loading={isRequestingPlan}
                />
              </View>

              <Text style={styles.planHint}>*Valores mensais sujeitos a viabilidade técnica.</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View >
  );

  function QuickLink({ icon: Icon, label, color, theme, onPress }: any) {
    const qstyles = StyleSheet.create({
      ql: { width: '22%', alignItems: 'center', marginBottom: 20 },
      qlI: { width: 56, height: 56, backgroundColor: theme.card, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
      qlL: { color: theme.text, fontSize: 9, fontWeight: 'bold', marginTop: 8 }
    });
    return (
      <TouchableOpacity style={qstyles.ql} onPress={onPress}>
        <View style={qstyles.qlI}><Icon color={color} size={24} /></View>
        <Text style={qstyles.qlL}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function PlanCard({ title, speed, price, theme, color, features, highlighted, onPress, loading }: any) {
    return (
      <View style={[styles.planCard, highlighted && { borderColor: theme.primary, borderWidth: 2, transform: [{ scale: 1.05 }] }]}>
        {highlighted && <View style={styles.planBadge}><Text style={styles.planBadgeT}>MAIS POPULAR</Text></View>}
        <Text style={[styles.planTitle, { color }]}>{title}</Text>
        <View style={styles.planSpeedRow}>
          <Text style={styles.planSpeed}>{speed}</Text>
          <Text style={styles.planUnit}>MB</Text>
        </View>
        <View style={styles.planPriceRow}>
          <Text style={styles.planCurrency}>R$</Text>
          <Text style={styles.planValue}>{price}</Text>
          <Text style={styles.planMonth}>/mês</Text>
        </View>
        <View style={styles.planFeatures}>
          {features.map((f: string, i: number) => (
            <View key={i} style={styles.planFeatureItem}>
              <CheckCircle2 color={theme.success} size={12} />
              <Text style={styles.planFeatureText}>{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.planBtn, { backgroundColor: highlighted ? theme.primary : theme.background }]}
          onPress={onPress}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={highlighted ? "#fff" : theme.primary} /> : <Text style={[styles.planBtnT, { color: highlighted ? '#fff' : theme.primary }]}>CONTRATAR</Text>}
        </TouchableOpacity>
      </View>
    );
  }
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerArea: { paddingTop: 40, paddingHorizontal: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  menuIcon: { padding: 5, zIndex: 10 },
  bellIconBox: { padding: 5, width: 40, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  unreadBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.primary },
  unreadBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  logoCenter: { alignItems: 'center', flex: 1 },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  logoSub: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 'bold' },
  greeting: { marginBottom: 25 },
  gText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  gSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  iCard: { marginBottom: 20 },
  iLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' },
  iRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  iValue: { color: '#fff', fontSize: 38, fontWeight: '900' },
  iBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  iBtnText: { color: theme.primary, fontSize: 10, fontWeight: '900' },
  iDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 5, fontWeight: 'bold' },
  bannerPos: { position: 'absolute', bottom: -85, left: 20, right: 20 },
  banner: { backgroundColor: theme.card, borderRadius: 28, height: 150, overflow: 'hidden', flexDirection: 'row', elevation: 10, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 10 },
  bText: { flex: 1, padding: 20, justifyContent: 'center', zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.warning, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, gap: 4, marginBottom: 5 },
  badgeT: { color: '#fff', fontSize: 7, fontWeight: '900' },
  bTitle: { color: theme.primary, fontSize: 15, fontWeight: '900' },
  bSub: { color: theme.textDim, fontSize: 10 },
  bImg: { position: 'absolute', right: -20, width: '55%', height: '100%', opacity: 0.8 },
  content: { marginTop: 110, paddingHorizontal: 20 },
  sHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sTitle: { fontSize: 11, fontWeight: '900', color: theme.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  biometricStatusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.success + '10', padding: 15, borderRadius: 15, marginTop: 10, borderWidth: 1, borderColor: theme.success + '30' },
  biometricStatusText: { color: theme.success, fontSize: 10, fontWeight: 'bold', flex: 1 },
  mBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  mContent: { backgroundColor: theme.card, borderRadius: 30, padding: 25, overflow: 'hidden' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  mTitle: { fontWeight: '900', color: theme.primary, fontSize: 18, textAlign: 'center' },
  mSubText: { fontSize: 11, color: theme.textDim, fontWeight: 'bold', marginTop: 2 },
  bioIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  bioDesc: { textAlign: 'center', color: theme.textDim, fontSize: 14, lineHeight: 22, marginBottom: 30, paddingHorizontal: 20 },
  inputGroup: { gap: 12, marginBottom: 25 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 15, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 15 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 55, color: theme.text, fontSize: 14, fontWeight: '600' },
  btn: { width: '100%', backgroundColor: theme.primary, height: 65, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 5 },
  btnT: { color: '#fff', fontWeight: '900', fontSize: 15 },
  laterBtn: { marginTop: 15, padding: 10 },
  laterBtnT: { color: theme.textDim, fontWeight: 'bold', fontSize: 13 },
  successArea: { alignItems: 'center', paddingVertical: 30 },
  successTitle: { fontSize: 28, fontWeight: '900', color: theme.primary, marginTop: 20, letterSpacing: 1 },
  closeSuccessBtn: { marginTop: 30, backgroundColor: theme.background, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 },
  closeSuccessBtnText: { color: theme.primary, fontWeight: '900', fontSize: 13 },
  confetti: { position: 'absolute', width: 8, height: 8, borderRadius: 4, zIndex: -1 },
  mIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 15 },
  confText: { color: theme.text, fontSize: 13, lineHeight: 22, textAlign: 'center', paddingHorizontal: 10 },
  confSignature: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 25 },
  confSigText: { color: theme.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  logoBadge: { width: 50, height: 50, borderRadius: 15, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  logoBadgeT: { color: '#fff', fontSize: 20, fontWeight: '900' },
  contactsTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  contactsSub: { color: theme.textDim, fontSize: 12, fontWeight: 'bold' },
  contactList: { gap: 20, marginBottom: 30 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: theme.background, padding: 15, borderRadius: 15 },
  contactLabel: { color: theme.textDim, fontSize: 9, fontWeight: '900' },
  contactValue: { color: theme.text, fontSize: 13, fontWeight: 'bold' },
  socialRow: { flexDirection: 'row', gap: 15, justifyContent: 'center', marginBottom: 30 },
  socialBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  plansContainer: { gap: 20 },
  planCard: { backgroundColor: theme.card, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: theme.border, position: 'relative' },
  planBadge: { position: 'absolute', top: -10, right: 20, backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  planBadgeT: { color: '#fff', fontSize: 8, fontWeight: '900' },
  planTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  planSpeedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 5 },
  planSpeed: { color: theme.text, fontSize: 32, fontWeight: '900' },
  planUnit: { color: theme.textDim, fontSize: 14, fontWeight: 'bold' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 20 },
  planCurrency: { color: theme.textDim, fontSize: 12, fontWeight: 'bold' },
  planValue: { color: theme.primary, fontSize: 20, fontWeight: '900' },
  planMonth: { color: theme.textDim, fontSize: 11, fontWeight: 'bold' },
  planFeatures: { gap: 10, marginBottom: 25 },
  planFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planFeatureText: { color: theme.text, fontSize: 11, fontWeight: '600' },
  planBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  planBtnT: { fontWeight: '900', fontSize: 12 },
  planHint: { textAlign: 'center', color: theme.textDim, fontSize: 9, marginTop: 20, fontWeight: 'bold' }
});

export default Dashboard;
