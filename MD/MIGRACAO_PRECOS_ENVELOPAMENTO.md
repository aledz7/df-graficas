# Migração dos Preços de Envelopamento

## 📋 Visão Geral

Esta migração move os preços de envelopamento da tabela `dados_usuario` (configurações por usuário) para a tabela `admin_configuracoes` (configurações globais da empresa).

## 🎯 Objetivos

- **Centralizar configurações**: Os preços agora são globais para toda a empresa
- **Multi-tenancy**: Cada empresa (tenant) tem suas próprias configurações
- **Consistência**: Todos os usuários da mesma empresa veem os mesmos preços
- **Manutenibilidade**: Configurações centralizadas são mais fáceis de gerenciar

## 🗄️ Mudanças no Banco de Dados

### Nova Estrutura

A tabela `admin_configuracoes` agora inclui os seguintes campos:

```sql
ALTER TABLE admin_configuracoes ADD COLUMN preco_aplicacao_envelopamento DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE admin_configuracoes ADD COLUMN preco_remocao_envelopamento DECIMAL(10,2) DEFAULT 5.00;
ALTER TABLE admin_configuracoes ADD COLUMN preco_lixamento_envelopamento DECIMAL(10,2) DEFAULT 8.00;
ALTER TABLE admin_configuracoes ADD COLUMN preco_pelicula_envelopamento DECIMAL(10,2) DEFAULT 40.00;
```

### Estrutura Antiga vs Nova

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Localização** | `dados_usuario` | `admin_configuracoes` |
| **Escopo** | Por usuário | Por empresa (tenant) |
| **Chave** | `adminAdicionaisSettings` | Campos diretos na tabela |
| **Acesso** | Apenas usuário específico | Todos os usuários da empresa |

## 🚀 Passos para Migração

### 1. Aplicar a Migração do Banco

```bash
cd backend
php artisan migrate
```

### 2. Executar o Comando de Migração dos Dados

```bash
php artisan envelopamento:migrar-precos
```

### 3. Verificar a Migração

```bash
# Verificar se os dados foram migrados
php artisan tinker
>>> App\Models\AdminConfiguracao::all()->pluck('preco_aplicacao_envelopamento', 'tenant_id');
```

## 🔧 Novas APIs

### Endpoints

- `GET /api/envelopamento-precos` - Buscar preços atuais
- `PUT /api/envelopamento-precos` - Atualizar preços
- `GET /api/envelopamento-precos/compatibilidade` - Endpoint de compatibilidade

### Exemplo de Uso

```javascript
// Buscar preços
const response = await fetch('/api/envelopamento-precos', {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Atualizar preços
const response = await fetch('/api/envelopamento-precos', {
    method: 'PUT',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        preco_aplicacao: 15.00,
        preco_remocao: 8.00,
        preco_lixamento: 12.00,
        preco_pelicula: 50.00
    })
});
```

## 📱 Mudanças no Frontend

### Arquivos Modificados

1. **`ConfiguracaoPrecosEnvelopamentoPage.jsx`**
   - Usa nova API `/api/envelopamento-precos`
   - Remove dependência de `adminAdicionaisSettings`

2. **`useEnvelopamento.js`**
   - Atualizado para usar `envelopamentoPrecos`
   - Mantém compatibilidade com cache local

3. **`apiDataManager.js`**
   - Nova chave `envelopamentoPrecos`
   - Remove referência a `adminAdicionaisSettings`

### Cache e Persistência

- **Chave antiga**: `adminAdicionaisSettings`
- **Nova chave**: `envelopamentoPrecos`
- **Escopo**: Global por empresa (não mais por usuário)

## ✅ Verificação Pós-Migração

### 1. Testar Frontend

- Acessar a página de configuração de preços
- Verificar se os preços são carregados corretamente
- Testar salvamento de novos valores
- Verificar se outros usuários da mesma empresa veem os mesmos valores

### 2. Verificar Banco de Dados

```sql
-- Verificar se os dados foram migrados
SELECT 
    tenant_id,
    preco_aplicacao_envelopamento,
    preco_remocao_envelopamento,
    preco_lixamento_envelopamento,
    preco_pelicula_envelopamento
FROM admin_configuracoes;

-- Verificar dados antigos (para comparação)
SELECT 
    u.tenant_id,
    du.valor
FROM dados_usuario du
JOIN users u ON du.user_id = u.id
WHERE du.chave = 'adminAdicionaisSettings';
```

### 3. Testar Multi-Usuário

- Fazer login com diferentes usuários da mesma empresa
- Verificar se todos veem os mesmos preços
- Alterar preços com um usuário e verificar se outro usuário vê as mudanças

## 🧹 Limpeza (Opcional)

Após confirmar que tudo está funcionando, você pode remover os dados antigos:

```sql
-- Remover dados antigos (CUIDADO: execute apenas após confirmar que tudo funciona)
DELETE FROM dados_usuario WHERE chave = 'adminAdicionaisSettings';
```

## ⚠️ Considerações Importantes

### Rollback

Se algo der errado, você pode reverter a migração:

```bash
# Reverter a migração do banco
php artisan migrate:rollback --step=1

# Os dados antigos ainda estarão na tabela dados_usuario
```

### Backup

Sempre faça backup antes de executar migrações:

```bash
# Backup do banco
mysqldump -u usuario -p nome_banco > backup_pre_migracao.sql
```

### Compatibilidade

- O frontend mantém compatibilidade com cache local
- Novos usuários usam automaticamente a nova API
- Usuários existentes são migrados gradualmente

## 🎉 Benefícios da Nova Implementação

1. **Centralização**: Configurações em um só lugar
2. **Consistência**: Todos os usuários veem os mesmos valores
3. **Manutenibilidade**: Mais fácil de gerenciar e atualizar
4. **Performance**: Menos consultas ao banco
5. **Escalabilidade**: Suporte adequado a multi-tenancy
6. **Auditoria**: Rastreamento de mudanças centralizado

## 📞 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs do Laravel (`storage/logs/laravel.log`)
2. Execute o comando com `--verbose` para mais detalhes
3. Verifique se todas as migrações foram aplicadas
4. Confirme que o tenant_id está sendo definido corretamente
