
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Customer } from '../types';
import { User, MapPin, Mail, Phone, Fingerprint, ShieldCheck, Edit3, Save, BarChart2 } from 'lucide-react-native';
import { Theme } from '../utils';
import Statistics from './Statistics';

const Profile: React.FC<{ customer: Customer, theme: Theme }> = ({ customer, theme }) => {
  const styles = createStyles(theme);
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.cell_phone_number_1);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false);
      Alert.alert("Sucesso", "Seus dados foram atualizados com sucesso.");
    }, 1200);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}><User size={35} color="#fff" /></View>
        <Text style={styles.name}>{customer.full_name}</Text>
        <Text style={styles.status}>CLIENTE JM NOVA ERA • #{customer.id}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>INFORMAÇÕES DE CONTATO</Text>
          <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
            {isEditing ? (
              saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Save size={18} color={theme.primary} />
            ) : <Edit3 size={18} color={theme.primary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <Fingerprint size={16} color={theme.primary} />
          <View>
            <Text style={styles.label}>CPF / CNPJ</Text>
            <Text style={styles.value}>{customer.cpf_cnpj}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Mail size={16} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>E-MAIL CADASTRADO</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            ) : <Text style={styles.value}>{email || 'Nenhum cadastrado'}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <Phone size={16} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>WHATSAPP / CELULAR</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : <Text style={styles.value}>{phone}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ENDEREÇO DE INSTALAÇÃO</Text>
        <View style={styles.row}>
          <MapPin size={16} color={theme.primary} />
          <View>
            <Text style={styles.label}>LOCALIZAÇÃO TÉCNICA</Text>
            <Text style={styles.value}>{customer.address}, {customer.neighborhood}</Text>
            <Text style={styles.value}>{customer.city} - {customer.zip_code}</Text>
          </View>
        </View>
      </View>

      <View style={styles.securityBox}>
        <ShieldCheck size={14} color={theme.success} />
        <Text style={styles.securityText}>DADOS PROTEGIDOS • JM NOVA ERA</Text>
      </View>

    </ScrollView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerCard: { alignItems: 'center', padding: 30, backgroundColor: theme.card, borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 10 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  name: { color: theme.text, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  status: { color: theme.primary, fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 0.5 },
  section: { backgroundColor: theme.card, padding: 25, borderRadius: 20, marginBottom: 15, elevation: 2, shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sectionTitle: { color: theme.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 15, marginBottom: 20, alignItems: 'center' },
  label: { color: theme.textDim, fontSize: 9, fontWeight: 'bold' },
  value: { color: theme.text, fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  input: { color: theme.text, fontSize: 13, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: theme.primary, paddingVertical: 4 },
  securityBox: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 30, opacity: 0.8 },
  securityText: { color: theme.textDim, fontSize: 9, fontWeight: 'bold' }
});

export default Profile;
