# Instruções de Segurança e Deploy (GitHub)

Para manter este projeto seguro ao subir no GitHub, as chaves de API foram removidas do código-fonte e movidas para variáveis de ambiente.

## Configuração para GitHub Pages / Vercel / Netlify

Se você for gerar uma URL pública usando GitHub Actions ou outras plataformas, você deve configurar as seguintes **Secrets** no seu repositório:

1. Vá em: `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
2. Adicione as seguintes chaves:
   - `EXPO_PUBLIC_GEMINI_API_KEY`: Sua chave Gemini AI.
   - `EXPO_PUBLIC_MIKWEB_TOKEN`: Seu token da MikWeb.
   - `EXPO_PUBLIC_EFI_CLIENT_ID`: Seu Client ID do Efí/Gerencianet.
   - `EXPO_PUBLIC_EFI_CLIENT_SECRET`: Seu Client Secret do Efí/Gerencianet.

## Desenvolvimento Local
O arquivo `.env` já está configurado na sua máquina e ele **NÃO** será enviado ao GitHub (está no `.gitignore`). Se precisar configurar em outro lugar:
1. Copie `.env.example` para `.env`.
2. Preencha as chaves reais.

## Nota sobre Segurança Web
Lembre-se que por ser uma aplicação **Frontend (Client-side)**, as chaves de API configuradas no build estarão presentes no código JavaScript baixado pelo navegador. Para segurança máxima em produção, o ideal é usar um servidor backend (Proxy) para realizar estas chamadas, mas o uso de `.env` é o primeiro e essencial passo para não expor suas chaves no histórico do Git.
