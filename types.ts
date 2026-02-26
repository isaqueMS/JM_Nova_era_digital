
export interface Plan {
  id: number;
  name: string;
  value: string;
}

export interface Server {
  id: number;
  name: string;
  hash_server: string;
}

export interface Customer {
  id: number;
  server_id: number;
  plan_id: number;
  full_name: string;
  login: string;
  email: string;
  authentication_type: string;
  person_type: string;
  cpf_cnpj: string;
  due_day: number;
  phone_number: string;
  cell_phone_number_1: string;
  financial_status: string;
  status: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  zip_code?: string;
  ip_pppoe?: string;
  plan?: Plan;
}

export interface Invoice {
  id: string;
  customer_id: string; // Vínculo necessário para download autenticado
  gateway_id?: string;
  type?: 'billing' | 'card';
  value: string;
  vencimento: string;
  status: string;
  pix_copia_cola?: string;
  linha_digitavel?: string;
  competencia?: string;
  link_boleto?: string;
  form_payment?: string;
  is_efi?: boolean;
}

export interface ConnectionHistory {
  id: number;
  start_date: string;
  end_date: string;
  duration: string;
  upload: string;
  download: string;
  ip: string;
  mac: string;
}


export interface Ticket {
  id: number;
  customer_id?: number;
  customer_name?: string;
  priority: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface AppNotification {
  id: string | number;
  title: string;
  description: string;
  type: 'invoice' | 'system' | 'alert';
  date: string;
  isRead: boolean;
}
export interface MikrotikDetails {
  status: 'Online' | 'Offline' | 'Bloqueado' | 'Pendente' | 'Inativo' | 'Sem Cadastro';
  ip?: string;
  mac?: string;
  uptime?: string;
  signal?: string;
  onu_status?: string;
  tx_rate?: string;
  rx_rate?: string;
}
