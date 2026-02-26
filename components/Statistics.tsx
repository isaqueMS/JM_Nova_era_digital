
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { ConnectionHistory } from '../types';
import { MikWebService } from '../services/mikweb';
import { History, Clock, ArrowUp, ArrowDown, Wifi } from 'lucide-react-native';
import { Theme } from '../utils';
import { LinearGradient } from 'expo-linear-gradient';

interface StatisticsProps {
  customerId: number;
  theme: Theme;
  standalone?: boolean; // Se true, exibe com header. Se false, exibe inline no Perfil
}

const Statistics: React.FC<StatisticsProps> = ({ customerId, theme, standalone = true }) => {
  const [history, setHistory] = useState<ConnectionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = createStyles(theme);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const hData = await MikWebService.getConnectionHistory(customerId);
      setHistory(hData);
      setLoading(false);
    };
    loadData();
  }, [customerId]);


  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    );
  }

  const content = (
    <>

      {/* — Log de Conexão — */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <History color={theme.secondary} size={16} />
          <Text style={styles.sectionTitle}>LOG PPPoE</Text>
        </View>
        {history.length > 0 ? history.map((h, i) => (
          <View key={i} style={[styles.histCard, i !== history.length - 1 && styles.histCardBorder]}>
            <View style={styles.histTop}>
              <View style={styles.histDateRow}>
                <Clock size={11} color={theme.textDim} />
                <Text style={styles.histDate}>
                  {new Date(h.start_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.ipTag, { backgroundColor: theme.primary + '15' }]}>
                <Wifi size={10} color={theme.primary} />
                <Text style={[styles.ipText, { color: theme.primary }]}>{h.ip || 'N/D'}</Text>
              </View>
            </View>
            <View style={styles.histStats}>
              <View style={styles.histStat}>
                <ArrowDown size={11} color={theme.primary} />
                <Text style={styles.histStatText}>{h.download || '---'}</Text>
              </View>
              <View style={styles.histStat}>
                <ArrowUp size={11} color={theme.secondary} />
                <Text style={styles.histStatText}>{h.upload || '---'}</Text>
              </View>
              <View style={styles.histStat}>
                <Clock size={11} color={theme.textDim} />
                <Text style={styles.histStatText}>{h.duration || 'Ativa'}</Text>
              </View>
            </View>
          </View>
        )) : (
          <View style={styles.emptyBox}>
            <History size={28} color={theme.border} />
            <Text style={styles.emptyText}>Nenhuma sessão registrada.</Text>
          </View>
        )}
      </View>
    </>
  );

  if (!standalone) {
    return <View>{content}</View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[theme.primary, theme.accent]} style={styles.header}>
        <History color="#fff" size={22} />
        <Text style={styles.headerTitle}>HISTÓRICO DE CONEXÃO</Text>
      </LinearGradient>
      {content}
    </ScrollView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 20, paddingTop: 25, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: theme.textDim, fontSize: 12, fontWeight: 'bold' },
  section: { backgroundColor: theme.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { color: theme.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  usageGrid: { gap: 12 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageDate: { color: theme.textDim, fontSize: 9, width: 42, fontWeight: 'bold' },
  barTrack: { flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  usageNumbers: { flexDirection: 'row', gap: 6, width: 95 },
  usageDown: { color: theme.text, fontSize: 9, fontWeight: '900' },
  usageUp: { color: theme.secondary, fontSize: 9, fontWeight: 'bold' },
  histCard: { paddingVertical: 12 },
  histCardBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  histDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  histDate: { color: theme.text, fontSize: 11, fontWeight: 'bold' },
  ipTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ipText: { fontSize: 10, fontWeight: '900' },
  histStats: { flexDirection: 'row', gap: 18 },
  histStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  histStatText: { color: theme.textDim, fontSize: 10, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', paddingVertical: 25, gap: 8 },
  emptyText: { color: theme.textDim, fontSize: 11, fontWeight: 'bold', textAlign: 'center' }
});

export default Statistics;
