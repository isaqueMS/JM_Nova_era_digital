
/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA)
 * Lida com strings ISO, YYYY-MM-DD e objetos Date.
 * Evita problemas de fuso horário ao lidar com strings YYYY-MM-DD.
 */
export const formatDateBR = (dateInput: any): string => {
    if (!dateInput) return "---";
    const str = String(dateInput).trim();
    if (str === 'null' || str === 'undefined' || !str) return "---";

    // Caso 1: Já está no formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str.substring(0, 10);

    // Caso 2: Formato YYYY-MM-DD (Evita erro de fuso horário)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const parts = str.split('T')[0].split(' ')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }

    // Caso 3: Objeto Date ou ISO String
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            // Usamos UTC para evitar que a data mude dependendo do fuso horário local
            // se a entrada for apenas YYYY-MM-DD
            const day = d.getUTCDate().toString().padStart(2, '0');
            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        }
    } catch (e) { }

    return str;
};

/**
 * Converte uma string de data (DD/MM/AAAA ou YYYY-MM-DD) para um objeto Date
 * Útil para ordenação.
 */
export const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    const str = String(dateInput).trim();

    // DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d);
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y, m, d] = str.split('T')[0].split(' ')[0].split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

// DESIGN SYSTEM - JM NOVA ERA DIGITAL
export const lightTheme = {
    primary: '#003399',
    secondary: '#22c55e',
    background: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textDim: '#64748b',
    border: '#f1f5f9',
    accent: '#38bdf8',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    shadow: '#00000010'
};

export const techTheme = {
    primary: '#003399', // Standard App Blue
    secondary: '#38bdf8', // App Accent Blue
    background: '#010409', // Github Dark Black
    card: '#0d1117', // Dark Slate
    text: '#f0f6fc',
    textDim: '#8b949e',
    border: '#30363d',
    accent: '#2f81f7',
    error: '#f85149',
    success: '#3fb950',
    warning: '#d29922',
    shadow: '#000000bb'
};

export type Theme = typeof lightTheme;
