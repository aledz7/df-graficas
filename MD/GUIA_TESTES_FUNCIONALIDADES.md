# Guia de Testes - Funcionalidades Implementadas

Este documento descreve as três funcionalidades implementadas e onde testá-las.

## 📋 Funcionalidades Implementadas

### 1. 🔔 ALERTAS E NOTIFICAÇÕES

Sistema automático de alertas que monitora:
- **Estoque baixo**: Produtos com estoque igual ou abaixo do mínimo
- **Atrasos**: Contas a receber vencidas
- **Clientes inativos**: Clientes sem compras há 90 dias ou mais
- **Metas próximas**: Quando uma meta está próxima de ser batida (80% ou configurado)

#### Endpoints da API:

```
GET    /api/alertas                    - Listar alertas/notificações
POST   /api/alertas/executar-verificacoes - Executar todas as verificações manualmente
GET    /api/alertas/contar-nao-lidas   - Contar notificações não lidas
POST   /api/alertas/marcar-todas-lidas - Marcar todas como lidas
POST   /api/alertas/{id}/marcar-lida   - Marcar uma notificação como lida
```

#### Como Testar:

1. **Estoque Baixo:**
   - Acesse: Produtos → Edite um produto e defina `estoque_minimo`
   - Defina o `estoque` atual igual ou abaixo do mínimo
   - Execute: `POST /api/alertas/executar-verificacoes`
   - Verifique: `GET /api/alertas?tipo=estoque_baixo`

2. **Atrasos:**
   - Crie uma conta a receber com data de vencimento no passado
   - Execute: `POST /api/alertas/executar-verificacoes`
   - Verifique: `GET /api/alertas?tipo=atraso`

3. **Clientes Inativos:**
   - Tenha um cliente sem vendas há mais de 90 dias
   - Execute: `POST /api/alertas/executar-verificacoes`
   - Verifique: `GET /api/alertas?tipo=cliente_inativo`

4. **Metas Próximas:**
   - Crie uma meta ativa
   - Realize vendas até atingir 80% ou mais da meta (mas não 100%)
   - Execute: `POST /api/alertas/executar-verificacoes`
   - Verifique: `GET /api/alertas?tipo=meta_proxima`

---

### 2. 🏆 RANKING INTERNO DE VENDEDORES

Placar que mostra o desempenho dos vendedores com:
- Total vendido (valor)
- Quantidade de vendas
- Ticket médio
- Percentual de contribuição no total da empresa
- Filtros por período (diário, mensal, personalizado)

#### Endpoints da API:

```
GET    /api/ranking-vendedores              - Ranking por valor vendido
GET    /api/ranking-vendedores/por-quantidade - Ranking por quantidade de vendas
```

#### Parâmetros de Query:

- `data_inicio` (opcional): Data início do período (formato: YYYY-MM-DD)
- `data_fim` (opcional): Data fim do período (formato: YYYY-MM-DD)
- `tipo_periodo` (opcional): 'diario', 'mensal', 'personalizado'
- `mes` (opcional): Mês para período mensal (1-12)
- `ano` (opcional): Ano para período mensal

#### Como Testar:

1. **Ranking por Valor:**
   ```
   GET /api/ranking-vendedores?tipo_periodo=mensal&mes=1&ano=2025
   ```

2. **Ranking por Quantidade:**
   ```
   GET /api/ranking-vendedores/por-quantidade?tipo_periodo=diario
   ```

