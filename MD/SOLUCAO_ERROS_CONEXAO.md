# Solução para Erros de Conexão ERR_CONNECTION_REFUSED

## Problema Identificado

Os erros `ERR_CONNECTION_REFUSED` estavam ocorrendo porque:

1. **Backend Laravel não estava rodando** na porta 8000
2. **Arquivo .env ausente** no diretório raiz do projeto
3. **Configuração de ambiente** não estava sendo carregada corretamente

## Erros Encontrados

```
Failed to load resource: net::ERR_CONNECTION_REFUSED
:8000/api/aparencia/theme:1
:8000/api/empresa:1
:8000/api/me:1
:8000/api/login:1
```

## Solução Implementada

### 1. Criação do arquivo .env
```bash
cp .env.development .env
```

### 2. Inicialização do Backend Laravel
```bash
cd backend
php artisan serve --host=localhost --port=8000
```

### 3. Verificação da Conectividade
```bash
curl -I http://localhost:8000/api/me
# Resposta: HTTP/1.1 401 Unauthorized (backend funcionando)
```

## Script de Desenvolvimento

Foi criado o script `start-dev.sh` para facilitar o gerenciamento:

```bash
./start-dev.sh
```

Este script:
- ✅ Cria o arquivo .env se não existir
- ✅ Inicia o backend Laravel na porta 8000
- ✅ Inicia o frontend Vite na porta 5180
- ✅ Verifica se ambos os serviços estão funcionando
- ✅ Exibe URLs de acesso

## Configurações de Ambiente

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME="Jet Impre"
VITE_APP_ENV=development
VITE_APP_DEBUG=true
```

### Backend (backend/.env)
```env
APP_URL=http://localhost:8000
APP_DEBUG=true
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=jetimpre
```

## URLs de Acesso

- **Frontend**: http://localhost:5180
- **Backend**: http://localhost:8000
- **API**: http://localhost:8000/api/

## Comandos Úteis

### Iniciar desenvolvimento
```bash
./start-dev.sh
```

### Parar servidores
```bash
pkill -f 'php artisan serve'
pkill -f 'npm run dev'
```

### Verificar status
```bash
curl -I http://localhost:8000/api/me
curl -I http://localhost:5180
```

## Status Atual

✅ Backend Laravel rodando na porta 8000  
✅ Frontend Vite rodando na porta 5180  
✅ Configurações de ambiente corretas  
✅ Conectividade entre frontend e backend estabelecida  

Os erros de conexão foram resolvidos e o ambiente de desenvolvimento está funcionando corretamente.

