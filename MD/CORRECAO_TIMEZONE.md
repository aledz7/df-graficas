# Correção de Problema de Timezone - Data e Hora Erradas

## Problema Identificado
O sistema estava salvando datas e horas com diferença de 3 horas (fuso horário UTC) em relação ao horário local do Brasil.

**Causa**: O JavaScript `new Date().toISOString()` sempre retorna a data em UTC (Tempo Universal Coordenado), não respeitando o fuso horário local.

## Solução Implementada

### 1. Criado Utilitário de Datas (`src/utils/dateUtils.js`)
Funções para manipular datas corretamente:
- `formatDateForBackend(date)` - Converte data local para formato aceito pelo Laravel ('YYYY-MM-DD HH:mm:ss')
- `getCurrentDateTime()` - Retorna data/hora atual no formato correto
- `toLocalISOString(date)` - Converte para ISO mantendo timezone local
- `formatDateTimeBR(date)` - Formata para exibição brasileira (DD/MM/YYYY HH:mm)
- `formatDateBR(date)` - Formata apenas a data (DD/MM/YYYY)

### 2. Arquivos Corrigidos

#### PDV (Ponto de Venda)
- ✅ `src/hooks/pdv/pdvDataService.js` - Criação e atualização de vendas
- ✅ `src/hooks/usePDV.jsx` - Hook principal do PDV

#### Ordem de Serviço
- ✅ `src/hooks/os/osDataService.js` - Criação e manipulação de OS
- ✅ `src/hooks/os/osLifecycleHandlers.js` - Ciclo de vida das OS
- ✅ `src/hooks/os/osConstants.js` - Estados iniciais

#### Envelopamento
- ✅ `src/hooks/envelopamento/envelopamentoDataService.js` - Dados de envelopamento
- ✅ `src/hooks/envelopamento/envelopamentoHandlers.js` - Manipuladores
- ✅ `src/hooks/envelopamento/envelopamentoState.js` - Estado inicial

#### Agenda
- ✅ `src/components/agenda/AppointmentModal.jsx` - Criação de compromissos

### 3. Padrão de Correção

**Antes:**
```javascript
data_emissao: new Date().toISOString()
```

**Depois:**
```javascript
import { formatDateForBackend } from '@/utils/dateUtils';

data_emissao: formatDateForBackend()
```

## Arquivos Restantes

Ainda existem aproximadamente 37 arquivos com `new Date().toISOString()` que precisam ser corrigidos.

### Para corrigir os demais arquivos:

1. Adicione o import:
```javascript
import { formatDateForBackend } from '@/utils/dateUtils';
```

2. Substitua `new Date().toISOString()` por `formatDateForBackend()`

3. Se precisar usar uma data específica:
```javascript
formatDateForBackend(new Date('2025-01-01'))
```

## Testando a Correção

1. Crie um novo registro (venda, OS, envelopamento, etc.)
2. Verifique no banco de dados se a data/hora está correta
3. Compare com o horário do sistema operacional

## Configuração do Backend (Laravel)

O timezone já está configurado corretamente no Laravel:
- Arquivo: `backend/config/app.php`
- Timezone: `America/Sao_Paulo` (linha 68)

## Observações Importantes

- O Laravel já estava configurado para o timezone correto (`America/Sao_Paulo`)
- O problema estava no frontend JavaScript enviando datas em UTC
- A correção não afeta registros antigos, apenas novos registros
- Para corrigir registros antigos, seria necessário criar um script de migração no backend

## Próximos Passos

Se necessário, você pode criar um script para buscar os arquivos restantes:

```bash
# Listar todos os arquivos que ainda usam toISOString()
grep -r "new Date()\.toISOString()" src --include="*.js" --include="*.jsx"
```

Para substituir automaticamente em um arquivo específico, use o padrão já implementado nos arquivos corrigidos.