3. **Período Personalizado:**
   ```
   GET /api/ranking-vendedores?data_inicio=2025-01-01&data_fim=2025-01-31
   ```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "posicao": 1,
        "vendedor_id": 1,
        "vendedor_nome": "João Silva",
        "total_vendido": 15000.00,
        "quantidade_vendas": 25,
        "ticket_medio": 600.00,
        "percentual_contribuicao": 45.5
      }
    ],
    "periodo": {...},
    "total_geral": 33000.00,
    "total_vendedores": 3
  }
}
```

---

### 3. 🎮 SISTEMA DE METAS GAMIFICADO

Sistema completo de gamificação com:
- **Metas com pontos**: Cada meta pode ter pontos configurados
- **Progresso visual**: Barra de progresso mostrando % alcançado
- **Níveis e Badges**: Bronze, Prata, Ouro, Platina, Diamante
- **Histórico de pontos**: Registro de todas as ações que geraram pontos
- **Ranking de pontos**: Classificação dos vendedores por pontos
- **Premiações**: Sistema de premiação quando meta é batida

#### Endpoints da API:

**Metas:**
```
GET    /api/metas-vendas                    - Listar todas as metas
POST   /api/metas-vendas                    - Criar nova meta (com campos de gamificação)
PUT    /api/metas-vendas/{id}                - Atualizar meta
GET    /api/metas-vendas/{id}/progresso      - Obter progresso da meta
```

**Gamificação:**
```
GET    /api/gamificacao/ranking              - Ranking de pontos
GET    /api/gamificacao/meus-pontos          - Pontos do vendedor logado
GET    /api/gamificacao/historico            - Histórico de pontos
GET    /api/gamificacao/premiacoes           - Premiações do vendedor
POST   /api/gamificacao/premiacoes/{id}/entregar - Marcar premiação como entregue
```

#### Campos de Gamificação na Meta:

Ao criar/atualizar uma meta, você pode incluir:

```json
{
  "tipo": "vendedor",
  "vendedor_id": 1,
  "data_inicio": "2025-01-01",
  "data_fim": "2025-01-31",
  "valor_meta": 10000.00,
  "pontos_meta": 100,                    // Pontos ao bater a meta
  "percentual_proximo_alerta": 80,      // % para alertar que está próximo
  "premiacao": {                        // Configuração de premiação
    "tipo": "bonus",                    // bonus, brinde, folga
    "titulo": "Bônus por Meta",
    "descricao": "Parabéns!",
    "valor": 500.00                     // Se tipo for bonus
  }
}
```

#### Como Testar:

1. **Criar Meta com Gamificação:**
   ```
   POST /api/metas-vendas
   {
     "tipo": "vendedor",
     "vendedor_id": 1,
     "data_inicio": "2025-01-01",
     "data_fim": "2025-01-31",
     "periodo_tipo": "mensal",
     "valor_meta": 5000.00,
     "pontos_meta": 100,
     "percentual_proximo_alerta": 80,
     "premiacao": {
       "tipo": "bonus",
       "titulo": "Bônus Mensal",
       "valor": 200.00
     }
   }
   ```

2. **Ver Progresso da Meta:**
   ```
   GET /api/metas-vendas/{id}/progresso
   ```
   Retorna: valor realizado, percentual, pontos, nível do vendedor, etc.

3. **Ver Meus Pontos:**
   ```
   GET /api/gamificacao/meus-pontos
   ```
   Retorna: pontos totais, nível atual, badge, pontos faltando para próximo nível

4. **Ver Ranking:**
   ```
   GET /api/gamificacao/ranking?limite=10
   ```

5. **Ver Histórico:**
   ```
   GET /api/gamificacao/historico
   ```

6. **Testar Pontos Automáticos:**
   - Finalize uma venda (status: finalizada)
   - O sistema automaticamente adiciona 10 pontos ao vendedor
   - Verifique: `GET /api/gamificacao/meus-pontos`

7. **Testar Meta Batida:**
   - Crie uma meta com valor baixo (ex: R$ 100)
   - Finalize vendas até bater a meta
   - O sistema automaticamente:
     - Adiciona pontos da meta ao vendedor
     - Cria uma premiação (se configurada)
     - Atualiza o nível do vendedor se necessário

---

## 🚀 Como Executar as Migrations

Antes de testar, execute as migrations:

```bash
cd backend
php artisan migrate
```

Isso criará as seguintes tabelas:
- `vendedor_pontos` - Pontos e níveis dos vendedores
- `historico_pontos` - Histórico de ações que geraram pontos
- `premiacoes` - Premiações concedidas
- Adicionará campos de gamificação em `metas_vendas`
- Adicionará campo `dados_adicionais` em `notificacoes`

---

## 📍 Onde Testar no Frontend

### 1. Alertas e Notificações

**Local sugerido:** Dashboard ou menu de notificações

**Componentes a criar:**
- `AlertasPanel.jsx` - Painel de alertas
- `NotificacaoCard.jsx` - Card de notificação individual
- Botão para executar verificações manualmente

**Exemplo de uso:**
```javascript
// Executar verificações
POST /api/alertas/executar-verificacoes

