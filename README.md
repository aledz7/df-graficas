# Sistema Gráficas

Sistema de gestão para gráfica rápida desenvolvido com React + Vite no frontend e Laravel no backend.

## Configuração do Ambiente

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- PHP 8.1 ou superior
- Composer
- MySQL/PostgreSQL/SQLite

### Configuração do Ambiente de Desenvolvimento

1. **Clonar o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd jet-impre
   ```

2. **Instalar dependências do frontend**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   # Para desenvolvimento
   npm run setup:dev
   
   # Para produção
   npm run setup:prod
   ```

4. **Iniciar o servidor de desenvolvimento**
   ```bash
   # Modo desenvolvimento
   npm run dev
   
   # Ou com hot-reload para desenvolvimento
   npm start
   ```

### Configuração do Backend (Laravel)

1. **Acessar a pasta do backend**
   ```bash
   cd backend
   ```

2. **Instalar dependências do PHP**
   ```bash
   composer install
   ```

3. **Configurar o arquivo .env**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Configurar o banco de dados**
   - Criar um banco de dados
   - Atualizar as configurações no arquivo `.env`
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=jet_impre
   DB_USERNAME=seu_usuario
   DB_PASSWORD=sua_senha
   ```

5. **Executar migrações**
   ```bash
   php artisan migrate --seed
   ```

6. **Iniciar o servidor Laravel**
   ```bash
   php artisan serve
   ```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run dev:prod` - Inicia o servidor em modo produção
- `npm run build` - Gera os arquivos para produção
- `npm run preview` - Pré-visualiza a build de produção
- `npm run setup:dev` - Configura o ambiente de desenvolvimento
- `npm run setup:prod` - Configura o ambiente de produção
- `npm start` - Configura e inicia o ambiente de desenvolvimento
- `npm run start:prod` - Configura e inicia o ambiente de produção

## Variáveis de Ambiente

O projeto utiliza as seguintes variáveis de ambiente:

- `VITE_API_URL` - URL base da API do Laravel
- `VITE_APP_NAME` - Nome da aplicação
- `VITE_APP_ENV` - Ambiente da aplicação (development, production)
- `VITE_APP_DEBUG` - Modo de depuração
- `VITE_APP_URL` - URL da aplicação frontend
- `VITE_BACKEND_URL` - URL do backend
- `VITE_BACKEND_API_PREFIX` - Prefixo da API (padrão: /api)
- `VITE_APP_FEATURE_REGISTRATION` - Habilita/desabilita registro de usuários
- `VITE_APP_FEATURE_EMAIL_VERIFICATION` - Habilita/desabilita verificação de e-mail

## Estrutura do Projeto

- `/src` - Código-fonte do frontend
  - `/assets` - Recursos estáticos (imagens, fontes, etc.)
  - `/components` - Componentes reutilizáveis
  - `/contexts` - Contextos React (Auth, Theme, etc.)
  - `/hooks` - Custom Hooks
  - `/lib` - Utilitários e funções auxiliares
  - `/pages` - Páginas da aplicação
  - `/routes` - Configuração de rotas
  - `/services` - Serviços (API, autenticação, etc.)
  - `/styles` - Estilos globais
  - `/types` - Definições de tipos TypeScript
- `/public` - Arquivos públicos
- `/backend` - Código-fonte do Laravel

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça o push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
