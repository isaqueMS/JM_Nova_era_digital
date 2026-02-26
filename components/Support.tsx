
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl
} from 'react-native';
import { getAIResponse } from '../services/gemini';
import { MikWebService } from '../services/mikweb';
import { Ticket, Customer } from '../types';
import { Send, Bot, ListFilter, ClipboardList, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Theme } from '../utils';
import { LinearGradient } from 'expo-linear-gradient';

const formatDate = (dateStr: string) => {
  if (!dateStr) return "---";
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

interface SupportProps {
  customer: Customer;
  theme: Theme;
}

const Support: React.FC<SupportProps> = ({ customer, theme }) => {
  const styles = createStyles(theme);
  const [activeTab, setActiveTab] = useState<'ai' | 'list' | 'create'>('ai');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: `Olá, ${customer.full_name.split(' ')[0]}. Sou o Mestre Mik, seu assistente da JM Nova Era Digital. Como posso ajudar você hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (activeTab === 'list') loadTickets();
  }, [activeTab]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await MikWebService.getTickets(customer.id);
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar chamados:", error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSendAI = async () => {
    if (!input.trim() || loadingAI) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoadingAI(true);
    try {
      const response = await getAIResponse(userMsg, customer.full_name);
      setMessages(prev => [...prev, { role: 'ai', text: response || 'Desculpe, não consegui processar sua dúvida.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Estou com dificuldades técnicas no momento.' }]);
    } finally {
      setLoadingAI(false);
      setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Aviso", "Preencha o assunto e a descrição do problema.");
      return;
    }
    setSubmitting(true);

    const technicalData =
      `--- DADOS DO CLIENTE ---\n` +
      `Nome: ${customer.full_name}\n` +
      `Login: ${customer.login}\n` +
      `CPF/CNPJ: ${customer.cpf_cnpj}\n` +
      `Contato: ${customer.cell_phone_number_1 || customer.phone_number || 'Não informado'}\n` +
      `Endereço: ${customer.address || 'Não informado'}, ${customer.neighborhood || ''}\n` +
      `------------------------\n\n` +
      `MENSAGEM DO CLIENTE:\n${message}`;

    try {
      const result = await MikWebService.createTicket(customer.id, subject.toUpperCase(), technicalData);
      if (result) {
        Alert.alert("Sucesso", "Chamado registrado! Nossa equipe técnica analisará sua solicitação.");
        setSubject('');
        setMessage('');
        // Força a atualização da lista ao mudar de aba
        setActiveTab('list');
        loadTickets();
      } else {
        Alert.alert("Erro", "Não foi possível registrar o chamado. Tente novamente.");
      }
    } catch (e) {
      Alert.alert("Erro", "Falha de comunicação com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {[
          { id: 'ai', icon: Bot, label: 'MESTRE MIK' },
          { id: 'list', icon: ListFilter, label: 'CHAMADOS' },
          { id: 'create', icon: ClipboardList, label: 'ABRIR NOVO' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as any)}
            style={[styles.tab, activeTab === t.id && styles.activeTab]}
          >
            <t.icon size={22} color={activeTab === t.id ? theme.primary : theme.textDim} />
            <Text style={[styles.tabText, activeTab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'list' && (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={loadingTickets} onRefresh={loadTickets} colors={[theme.primary]} tintColor={theme.primary} />
          }
          renderItem={({ item }) => (
            <View style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketId}>PROTOCOLO #{item.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status?.toLowerCase().includes('conclu') ? theme.success : theme.primary }]}>
                  <Text style={styles.statusText}>{item.status?.toUpperCase() || 'ABERTO'}</Text>
                </View>
              </View>
              <Text style={styles.ticketSubject}>{item.subject?.toUpperCase() || 'SEM ASSUNTO'}</Text>
              <View style={styles.ticketFooter}>
                <Clock size={12} color={theme.textDim} />
                <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loadingTickets ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <AlertCircle size={40} color={theme.border} />
                <Text style={styles.emptyText}>Nenhum chamado encontrado.</Text>
              </View>
            )
          }
        />
      )}

      {activeTab === 'create' && (
        <ScrollView style={styles.form} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.infoNote}>
            <CheckCircle size={14} color={theme.primary} />
            <Text style={styles.infoNoteText}>
              Seus dados de conexão e localização serão anexados automaticamente para agilizar o suporte.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ASSUNTO DA OCORRÊNCIA</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Ex: Lentidão ou Sem Sinal"
              placeholderTextColor={theme.textDim}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>DESCRIÇÃO DETALHADA</Text>
            <TextInput
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Descreva o que está acontecendo..."
              placeholderTextColor={theme.textDim}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleCreateTicket}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>ABRIR CHAMADO AGORA</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'ai' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 20 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.bubbleText, m.role === 'user' ? { color: '#fff' } : { color: theme.text }]}>{m.text}</Text>
              </View>
            ))}
            {loadingAI && (
              <View style={styles.aiLoading}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Text style={styles.aiLoadingText}>Mestre Mik está digitando...</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Digite sua dúvida técnica..."
              placeholderTextColor={theme.textDim}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendAI}>
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  tabs: { flexDirection: 'row', backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, elevation: 4, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
  tab: { flex: 1, height: 75, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.primary },
  tabText: { color: theme.textDim, fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 0.5 },
  activeTabText: { color: theme.primary },
  infoNote: { backgroundColor: theme.primary + '10', padding: 15, borderRadius: 12, marginBottom: 25, flexDirection: 'row', gap: 10, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: theme.primary },
  infoNoteText: { color: theme.primary, fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  ticketCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: theme.border, elevation: 3, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  ticketId: { color: theme.textDim, fontSize: 10, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  ticketSubject: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  ticketDate: { color: theme.textDim, fontSize: 11, fontWeight: '600' },
  form: { flex: 1 },
  field: { marginBottom: 20 },
  label: { color: theme.textDim, fontSize: 11, fontWeight: '900', marginBottom: 10, letterSpacing: 0.5 },
  input: { backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 15, color: theme.text, fontSize: 15, fontWeight: '600' },
  submitBtn: { backgroundColor: theme.primary, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  bubble: { padding: 16, borderRadius: 24, marginBottom: 15, maxWidth: '85%', elevation: 2, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
  aiBubble: { backgroundColor: theme.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  userBubble: { backgroundColor: theme.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10, marginBottom: 20 },
  aiLoadingText: { fontSize: 12, color: theme.textDim, fontWeight: 'bold' },
  inputArea: { flexDirection: 'row', padding: 15, gap: 12, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: theme.background, borderRadius: 18, paddingHorizontal: 18, height: 55, color: theme.text, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: theme.border },
  sendBtn: { width: 55, height: 55, backgroundColor: theme.primary, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 15 },
  emptyText: { color: theme.textDim, fontSize: 15, fontWeight: 'bold' }
});

export default Support;
