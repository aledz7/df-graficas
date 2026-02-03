# Integração Funcionários - Sistema de Usuários

## Visão Geral

Este documento descreve a integração implementada entre a tabela `funcionarios` e a tabela `users` do sistema, permitindo que funcionários tenham credenciais de acesso ao sistema.

## Como Funciona

### 1. Criação de Funcionário com Credenciais

Quando um funcionário é criado com credenciais (email, login ou senha), o sistema automaticamente:

1. **Cria um registro na tabela `users`** com:
   - `name`: Nome do funcionário
   - `email`: Email do funcionário (ou gerado automaticamente)
   - `password`: Senha criptografada (ou "123456" por padrão)
   - `tenant_id`: ID do tenant do funcionário
   - `is_admin`: false
   - `ativo`: Status do funcionário

2. **Gera credenciais automaticamente** se não fornecidas:
   - **Email**: `nome.sobrenome@empresa.com` (com contador se duplicado)
   - **Login**: `nomesobrenome` (baseado no nome)
   - **Senha**: "123456" (se não informada)

### 2. Atualização de Credenciais

Quando as credenciais de um funcionário são atualizadas:

1. **Atualiza o registro na tabela `users`** correspondente
2. **Sincroniza os dados** entre as duas tabelas
3. **Mantém a integridade** dos dados

### 3. Remoção de Funcionário

Quando um funcionário é removido:

1. **Remove o registro da tabela `users`** associado
2. **Remove o funcionário** da tabela `funcionarios`

## Estrutura das Tabelas

### Tabela `funcionarios`
```sql
- id (PK)
- tenant_id (FK)
- nome
- email (usado para relacionamento com users)
- login (opcional)
- senha (opcional, não criptografada)
- status
- ... outros campos
```

### Tabela `users`
```sql
- id (PK)
- tenant_id (FK)
- name (nome do funcionário)
- email (mesmo email do funcionário)
- password (criptografada)
- is_admin (sempre false para funcionários)
- ativo (mesmo status do funcionário)
- ... outros campos
```

## Relacionamentos

### No Modelo Funcionario
```php
public function user()
{
    return $this->belongsTo(User::class, 'email', 'email')
        ->where('tenant_id', $this->tenant_id);
}
```

### No Modelo User
```php
public function funcionario()
{
    return $this->hasOne(Funcionario::class, 'email', 'email')
        ->where('tenant_id', $this->tenant_id);
}
```

## Endpoints da API

### Verificar Credenciais
```
GET /api/funcionarios/{id}/credenciais
```

**Resposta:**
```json
{
    "success": true,
    "data": {
        "has_credentials": true,
        "user_id": 123,
        "email": "joao.silva@empresa.com",
        "login": "joao.silva"
    }
}
```

### Resetar Senha
```
POST /api/funcionarios/{id}/reset-senha
```

**Resposta:**
```json
{
    "success": true,
    "data": {
        "new_password": "aB3x9K2m",
        "message": "Senha resetada com sucesso"
    }
}
```

## Interface do Usuário

### Componente FuncionarioCredenciais
- Campo para email (obrigatório para login)
- Campo para nome de usuário (opcional)
- Campo para senha (com toggle de visibilidade)
- Informações sobre a integração
- Avisos de segurança

### Página de Listagem
- Coluna "Credenciais" mostrando status
- Botão para resetar senha
- Visualização temporária da nova senha
- Indicadores visuais de status

## Segurança

### Medidas Implementadas
1. **Senhas criptografadas** usando Hash::make()
2. **Validação de dados** no backend
3. **Transações de banco** para garantir consistência
4. **Multi-tenancy** respeitado em todas as operações

### Recomendações Futuras
1. **Políticas de senha forte**
2. **Autenticação de dois fatores**
3. **Auditoria de acessos**
4. **Expiração de senhas**
5. **Bloqueio por tentativas**

## Fluxo de Login

1. Funcionário acessa `/login`
2. Insere email e senha
3. Sistema valida na tabela `users`
4. Se válido, cria sessão e redireciona
5. Se inválido, mostra erro

## Considerações Importantes

### 1. Email Único
- O email deve ser único por tenant
- Sistema gera automaticamente se não fornecido
- Usado como chave de relacionamento

### 2. Sincronização
- Alterações em funcionários sincronizam com users
- Remoção de funcionário remove usuário
- Status ativo/inativo sincronizado

### 3. Permissões
- Funcionários não são administradores por padrão
- Permissões específicas podem ser implementadas
- Sistema de roles pode ser expandido

### 4. Backup e Recuperação
- Backup deve incluir ambas as tabelas
- Restauração deve manter relacionamentos
- Considerar soft deletes para auditoria

## Troubleshooting

### Problema: Funcionário não consegue fazer login
**Solução:**
1. Verificar se existe registro na tabela `users`
2. Verificar se email está correto
3. Resetar senha se necessário
4. Verificar se funcionário está ativo

### Problema: Dados dessincronizados
**Solução:**
1. Verificar integridade entre tabelas
2. Executar sincronização manual se necessário
3. Verificar logs de erro

### Problema: Email duplicado
**Solução:**
1. Sistema gera automaticamente com contador
2. Verificar se email já existe no tenant
3. Usar email alternativo se necessário 