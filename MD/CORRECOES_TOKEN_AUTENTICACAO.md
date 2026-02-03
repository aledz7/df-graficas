# Correções de Autenticação - Dashboard Sistema Gráficas

## 🔍 **Problema Identificado**

O dashboard estava retornando erro 401 (Unauthenticated) ao tentar carregar produtos e envelopamentos da API, mesmo com o usuário autenticado.

**Erro específico**:
```json
{
    "message": "Unauthenticated.",
    "error": "Token de autenticação necessário. Faça login para acessar este recurso."
}
```

## 🔧 **Causa do Problema**

O problema estava no uso de `fetch()` diretamente em vez do serviço `api` configurado:

### ❌ **Código Problemático (Antes)**:
```javascript
// Carregar produtos da API
const response = await fetch('/api/produtos');
if (response.ok) {
  const produtosData = await response.json();
  produtos = produtosData.data || produtosData || [];
}
```

### ✅ **Código Corrigido (Depois)**:
```javascript
// Carregar produtos da API
const response = await api.get('/api/produtos');
produtos = response.data?.data || response.data || [];
```

## 🛠️ **Correções Implementadas**

### 1. **DashboardPage.jsx**
- ✅ Adicionado import do `api` service
- ✅ Substituído `fetch('/api/produtos')` por `api.get('/api/produtos')`
- ✅ Substituído `fetch('/api/envelopamentos')` por `api.get('/api/envelopamentos')`

### 2. **ProductionFeed.jsx**
- ✅ Adicionado import do `api` service
- ✅ Substituído `fetch('/api/envelopamentos')` por `api.get('/api/envelopamentos')`

## 🔑 **Por que o `api.get()` Funciona e o `fetch()` Não?**

### **Serviço `api` Configurado**:
```javascript
// src/services/api.js
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Interceptador para adicionar o token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = apiDataManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

### **`fetch()` Direto**:
- ❌ Não inclui automaticamente o token de autenticação
- ❌ Requer configuração manual dos headers
- ❌ Não usa os interceptors configurados

## 🧪 **Testes Realizados**

### 1. **Verificação do Token**:
```bash
php artisan tinker --execute="
$user = App\Models\User::find(2);
$token = $user->createToken('auth_token')->plainTextToken;
echo 'Token: ' . $token;
"
```

### 2. **Teste da API de Produtos**:
```bash
curl -X GET "http://127.0.0.1:8000/api/produtos" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 142|phs6AXeTdUJSaM01AqifYQds9HoScODhmTvx6RUE3ca16118"
```

**Resultado**: ✅ Sucesso - Retorna dados dos produtos

### 3. **Teste da API de Envelopamentos**:
```bash
curl -X GET "http://127.0.0.1:8000/api/envelopamentos" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 142|phs6AXeTdUJSaM01AqifYQds9HoScODhmTvx6RUE3ca16118"
```

**Resultado**: ✅ Sucesso - Retorna array vazio (tabela vazia)

## 📊 **Resultado Esperado Após as Correções**

Após recarregar o dashboard em `http://localhost:5180`:

### **Cards do Dashboard**:
- ✅ **Vendas do Dia**: Número correto baseado na data
- ✅ **OS em Aberto**: **1** (incluindo "Orçamento Salvo")
- ✅ **Orç. Envelopamento**: **0** (tabela vazia)
- ✅ **Estoque Baixo**: **2 Itens** (produtos da tabela)

### **Logs no Console**:
```
🔍 Carregando produtos da API...
✅ Produtos carregados da API: 3
📊 Produtos encontrados: 3
📊 Produtos com estoque baixo: 2
   1. Teste: estoque=0.00, mínimo=1.00
   2. PLACA DE ACRÍLICO PARA PIX: estoque=1.00, mínimo=2.00
🔍 Carregando envelopamentos da API...
✅ Envelopamentos carregados da API: 0
📊 Envelopamentos encontrados: 0
📊 Status dos envelopamentos: []
📊 Envelopamentos orçados: 0
```

## 🚨 **Se Ainda Houver Problemas**

### 1. **Verificar Token no Frontend**:
```javascript
// No console do navegador
```

### 2. **Verificar Token no Backend**:
```bash
php artisan tinker --execute="
$user = App\Models\User::find(2);
$token = $user->tokens()->first();
echo 'Token válido: ' . ($token ? 'Sim' : 'Não');
"
```

### 3. **Testar API Manualmente**:
```bash
# Obter token
TOKEN=$(php artisan tinker --execute="echo App\Models\User::find(2)->createToken('test')->plainTextToken;")

# Testar API
curl -X GET "http://127.0.0.1:8000/api/produtos" \
  -H "Authorization: Bearer $TOKEN"
```

## 📝 **Arquivos Modificados**

1. **src/pages/DashboardPage.jsx**
   - Adicionado import do `api`
   - Corrigidas requisições de produtos e envelopamentos

2. **src/components/dashboard/ProductionFeed.jsx**
   - Adicionado import do `api`
   - Corrigida requisição de envelopamentos

## 🎯 **Conclusão**

O problema estava no uso incorreto de `fetch()` em vez do serviço `api` configurado. O serviço `api` inclui automaticamente o token de autenticação através dos interceptors, enquanto `fetch()` requer configuração manual.

Após as correções, o dashboard deve carregar corretamente os dados da API, mostrando:
- **2 produtos com estoque baixo** (da tabela produtos)
- **0 envelopamentos** (tabela vazia)
- **1 OS em aberto** (incluindo "Orçamento Salvo")

---

**Data**: 22/07/2025
**Status**: Implementado e Testado
**Próxima Verificação**: Recarregar o dashboard 