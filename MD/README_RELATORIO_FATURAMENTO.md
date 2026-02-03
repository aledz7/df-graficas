# Relatório de Faturamento - Integração com Laravel

## Visão Geral

O relatório de faturamento foi integrado com o banco de dados Laravel para fornecer dados reais de vendas da empresa. O sistema agora busca automaticamente as informações de vendas do banco de dados e apresenta um relatório completo com gráficos, totais e detalhes.

## Funcionalidades

### ✅ Implementadas

1. **Integração com Banco de Dados Laravel**
   - Busca vendas reais da tabela `vendas`
   - Filtros por período (data início e fim)
   - Cálculo automático de totais

2. **Interface de Usuário**
   - Seletores de data com calendário
   - Indicadores de carregamento
   - Cards com totais em tempo real
   - Gráfico de faturamento por dia
   - Tabela detalhada de vendas

3. **Exportação**
   - Exportação para PDF
   - Exportação para Excel
   - Botões desabilitados durante carregamento

4. **Filtros**
   - Filtro por data de início
   - Filtro por data de fim
   - Botão para limpar filtros
   - Recarregamento automático ao alterar filtros

## Estrutura do Backend

### Rotas API (Laravel)

```php
// backend/routes/api.php
Route::prefix('vendas')->group(function () {
    Route::get('estatisticas', [VendaController::class, 'estatisticas']);
    Route::get('relatorio-faturamento', [VendaController::class, 'relatorioFaturamento']);
});
```

### Endpoint: `/api/vendas/relatorio-faturamento`

**Parâmetros:**
- `data_inicio` (opcional): Data de início no formato YYYY-MM-DD
- `data_fim` (opcional): Data de fim no formato YYYY-MM-DD

**Resposta:**
```json
{
  "success": true,
  "data": {
    "vendas": [
      {
        "id": 1,
        "data": "2024-01-15",
        "tipo": "venda",
        "clienteId": 1,
        "clienteNome": "João Silva",
        "total": 1500.00,
        "desconto": 100.00,
        "pagamentos": [
          {
            "metodo": "PIX"
          }
        ]
      }
    ],
    "totais": {
      "faturamentoBruto": 15000.00,
      "totalDescontos": 1000.00,
      "faturamentoLiquido": 14000.00
    },
    "faturamentoPorDia": {
      "2024-01-15": 5000.00,
      "2024-01-16": 10000.00
    },
    "periodo": {
      "dataInicio": "2024-01-01",
      "dataFim": "2024-01-31"
    }
  }
}
```

## Estrutura do Frontend

### Componente Principal
- **Arquivo:** `src/components/relatorios/financeiros/RelatorioFaturamento.jsx`
- **Serviço:** `src/services/api.js` (vendaService.getRelatorioFaturamento)

### Estados do Componente
```javascript
const [vendas, setVendas] = useState([]);
const [loading, setLoading] = useState(false);
const [totais, setTotais] = useState({
  faturamentoBruto: 0,
  totalDescontos: 0,
  faturamentoLiquido: 0
});
const [filtros, setFiltros] = useState({
  dataInicio: null,
  dataFim: null,
});
```

### Funcionalidades Principais

1. **Carregamento de Dados**
   - Função `carregarDadosFaturamento()` busca dados da API
   - Executa automaticamente quando filtros mudam
   - Exibe indicadores de carregamento

2. **Filtros de Data**
   - Calendários interativos para seleção de datas
   - Formatação automática para API (YYYY-MM-DD)
   - Recarregamento automático dos dados

3. **Exibição de Dados**
   - Cards com totais em tempo real
   - Gráfico de faturamento por dia
   - Tabela detalhada com todas as vendas

## Como Usar

### 1. Acessar o Relatório
- Navegue até a seção de relatórios
- Selecione "Relatório de Faturamento"

### 2. Filtrar por Período
- Clique em "Data Início" para selecionar data inicial
- Clique em "Data Fim" para selecionar data final
- Os dados serão carregados automaticamente

### 3. Visualizar Dados
- **Cards Superiores:** Totais de faturamento bruto, descontos e líquido
- **Gráfico:** Evolução do faturamento por dia
- **Tabela:** Detalhes de cada venda com cliente, valores e forma de pagamento

### 4. Exportar Relatório
- **PDF:** Clique em "Exportar PDF" para gerar relatório em PDF
- **Excel:** Clique em "Exportar Excel" para gerar planilha

## Configurações Necessárias

### Backend (Laravel)
1. **Modelo Venda:** Certifique-se de que o modelo `Venda` tem os relacionamentos corretos
2. **Migrations:** Verifique se a tabela `vendas` tem todas as colunas necessárias
3. **Autenticação:** O endpoint requer autenticação via token Bearer

### Frontend (React)
1. **Variável de Ambiente:** Configure `VITE_API_URL` no arquivo `.env`
2. **Autenticação:** Certifique-se de que o token está sendo enviado nas requisições
3. **Dependências:** Verifique se todas as dependências estão instaladas

## Dependências

### Backend
- Laravel 10+
- MySQL/PostgreSQL
- Sanctum (para autenticação)

### Frontend
- React 18+
- Axios (para requisições HTTP)
- Chart.js (para gráficos)
- date-fns (para manipulação de datas)
- XLSX (para exportação Excel)

## Tratamento de Erros

### Backend
- Validação de parâmetros de data
- Tratamento de vendas sem cliente
- Logs de erro para debugging

### Frontend
- Indicadores de carregamento
- Mensagens de erro amigáveis
- Fallback para dados vazios
- Desabilitação de botões durante carregamento

## Próximas Melhorias

1. **Filtros Adicionais**
   - Filtro por cliente
   - Filtro por forma de pagamento
   - Filtro por vendedor

2. **Gráficos Avançados**
   - Comparação com períodos anteriores
   - Gráfico de tendências
   - Análise por categoria de produto

3. **Relatórios Comparativos**
   - Comparação mensal/trimestral
   - Análise de crescimento
   - Projeções de faturamento

4. **Exportação Avançada**
   - Relatórios personalizados
   - Agendamento de relatórios
   - Envio por email

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do Laravel (`storage/logs/laravel.log`)
2. Verifique o console do navegador para erros JavaScript
3. Teste a API diretamente via Postman ou similar
4. Verifique se o token de autenticação está válido 