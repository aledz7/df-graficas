# Configuração do Fechamento Automático de Mês - cPanel

## 📋 Configuração no cPanel

### Passo a Passo

1. **Acesse o cPanel** do seu servidor
2. **Procure por "Tarefas Agendadas"** ou **"Cron Jobs"** (geralmente na seção "Avançado")
3. **Clique em "Criar Nova Tarefa Agendada"** ou **"Adicionar Cron Job"**
4. **Configure a tarefa:**

#### Opção 1: Verificação Normal (Recomendado)

Esta opção verifica se é o dia configurado antes de fechar:

**Configuração:**
- **Frequência:** Diariamente
- **Horário:** 00:00 (meia-noite) ou o horário de sua preferência
- **Comando:**
```bash
cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico
```

**Como funciona:**
- Verifica se hoje é o dia configurado no sistema
- Se for o dia correto, fecha o mês automaticamente
- Se não for o dia, não faz nada (comportamento normal)

#### Opção 2: Fechamento Forçado

Esta opção ignora a verificação de dia e fecha se possível:

**Configuração:**
- **Frequência:** Diariamente
- **Horário:** 00:00 (meia-noite) ou o horário de sua preferência
- **Comando:**
```bash
cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico --forcar
```

**Como funciona:**
- Ignora a verificação de dia configurado
- Fecha o mês se ainda não foi fechado
- ⚠️ **Atenção:** Use apenas se configurar o painel para executar no dia correto, ou se quiser que feche sempre que executar (pode causar fechamentos duplicados)

### Exemplo de Configuração no cPanel

**Interface do cPanel:**
```
Frequência: Diariamente
Horário: 00:00
Comando: cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico
```

**Ou usando a sintaxe do cron diretamente:**
```
0 0 * * * cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico
```

## ✅ Verificar se Está Funcionando

### 1. Testar o Comando Manualmente

Execute o comando diretamente no terminal para ver se funciona:

```bash
cd /var/www/html/jet-impre/backend
php artisan funcionarios:fechar-mes-automatico
```

Isso mostrará:
- ✅ Se encontrou configurações ativas
- ✅ Se o dia corresponde
- ✅ Se o mês já foi fechado
- ✅ Se o mês anterior foi fechado
- ✅ Qualquer erro que ocorreu
- ✅ Quantos holerites foram gerados

### 2. Verificar os Logs

Os logs são salvos em:
- **Log específico:** `/var/www/html/jet-impre/backend/storage/logs/fechamento-mes-automatico.log`
- **Log geral:** `/var/www/html/jet-impre/backend/storage/logs/laravel.log`

Para ver os últimos logs:
```bash
tail -f /var/www/html/jet-impre/backend/storage/logs/fechamento-mes-automatico.log
```

Ou filtrar no log geral:
```bash
tail -f /var/www/html/jet-impre/backend/storage/logs/laravel.log | grep "Fechamento automático"
```

### 3. Verificar no Sistema

Acesse a interface do sistema:
1. Vá em **"Funcionários"** > **"Fechar Mês"**
2. Clique na aba **"Histórico"**
3. Verifique se há registros de fechamento automático

### 4. Verificar Logs do cPanel

O cPanel geralmente mantém logs das tarefas agendadas:
1. Acesse **"Tarefas Agendadas"** no cPanel
2. Procure por **"Logs"** ou **"Histórico"** das tarefas
3. Verifique se há erros na execução

## 📝 Condições para o Fechamento Automático Funcionar

O fechamento automático só será executado se **TODAS** as condições forem atendidas:

1. ✅ O fechamento automático está **ativado** na configuração do sistema
2. ✅ O **dia atual** corresponde ao **dia configurado** (se usar comando normal)
3. ✅ O **mês atual ainda não foi fechado**
4. ✅ O **mês anterior foi fechado** (exceto para o primeiro fechamento do sistema)

## 🛠️ Solução de Problemas

### Problema: "Nenhuma configuração ativa encontrada"

**Solução:**
1. Acesse a interface do sistema
2. Vá em **"Funcionários"** > **"Fechar Mês"**
3. Clique na aba **"Configuração"**
4. Ative o switch **"Ativar Fechamento Automático"**
5. Configure o **dia do mês** (1-31)
6. Clique em **"Salvar Configuração"**

### Problema: "Hoje não é dia de fechamento"

**Isso é normal!** O comando verifica se é o dia configurado. Se não for, não faz nada.

**Soluções:**
- **Opção 1:** Use o comando com `--forcar` no cPanel para ignorar esta verificação
- **Opção 2:** Configure o cPanel para executar apenas no dia configurado
- **Opção 3:** Use o botão **"Executar Agora"** na aba Configuração para testar

### Problema: "Mês anterior não foi fechado"

**Soluções:**

