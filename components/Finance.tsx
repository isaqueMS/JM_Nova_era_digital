import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView, Clipboard, Image, Platform } from 'react-native';
import { Invoice } from '../types';
import { EfiService } from '../services/efi';
import { QrCode, X, Copy, Barcode, FileText, ShieldCheck, CreditCard, CheckCircle2, AlertCircle, History, Download } from 'lucide-react-native';
import { MIKWEB_TOKEN } from '../services/mikweb';
import { parseDate } from '../utils';

import { formatDateBR, Theme } from '../utils';
import { Linking, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const Finance: React.FC<{ invoices: Invoice[], theme: Theme }> = ({ invoices, theme }) => {
  const styles = createStyles(theme);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const sortInvoices = (list: typeof invoices) => {
    return [...list].sort((a, b) => {
      const aIsPaid = a.status === 'P';
      const bIsPaid = b.status === 'P';
      if (aIsPaid !== bIsPaid) return aIsPaid ? 1 : -1;
      const getTime = (v: string) => {
        if (!v) return 0;
        const clean = v.split('T')[0];
        const [y, m, d] = clean.split('-').map(Number);
        return y && m && d ? new Date(y, m - 1, d).getTime() : 0;
      };
      return getTime(a.vencimento) - getTime(b.vencimento);
    });
  };

  const filteredData = useMemo(() => {
    if (!invoices) return [];
    if (filter === 'pending') return sortInvoices(invoices.filter(i => i.status !== 'P'));
    if (filter === 'paid') return sortInvoices(invoices.filter(i => i.status === 'P'));
    return sortInvoices(invoices);
  }, [invoices, filter]);

  const handleOpenPix = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPixCode(null);
    const raw = (inv.pix_copia_cola || "").replace(/\s/g, "");
    if (raw.length > 20) {
      setPixCode(raw);
    } else {
      setLoadingPix(true);
      try {
        if (inv.is_efi) {
          const code = await EfiService.getPixCode(inv.gateway_id || inv.id);
          if (code) setPixCode(code.trim());
        }
      } catch { }
      setLoadingPix(false);
    }
  };

  const copy = (txt: string | undefined, label: string) => {
    if (!txt || txt.length < 5) { Alert.alert("Erro", "Informação indisponível."); return; }
    Clipboard.setString(txt.trim());
    Alert.alert("Copiado", `${label} disponível na área de transferência.`);
  };

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);

    try {
      // Primeiro tenta buscar o integration_link direto da API (mais atualizado)
      let openUrl = inv.link_boleto || '';

      try {
        const res = await fetch(`https://api.mikweb.com.br/v1/admin/billings/${inv.id}`, {
          headers: {
            'Authorization': `Bearer ${MIKWEB_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          const b = data.billing;
          openUrl = b.integration_link || b.pdf || b.link || openUrl;
        }
      } catch { /* usa link já mapeado */ }

      if (openUrl && openUrl.startsWith('http')) {
        Linking.openURL(openUrl);
      } else {
        Alert.alert("Indisponível", "Esta fatura não possui link para visualização disponível.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const isOverdue = (vencimento: string, status: string) => {
    if (status === 'P') return false;
    const dateVenc = parseDate(vencimento);
    if (!dateVenc) return false;

    // Zera horas para comparação justa
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateVenc.setHours(0, 0, 0, 0);

    return dateVenc < today;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.primary, theme.accent]} style={styles.header}>
        <ShieldCheck color="#fff" size={24} />
        <Text style={[styles.headerTitle, { color: '#fff' }]}>HISTÓRICO FINANCEIRO</Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        <TouchableOpacity onPress={() => setFilter('all')} style={[styles.fBtn, filter === 'all' && styles.fBtnActive]}><Text style={[styles.fText, filter === 'all' && styles.fTextActive]}>TUDO</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('pending')} style={[styles.fBtn, filter === 'pending' && styles.fBtnActive]}><Text style={[styles.fText, filter === 'pending' && styles.fTextActive]}>PENDENTES</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('paid')} style={[styles.fBtn, filter === 'paid' && styles.fBtnActive]}><Text style={[styles.fText, filter === 'paid' && styles.fTextActive]}>PAGOS</Text></TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === 'P' && styles.cardPaid, (item.status === 'V' || isOverdue(item.vencimento, item.status)) && styles.cardLate]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardId}>#{item.id}</Text>
              {isOverdue(item.vencimento, item.status) ? (
                <Animated.View style={[styles.badge, styles.bgV, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.badgeText}>ATRASADO</Text>
                </Animated.View>
              ) : (
                <View style={[styles.badge, styles[`bg${item.status}`]]}>
                  <Text style={styles.badgeText}>{item.status === 'P' ? 'PAGO' : item.status === 'V' ? 'VENCIDO' : 'ABERTO'}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardValue}>R$ {parseFloat(item.value).toFixed(2)}</Text>
            <Text style={styles.cardDate}>Vencimento: {formatDateBR(item.vencimento)}</Text>
            <Text style={styles.cardComp}>{item.competencia}</Text>

            <View style={styles.actions}>
              {item.status !== 'P' && (
                <>
                  <TouchableOpacity style={styles.btnPix} onPress={() => handleOpenPix(item)}>
                    <QrCode color="#fff" size={16} /><Text style={styles.btnPixText}>PIX</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnCopy} onPress={() => copy(item.linha_digitavel, 'Boleto')}>
                    <Barcode color={theme.primary} size={16} /><Text style={styles.btnCopyText}>LINHA</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.btnDownload, item.status === 'P' && { flex: 1, backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
                onPress={() => handleDownload(item)}
                disabled={downloadingId === item.id}
              >
                {downloadingId === item.id ? (
                  <ActivityIndicator size="small" color={item.status === 'P' ? theme.primary : theme.success} />
                ) : (
                  <>
                    <Download color={item.status === 'P' ? theme.primary : theme.success} size={16} />
                    <Text style={[styles.btnDownloadText, item.status === 'P' && { color: theme.primary }]}>
                      {item.status === 'P' ? 'RECIBO' : 'BAIXAR'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}><History size={40} color={theme.border} /><Text style={styles.emptyText}>Nenhuma fatura encontrada.</Text></View>
        }
      />

      {/* Modal PIX Redesenhado */}
      <Modal visible={!!selectedInvoice} transparent animationType="slide">
        <View style={styles.mOverlay}>
          <View style={styles.mBox}>

            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Topo com X e título */}
            <View style={styles.mTopRow}>
              <View style={{ width: 36 }} />
              <Text style={styles.mTopTitle}>PAGAR COM PIX</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)} style={styles.mCloseBtn}>
                <X color={theme.textDim} size={20} />
              </TouchableOpacity>
            </View>

            {/* Ícone de destaque acima do QR */}
            <View style={styles.mIconArea}>
              <LinearGradient colors={[theme.primary, theme.accent]} style={styles.mIconCircle}>
                <QrCode color="#fff" size={30} />
              </LinearGradient>
              <Text style={styles.mIconLabel}>JM NOVA ERA</Text>
              {selectedInvoice && (
                <View style={styles.mInvoiceInfo}>
                  <Text style={styles.mInvoiceValue}>R$ {parseFloat(selectedInvoice.value).toFixed(2)}</Text>
                  <Text style={styles.mInvoiceDate}>Vence em {formatDateBR(selectedInvoice.vencimento)}</Text>
                </View>
              )}
            </View>

            <View style={styles.mBody}>
              {loadingPix ? (
                <View style={styles.mLoadingArea}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.mLoadingText}>Gerando QR Code...</Text>
                </View>
              ) : (
                <>
                  {/* QR Code */}
                  <View style={styles.qrBox}>
                    {pixCode ? (
                      <Image
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}` }}
                        style={styles.qr}
                      />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 10 }}>
                        <AlertCircle color={theme.textDim} size={40} />
                        <Text style={{ color: theme.textDim, fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>Código PIX{'\n'}não disponível</Text>
                      </View>
                    )}
                  </View>

                  {/* Código copia e cola */}
                  {pixCode && (
                    <View style={styles.pixCodeContainer}>
                      <Text style={styles.pixCodeLabel}>PIX COPIA E COLA</Text>
                      <View style={styles.pixCodeWrapper}>
                        <Text style={styles.pixCodeText} numberOfLines={1} ellipsizeMode="middle">
                          {pixCode}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: pixCode ? theme.primary : theme.border }]}
                    onPress={() => copy(pixCode!, 'Código PIX')}
                    disabled={!pixCode}
                  >
                    <Copy color="#fff" size={18} />
                    <Text style={styles.copyBtnText}>COPIAR CÓDIGO PIX</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.closeBtnSecondary} onPress={() => setSelectedInvoice(null)}>
                    <Text style={styles.closeBtnSecondaryText}>FECHAR</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 50, paddingTop: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', padding: 15, gap: 10 },
  fBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.card, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  fBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  fText: { fontSize: 10, fontWeight: '900', color: theme.textDim },
  fTextActive: { color: '#fff' },
  card: { backgroundColor: theme.card, borderRadius: 24, padding: 20, marginBottom: 15, elevation: 4, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 8, borderWidth: 1, borderColor: theme.border },
  cardPaid: { borderColor: theme.success + '40', backgroundColor: theme.success + '08' },
  cardLate: { borderColor: theme.error + '40', backgroundColor: theme.error + '08' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardId: { fontSize: 10, color: theme.textDim, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  bgA: { backgroundColor: theme.warning }, bgP: { backgroundColor: theme.success }, bgV: { backgroundColor: theme.error },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  cardValue: { fontSize: 32, fontWeight: '900', color: theme.text },
  cardDate: { fontSize: 13, color: theme.textDim, marginTop: 4, fontWeight: 'bold' },
  cardComp: { fontSize: 10, color: theme.textDim, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnPix: { flex: 1, backgroundColor: theme.primary, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 3 },
  btnCopy: { flex: 1, backgroundColor: theme.card, height: 50, borderRadius: 15, borderWidth: 1, borderColor: theme.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnPixText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  btnCopyText: { color: theme.primary, fontSize: 12, fontWeight: '900' },
  btnDownload: { flex: 1, backgroundColor: theme.success + '15', height: 50, borderRadius: 15, borderWidth: 1, borderColor: theme.success, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnDownloadText: { color: theme.success, fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: theme.textDim, fontWeight: 'bold' },

  // ========= MODAL PIX REDESENHADO =========
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  mBox: { backgroundColor: theme.card, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 40, overflow: 'hidden' },
  handleBar: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  mTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingVertical: 12 },
  mTopTitle: { fontSize: 13, fontWeight: '900', color: theme.text, letterSpacing: 1 },
  mCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
  mIconArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  mIconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, marginBottom: 10 },
  mIconLabel: { fontSize: 11, fontWeight: '900', color: theme.primary, letterSpacing: 2 },
  mInvoiceInfo: { marginTop: 12, alignItems: 'center', backgroundColor: theme.background, paddingHorizontal: 30, paddingVertical: 10, borderRadius: 15 },
  mInvoiceValue: { fontSize: 26, fontWeight: '900', color: theme.text },
  mInvoiceDate: { fontSize: 11, color: theme.textDim, fontWeight: 'bold', marginTop: 2 },
  mBody: { paddingHorizontal: 25, paddingTop: 20, alignItems: 'center' },
  mLoadingArea: { height: 180, justifyContent: 'center', alignItems: 'center', gap: 15 },
  mLoadingText: { color: theme.textDim, fontSize: 13, fontWeight: 'bold' },
  qrBox: { width: 230, height: 230, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  qr: { width: 190, height: 190 },
  pixCodeContainer: { width: '100%', gap: 8, marginBottom: 16 },
  pixCodeLabel: { fontSize: 9, fontWeight: '900', color: theme.textDim, letterSpacing: 1.5 },
  pixCodeWrapper: { backgroundColor: theme.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  pixCodeText: { color: theme.text, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyBtn: { width: '100%', height: 58, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4, marginBottom: 12 },
  copyBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  closeBtnSecondary: { width: '100%', height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  closeBtnSecondaryText: { color: theme.textDim, fontWeight: '900', fontSize: 12 },
  // Estilos legados não usados mais (mantidos para compat)
  mHeader: {}, mHeaderLeft: {}, mTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

export default Finance;
