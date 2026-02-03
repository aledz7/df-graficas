# Sistema de Fechamento Automático de Mês

## Visão Geral

O sistema de fechamento automático de mês permite que o usuário configure uma data fixa mensal para que o sistema feche automaticamente o mês de funcionários, gerando os holerites e abrindo o próximo mês.

## Funcionalidades

### 1. Configuração de Fechamento Automático

- O usuário pode definir o **dia do mês** (1-31) para fechamento automático
- O fechamento pode ser **ativado/desativado** a qualquer momento
- A configuração fica ativa até o usuário alterar
- Apenas uma configuração por tenant

### 2. Fechamento Automático

- Executa automaticamente quando chega no dia configurado
- Gera holerites para todos os funcionários ativos
- Zera vales e faltas para o próximo mês
- Abre automaticamente o próximo mês após o fechamento
- Registra todas as ações no histórico

### 3. Fechamento Manual

- O usuário ainda pode fechar manualmente através da interface
- Fechamento manual também registra no histórico
- Possibilidade de adicionar observações no fechamento manual

### 4. Reabertura de Mês

- Permite reabrir um mês já fechado (desfazer fechamento)
- Remove automaticamente o próximo mês que foi aberto
- Registra a reabertura no histórico

### 5. Histórico Completo

- Registra todos os fechamentos (manuais e automáticos)
- Registra todas as aberturas de mês
- Registra todas as reaberturas
- Mostra data/hora, usuário responsável, quantidade de holerites
- Observações de cada ação

## Estrutura do Banco de Dados

### Tabela: `configuracao_fechamento_mes`

```sql
CREATE TABLE `configuracao_fechamento_mes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `dia_fechamento` int(11) NOT NULL DEFAULT 25,
  `ativo` tinyint(1) NOT NULL DEFAULT 0,
  `usuario_configuracao_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
);
```

### Tabela: `historico_fechamento_mes`

```sql
CREATE TABLE `historico_fechamento_mes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` enum('fechamento','abertura','reabertura') NOT NULL DEFAULT 'fechamento',
  `mes` int(11) NOT NULL,
  `ano` int(11) NOT NULL,
  `data_acao` timestamp NOT NULL,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `automatico` tinyint(1) NOT NULL DEFAULT 0,
  `quantidade_holerites` int(11) NOT NULL DEFAULT 0,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `tipo` (`tipo`),
  KEY `mes` (`mes`,`ano`),
  KEY `data_acao` (`data_acao`)
);
```

## APIs Disponíveis

### Configuração de Fechamento

#### Obter Configuração
```
GET /api/configuracao-fechamento-mes
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenant_id": 1,
    "dia_fechamento": 25,
    "ativo": true,
    "usuario_configuracao_id": 1,
    "created_at": "2025-10-21T10:00:00.000000Z",
    "updated_at": "2025-10-21T10:00:00.000000Z"
  }
}
```

#### Atualizar Configuração
```
PUT /api/configuracao-fechamento-mes
```

**Body:**
```json
{
  "dia_fechamento": 25,
  "ativo": true
}
```

### Histórico de Fechamentos

#### Listar Histórico (Paginado)
```
GET /api/configuracao-fechamento-mes/historico?per_page=50&mes=10&ano=2025&tipo=fechamento
```

#### Listar Histórico Resumido (Últimos 20)
```
GET /api/configuracao-fechamento-mes/historico-resumido
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "tipo": "fechamento",
      "mes": 10,
      "ano": 2025,
      "data_acao": "2025-10-25T00:00:00.000000Z",
      "usuario_id": null,
      "automatico": true,
      "quantidade_holerites": 15,
      "observacoes": "Fechamento automático do sistema",
      "mes_nome": "Outubro",
      "periodo": "Outubro de 2025",
      "usuario": null
    }
  ]
}
```

## Comando Artisan

### Executar Fechamento Automático

```bash
php artisan funcionarios:fechar-mes-automatico
```

Este comando:
- Verifica todas as configurações ativas
- Compara o dia atual com o dia configurado
- Fecha automaticamente se for o dia configurado
- Registra tudo no histórico
- Retorna relatório de quantos foram fechados e erros encontrados

### Agendamento no Cron

Para executar automaticamente todos os dias, adicione ao `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    // Verificar fechamento automático de mês todos os dias à meia-noite
    $schedule->command('funcionarios:fechar-mes-automatico')
             ->daily()
             ->at('00:00');
}
```

Ou configure diretamente no crontab do servidor:

```bash
0 0 * * * cd /var/www/html/jet-impre/backend && php artisan funcionarios:fechar-mes-automatico >> /dev/null 2>&1
```

## Interface do Usuário

### Modal de Fechamento de Mês

O modal foi atualizado com 3 abas:

