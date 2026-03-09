import { Customer, Invoice, Ticket, ConnectionHistory, MikrotikDetails, AppNotification } from '../types';
import { parseDate, TECHNICIAN_IDS } from '../utils';

/**
 * MIKWEB API SERVICE v1 - JM NOVA ERA DIGITAL
 */
const BASE_URL = 'https://api.mikweb.com.br/v1';
export const MIKWEB_TOKEN = process.env.EXPO_PUBLIC_MIKWEB_TOKEN || '';

export class MikWebService {


  static getHeaders() {
    const token = process.env.EXPO_PUBLIC_MIKWEB_TOKEN || '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }


  /**
   * Envia um comando para o MikroTik através da Bridge Local Node.js (Proxy mk-bridge.js)
   */
  static async sendMikrotikCommand(creds: { host: string, port: string, user: string, pass: string }, command: string): Promise<string> {
    try {
      // Usando o nosso servidor local (Proxy) pois a API MikWeb removeu este endpoint
      const response = await fetch(`http://192.168.101.6:3001/bridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          host: creds.host,
          port: creds.port,
          user: creds.user,
          password: creds.pass,
          command: command
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return `ERRO BRIDGE (${response.status}): ${errorData.error || 'Falha na comunicação com Proxy Local'}`;
      }

      const result = await response.json();
      return result.output || result.data || JSON.stringify(result, null, 2);
    } catch (e) {
      console.error("Erro na bridge MikroTik Proxy:", e);
      return "ERRO CRÍTICO: Bridge Local (Proxy da Porta 3001) inacessível. Certifique-se de estar rodando 'node mk-bridge.js'.";
    }
  }

  /**
   * Busca o ID do login PPPoE de um cliente (via /admin/logins?customer_id=...)
   */
  static async getCustomerLoginId(customerId: number, email?: string): Promise<number | null> {
    try {
      // 1. Tenta buscar pelo ID do cliente (Removido per_page=1 pois quebra a API em alguns casos)
      const response = await fetch(`${BASE_URL}/admin/logins?customer_id=${customerId}`, {
        headers: this.getHeaders()
      });
      if (response.ok) {
        const result = await response.json();
        const logins = result.logins || result.data || [];
        if (logins.length > 0) return logins[0].id;
      }

      // 2. Se falhar e tiver e-mail, tenta buscar pelo e-mail (Login PPPoE as Email)
      if (email && email.trim()) {
        const respEmail = await fetch(`${BASE_URL}/admin/logins?login=${encodeURIComponent(email.trim())}`, {
          headers: this.getHeaders()
        });
        if (respEmail.ok) {
          const res = await respEmail.json();
          const loginsEmail = res.logins || res.data || [];
          // Filtra para garantir que o login pertença ao cliente ou seja o único exato
          const match = loginsEmail.find((l: any) => l.customer_id === customerId || l.login === email);
          if (match) return match.id;
          if (loginsEmail.length === 1) return loginsEmail[0].id;
        }
      }

      return null;
    } catch (e) {
      console.warn("[MikWeb] Erro ao buscar login por ID/Email:", e);
      return null;
    }
  }

  /**
   * Busca o status de rede de um cliente pela API MikWeb (/admin/logins/{loginId})
   * Retorna dados como IP, status de acesso, ONU serial, plano, etc.
   */
  static async getMikrotikDiagnostics(
    _creds: { host: string, port: string, user: string, pass: string },
    loginOrId: string | number
  ): Promise<MikrotikDetails & { raw?: string }> {
    try {
      let loginId: number | null = null;
      let loginData: any = null;

      // 1. Obter dados básicos do Login
      if (typeof loginOrId === 'number') {
        loginId = loginOrId;
      } else {
        const resp = await fetch(`${BASE_URL}/admin/logins?login=${encodeURIComponent(loginOrId)}&per_page=1`, {
          headers: this.getHeaders()
        });
        if (resp.ok) {
          const result = await resp.json();
          const logins = result.logins || result.data || [];
          if (logins.length > 0) loginId = logins[0].id;
        }
      }

      if (!loginId) return { status: 'Offline' };

      const response = await fetch(`${BASE_URL}/admin/logins/${loginId}`, {
        headers: this.getHeaders()
      });
      if (!response.ok) return { status: 'Offline' };

      const loginResult = await response.json();
      loginData = loginResult.login || loginResult;

      // 2. Tentar obter dados detalhados da ONU se houver ID vinculado
      let onuData: any = null;
      const onuId = loginData.onu?.id || loginData.onu_id || (Array.isArray(loginData.onu_ids) ? loginData.onu_ids[0] : null) || loginResult.onu?.id;

      if (onuId) {
        try {
          const onuResp = await fetch(`${BASE_URL}/admin/onus/${onuId}`, {
            headers: this.getHeaders()
          });
          if (onuResp.ok) {
            const onuResult = await onuResp.json();
            onuData = onuResult.onu || onuResult;
          }
        } catch (e) {
          console.warn("[MikWeb] Erro ao buscar dados da ONU:", e);
        }
      }

      const statusMap: Record<string, string> = {
        'access_active': 'Online',
        'access_blocked': 'Bloqueado',
        'access_pending': 'Pendente',
        'access_unavailable': 'Inativo'
      };

      const accessStatus = loginData.access_status || 'access_unavailable';

      // Mapeamento final com fallback para campos comuns
      const finalStatus = onuData?.connection_status || statusMap[accessStatus] || (loginData.status === 'active' ? 'Online' : 'Offline');

      return {
        status: (finalStatus === 'access_active' ? 'Online' : finalStatus) as MikrotikDetails['status'],
        ip: loginData.ip || loginData.ip_pppoe || 'N/D',
        mac: onuData?.serial_number || loginData.mac || (loginData.onu?.serial_number || 'N/D'),
        uptime: loginData.updated_at ? `Sincronismo: ${new Date(loginData.updated_at).toLocaleTimeString('pt-BR')}` : 'N/D',
        signal: (onuData?.tx_signal || onuData?.rx_signal) ? `${onuData.tx_signal || onuData.rx_signal} dBm (${onuData.tx_signal_quality || 'OK'})` : 'N/D',
        onu_status: onuData?.device_model ? `${onuData.device_model} [Porta ${onuData.pon_key || 'N/D'}]` : (loginData.server?.name || 'N/D'),
        tx_rate: (loginData.plan?.name || (loginData.plan_name || 'N/D')),
        rx_rate: loginData.authentication_type?.toUpperCase() || 'PPPoE',
        raw: JSON.stringify({
          login: loginData,
          onu: onuData,
          debug_info: { onuId, accessStatus }
        }, null, 2)
      };
    } catch (e) {
      console.error('[MikWeb] getMikrotikDiagnostics error:', e);
      return {
        status: 'Offline',
        raw: JSON.stringify({ error: String(e) })
      };
    }
  }

  /**
   * Desconecta um cliente pelo ID do cliente (POST /admin/customers/{id}/logout)
   */
  static async disconnectClient(
    _creds: { host: string, port: string, user: string, pass: string },
    loginOrCustomerId: string | number
  ): Promise<boolean> {
    try {
      // Tenta desconectar via customer logout endpoint da MikWeb
      // Se loginOrCustomerId é um login string, primeiro busca o customer_id via /admin/logins
      let customerId: number | null = null;

      if (typeof loginOrCustomerId === 'number') {
        customerId = loginOrCustomerId;
      } else {
        // Busca customer_id pelo login string
        const resp = await fetch(`${BASE_URL}/admin/logins?login=${encodeURIComponent(loginOrCustomerId)}&per_page=1`, {
          headers: this.getHeaders()
        });
        if (resp.ok) {
          const result = await resp.json();
          const logins = result.logins || result.data || [];
          if (logins.length > 0) customerId = logins[0].customer_id;
        }
      }

      if (!customerId) return false;

      const response = await fetch(`${BASE_URL}/admin/customers/${customerId}/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  }

  static async authenticateByCPF(cpfCnpj: string): Promise<Customer | null> {
    const cleanQuery = cpfCnpj.replace(/\D/g, '');
    if (TECHNICIAN_IDS.includes(cleanQuery)) return this.getMockCustomer(cleanQuery);

    try {
      const response = await fetch(`${BASE_URL}/admin/customers?search=${cleanQuery}`, {
        headers: this.getHeaders()
      });
      if (!response.ok) return null;
      const result = await response.json();

      let customers: any[] = [];
      if (Array.isArray(result)) customers = result;
      else if (result.customers) {
        customers = Array.isArray(result.customers) ? result.customers : (result.customers.data || []);
      } else if (result.data) {
        customers = Array.isArray(result.data) ? result.data : (result.data.data || []);
      }

      return customers.find((c: any) => String(c.cpf_cnpj || '').replace(/\D/g, '') === cleanQuery) || null;
    } catch (e) {
      console.error("Erro authenticateByCPF:", e);
      return null;
    }
  }

  static async getCustomerPPPoELogin(customerId: number): Promise<string | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/customers/${customerId}`, {
        headers: this.getHeaders()
      });
      if (!response.ok) return null;
      const result = await response.json();

      const customer = result.customer || result;
      if (customer.logins && customer.logins.length > 0) {
        return customer.logins[0].login;
      }
      return customer.login || null;
    } catch (e) {
      console.error("Erro ao buscar login PPPoE:", e);
      return null;
    }
  }

  static async getAllCustomers(search?: string): Promise<Customer[]> {
    try {
      const url = search
        ? `${BASE_URL}/admin/customers?search=${encodeURIComponent(search)}&per_page=100`
        : `${BASE_URL}/admin/customers?per_page=500`;
      const response = await fetch(url, {
        headers: this.getHeaders()
      });
      if (!response.ok) return [];
      const result = await response.json();

      console.log("[MikWeb] Clientes recebidos (chaves):", Object.keys(result));

      let list: any[] = [];
      if (Array.isArray(result)) list = result;
      else if (result.customers) {
        list = Array.isArray(result.customers) ? result.customers : (result.customers.data || []);
      } else if (result.data) {
        list = Array.isArray(result.data) ? result.data : (result.data.data || []);
      }

      console.log("[MikWeb] Total de clientes processados:", list.length);

      // Mapeamento para garantir compatibilidade com a interface Customer do App
      return list.map((c: any) => ({
        ...c,
        id: c.id,
        full_name: c.full_name || c.name || 'N/D',
        email: c.email || '',
        login: c.login || (c.logins && c.logins.length > 0 ? c.logins[0].login : ''),
        status: c.status || 'Ativo',
        financial_status: c.financial_status || 'Normal',
        due_day: c.due_day || 10,
        plan: c.plan || (c.logins && c.logins[0]?.plan ? c.logins[0].plan : { name: 'Padrão', value: '0.00' })
      }));
    } catch (e) {
      console.error("[MikWeb] Erro ao buscar clientes:", e);
      return [];
    }
  }

  static async sendNotification(customerId: number, title: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/admin/calledies`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          customer_id: customerId,
          subject: title.startsWith('[') ? title : `[AVISO] ${title}`,
          description: message,
          message: message,
          status: 'novo', // Opcional, dependendo da API
          priority: 'B' // Baixa prioridade
        })
      });
      return response.ok || response.status === 201;
    } catch { return false; }
  }

  static async getInvoices(customerId: number): Promise<Invoice[]> {
    if (customerId === 2) return this.getMockInvoices();

    try {
      const [billingsRes, cardsRes] = await Promise.all([
        fetch(`${BASE_URL}/admin/billings?customer_id=${customerId}&per_page=100`, { headers: this.getHeaders() }),
        fetch(`${BASE_URL}/admin/payment_cards?customer_id=${customerId}`, { headers: this.getHeaders() })
      ]);

      const billingsData = billingsRes.ok ? await billingsRes.json() : { data: [] };
      const cardsData = cardsRes.ok ? await cardsRes.json() : { data: [] };

      const rawBillings = billingsData.data || billingsData.billings || [];
      const rawCards = cardsData.data || cardsData.payment_cards || [];

      const isGatewayEfi = (g: string) => ['gn', 'cgn', 'gn_v1', 'bf'].includes(g);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isOverdue = (dateStr: string) => {
        if (!dateStr) return false;
        try {
          const dueDate = parseDate(dateStr);
          if (!dueDate) return false;
          // Zera horas para comparação justa
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
        } catch { return false; }
      };

      // Filtra boletos (billings)
      const billings = rawBillings
        .filter((b: any) => {
          const sitId = Number(b.situation_id);
          const sitLabel = String(b.situation_label || b.status_label || b.situation_name || b.situation?.name || '').toLowerCase();
          const canceled = sitId === 4 || b.canceled_at || sitLabel.includes('cancela');
          return !canceled;
        })
        .map((b: any) => {
          const link = b.pdf || b.link_boleto || b.link || b.integration_link || '';
          const vencimento = b.due_day || b.data_vencimento || b.due_date || '';

          // Status: P (Pago), V (Vencido), A (Aberto/Pendente)
          let status = 'A';
          const sitId = Number(b.situation_id);
          const sitLabel = String(b.situation_label || b.status_label || b.situation_name || b.situation?.name || '').toLowerCase();

          // MikWeb: 3=Pago/Efetuado, 5=Liquidado/Baixado. 
          // Checa também valor pago, labels e datas.
          const isPaid = sitId === 3 ||
            sitId === 5 ||
            (b.value_paid && Number(b.value_paid) > 0) ||
            b.paid_at ||
            b.date_payment ||
            b.payment_date ||
            sitLabel.includes('pago') ||
            sitLabel.includes('liquida') ||
            sitLabel.includes('efetuado');

          if (isPaid) {
            status = 'P';
          } else if (sitId === 2 || isOverdue(vencimento)) {
            status = 'V';
          }

          const isEfi = isGatewayEfi(String(b.gateway)) || link.includes('sejaefi') || link.includes('gerencianet');

          return {
            id: String(b.id),
            customer_id: String(customerId),
            gateway_id: String(b.gateway_id || b.id),
            type: 'billing',
            value: String(b.value || '0.00'),
            vencimento: vencimento,
            status: status,
            pix_copia_cola: b.pix_copy_paste || b.pix_copia_cola || '',
            linha_digitavel: b.digitable_line || b.linha_digitavel || '',
            competencia: b.reference || b.description || `FATURA #${b.id}`,
            link_boleto: link,
            form_payment: String(b.form_payment || ''),
            is_efi: isEfi
          };
        });

      // Filtra parcelas do cartão (cards)
      const cards = rawCards
        .filter((c: any) => {
          const sitId = Number(c.situation_id);
          const sitLabel = String(c.situation_label || c.status_label || c.situation_name || c.situation?.name || '').toLowerCase();
          const canceled = sitId === 4 || c.canceled_at || sitLabel.includes('cancela');
          return !canceled;
        })
        .map((c: any) => {
          const vencimento = c.first_installment_date || c.due_date || '';

          let status = 'A';
          const sitId = Number(c.situation_id);
          const sitLabel = String(c.situation_label || c.status_label || c.situation_name || c.situation?.name || '').toLowerCase();

          // MikWeb Cards: 'C' geralmente é Confirmado/Pago, 'P' Pago. 'L' Liquidado.
          const isPaid = sitId === 3 ||
            sitId === 5 ||
            (c.value_paid && Number(c.value_paid) > 0) ||
            c.status === 'P' ||
            c.status === 'L' ||
            c.status === 'C' ||
            c.paid_at ||
            c.date_payment ||
            c.payment_date ||
            sitLabel.includes('pago') ||
            sitLabel.includes('liquida') ||
            sitLabel.includes('efetuado');

          if (isPaid) {
            status = 'P';
          } else if (sitId === 2 || isOverdue(vencimento)) {
            status = 'V';
          }

          return {
            id: String(c.id),
            customer_id: String(customerId),
            gateway_id: String(c.id),
            type: 'card',
            value: String(c.value || '0.00'),
            vencimento: vencimento,
            status: status,
            competencia: `CARNÊ #${c.id}`,
            link_boleto: c.link || c.integration_link || '',
            form_payment: String(c.form_payment || ''),
            is_efi: false
          };
        });

      // Ordena: pendentes primeiro (mais RECENTE no topo), depois pagas (mais RECENTE no topo)
      return [...billings, ...cards].sort((a, b) => {
        const aIsPaid = a.status === 'P';
        const bIsPaid = b.status === 'P';
        // Pendentes sempre antes das pagas
        if (aIsPaid !== bIsPaid) return aIsPaid ? 1 : -1;
        // Dentro do mesmo grupo: mais recente (data maior) no topo
        const parseVenc = (v: string) => {
          if (!v) return 0;
          const parts = v.split('T')[0].split('-');
          if (parts.length === 3 && parts[0].length === 4) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
          }
          return new Date(v).getTime() || 0;
        };
        return parseVenc(a.vencimento) - parseVenc(b.vencimento);
      });
    } catch { return []; }
  }

  static async downloadBillet(billingId: string | number): Promise<Blob | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/billings/${billingId}/download?valid=true`, {
        headers: this.getHeaders()
      });
      if (!response.ok) return null;
      return await response.blob();
    } catch (e) {
      console.error('Erro no download do boleto:', e);
      return null;
    }
  }

  static async confirmBilletPayment(billingId: string | number, valuePaid: number): Promise<boolean> {
    try {
      // Data formato dd-MM-yyyy
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      const response = await fetch(`${BASE_URL}/admin/billings/${billingId}/confirm`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          value_paid: valuePaid,
          date_payment: dateStr
        })
      });
      return response.ok;
    } catch { return false; }
  }

  static async getTickets(customerId?: number): Promise<Ticket[]> {
    try {
      const url = customerId
        ? `${BASE_URL}/admin/calledies?customer_id=${customerId}&per_page=500`
        : `${BASE_URL}/admin/calledies?per_page=500`;
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();

      let tickets: any[] = [];
      if (Array.isArray(result)) tickets = result;
      else if (result.calledies) {
        tickets = Array.isArray(result.calledies) ? result.calledies : (result.calledies.data || []);
      } else if (result.data) {
        tickets = Array.isArray(result.data) ? result.data : (result.data.data || []);
      }

      return tickets.map((t: any) => ({
        id: t.id, customer_id: t.customer_id, customer_name: t.customer?.full_name || 'Cliente',
        priority: t.priority || 'M', subject: t.subject || 'Suporte', message: t.description || t.message || '',
        status: t.status_label || (t.status === 'aberto' ? 'Aberto' : t.status), created_at: t.created_at
      }));
    } catch { return []; }
  }

  static async createTicket(customerId: number, subject: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/admin/calledies`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          subject,
          description: message,
          message: message,
          customer_id: customerId,
          priority: 'M'
        })
      });
      return response.ok;
    } catch { return false; }
  }

  static async sendIndication(customerId: number, friendData: { name: string, phone: string, neighborhood: string }): Promise<boolean> {
    const body = `--- NOVA INDICAÇÃO PREMIUM ---\n` +
      `Indicado por: Cliente ID ${customerId}\n` +
      `Nome do Amigo: ${friendData.name}\n` +
      `WhatsApp: ${friendData.phone}\n` +
      `Bairro: ${friendData.neighborhood}\n` +
      `------------------------------`;

    return this.createTicket(customerId, "INDICAÇÃO DE CLIENTE", body);
  }

  static async requestPlanChange(customerId: number, plan: { title: string, speed: string, price: string }): Promise<boolean> {
    const body = `Solicitação de mudança de plano para: ${plan.title} (${plan.speed}MB) - R$ ${plan.price},00`;
    return this.createTicket(customerId, "SOLICITAÇÃO DE PLANO", body);
  }

  static async updateTicket(id: number, status: string, response: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/admin/calledies/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          status: status,
          response: response
        })
      });
      return res.ok;
    } catch { return false; }
  }

  static async getNotifications(customerId: number): Promise<AppNotification[]> {
    try {
      // Busca chamados do cliente para agir como notificações
      const response = await fetch(`${BASE_URL}/admin/calledies?customer_id=${customerId}`, { headers: this.getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();

      let tickets: any[] = [];
      if (Array.isArray(result)) tickets = result;
      else if (result.calledies) tickets = Array.isArray(result.calledies) ? result.calledies : (result.calledies.data || []);
      else if (result.data) tickets = Array.isArray(result.data) ? result.data : (result.data.data || []);

      // Filtra chamados que são identificados como "notificações/avisos" pelo sistema
      const notifTickets = tickets.filter((t: any) => {
        const title = (t.subject || '').toUpperCase();
        return title.includes('[AVISO]') || title.includes('COMUNICADO') || title.includes('[BROADCAST]');
      });

      return notifTickets.map((n: any) => ({
        id: String(n.id),
        title: n.subject.replace(/\[AVISO\]|\[BROADCAST\]|COMUNICADO/ig, '').trim() || 'Comunicado JM',
        description: n.description || n.message || 'Nova mensagem do provedor.',
        date: n.created_at,
        isRead: n.status?.toLowerCase().includes('conclu') || false,
        type: 'system'
      }));
    } catch { return []; }
  }

  static async deleteNotification(id: string | number): Promise<boolean> {
    try {
      // Remove o chamado do MikWeb permanentemente
      const response = await fetch(`${BASE_URL}/admin/calledies/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return response.ok || response.status === 204;
    } catch { return false; }
  }

  static async markNotificationRead(id: string | number): Promise<boolean> {
    try {
      // Atualiza o chamado no painel admin para um status concluído ou fechado
      const response = await fetch(`${BASE_URL}/admin/calledies/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: 3 })
      });
      return response.ok;
    } catch { return false; }
  }

  static async getConnectionHistory(
    customerId: number,
    loginName?: string,
    mktCreds?: { host: string, port: string, user: string, pass: string }
  ): Promise<ConnectionHistory[]> {
    try {
      // Se não temos as credenciais ou o login, não podemos buscar direto no MikroTik
      if (!loginName || !mktCreds) return [];

      const command = `/ppp/active/print where name="${loginName}"`;
      const responseStr = await this.sendMikrotikCommand(mktCreds, command);

      if (responseStr.includes('ERRO') || !responseStr) return [];

      const activeSessions = JSON.parse(responseStr);
      if (!activeSessions || activeSessions.length === 0) return [];

      const session = activeSessions[0];

      // Cria um registro histórico "falso" representando a sessão atual
      return [{
        id: new Date().getTime(),
        start_date: new Date().toISOString(), // Não temos a data de inicio exata vinda do uptime no formato ISO, usamos agora como ref
        end_date: 'Sessão Ativa',
        duration: session.uptime || '00:00:00',
        upload: 'N/A', // Upload/Download real vem no BandwidthUsage
        download: 'N/A',
        ip: session.address || 'N/D',
        mac: session['caller-id'] || 'N/D'
      }];
    } catch (e) {
      console.warn('[MikWeb] Erro ao buscar histórico (MikroTik):', e);
      return [];
    }
  }

  /**
   * GLOBAL GAME LEADERBOARD (TICKET-BASED)
   * Fetches all tickets, filters game records, and groups by user to avoid duplicates.
   */
  static async getGlobalLeaderboard(): Promise<{ name: string, score: number, rank: number }[]> {
    try {
      const response = await fetch(`${BASE_URL}/admin/calledies?per_page=500`, {
        headers: this.getHeaders()
      });
      if (!response.ok) return [];

      const result = await response.json();
      let tickets: any[] = [];
      if (Array.isArray(result)) tickets = result;
      else if (result.calledies) tickets = Array.isArray(result.calledies) ? result.calledies : (result.calledies.data || []);
      else if (result.data) tickets = Array.isArray(result.data) ? result.data : (result.data.data || []);

      const recordMap: Record<number, { name: string, score: number }> = {};

      tickets.forEach((t: any) => {
        const subject = (t.subject || '').toUpperCase();
        if (subject.includes('[GAME_RECORD]')) {
          const customerId = t.customer_id;
          const name = t.customer?.full_name || t.customer?.name || 'Jogador';

          // Extrai o score do assunto (Formato: [GAME_RECORD] SCORE: XXX)
          const scoreMatch = subject.match(/SCORE:\s*(\d+)/i);
          const scoreValue = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

          if (!recordMap[customerId] || scoreValue > recordMap[customerId].score) {
            recordMap[customerId] = { name, score: scoreValue };
          }
        }
      });

      // Converte o objeto para array, ordena e adiciona o rank
      return Object.values(recordMap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((player, idx) => ({
          rank: idx + 1,
          name: player.name,
          score: player.score
        }));
    } catch (e) {
      console.warn("[MikWeb] Erro ao buscar ranking real:", e);
      return [];
    }
  }

  /**
   * UPDATES CUSTOMER SCORE (VIA TICKET)
   * Creates a hidden game record ticket in MikWeb.
   */
  static async updateCustomerScore(customerId: number, score: number): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/admin/calledies`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          customer_id: customerId,
          subject: `[GAME_RECORD] SCORE: ${score}`,
          description: `Novo recorde alcançado no Conexão Turbo: ${score} Mbps`,
          message: `Score: ${score}`,
          priority: 'B' // Baixa prioridade
        })
      });
      return response.ok;
    } catch (e) {
      console.error("[MikWeb] Erro ao salvar score via ticket:", e);
      return false;
    }
  }


  private static getMockCustomer(cpfCnpj?: string): Customer {
    return {
      id: 2, server_id: 1, plan_id: 1, full_name: "DEMONSTRAÇÃO JM NOVA ERA", login: "demo",
      email: "contato@jmnovaera.com.br", authentication_type: "pppoe", person_type: "Física",
      cpf_cnpj: cpfCnpj || TECHNICIAN_IDS[0], due_day: 10, phone_number: "7199999999", cell_phone_number_1: "7199999999",
      financial_status: "L", status: "Ativo", address: "Rua Principal, 100", neighborhood: "Centro", city: "Salvador",
      zip_code: "40000000", ip_pppoe: "10.0.0.1", plan: { id: 1, name: "ULTRA FIBRA 500MB", value: "99.90" }
    };
  }

  private static getMockInvoices(): Invoice[] {
    return [
      { id: "101", customer_id: "2", gateway_id: "123456", value: "99.90", vencimento: new Date().toISOString(), status: 'A', competencia: "05/2024", is_efi: true },
    ];
  }
}
