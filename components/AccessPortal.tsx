
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

// Helper de Armazenamento para Ambiente Web/Mobile
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try { await SecureStore.setItemAsync(key, value); } catch { }
  }
};


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
      const savedDoc = await storage.getItem('user_document');
      if (savedDoc) setHasBiometricData(true);
    } catch (e) {
      console.warn('Erro ao verificar dados salvos:', e);
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
        const savedDoc = await storage.getItem('user_document');
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
    <SafeAreaView style={styles.outerContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.card, { opacity: 1 }]}>
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>JM</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>NOVA ERA</Text>
                <Text style={styles.brandSub}>INTERNET DIGITAL</Text>
              </View>
            </View>

            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>Bem-vindo</Text>
              <Text style={styles.welcomeSub}>Acesse sua conta para gerenciar seu plano</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>CPF OU CNPJ</Text>
              <View style={styles.inputContainer}>
                <Fingerprint color="#003399" size={20} style={styles.inputIcon} />
                <TextInput
                  placeholder="000.000.000-00"
                  placeholderTextColor="rgba(0, 51, 153, 0.3)"
                  style={styles.input}
                  value={doc}
                  onChangeText={setDoc}
                  keyboardType="numeric"
                />
              </View>
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
                    <Text style={styles.buttonText}>CONECTAR AGORA</Text>
                    <Lock color="#ffffff" size={16} />
                  </View>
                )}
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
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
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SUPORTE PRIORITÁRIO</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footerLinks}>
              <Text style={styles.biometricHint}>
                Acesso seguro criptografado ponta-a-ponta
              </Text>
            </View>
          </Animated.View>

          <Text style={styles.footer}>JM NOVA ERA DIGITAL • V2.5 WEB PREMIUM</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#001a4d',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 40,
    padding: 35,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 40,
  },
  logoBadge: {
    width: 60,
    height: 60,
    backgroundColor: '#003399',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#003399',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
  },
  welcomeBox: {
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 5,
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#003399',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 18,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    height: 60,
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 65,
    backgroundColor: '#003399',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#003399',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  biometricBtn: {
    width: 65,
    height: 65,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 35,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff1f2',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  footerLinks: {
    alignItems: 'center',
  },
  biometricHint: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginTop: 40,
    fontWeight: '800',
    letterSpacing: 1,
  },
});


export default AccessPortal;
