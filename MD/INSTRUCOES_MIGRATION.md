# Instruções para Corrigir a Tabela de Serviços Adicionais

## Problema Identificado

A tabela `servicos_adicionais` já existe no banco de dados, mas está usando:
- `user_id` em vez de `tenant_id`
- `preco` em vez de `preco_por_m2`
- `unidade` em vez de `unidade_medida`
- Não tem a coluna `categoria`

## Solução

### 1. Executar a Migration de Atualização

```bash
cd backend
php artisan migrate
```

Esta migration irá:
- Adicionar a coluna `tenant_id` se não existir
- Adicionar a coluna `categoria` se não existir
- Definir `tenant_id = 1` para registros existentes
- Definir `categoria = 'outros'` para registros existentes

### 2. Verificar se a Migration Funcionou

```bash
php artisan migrate:status
```

### 3. Verificar a Estrutura da Tabela

```sql
DESCRIBE servicos_adicionais;
```

### 4. Verificar os Dados

```sql
SELECT id, nome, preco, unidade, categoria, tenant_id, ativo FROM servicos_adicionais;
```

### 5. Se Precisar, Executar o Seeder

```bash
php artisan db:seed --class=ServicoAdicionalSeeder
```

## Estrutura Esperada da Tabela

Após a migration, a tabela deve ter:

```sql
CREATE TABLE servicos_adicionais (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NULL,
    preco DECIMAL(10,2) NOT NULL,
    unidade VARCHAR(50) DEFAULT 'm²',
    ativo BOOLEAN DEFAULT TRUE,
    categoria VARCHAR(100) NULL,
    ordem INT DEFAULT 0,
    tenant_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_ativo_categoria (ativo, categoria),
    INDEX idx_ordem (ordem),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

## Verificações

### Backend
- [ ] Migration executada com sucesso
- [ ] Controller funcionando
- [ ] Rotas respondendo
- [ ] Model funcionando

### Frontend
- [ ] Página carregando sem erros
- [ ] Lista de serviços sendo exibida
- [ ] Modal funcionando
- [ ] CRUD funcionando

## Se Houver Problemas

### 1. Verificar Logs
```bash
tail -f storage/logs/laravel.log
```

### 2. Verificar Rotas
```bash
php artisan route:list | grep servicos-adicionais
```

### 3. Verificar Banco
```bash
php artisan tinker
>>> App\Models\ServicoAdicional::first();
```

### 4. Limpar Cache
```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

## Próximos Passos

Após confirmar que tudo está funcionando:

1. Descomentar o ServicoAdicionalSeeder no DatabaseSeeder
2. Executar o seeder para adicionar dados de exemplo
3. Testar todas as funcionalidades do frontend
4. Integrar com a calculadora de envelopamento
