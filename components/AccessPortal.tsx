
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Lock, Fingerprint, ShieldAlert } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface AccessPortalProps {
  onSearch: (query: string) => Promise<void>;
  error?: string;
}

const AccessPortal: React.FC<AccessPortalProps> = ({ onSearch, error }) => {
  const [doc, setDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasBiometricData, setHasBiometricData] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    checkBiometrics();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const checkBiometrics = async () => {
    try {
      const savedDoc = await SecureStore.getItemAsync('user_document');
      if (savedDoc) setHasBiometricData(true);
    } catch (e) {
      console.warn('Erro SecureStore:', e);
    }
  };

  const handleSubmit = async () => {
    if (doc.length < 11 && doc !== 'admin') return;
    setIsLoading(true);
    await onSearch(doc);
    setIsLoading(false);
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert("Biometria Indisponível", "Seu dispositivo não possui biometria cadastrada.");
        return;
      }

      if (!hasBiometricData) {
        Alert.alert("Atenção", "Faça o primeiro login com seu CPF para ativar a biometria.");
        return;
      }

      setIsBiometricLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação JM Nova Era',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const savedDoc = await SecureStore.getItemAsync('user_document');
        if (savedDoc) {
          await onSearch(savedDoc);
        }
      } else {
        Alert.alert("Falha", "Autenticação biométrica falhou.");
      }
    } catch (e) {
      Alert.alert("Erro", "Falha ao acessar o hardware de biometria.");
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#003399' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>JM</Text>
              <Text style={styles.logoSub}>NOVA ERA</Text>
              <View style={styles.logoLine} />
              <Text style={styles.logoSmall}>DIGITAL • INTERNET FIBRA</Text>
            </View>

            <Text style={styles.subtitle}>PAINEL DE ACESSO SEGURO</Text>

            <View style={styles.inputContainer}>
              <Fingerprint color="#003399" size={20} style={styles.inputIcon} />
              <TextInput
                placeholder="CPF ou CNPJ do Titular"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={doc}
                onChangeText={setDoc}
                keyboardType="numeric"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <ShieldAlert color="#ef4444" size={16} />
                <Text style={styles.errorText}>Acesso não autorizado ou falha na rede.</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.button, (doc.length < 11 && doc !== 'admin') && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading || isBiometricLoading || (doc.length < 11 && doc !== 'admin')}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Lock color="#ffffff" size={18} />
                    <Text style={styles.buttonText}>ENTRAR</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.biometricBtn, !hasBiometricData && { opacity: 0.4 }]}
                  onPress={handleBiometricLogin}
                  disabled={isLoading || isBiometricLoading}
                >
                  {isBiometricLoading ? (
                    <ActivityIndicator color="#003399" />
                  ) : (
                    <Fingerprint color={hasBiometricData ? "#003399" : "#94a3b8"} size={28} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footerLinks}>


              <Text style={styles.biometricHint}>
                {hasBiometricData
                  ? "Autentique com Biometria ou FaceID para acessar"
                  : "Cadastre sua biometria após o primeiro login"}
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>JM NOVA ERA DIGITAL • TECNOLOGIA SHEIK_CELULAR v2.2</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#003399',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#003399',
    padding: 15,
    borderRadius: 20,
    width: '100%'
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  logoSub: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: -5 },
  logoLine: { height: 2, width: 50, backgroundColor: '#fff', marginVertical: 4 },
  logoSmall: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
  subtitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 30,
    letterSpacing: 2,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 60, color: '#1e293b', fontSize: 16, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  button: {
    flex: 1,
    height: 65,
    backgroundColor: '#003399',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  biometricBtn: {
    width: 65,
    height: 65,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  errorText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
  footerLinks: {
    marginTop: 25,
    alignItems: 'center',
    gap: 15
  },
  demoLink: { padding: 5 },
  demoText: { color: '#003399', fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  biometricHint: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  footer: { color: '#ffffff', fontSize: 8, marginTop: 40, fontWeight: 'bold', opacity: 0.8, letterSpacing: 2 }
});

export default AccessPortal;