#### 1. Aba "Fechar Mês"
- Seleção de dia, mês e ano
- Verificação em tempo real se o mês já foi fechado
- Botão para fechar mês manualmente
- Botão para reabrir mês (se já estiver fechado)
- Campo de observações

#### 2. Aba "Configuração"
- Configuração do dia de fechamento automático (1-31)
- Switch para ativar/desativar o fechamento automático
- Salvar configurações

#### 3. Aba "Histórico"
- Lista dos últimos 20 fechamentos/aberturas/reaberturas
- Badge indicando o tipo de ação
- Badge indicando se foi automático ou manual
- Data/hora da ação
- Usuário responsável (se manual)
- Quantidade de holerites afetados
- Observações da ação

## Modelos (Models)

### ConfiguracaoFechamentoMes

```php
// Obter ou criar configuração para o tenant atual
$configuracao = ConfiguracaoFechamentoMes::obterOuCriar($tenantId);
```

### HistoricoFechamentoMes

```php
// Registrar fechamento
HistoricoFechamentoMes::registrarFechamento($mes, $ano, $quantidadeHolerites, $observacoes, $automatico);

// Registrar abertura
HistoricoFechamentoMes::registrarAbertura($mes, $ano, $quantidadeHolerites, $observacoes, $automatico);

// Registrar reabertura
HistoricoFechamentoMes::registrarReabertura($mes, $ano, $quantidadeHolerites, $observacoes);
```

## Fluxo de Funcionamento

### Fechamento Automático

1. O comando `funcionarios:fechar-mes-automatico` é executado diariamente
2. Busca todas as configurações com `ativo = true`
3. Para cada configuração:
   - Verifica se o dia atual é igual ao `dia_fechamento`
   - Verifica se o mês atual ainda não foi fechado
   - Verifica se o mês anterior foi fechado (obrigatório)
   - Executa o fechamento:
     - Gera holerites para todos funcionários ativos
     - Zera vales e faltas
     - Marca como fechado
     - Registra no histórico como "fechamento automático"
   - Abre o próximo mês automaticamente:
     - Cria holerites vazios para o próximo mês
     - Registra no histórico como "abertura automática"

### Fechamento Manual

1. Usuário acessa a página de funcionários
2. Clica em "Fechar Mês"
3. Seleciona o mês e ano
4. Sistema verifica se pode fechar
5. Usuário confirma
6. Sistema executa o fechamento
7. Registra no histórico como "fechamento manual"

### Reabertura de Mês

1. Usuário acessa a página de funcionários
2. Clica em "Fechar Mês"
3. Seleciona um mês já fechado
4. Clica em "Reabrir Mês"
5. Sistema remove o fechamento
6. Remove o próximo mês que foi aberto automaticamente
7. Registra no histórico como "reabertura"

## Observações Importantes

- **Apenas um mês pode ser fechado por vez**: Não é possível pular meses. O mês anterior precisa estar fechado.
- **Fechamento automático respeita a ordem**: Se o mês anterior não estiver fechado, o automático não fecha.
- **Histórico é imutável**: Não é possível deletar registros do histórico.
- **Configuração por tenant**: Cada tenant tem sua própria configuração independente.
- **Segurança**: Todas as ações usam o tenant_id do usuário autenticado.

## Benefícios

1. **Automação**: Não é mais necessário lembrar de fechar o mês manualmente
2. **Consistência**: Todos os meses são fechados na mesma data
3. **Rastreabilidade**: Histórico completo de todas as ações
4. **Flexibilidade**: Pode ser ativado/desativado facilmente
5. **Auditoria**: Sabe exatamente quem fez o quê e quando
6. **Transparência**: Interface clara mostrando status e histórico

## Testes

Para testar o sistema:

1. Configure o fechamento automático para o dia seguinte
2. Ative o fechamento automático
3. Execute manualmente o comando: `php artisan funcionarios:fechar-mes-automatico`
4. Verifique o histórico na aba "Histórico"
5. Teste a reabertura de um mês fechado
6. Verifique que o próximo mês foi removido

## Troubleshooting

### O fechamento automático não está funcionando

- Verifique se o cron está configurado corretamente
- Verifique se o fechamento está ativo nas configurações
- Execute manualmente o comando e veja os logs
- Verifique se o mês anterior está fechado

### Não consigo fechar um mês

- Verifique se o mês anterior foi fechado
- Verifique se há funcionários ativos
- Verifique as mensagens de erro no console

### O histórico não está aparecendo

- Verifique se as tabelas foram criadas corretamente
- Execute as migrations: `php artisan migrate`
- Verifique os logs do backend

## Próximos Passos

Possíveis melhorias futuras:
- Notificações por email quando um mês é fechado
- Relatório mensal automático por email
- Dashboard com estatísticas de fechamentos
- Exportação de holerites em PDF automaticamente
- Integração com sistemas de contabilidade

