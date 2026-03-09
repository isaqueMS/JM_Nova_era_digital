const EFI_CLIENT_ID = process.env.EXPO_PUBLIC_EFI_CLIENT_ID || '';
const EFI_CLIENT_SECRET = process.env.EXPO_PUBLIC_EFI_CLIENT_SECRET || '';
const BASE_URL = 'https://api.sejaefi.com.br/v1';

function encodeBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed.");
    }
    block = block << 8 | charCode;
  }
  return output;
}

export interface EfiBoletoData {
  link: string;
  barcode: string;
  pdf?: string;
  status: string;
}

export class EfiService {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  private static async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) return this.accessToken;

    try {
      const credentials = encodeBase64(`${EFI_CLIENT_ID}:${EFI_CLIENT_SECRET}`);
      const response = await fetch(`${BASE_URL}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grant_type: 'client_credentials' })
      });

      if (!response.ok) return null;
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch { return null; }
  }

  static async getBoletoData(chargeId: string): Promise<EfiBoletoData | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      // Importante: A API do Efí v1 usa o endpoint /charge/:id
      const response = await fetch(`${BASE_URL}/charge/${chargeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return null;
      const result = await response.json();
      const charge = result.data;

      if (charge && charge.payment) {
        return {
          link: charge.payment.link || '',
          barcode: charge.payment.barcode || '',
          pdf: charge.payment.pdf?.charge || charge.payment.link,
          status: charge.status
        };
      }
      return null;
    } catch { return null; }
  }

  static async getPixCode(chargeId: string): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${BASE_URL}/charge/${chargeId}/pix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data.qrcode || result.data.pix_copia_e_cola || null;
    } catch { return null; }
  }
}