// Listar alertas
GET /api/alertas?lida=false

// Marcar como lida
POST /api/alertas/{id}/marcar-lida
```

### 2. Ranking de Vendedores

**Local sugerido:** Nova página "Ranking" ou seção no Dashboard

**Componentes a criar:**
- `RankingVendedoresPage.jsx` - Página completa
- `RankingTable.jsx` - Tabela de ranking
- `PeriodoFilter.jsx` - Filtro de período

**Exemplo de uso:**
```javascript
// Buscar ranking
GET /api/ranking-vendedores?tipo_periodo=mensal&mes=1&ano=2025
```

### 3. Metas Gamificadas

**Local sugerido:** Página de Metas expandida ou nova seção

**Componentes a criar:**
- `MetasGamificadasPage.jsx` - Página de metas com gamificação
- `ProgressoMetaCard.jsx` - Card mostrando progresso da meta
- `PontosVendedorCard.jsx` - Card mostrando pontos do vendedor
- `RankingPontos.jsx` - Ranking de pontos
- `HistoricoPontos.jsx` - Histórico de pontos

**Exemplo de uso:**
```javascript
// Criar meta com gamificação
POST /api/metas-vendas
{
  "tipo": "vendedor",
  "vendedor_id": 1,
  "valor_meta": 10000,
  "pontos_meta": 100,
  "premiacao": {...}
}

// Ver progresso
GET /api/metas-vendas/{id}/progresso

// Ver meus pontos
GET /api/gamificacao/meus-pontos
```

---

## 🔧 Configurações Importantes

### Pontos por Ação (configurável no código)

No arquivo `backend/app/Services/GamificacaoService.php`:

```php
const PONTOS_VENDA = 10;           // Pontos por venda realizada
const PONTOS_META_BATIDA = 100;    // Pontos padrão por meta batida
const PONTOS_TICKET_MEDIO = 50;    // Pontos por bater ticket médio
const PONTOS_BONUS = 25;           // Pontos bônus
```

### Níveis e Pontos Necessários

No arquivo `backend/app/Models/VendedorPontos.php`:

- Bronze: 0 pontos (inicial)
- Prata: 100 pontos
- Ouro: 500 pontos
- Platina: 1500 pontos
- Diamante: 5000 pontos

---

## 📝 Notas Importantes

1. **Alertas Automáticos**: Os alertas são criados quando você chama `executar-verificacoes`. Para automatizar, configure um job/cron que execute periodicamente.

2. **Pontos Automáticos**: Os pontos são adicionados automaticamente quando:
   - Uma venda é finalizada (10 pontos)
   - Uma meta é batida (pontos configurados na meta)

3. **Níveis**: Os níveis são atualizados automaticamente quando os pontos mudam.

4. **Premiações**: São criadas automaticamente quando uma meta é batida (se configurada na meta).

5. **Multi-tenant**: Todas as funcionalidades respeitam o `tenant_id` do usuário logado.

---

## ✅ Checklist de Testes

- [ ] Executar migrations
- [ ] Criar uma meta com gamificação
- [ ] Finalizar uma venda e verificar pontos
- [ ] Verificar progresso da meta
- [ ] Bater uma meta e verificar premiação
- [ ] Ver ranking de vendedores
- [ ] Executar verificações de alertas
- [ ] Verificar notificações criadas
- [ ] Testar filtros de período no ranking

---

**Desenvolvido em:** 28/01/2025
**Versão:** 1.0
