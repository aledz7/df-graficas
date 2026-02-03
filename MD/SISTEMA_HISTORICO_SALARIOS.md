# Sistema de Histórico de Salários e Relatórios Mensais

## Visão Geral

Este sistema permite gerenciar o histórico de alterações de salário dos funcionários e gerar relatórios mensais precisos, considerando o salário base correto de cada mês.

## Funcionalidades Implementadas

### 1. Histórico de Alterações de Salário
- Registra automaticamente todas as alterações de salário
- Armazena salário anterior, novo salário, diferença e motivo
- Mantém rastreabilidade completa das mudanças

### 2. Relatórios Mensais
- Gera relatórios com o salário base correto de cada mês
- Considera vales, faltas e consumo interno do período
- Calcula salário líquido preciso

### 3. Interface de Usuário
- Modal para visualizar histórico de salários
- Geração de relatórios por mês/ano
- Visualização detalhada de cada relatório

## Como Usar

### 1. Alterando o Salário de um Funcionário

1. Acesse a seção de funcionários
2. Clique no campo "Salário Base" (se já houver um valor cadastrado)
3. Digite o novo valor
4. Informe a senha master
5. Opcionalmente, adicione um motivo para a alteração
6. Confirme a alteração

O sistema automaticamente:
- Registra a alteração no histórico
- Calcula a diferença entre os valores
- Armazena o motivo (se fornecido)

### 2. Gerando Relatórios Mensais

1. Na seção de salários do funcionário
2. Clique no botão "Histórico e Relatórios"
3. Selecione o mês e ano desejados
4. Clique em "Gerar Relatório"

O relatório incluirá:
- Salário base do mês selecionado (considerando o histórico)
- Total de vales do período
- Total de faltas/descontos
- Total de consumo interno
- Salário líquido calculado

### 3. Visualizando o Histórico

No modal "Histórico e Relatórios" você pode:
- Ver todas as alterações de salário em ordem cronológica
- Visualizar relatórios já gerados
- Acessar detalhes de cada relatório
- Baixar relatórios em PDF (funcionalidade futura)

## Estrutura do Banco de Dados

### Tabela: `funcionario_salario_historico`
- `id`: Chave primária
- `funcionario_id`: ID do funcionário (FK para users)
- `salario_anterior`: Salário antes da alteração
- `novo_salario`: Novo valor do salário
- `diferenca`: Diferença entre os valores
- `motivo`: Motivo da alteração (opcional)
- `data_alteracao`: Data da alteração
- `created_at`, `updated_at`: Timestamps

### Tabela: `funcionario_relatorios_mensais`
- `id`: Chave primária
- `funcionario_id`: ID do funcionário (FK para users)
- `mes`: Mês do relatório (1-12)
- `ano`: Ano do relatório
- `salario_base`: Salário base do mês
- `total_vales`: Total de vales do mês
- `total_faltas`: Total de faltas do mês
- `total_consumo_interno`: Total de consumo interno
- `salario_liquido`: Salário líquido calculado
- `created_at`, `updated_at`: Timestamps

## Endpoints da API

### Histórico de Salários
- `POST /api/funcionarios/{id}/salario-historico` - Adicionar registro no histórico
- `GET /api/funcionarios/{id}/salario-historico` - Buscar histórico do funcionário
- `GET /api/funcionarios/{id}/salario-por-mes?mes=X&ano=Y` - Buscar salário de mês específico

### Relatórios Mensais
- `GET /api/funcionarios/{id}/relatorio-mensal?mes=X&ano=Y` - Gerar relatório mensal
- `GET /api/funcionarios/{id}/relatorios-mensais` - Listar relatórios gerados

## Exemplo de Uso

### Cenário: Funcionário com alterações de salário

1. **Janeiro 2024**: Salário inicial R$ 1.500,00
2. **Março 2024**: Aumento para R$ 1.800,00 (motivo: "Aumento por mérito")
3. **Julho 2024**: Aumento para R$ 2.000,00 (motivo: "Promoção")

### Gerando Relatório de Maio 2024

O sistema irá:
- Usar o salário base de R$ 1.800,00 (vigente em maio)
- Considerar vales, faltas e consumo interno de maio
- Calcular o salário líquido correto

### Gerando Relatório de Agosto 2024

O sistema irá:
- Usar o salário base de R$ 2.000,00 (vigente em agosto)
- Considerar vales, faltas e consumo interno de agosto
- Calcular o salário líquido correto

## Benefícios

1. **Precisão Histórica**: Relatórios sempre usam o salário correto do período
2. **Rastreabilidade**: Histórico completo de todas as alterações
3. **Auditoria**: Motivos registrados para cada alteração
4. **Flexibilidade**: Geração de relatórios para qualquer período
5. **Segurança**: Alterações protegidas por senha master

## Próximas Funcionalidades

- [ ] Download de relatórios em PDF
- [ ] Relatórios comparativos entre meses
- [ ] Gráficos de evolução salarial
- [ ] Exportação de dados para Excel
- [ ] Notificações de alterações salariais 