
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { MikWebService } from '../services/mikweb';
import { Ticket } from '../types';
import { Theme, TECHNICIAN_IDS } from '../utils';
import {
  HardDrive,
  Receipt,
  History as HistoryIcon,
  Phone,
  Mail,
  Home,
  FileText,
  AlertCircle,
  Terminal as TerminalIcon,
  ClipboardList,
  Cpu,
  Activity,
  Server,
  Play,
  X,
  ChevronRight,
  MessageCircle,
  CheckCircle,
  Clock,
  Zap,
  Settings as SettingsIcon,
  ShieldCheck,
  Globe,
  Key,
  Info,
  User,
  Loader,
  LogOut,
  Wifi,
  Users,
  Search,
  TrendingUp,
  Database,
  MapPin,
  Smartphone,
  Download
} from 'lucide-react-native';
import { Customer, MikrotikDetails, Invoice, ConnectionHistory } from '../types';

const { width, height } = Dimensions.get('window');

interface TechnicianAreaProps {
  onLogout: () => void;
  theme: Theme;
}

const TechnicianArea: React.FC<TechnicianAreaProps> = ({ onLogout, theme }) => {
  const styles = createStyles(theme);
  const [activeTab, setActiveTab] = useState<'tickets' | 'broadcast' | 'clients'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedDiagCustomer, setSelectedDiagCustomer] = useState<Customer | null>(null);
  const [diagInfo, setDiagInfo] = useState<MikrotikDetails | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Diag States
  const [diagTab, setDiagTab] = useState<'info' | 'status' | 'finance' | 'history' | 'actions'>('info');
  const [sendMsgTitle, setSendMsgTitle] = useState('');
  const [sendMsgBody, setSendMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [diagInvoices, setDiagInvoices] = useState<Invoice[]>([]);
  const [diagHistory, setDiagHistory] = useState<ConnectionHistory[]>([]);

  const [loadingExtra, setLoadingExtra] = useState(false);

  // MKT Credentials State
  const [mktHost, setMktHost] = useState('177.126.118.2');
  const [mktPort, setMktPort] = useState('8728');
  const [mktUser, setMktUser] = useState('app');
  const [mktPass, setMktPass] = useState('appjm2026');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Terminal States
  const [terminalLogs, setTerminalLogs] = useState<{ msg: string, type: 'cmd' | 'resp' | 'info' | 'error' }[]>([
    { msg: 'SISTEMA OPERACIONAL JM-CORE v2.0 - ONLINE', type: 'info' },
    { msg: 'AGUARDANDO PONTE API MIKWEB...', type: 'info' }
  ]);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const terminalScrollRef = useRef<ScrollView>(null);

  // Broadcast States
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcProgress, setBcProgress] = useState(0);
  const [bcTotal, setBcTotal] = useState(0);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Search debounce
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      if (text.trim().length >= 2) {
        setLoading(true);
        try {
          const results = await MikWebService.getAllCustomers(text.trim());
          setCustomers(results);
        } catch { /* usa filtro local */ }
        setLoading(false);
      } else if (text.trim() === '') {
        loadCustomers();
      }
    }, 600);
  };


  useEffect(() => {
    if (activeTab === 'tickets') loadTickets();
    if (activeTab === 'clients') loadCustomers();
  }, [activeTab]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await MikWebService.getAllCustomers();
      setCustomers(data);
    } catch {
      Alert.alert("Erro", "Falha ao carregar base de clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClient = (customer: Customer) => {
    console.log('[DEBUG] handleOpenClient chamado para:', customer.id, customer.full_name);
    setSelectedDiagCustomer(customer);
    setDiagTab('info');
    setSendMsgTitle('');
    setSendMsgBody('');
    setDiagInfo(null);
    setDiagInvoices([]);
    setDiagHistory([]);
    setLoadingDiag(false);
    setLoadingExtra(false);

    // Carrega dados em background sem travar o modal
    loadClientData(customer);
  };

  const loadClientData = async (customer: Customer) => {
    console.log('[DEBUG] loadClientData iniciado para:', customer.id);
    setLoadingExtra(true);
    try {
      const mktCreds = { host: mktHost, port: mktPort, user: mktUser, pass: mktPass };

      const [invoices, history] = await Promise.all([
        MikWebService.getInvoices(customer.id),
        MikWebService.getConnectionHistory(customer.id, customer.login, mktCreds)
      ]);
      console.log('[DEBUG] Dados carregados - faturas:', invoices.length, 'hist:', history.length);
      setDiagInvoices(invoices);
      setDiagHistory(history);
    } catch (e) {
      console.log('[DEBUG] Erro ao carregar dados extras:', e);
    }
    setLoadingExtra(false);
    // Scan de rede via API MikWeb (usa /admin/logins diretamente)
    setLoadingDiag(true);
    try {
      const loginId = await MikWebService.getCustomerLoginId(customer.id, customer.email);
      if (loginId) {
        const info = await MikWebService.getMikrotikDiagnostics(
          { host: mktHost, port: mktPort, user: mktUser, pass: mktPass },
          loginId
        );
        console.log('[DEBUG] Diagnóstico retornou:', info?.status);
        setDiagInfo(info);
      } else {
        console.log('[DEBUG] Não encontrou login para o cliente:', customer.id);
        setDiagInfo({ status: 'Sem Cadastro' } as any);
      }
    } catch (e) {
      console.log('[DEBUG] Erro no diagnóstico de rede:', e);
      setDiagInfo({ status: 'Offline', raw: JSON.stringify({ error: String(e) }) } as any);
    }
    setLoadingDiag(false);
  };

  const handleRunDiagnosis = async (customer: Customer) => {
    setLoadingDiag(true);
    try {
      const loginId = await MikWebService.getCustomerLoginId(customer.id, customer.email);
      if (loginId) {
        const info = await MikWebService.getMikrotikDiagnostics(
          { host: mktHost, port: mktPort, user: mktUser, pass: mktPass },
          loginId
        );
        setDiagInfo(info);
      } else {
        setDiagInfo({ status: 'Sem Cadastro' } as any);
      }
    } catch (e) {
      console.error("[DEBUG] Erro ao rodar diagnóstico manual:", e);
      setDiagInfo({ status: 'Offline', raw: JSON.stringify({ error: String(e) }) } as any);
    }
    setLoadingDiag(false);
  };

  const handleDownloadBillet = async (inv: Invoice) => {
    try {
      let openUrl = inv.link_boleto || '';

      // Tenta buscar o link atualizado via API MikWeb
      try {
        const response = await fetch(`https://api.mikweb.com.br/v1/admin/billings/${inv.id}`, {
          headers: MikWebService.getHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          const b = data.billing || data;
          openUrl = b.integration_link || b.pdf || b.link || openUrl;
        }
      } catch (e) {
        console.warn("Erro ao buscar link atualizado:", e);
      }

      if (openUrl && openUrl.startsWith('http')) {
        Linking.openURL(openUrl);
      } else {
        Alert.alert("Indisponível", "Esta fatura não possui link disponível para visualização.");
      }
    } catch {
      Alert.alert("Erro", "Falha ao processar o redirecionamento.");
    }
  };

  const handleConfirmPayment = async (invoice: Invoice) => {
    if (invoice.status === 'P') return;

    Alert.alert(
      "Confirmar Pagamento",
      `Deseja dar baixa na fatura #${invoice.id} de R$ ${invoice.value}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "DAR BAIXA",
          onPress: async () => {
            const success = await MikWebService.confirmBilletPayment(invoice.id, parseFloat(invoice.value.replace(',', '.')));
            if (success) {
              Alert.alert("Sucesso", "Fatura baixada no sistema MikWeb.");
              if (selectedDiagCustomer) handleRunDiagnosis(selectedDiagCustomer);
            } else {
              Alert.alert("Erro", "Falha ao dar baixa.");
            }
          }
        }
      ]
    );
  };

  const handleDisconnect = async () => {
    if (!selectedDiagCustomer) return;

    Alert.alert(
      "Confirmar Desconexão",
      `Deseja realmente derrubar a sessão de ${selectedDiagCustomer.full_name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "DERRUBAR",
          style: "destructive",
          onPress: async () => {
            setLoadingDiag(true);
            const success = await MikWebService.disconnectClient(
              { host: mktHost, port: mktPort, user: mktUser, pass: mktPass },
              selectedDiagCustomer.id
            );
            if (success) {
              Alert.alert("Sucesso", "Usuário desconectado. Aguarde a reconexão automática.");
              handleRunDiagnosis(selectedDiagCustomer);
            } else {
              Alert.alert("Erro", "Não foi possível derrubar a sessão. Verifique o painel MikWeb.");
            }
            setLoadingDiag(false);
          }
        }
      ]
    );
  };

  const handleBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) {
      Alert.alert("Erro", "Preencha o título e a mensagem do comunicado.");
      return;
    }
    let targetCustomers = customers.filter(c => !TECHNICIAN_IDS.includes(c.cpf_cnpj || ''));

    if (targetCustomers.length === 0) {
      Alert.alert("Aguarde", "Carregando base de clientes...");
      setIsBroadcasting(true);
      const allCustomers = await MikWebService.getAllCustomers();
      targetCustomers = allCustomers.filter(c => !TECHNICIAN_IDS.includes(c.cpf_cnpj || ''));
      setIsBroadcasting(false);

      if (targetCustomers.length === 0) {
        Alert.alert("Erro", "Nenhum cliente válido retornado pela API. Impossível disparar.");
        return;
      }
    }

    Alert.alert(
      "Confirmar Disparo",
      `Deseja disparar este comunicado para ${targetCustomers.length} clientes? Isso abrirá chamados para notificação.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Disparar", onPress: async () => {
            setIsBroadcasting(true);
            setBcTotal(targetCustomers.length);
            setBcProgress(0);

            let successCount = 0;
            // Disparo iterativo com atraso para evitar Rate Limit (bloqueio por muitas requisições na API)
            for (let i = 0; i < targetCustomers.length; i++) {
              const c = targetCustomers[i];
              if (c && c.id) {
                const ok = await MikWebService.sendNotification(c.id, `[BROADCAST] ${bcTitle}`, bcMessage);
                if (ok) successCount++;
                // Pequena pausa (300ms) para não derrubar ou ser bloqueado pela API MIKWEB
                await new Promise(r => setTimeout(r, 300));
              }
              setBcProgress(i + 1);
            }

            setIsBroadcasting(false);
            Alert.alert("Finalizado", `Disparo concluído!\nSucesso: ${successCount}\nFalhas: ${targetCustomers.length - successCount}`);
            setBcTitle('');
            setBcMessage('');
          }
        }
      ]
    );
  };

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.login?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cpf_cnpj?.includes(searchQuery)
  );

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await MikWebService.getTickets();

      const filtered = data.filter(t => {
        const subject = (t.subject || '').toUpperCase();
        return !subject.includes('[BROADCAST]') &&
          !subject.includes('[AVISO]') &&
          !subject.includes('COMUNICADO');
      });

      if (data.length > 0 && filtered.length !== data.length) {
        setTerminalLogs(prev => [...prev, { msg: `[SYS] ${data.length - filtered.length} chamados omitidos (Broadcasts).`, type: 'info' }]);
      }

      setTickets(filtered);
    } catch {
      Alert.alert("Erro", "Não foi possível sincronizar os chamados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!mktHost || !mktUser || !mktPass) {
      Alert.alert("Atenção", "Credenciais incompletas.");
      return;
    }
    setIsSavingSettings(true);
    try {
      // Tenta um comando simples para validar a ponte
      const result = await MikWebService.sendMikrotikCommand(
        { host: mktHost, port: mktPort, user: mktUser, pass: mktPass },
        "/system/identity/print"
      );

      if (result.includes('ERRO')) {
        Alert.alert("Erro na Ponte", result);
        setIsSavingSettings(false);
        return;
      }

      Alert.alert("Sucesso", "Ponte API MikWeb vinculada com sucesso ao Core.");
      setActiveTab('clients');
      setTerminalLogs(prev => [...prev, { msg: `[SYS] CONEXÃO ESTABELECIDA COM ${mktHost}`, type: 'info' }]);
      setIsConnected(true);
    } catch {
      Alert.alert("Erro Crítico", "Falha ao validar a ponte API.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTerminalCommand = async (cmd: string) => {
    if (!cmd.trim() || isProcessing) return;

    if (!mktHost) {
      Alert.alert("Erro", "Configure o Roteador Core em AJUSTES.");
      setActiveTab('clients');
      return;
    }

    setTerminalLogs(prev => [...prev, { msg: `[admin@${mktHost}] > ${cmd}`, type: 'cmd' }]);
    setIsProcessing(true);
    setCommand('');

    try {
      const result = await MikWebService.sendMikrotikCommand(
        { host: mktHost, port: mktPort, user: mktUser, pass: mktPass },
        cmd
      );
      const isError = result.includes('ERRO') || result.includes('timed out');
      setTerminalLogs(prev => [...prev, { msg: result, type: isError ? 'error' : 'resp' }]);
      if (!isError) setIsConnected(true);
    } catch {
      setTerminalLogs(prev => [...prev, { msg: "TIMEOUT DA BRIDGE API.", type: 'error' }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => terminalScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleUpdateTicket = async (status: string) => {
    if (!selectedTicket || !response.trim()) {
      Alert.alert("Aviso", "Parecer obrigatório.");
      return;
    }
    setSubmitting(true);
    const success = await MikWebService.updateTicket(selectedTicket.id, status, response);
    if (success) {
      Alert.alert("OK", "Chamado atualizado.");
      setSelectedTicket(null);
      setResponse('');
      loadTickets();
    } else {
      Alert.alert("Erro", "Falha na API.");
    }
    setSubmitting(false);
  };





  return (
    <View style={styles.container}>
      {/* Header OS - Estilo Industrial */}
      <View style={styles.osHeader}>
        <View style={styles.osTop}>
          <View style={styles.osLogo}>
            <Zap color="#003399" size={16} />
            <Text style={styles.osTitle}>JM CORE OPERATIONAL SYSTEM</Text>
          </View>
          <View style={styles.osClock}>
            <Clock size={12} color="#94a3b8" />
            <ClockDisplay styles={styles} />
          </View>
        </View>

        <View style={styles.osInfoBar}>
          <View style={styles.osUserBadge}>
            <User size={12} color="#fff" />
            <Text style={styles.osUserText}>OPERADOR: ADMIN</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <LogOut size={14} color="#ef4444" />
            <Text style={styles.logoutText}>TERMINAR SESSÃO</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.osTabs}>
          <TabItem styles={styles} theme={theme} active={activeTab === 'tickets'} label="CHAMADOS" icon={ClipboardList} onPress={() => setActiveTab('tickets')} />
          <TabItem styles={styles} theme={theme} active={activeTab === 'clients'} label={`CLIENTES (${customers.length})`} icon={Users} onPress={() => setActiveTab('clients')} />
          <TabItem styles={styles} theme={theme} active={activeTab === 'broadcast'} label="BROADCAST" icon={MessageCircle} onPress={() => setActiveTab('broadcast')} />
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'clients' && (
          <View style={{ flex: 1 }}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>BASE DE CLIENTES ({customers.length})</Text>
              <TouchableOpacity onPress={loadCustomers}>
                <Activity size={18} color="#003399" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBar}>
              <Search size={16} color={theme.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar cliente, login ou CPF..."
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
              />
            </View>
            {loading ? (
              <View style={styles.center}><ActivityIndicator color="#003399" /></View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.customerCard} onPress={() => handleOpenClient(item)}>
                    <View style={styles.customerIcon}>
                      <User size={18} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{item.full_name?.toUpperCase()}</Text>
                      <View style={styles.customerSub}>
                        <Text style={styles.customerLogin}>{item.login}</Text>
                        <Text style={styles.customerStatus}> • {item.status}</Text>
                      </View>
                    </View>
                    <Activity size={16} color="#003399" />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ padding: 15 }}
                ListEmptyComponent={<Text style={styles.empty}>NENHUM CLIENTE ENCONTRADO</Text>}
              />
            )}
          </View>
        )}

        {activeTab === 'tickets' && (
          <View style={{ flex: 1 }}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>FILA DE CHAMADOS TÉCNICOS ({tickets.length})</Text>
              <TouchableOpacity onPress={loadTickets}><Activity size={16} color="#003399" /></TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.center}><ActivityIndicator color="#003399" /></View>
            ) : (
              <FlatList
                data={tickets}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.ticketCard} onPress={() => setSelectedTicket(item)}>
                    <View style={styles.ticketMain}>
                      <View style={styles.ticketHeader}>
                        <Text style={styles.ticketId}>ID:{item.id}</Text>
                        <View style={[styles.badge, { backgroundColor: item.status?.includes('Conclu') ? '#1e3a8a' : '#1e3a8a' }]}>
                          <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.ticketClient}>{item.customer_name?.toUpperCase()}</Text>
                      <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
                    </View>
                    <ChevronRight size={18} color="#334155" />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ padding: 15 }}
                ListEmptyComponent={<Text style={styles.empty}>NENHUM EVENTO NA FILA</Text>}
              />
            )}
          </View>
        )}
        {activeTab === 'broadcast' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.sectionHeader}>
              <MessageCircle color="#38bdf8" size={24} />
              <Text style={styles.sectionTitle}>CENTRAL DE COMUNICADOS (BROADCAST)</Text>
            </View>

            <View style={styles.settingsCard}>
              <InputGroup styles={styles} theme={theme} label="TÍTULO DO AVISO" value={bcTitle} onChange={setBcTitle} icon={Info} />

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MENSAGEM PARA TODOS OS CLIENTES</Text>
                <TextInput
                  style={[styles.modalInput, { height: 150 }]}
                  multiline
                  value={bcMessage}
                  onChangeText={setBcMessage}
                  placeholder="Ex: Teremos manutenção preventiva..."
                  placeholderTextColor="#475569"
                  editable={!isBroadcasting}
                />
              </View>

              {isBroadcasting && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.progressText}>ENVIANDO: {bcProgress} / {bcTotal}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(bcProgress / bcTotal) * 100}%` }]} />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#38bdf8' }]}
                onPress={handleBroadcast}
                disabled={isBroadcasting}
              >
                {isBroadcasting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>DISPARAR COMUNICADO AGORA</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Info size={16} color="#38bdf8" />
              <Text style={styles.infoText}>
                Esta mensagem será enviada para o sino de notificações de todos os clientes JM Nova Era que utilizam o aplicativo.
              </Text>
            </View>
          </ScrollView>
        )}

      </View>

      <Modal visible={!!selectedDiagCustomer} transparent animationType="slide">
        <View style={styles.diagOverlay}>
          <View style={styles.diagContent}>
            <View style={styles.diagHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diagTitle}>GERENCIAMENTO DO CLIENTE</Text>
                <Text style={styles.diagSubtitle} numberOfLines={1}>{selectedDiagCustomer?.full_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDiagCustomer(null)} style={styles.closeBtn}>
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 8, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: 'center' }}>
              {[{ id: 'info', label: 'DADOS', icon: User }, { id: 'status', label: 'REDE', icon: Activity }, { id: 'actions', label: 'AÇÕES', icon: Zap }, { id: 'finance', label: 'FINANC', icon: Receipt }, { id: 'history', label: 'CONEX', icon: HistoryIcon }].map(t => (
                <TouchableOpacity key={t.id} style={[styles.diagTab, diagTab === t.id && styles.diagTabActive]} onPress={() => {
                  setDiagTab(t.id as any);
                  // Auto-scan quando navegar para aba REDE e ainda não tem dados
                  if (t.id === 'status' && !diagInfo && !loadingDiag && selectedDiagCustomer) {
                    handleRunDiagnosis(selectedDiagCustomer);
                  }
                }}>
                  <t.icon size={13} color={diagTab === t.id ? '#fff' : theme.textDim} />
                  <Text style={[styles.diagTabText, diagTab === t.id && styles.diagTabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.diagBody} showsVerticalScrollIndicator={false}>
              <View>
                {/* ====== ABA DADOS CADASTRAIS ====== */}
                {diagTab === 'info' && (
                  <>
                    <View style={styles.infoCard}>
                      <Text style={[styles.diagLabel, { marginBottom: 12, fontSize: 11 }]}>INFORMAÇÕES CADASTRAIS</Text>
                      <View style={styles.infoRow}><User size={14} color={theme.primary} /><Text style={styles.infoVal}>{selectedDiagCustomer?.full_name}</Text></View>
                      <View style={styles.infoRow}><FileText size={14} color={theme.primary} /><Text style={styles.infoVal}>CPF/CNPJ: {selectedDiagCustomer?.cpf_cnpj}</Text></View>
                      <View style={styles.infoRow}><Phone size={14} color={theme.primary} /><Text style={styles.infoVal}>{selectedDiagCustomer?.cell_phone_number_1 || selectedDiagCustomer?.phone_number || '---'}</Text></View>
                      <View style={styles.infoRow}><Mail size={14} color={theme.primary} /><Text style={styles.infoVal}>{selectedDiagCustomer?.email || '---'}</Text></View>
                      <View style={styles.infoRow}><Home size={14} color={theme.primary} /><Text style={styles.infoVal}>{selectedDiagCustomer?.address || ''} • {selectedDiagCustomer?.neighborhood || ''}</Text></View>
                      <View style={styles.infoRow}><MapPin size={14} color={theme.primary} /><Text style={styles.infoVal}>{selectedDiagCustomer?.city || ''} - CEP: {selectedDiagCustomer?.zip_code || '---'}</Text></View>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={[styles.diagLabel, { marginBottom: 12, fontSize: 11 }]}>DADOS DO PLANO</Text>
                      <View style={styles.infoRow}><Globe size={14} color="#38bdf8" /><Text style={styles.infoVal}>Plano: {selectedDiagCustomer?.plan?.name || 'N/D'}</Text></View>
                      <View style={styles.infoRow}><Database size={14} color="#38bdf8" /><Text style={styles.infoVal}>Valor: R$ {selectedDiagCustomer?.plan?.value || '---'}</Text></View>
                      <View style={styles.infoRow}><Smartphone size={14} color="#38bdf8" /><Text style={styles.infoVal}>Login PPPoE: {selectedDiagCustomer?.login || 'Buscando...'}</Text></View>
                      <View style={styles.infoRow}><AlertCircle size={14} color={selectedDiagCustomer?.financial_status === 'Normal' ? '#003399' : '#f43f5e'} /><Text style={[styles.infoVal, { color: selectedDiagCustomer?.financial_status === 'Normal' ? '#003399' : '#f43f5e' }]}>Financeiro: {selectedDiagCustomer?.financial_status || selectedDiagCustomer?.status}</Text></View>
                      <View style={styles.infoRow}><HardDrive size={14} color="#38bdf8" /><Text style={styles.infoVal}>Dia Vencimento: {selectedDiagCustomer?.due_day}</Text></View>
                    </View>
                  </>
                )}

                {diagTab === 'status' && (
                  <>
                    {loadingDiag ? (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                        <ActivityIndicator color="#003399" size="large" />
                        <Text style={styles.loadingText}>Escaneando rede e ONU...</Text>
                        <Text style={{ color: theme.textDim, fontSize: 10, marginTop: 8 }}>Consultando API MikWeb Cloud</Text>
                      </View>
                    ) : !diagInfo ? (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 50 }}>
                        <Wifi size={40} color={theme.textDim} />
                        <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: 'bold', marginTop: 15 }}>Diagnóstico não realizado</Text>
                        <Text style={{ color: theme.textDim, fontSize: 11, marginTop: 5, textAlign: 'center', paddingHorizontal: 40 }}>Toque no botão abaixo para escanear a rede deste cliente</Text>
                        <TouchableOpacity style={{ backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, marginTop: 20, flexDirection: 'row', gap: 8, alignItems: 'center' }} onPress={() => handleRunDiagnosis(selectedDiagCustomer!)}>
                          <Activity size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>ESCANEAR REDE</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <View style={styles.statusSection}>
                          <View style={[styles.statusBadge, { backgroundColor: diagInfo.status === 'Online' ? '#1e3a8a' : '#991b1b' }]}>
                            <Wifi size={14} color="#fff" />
                            <Text style={styles.statusBadgeText}>{diagInfo.status?.toUpperCase()}</Text>
                          </View>
                          {diagInfo.status === 'Online' && diagInfo.uptime && (
                            <View style={styles.uptimeBadge}>
                              <Clock size={12} color={theme.textDim} />
                              <Text style={styles.uptimeText}>UPTIME: {diagInfo.uptime}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.diagGrid}>
                          <View style={styles.diagItem}><Globe size={14} color="#38bdf8" /><Text style={styles.diagLabel}>WAN IP</Text><Text style={styles.diagValue}>{diagInfo.ip || '---'}</Text></View>
                          <View style={styles.diagItem}><Zap size={14} color="#eab308" /><Text style={styles.diagLabel}>MAC ADDRESS</Text><Text style={styles.diagValue} numberOfLines={1}>{diagInfo.mac || 'N/D'}</Text></View>
                          <View style={styles.diagItem}><TrendingUp size={14} color="#003399" /><Text style={styles.diagLabel}>PLANO</Text><Text style={styles.diagValue}>{diagInfo.tx_rate || '---'}</Text></View>
                          <View style={styles.diagItem}><TrendingUp size={14} color="#f43f5e" /><Text style={styles.diagLabel}>AUTENTICAÇÃO</Text><Text style={styles.diagValue}>{diagInfo.rx_rate || '---'}</Text></View>
                        </View>

                        <View style={[styles.infoCard, { marginTop: 15, padding: 15 }]}>
                          <Text style={[styles.diagLabel, { marginBottom: 12, fontSize: 11 }]}>DETALHES DA CONEXÃO ÓPTICA</Text>
                          <View style={{ flexDirection: 'row', gap: 20 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.textDim, fontSize: 10 }}>SINAL ÓPTICO</Text>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 3 }}>{diagInfo.signal || 'N/D'}</Text>
                            </View>
                            <View style={{ flex: 1.5 }}>
                              <Text style={{ color: theme.textDim, fontSize: 10 }}>EQUIPAMENTO / PORTA</Text>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 3 }}>{diagInfo.onu_status || 'N/D'}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.diagActionsRow}>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#334155' }]} onPress={() => handleRunDiagnosis(selectedDiagCustomer!)}>
                            <Activity size={16} color="#fff" /><Text style={styles.actionBtnT}>RESCAN</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#b91c1c' }]} onPress={handleDisconnect}>
                            <LogOut size={16} color="#fff" /><Text style={styles.actionBtnT}>KICK</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* ====== ABA AÇÕES DO TECNICO ====== */}
                {diagTab === 'actions' && (
                  <>
                    <Text style={[styles.diagLabel, { marginBottom: 12, paddingHorizontal: 5 }]}>AÇÕES DISPONÍVEIS PARA ESTE CLIENTE</Text>

                    {/* Enviar Notificação Individual */}
                    <View style={styles.infoCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <MessageCircle size={16} color="#38bdf8" />
                        <Text style={[styles.diagLabel, { fontSize: 11, marginBottom: 0 }]}>ENVIAR NOTIFICAÇÃO</Text>
                      </View>
                      <TextInput style={[styles.modalInput, { marginBottom: 10 }]} placeholder="Título da mensagem" placeholderTextColor="#475569" value={sendMsgTitle} onChangeText={setSendMsgTitle} />
                      <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Mensagem para o cliente..." placeholderTextColor="#475569" multiline value={sendMsgBody} onChangeText={setSendMsgBody} />
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1e3a8a', marginTop: 10, alignSelf: 'stretch', justifyContent: 'center' }]} disabled={sendingMsg} onPress={async () => {
                        if (!sendMsgTitle.trim() || !sendMsgBody.trim()) { Alert.alert('Erro', 'Preencha título e mensagem.'); return; }
                        setSendingMsg(true);
                        const ok = await MikWebService.sendNotification(selectedDiagCustomer!.id, `[AVISO] ${sendMsgTitle}`, sendMsgBody);
                        setSendingMsg(false);
                        if (ok) { Alert.alert('Enviado', 'Notificação enviada ao cliente.'); setSendMsgTitle(''); setSendMsgBody(''); } else { Alert.alert('Erro', 'Falha ao enviar.'); }
                      }}>
                        {sendingMsg ? <ActivityIndicator color="#fff" /> : <><MessageCircle size={14} color="#fff" /><Text style={styles.actionBtnT}>ENVIAR</Text></>}
                      </TouchableOpacity>
                    </View>

                    {/* Abrir Chamado */}
                    <TouchableOpacity style={styles.actionCardBtn} onPress={async () => {
                      Alert.prompt ? Alert.prompt('Abrir Chamado', 'Mensagem para o chamado:', async (msg: string) => {
                        if (!msg) return;
                        const ok = await MikWebService.createTicket(selectedDiagCustomer!.id, 'Chamado Técnico', msg);
                        Alert.alert(ok ? 'Sucesso' : 'Erro', ok ? 'Chamado aberto.' : 'Falha.');
                      }) : Alert.alert('Abrir Chamado', 'Utilize a tela de chamados para abrir um chamado para este cliente.');
                    }}>
                      <ClipboardList size={18} color="#38bdf8" />

                      <ChevronRight size={16} color={theme.textDim} />
                    </TouchableOpacity>

                    {/* Derrubar sessão */}
                    <TouchableOpacity style={styles.actionCardBtn} onPress={handleDisconnect}>
                      <LogOut size={18} color="#f43f5e" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionCardTitle}>DERRUBAR SESSÃO PPPoE</Text>
                        <Text style={styles.actionCardSub}>Força desconexão do cliente no concentrador</Text>
                      </View>
                      <ChevronRight size={16} color={theme.textDim} />
                    </TouchableOpacity>

                    {/* Re-escanear rede */}
                    <TouchableOpacity style={styles.actionCardBtn} onPress={() => handleRunDiagnosis(selectedDiagCustomer!)}>
                      <Activity size={18} color="#003399" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionCardTitle}>DIAGNÓSTICO DE REDE</Text>
                        <Text style={styles.actionCardSub}>Re-escaneia status PPPoE, IP, MAC e uptime</Text>
                      </View>
                      <ChevronRight size={16} color={theme.textDim} />
                    </TouchableOpacity>

                    {/* Ver faturas */}
                    <TouchableOpacity style={styles.actionCardBtn} onPress={() => setDiagTab('finance')}>
                      <Receipt size={18} color="#eab308" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionCardTitle}>VER FATURAS / DAR BAIXA</Text>
                        <Text style={styles.actionCardSub}>Visualiza faturas e pode confirmar pagamento manual</Text>
                      </View>
                      <ChevronRight size={16} color={theme.textDim} />
                    </TouchableOpacity>

                    {/* Histórico */}
                    <TouchableOpacity style={styles.actionCardBtn} onPress={() => setDiagTab('history')}>
                      <HistoryIcon size={18} color="#a78bfa" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionCardTitle}>HISTÓRICO DE CONEXÕES</Text>
                        <Text style={styles.actionCardSub}>Sessões anteriores, IP e consumo por sessão</Text>
                      </View>
                      <ChevronRight size={16} color={theme.textDim} />
                    </TouchableOpacity>

                  </>
                )}


                {diagTab === 'finance' && (
                  <View style={styles.financeList}>
                    {diagInvoices.length === 0 ? <Text style={styles.emptySmall}>SEM FATURAS</Text> : diagInvoices.map(inv => (
                      <View key={inv.id} style={styles.invItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.invTitle}>#{inv.id} - {inv.competencia}</Text>
                          <Text style={styles.invDate}>Venc: {inv.vencimento}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.invVal, { color: inv.status === 'P' ? '#10b981' : '#f43f5e' }]}>R$ {inv.value}</Text>
                          <Text style={styles.invSt}>{inv.status === 'P' ? 'PAGO' : 'PENDENTE'}</Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                            <TouchableOpacity onPress={() => handleDownloadBillet(inv)} style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5 }}>
                              <Download size={14} color="#38bdf8" />
                            </TouchableOpacity>
                            {inv.status !== 'P' && (
                              <TouchableOpacity onPress={() => handleConfirmPayment(inv)} style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5 }}>
                                <CheckCircle size={14} color="#003399" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {diagTab === 'history' && (
                  <View style={styles.financeList}>
                    {diagHistory.length === 0 ? <Text style={styles.emptySmall}>SEM SESSÕES RECENTES</Text> : diagHistory.map(h => (
                      <View key={h.id} style={styles.invItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.invTitle}>{h.start_date}</Text>
                          <Text style={styles.invDate}>Duração: {h.duration}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.invVal}>{h.ip}</Text>
                          <Text style={styles.invSt}>{h.upload} ↑ / {h.download} ↓</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View >
      </Modal >

      {/* Modal Parecer Técnico */}
      < Modal visible={!!selectedTicket} transparent animationType="fade" >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EVENT LOG #{selectedTicket?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}><X color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>CLIENTE / OCORRÊNCIA:</Text>
              <Text style={styles.modalText}>{selectedTicket?.customer_name}</Text>
              <Text style={styles.modalDesc}>{selectedTicket?.message}</Text>

              <Text style={styles.modalLabel}>DESPACHO DO OPERADOR:</Text>
              <TextInput
                style={styles.modalInput}
                multiline
                value={response}
                onChangeText={setResponse}
                placeholder="Insira os logs de reparo..."
                placeholderTextColor="#475569"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#334155' }]} onPress={() => handleUpdateTicket('Em Atendimento')}>
                  <Text style={styles.modalBtnT}>ATUALIZAR STATUS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1e3a8a' }]} onPress={() => handleUpdateTicket('Concluído')}>
                  <Text style={styles.modalBtnT}>FINALIZAR CHAMADO</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal >
    </View >
  );
};

const ClockDisplay = ({ styles }: { styles: any }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR')), 1000);
    return () => clearInterval(timer);
  }, []);

  return <Text style={styles.osClockText}>{time}</Text>;
};

const TabItem = ({ active, label, icon: Icon, onPress, styles, theme }: any) => (
  <TouchableOpacity style={[styles.tabItem, active && styles.tabItemActive]} onPress={onPress}>
    <Icon size={14} color={active ? '#fff' : theme.textDim} />
    <Text style={[styles.tabItemText, active && styles.tabItemTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ShortBtn = ({ label, cmd, onExec, styles }: any) => (
  <TouchableOpacity style={styles.shortBtn} onPress={() => onExec(cmd)}>
    <Text style={styles.shortBtnT}>{label}</Text>
  </TouchableOpacity>
);

const InputGroup = ({ label, value, onChange, icon: Icon, secure = false, kb = 'default', styles, theme }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Icon size={14} color={theme.textDim} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={kb}
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
      />
    </View>
  </View>
);

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  osHeader: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 20, paddingTop: 10 },
  osTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  osLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  osTitle: { color: theme.text, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  osClock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  osClockText: { color: theme.textDim, fontSize: 10, fontWeight: 'bold' },
  osInfoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  osUserBadge: { backgroundColor: theme.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  osUserText: { color: theme.text, fontSize: 9, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  logoutText: { color: theme.error, fontSize: 9, fontWeight: '900' },
  osTabs: { flexDirection: 'row', gap: 10, paddingBottom: 10 },
  tabItem: { flex: 1, height: 36, backgroundColor: theme.background, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabItemActive: { backgroundColor: theme.primary },
  tabItemText: { color: theme.textDim, fontSize: 9, fontWeight: '900' },
  tabItemTextActive: { color: '#fff' },
  content: { flex: 1 },
  panelHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: theme.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ticketCard: { backgroundColor: theme.card, marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  ticketMain: { flex: 1 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  ticketId: { color: theme.textDim, fontSize: 9, fontWeight: 'bold' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  ticketClient: { color: theme.text, fontSize: 12, fontWeight: '900', marginBottom: 2 },
  ticketSubject: { color: theme.textDim, fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 100, color: theme.textDim, fontWeight: '900', fontSize: 10 },
  terminalContainer: { flex: 1 },
  terminalStatus: { backgroundColor: theme.card, padding: 8, flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statT: { color: theme.primary, fontSize: 9, fontWeight: '900' },
  terminalConsole: { flex: 1, backgroundColor: '#000' },
  consoleLine: { fontSize: 11, fontFamily: 'monospace', marginBottom: 4, lineHeight: 16 },
  line_info: { color: '#38bdf8' },
  line_cmd: { color: '#fff', fontWeight: 'bold' },
  line_resp: { color: '#10b981' },
  line_error: { color: '#ef4444' },
  terminalFooter: { backgroundColor: theme.card, padding: 10 },
  terminalShortcuts: { marginBottom: 10 },
  shortBtn: { backgroundColor: theme.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  shortBtnT: { color: theme.textDim, fontSize: 9, fontWeight: '900' },
  terminalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, height: 45, backgroundColor: '#000', borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  prompt: { color: theme.primary, fontSize: 11, fontWeight: 'bold' },
  terminalInput: { flex: 1, color: '#fff', fontSize: 11, fontFamily: 'monospace' },
  settingsArea: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { color: theme.text, fontSize: 13, fontWeight: '900' },
  settingsCard: { backgroundColor: theme.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  inputGroup: { marginBottom: 15 },
  inputLabel: { color: theme.textDim, fontSize: 9, fontWeight: '900', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.background, paddingHorizontal: 12, height: 50, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  input: { flex: 1, color: theme.text, fontSize: 13, fontWeight: 'bold' },
  saveBtn: { backgroundColor: theme.primary, height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  infoText: { flex: 1, color: theme.secondary, fontSize: 10, lineHeight: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  modalHeader: { backgroundColor: theme.primary, padding: 20, flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalBody: { padding: 20 },
  modalLabel: { color: theme.textDim, fontSize: 9, fontWeight: '900', marginBottom: 5 },
  modalText: { color: theme.text, fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  modalDesc: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginBottom: 20 },
  modalInput: { backgroundColor: theme.background, borderRadius: 12, padding: 15, height: 120, textAlignVertical: 'top', color: theme.text, fontSize: 13, borderWidth: 1, borderColor: theme.border },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalBtnT: { color: '#fff', fontSize: 9, fontWeight: '900' },
  progressText: { color: theme.text, fontSize: 10, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  progressBar: { height: 6, backgroundColor: theme.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primary },

  // Clientes Tab Styles
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, height: 50, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  searchInput: { flex: 1, color: theme.text, fontSize: 13, fontWeight: 'bold' },
  customerCard: { backgroundColor: theme.card, marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, gap: 15 },
  customerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  customerName: { color: theme.text, fontSize: 13, fontWeight: '900' },
  customerSub: { flexDirection: 'row', alignItems: 'center' },
  customerLogin: { color: theme.textDim, fontSize: 11, fontWeight: 'bold' },
  customerStatus: { color: theme.success, fontSize: 10, fontWeight: 'bold' },

  // Diagnostic Modal Styles — Premium
  diagOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  diagContent: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: height * 0.88, overflow: 'hidden' },
  diagHeader: { paddingTop: 22, paddingBottom: 18, paddingHorizontal: 22, backgroundColor: theme.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  diagTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  diagSubtitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 3, letterSpacing: 0.3 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  diagBody: { padding: 16 },
  statusSection: { flexDirection: 'row', gap: 10, marginBottom: 18, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  uptimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  uptimeText: { color: theme.text, fontSize: 10, fontWeight: '900' },
  diagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  diagItem: { width: (width - 62) / 2, backgroundColor: theme.background, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  diagLabel: { color: theme.textDim, fontSize: 9, fontWeight: '900', marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  diagValue: { color: theme.text, fontSize: 13, fontWeight: '900' },
  usageSection: { backgroundColor: theme.background, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  usageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  usageTitle: { color: theme.text, fontSize: 10, fontWeight: '900' },
  usageBarRow: { marginBottom: 12 },
  usageLabel: { color: theme.textDim, fontSize: 9, fontWeight: 'bold', marginBottom: 6 },
  usageBar: { height: 6, backgroundColor: theme.card, borderRadius: 3, overflow: 'hidden' },
  usageProgress: { height: '100%', borderRadius: 3 },
  rebootBtn: { backgroundColor: theme.primary, height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  rebootBtnT: { color: '#fff', fontSize: 11, fontWeight: '900' },
  loadingText: { color: theme.textDim, fontSize: 12, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  errorText: { color: theme.error, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  // Diag Tab Pills
  diagTabs: { flexDirection: 'row', backgroundColor: theme.background, padding: 5, gap: 5 },
  diagTab: { height: 34, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 14, backgroundColor: 'transparent' },
  diagTabActive: { backgroundColor: theme.primary },
  diagTabText: { fontSize: 9, fontWeight: '900', color: theme.textDim, letterSpacing: 0.5 },
  diagTabTextActive: { color: '#fff' },

  // Action card buttons
  actionCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.background, padding: 18, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  actionCardTitle: { color: theme.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  actionCardSub: { color: theme.textDim, fontSize: 10, fontWeight: '500', marginTop: 3, lineHeight: 14 },
  infoCard: { padding: 18, backgroundColor: theme.background, marginBottom: 12, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: theme.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoVal: { color: theme.text, fontSize: 12, fontWeight: '700', flex: 1 },
  diagActionsRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnT: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  financeList: { paddingTop: 5 },
  invItem: { backgroundColor: theme.background, padding: 16, borderRadius: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  invTitle: { color: theme.text, fontSize: 11, fontWeight: '900' },
  invDate: { color: theme.textDim, fontSize: 10, fontWeight: 'bold' },
  invVal: { color: theme.text, fontSize: 14, fontWeight: '900' },
  invSt: { fontSize: 8, fontWeight: '900' },
  emptySmall: { textAlign: 'center', color: theme.textDim, fontSize: 12, marginTop: 40, fontWeight: '900', letterSpacing: 0.5 },
  invLabelSmall: { fontSize: 7, fontWeight: '900', color: theme.textDim },
  invValSmall: { fontSize: 11, fontWeight: '900', color: theme.text },
});

export default TechnicianArea;