1. **Primeiro fechamento do sistema** (recomendado):
   - Se este for o primeiro mês a ser fechado, o sistema permite automaticamente
   - Não precisa fazer nada, apenas execute o comando

2. **Fechar o mês anterior manualmente:**
   - Acesse **"Funcionários"** > **"Fechar Mês"**
   - Selecione o mês anterior (ex: outubro/2025)
   - Clique em **"Fechar Mês"**
   - Depois o fechamento automático funcionará normalmente

3. **Usar comando com --ignorar-mes-anterior** (use com cuidado):
   - Configure no cPanel: `cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico --forcar --ignorar-mes-anterior`
   - Isso permite fechar mesmo sem o mês anterior fechado
   - ⚠️ Pode causar inconsistências se usado incorretamente

### Problema: "Mês já está fechado"

**Isso é normal!** Se o mês já foi fechado, o comando não faz nada. Isso evita fechamentos duplicados.

### Problema: Comando não está sendo executado pelo cPanel

**Verificações:**

1. **Caminho correto:**
   - Verifique se o caminho `/var/www/html/jet-impre/backend` está correto
   - O caminho pode variar dependendo da configuração do servidor
   - Teste executando manualmente: `cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico`

2. **Permissões:**
   - Verifique se o usuário do cron tem permissão para executar o comando
   - Teste executando manualmente com o mesmo usuário

3. **PHP no PATH:**
   - Se o comando `php` não estiver no PATH, use o caminho completo
   - Exemplo: `/usr/bin/php` ou `/usr/local/bin/php`
   - Descubra o caminho com: `which php`

4. **Verificar logs do cPanel:**
   - O cPanel geralmente mostra erros nas tarefas agendadas
   - Verifique a seção de logs do cron job

5. **Testar comando completo:**
   ```bash
   cd /var/www/html/jet-impre/backend && /usr/bin/php artisan funcionarios:fechar-mes-automatico
   ```
   (Substitua `/usr/bin/php` pelo caminho correto do PHP no seu servidor)

## 🎯 Executar Manualmente

Você pode executar o fechamento manualmente de três formas:

### Opção 1: Via Interface (Recomendado)
1. Acesse **"Funcionários"** > **"Fechar Mês"**
2. Vá para a aba **"Configuração"**
3. Clique em **"Executar Agora"** para testar imediatamente

### Opção 2: Via Terminal
```bash
cd /var/www/html/jet-impre/backend
php artisan funcionarios:fechar-mes-automatico
```

### Opção 3: Via API
```bash
curl -X POST http://seu-dominio/api/configuracao-fechamento-mes/executar-fechamento \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 Opções do Comando

O comando aceita opções para diferentes situações:

### Forçar Fechamento (ignora verificação de dia)
```bash
php artisan funcionarios:fechar-mes-automatico --forcar
```

### Ignorar Verificação de Mês Anterior
```bash
php artisan funcionarios:fechar-mes-automatico --ignorar-mes-anterior
```

### Usar Ambas as Opções
```bash
php artisan funcionarios:fechar-mes-automatico --forcar --ignorar-mes-anterior
```

## 🔍 Diagnóstico Rápido

Execute este comando para ver o diagnóstico completo:

```bash
cd /var/www/html/jet-impre/backend
php artisan funcionarios:fechar-mes-automatico
```

Isso mostrará:
- ✅ Se encontrou configurações ativas
- ✅ Se o dia corresponde
- ✅ Se o mês já foi fechado
- ✅ Se o mês anterior foi fechado
- ✅ Qualquer erro que ocorreu
- ✅ Quantos holerites foram gerados

## 📌 Resumo das Configurações Recomendadas

| Configuração | Comando | Quando Usar |
|-------------|---------|-------------|
| **Normal** | `cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico` | Uso padrão, verifica o dia antes de fechar |
| **Forçado** | `cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico --forcar` | Quando quer fechar sempre que executar |

## 📝 Notas Importantes

- ⚠️ O comando verifica automaticamente todas as condições antes de fechar
- ✅ Você pode testar o fechamento a qualquer momento usando o botão **"Executar Agora"**
- 📋 Os logs mostram exatamente por que um fechamento foi ignorado ou executado
- 🔄 O sistema abre automaticamente o próximo mês após fechar
- 📊 Todo fechamento é registrado no histórico
- 🕐 Configure o cPanel para executar diariamente no horário desejado (recomendado: 00:00)

## 🔧 Exemplo Completo de Configuração no cPanel

1. **Acesse o cPanel**
2. **Vá em "Tarefas Agendadas"** ou **"Cron Jobs"**
3. **Clique em "Criar Nova Tarefa Agendada"**
4. **Preencha:**
   - **Frequência:** Diariamente
   - **Horário:** 00:00
   - **Comando:** `cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico`
5. **Salve a tarefa**

Pronto! O sistema agora fechará automaticamente o mês no dia configurado.
