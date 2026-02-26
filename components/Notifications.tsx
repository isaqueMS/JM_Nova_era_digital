
import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Bell, Receipt, AlertTriangle, Megaphone, Trash2, X, CheckCheck, ChevronRight, Mail, Inbox, MailOpen } from 'lucide-react-native';
import { AppNotification } from '../types';
import { Theme } from '../utils';

interface NotificationsProps {
  notifications: AppNotification[];
  theme: Theme;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  theme,
  onMarkRead,
  onDelete,
  onClearAll,
  onClose
}) => {
  const styles = createStyles(theme);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderIcon = (type: string, isUnread: boolean) => {
    const size = 20;
    const color = isUnread ? theme.primary : theme.textDim;
    switch (type) {
      case 'invoice': return <Receipt size={size} color={isUnread ? theme.primary : theme.textDim} />;
      case 'alert': return <AlertTriangle size={size} color={theme.error} />;
      case 'system': return <Megaphone size={size} color={isUnread ? '#38bdf8' : theme.textDim} />;
      default: return isUnread ? <Mail size={size} color={theme.primary} /> : <MailOpen size={size} color={theme.textDim} />;
    }
  };

  const handlePressNotification = (notif: AppNotification) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      onMarkRead(String(notif.id));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header - Minimalist Inbox Style */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Minha Caixa</Text>
            <Text style={styles.subtitle}>{notifications.length} mensagens • {unreadCount} novas</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={onClearAll} style={styles.actionBtnHeader}>
              <CheckCheck size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.inboxItem, !item.isRead && styles.inboxItemUnread]}
            onPress={() => handlePressNotification(item)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: item.isRead ? theme.border : (item.type === 'alert' ? theme.error + '20' : theme.primary + '15') }]}>
                {renderIcon(item.type, !item.isRead)}
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>

            <View style={styles.contentWrapper}>
              <View style={styles.contentTop}>
                <Text style={[styles.senderName, !item.isRead && styles.boldText]}>
                  {item.type === 'system' ? 'JM NOVA ERA' : (item.type === 'invoice' ? 'FINANCEIRO' : 'SISTEMA')}
                </Text>
                <Text style={styles.dateText}>
                  {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.subject, !item.isRead && styles.boldText]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.border} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Inbox size={60} color={theme.border} />
            <Text style={styles.emptyTitle}>Caixa de entrada vazia</Text>
            <Text style={styles.emptyText}>Você não possui notificações no momento.</Text>
          </View>
        }
      />

      {/* Detail Modal - Reading Pane */}
      <Modal visible={!!selectedNotif} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.readingPane}>
            <View style={styles.paneHeader}>
              <TouchableOpacity onPress={() => setSelectedNotif(null)} style={styles.closePaneBtn}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.paneActions}>
                <TouchableOpacity onPress={() => { onDelete(String(selectedNotif?.id)); setSelectedNotif(null); }} style={styles.paneActionBtn}>
                  <Trash2 size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.paneContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.paneSubject}>{selectedNotif?.title}</Text>

              <View style={styles.senderInfo}>
                <View style={[styles.avatarSmall, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={styles.avatarInitial}>J</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.senderFull}>Provedor JM Nova Era Digital</Text>
                  <Text style={styles.senderMeta}>para você • {selectedNotif && new Date(selectedNotif.date).toLocaleString('pt-BR')}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.messageBody}>
                {selectedNotif?.description}
              </Text>

              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.paneFooter}>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setSelectedNotif(null)}>
                <Text style={styles.primaryActionText}>ENTENDIDO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 5 },
  title: { fontSize: 20, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 11, color: theme.textDim, fontWeight: '600' },
  actionBtnHeader: { padding: 8, backgroundColor: theme.primary + '10', borderRadius: 10 },

  // Inbox Item Style
  inboxItem: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.border,
    alignItems: 'flex-start',
  },
  inboxItemUnread: {
    backgroundColor: theme.primary + '03',
  },
  avatarContainer: { marginRight: 15, position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentWrapper: { flex: 1, paddingRight: 8 },
  contentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  senderName: { fontSize: 13, color: theme.textDim, letterSpacing: 0.5, fontWeight: '600' },
  dateText: { fontSize: 11, color: theme.textDim },
  subject: { fontSize: 15, color: theme.text, marginBottom: 2 },
  preview: { fontSize: 13, color: theme.textDim, lineHeight: 18 },
  boldText: { fontWeight: '800', color: theme.text },

  emptyContainer: { alignItems: 'center', marginTop: 120, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 20 },
  emptyText: { fontSize: 14, color: theme.textDim, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 },

  // Detail Modal style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  readingPane: {
    backgroundColor: theme.card,
    height: '92%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  paneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closePaneBtn: { padding: 5 },
  paneActions: { flexDirection: 'row', gap: 15 },
  paneActionBtn: { padding: 8, backgroundColor: theme.error + '10', borderRadius: 10 },

  paneContent: { padding: 25 },
  paneSubject: { fontSize: 24, fontWeight: '900', color: theme.text, marginBottom: 25, lineHeight: 32 },
  senderInfo: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: theme.primary, fontWeight: '900', fontSize: 18 },
  senderFull: { fontSize: 15, fontWeight: '800', color: theme.text },
  senderMeta: { fontSize: 12, color: theme.textDim, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },
  messageBody: { fontSize: 16, color: theme.text, lineHeight: 26, letterSpacing: 0.3 },

  paneFooter: { padding: 20, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card },
  primaryActionBtn: { backgroundColor: theme.primary, height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});

export default Notifications;
