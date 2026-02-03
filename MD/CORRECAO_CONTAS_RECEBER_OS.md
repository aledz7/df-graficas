# Correção de Vínculos entre Contas a Receber e Ordens de Serviço

**Data:** 16 de Outubro de 2025  
**Status:** ✅ Corrigido

## 📋 Problema Identificado

### Sintoma Reportado
O usuário reportou que "a OS 170" aparecia com valores diferentes em dois locais:
- `/financeiro/contas-receber`: R$ 20,01
- `/operacional/os-historico`: R$ 184,08

### Causa Raiz

**Confusão de nomenclatura:** O número **170** referia-se a **dois registros diferentes**:

1. **Conta a Receber ID 170**:
   - Valor: R$ 20,01 ✓
   - Relacionada à OS-1757938512622-907d (OS ID 176)
   - ❌ **Bug**: Campo `os_id` estava NULL

2. **Ordem de Serviço ID 170**:
   - ID_OS: OS-1757706112704-8ac1
   - Valor: R$ 184,08 ✓
   - Status: Orçamento Salvo (sem conta a receber)

### Problema Técnico

**46 contas a receber** estavam com o campo `os_id` NULL, apesar de terem uma OS mencionada no campo `observacoes`. Isso quebrava o vínculo entre a conta e a OS, impossibilitando:
- Consultar a OS a partir da conta a receber
- Rastrear pagamentos de crediário
- Gerar relatórios corretos

## 🔧 Correções Realizadas

### 1. Correção Imediata (Manual)

Executamos um script SQL que:
- Identificou 46 contas sem vínculo
- Corrigiu 41 contas automaticamente
- 5 contas não puderam ser vinculadas (OS deletadas)

```php
// Código executado via tinker
$contas = ContaReceber::whereNull('os_id')
    ->whereNotNull('observacoes')
    ->where('observacoes', 'LIKE', '%Ordem de Serviço:%')
    ->get();

foreach ($contas as $conta) {
    preg_match('/Ordem de Serviço: (OS-[a-zA-Z0-9-]+)/', $conta->observacoes, $matches);
    if (isset($matches[1])) {
        $os = OrdemServico::where('id_os', $matches[1])->first();
        if ($os) {
            $conta->os_id = $os->id;
            $conta->save();
        }
    }
}
```

### 2. Comando Artisan para Verificação

Criado comando para verificação periódica:

```bash
# Verificar vínculos
php artisan contas:verificar-os

# Corrigir automaticamente
php artisan contas:verificar-os --fix
```

**Localização:** `/backend/app/Console/Commands/VerificarContasReceberOS.php`

## 📊 Diferenças de Valores (Explicação)

Durante a verificação, identificamos que **27 contas** têm valores diferentes das suas respectivas OS. **Isso é CORRETO e esperado** quando:

### Exemplo Real:
- **OS ID 68** (OS-1756319867176-ad0b):
  - Valor Total: R$ 651,49
  - Pagamentos:
    - Transferência Bancária: R$ 300,00 (à vista)
    - Crediário: R$ 351,49 (a prazo)

- **Conta a Receber ID 43**:
  - Valor: R$ 351,49 ✓ (apenas o crediário)

### Por que a diferença é correta?

A conta a receber registra **apenas o valor do crediário**, não o valor total da OS. O valor pago à vista (transferência, dinheiro, PIX, etc.) é registrado diretamente como recebido e não gera conta a receber.

## 🔍 Código Analisado

### Backend - Criação de Conta a Receber

**Arquivo:** `/backend/app/Http/Controllers/Api/OrdemServicoController.php`  
**Método:** `criarContaReceberOS()` (linha 1560)

```php
protected function criarContaReceberOS(OrdemServico $os)
{
    // Verificar se há pagamentos com Crediário
    $pagamentos = $os->pagamentos ?? [];
    $pagamentosCrediario = collect($pagamentos)->filter(function($pagamento) {
        return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
    });

    if ($pagamentosCrediario->isEmpty()) {
        return; // Não criar conta se não houver crediário
    }

    // Calcular valor total dos pagamentos crediário
    $valorCrediario = $pagamentosCrediario->sum('valor');

    // Preparar dados da conta a receber
    $dadosContaReceber = [
        'cliente_id' => $os->cliente_id,
        'os_id' => $os->id,  // ✓ Campo está sendo preenchido corretamente
        'descricao' => "OS #{$os->id} - Crediário",
        'valor_original' => $valorCrediario,
        'valor_pendente' => $valorCrediario,
        // ... outros campos
    ];

    ContaReceber::create($dadosContaReceber);
}
```

**Status:** ✅ O código está correto. O problema era residual de versões anteriores.

## 🛡️ Prevenção Futura

### 1. Comando de Verificação Periódica

Adicionar ao cron (recomendado: diário):

```bash
# /etc/cron.d/jet-impre
0 2 * * * cd /var/www/html/jet-impre/backend && php artisan contas:verificar-os --fix >> /var/log/contas-verificacao.log 2>&1
```

### 2. Validação na Migration

Considerar adicionar constraint foreign key na próxima migration:

```php
Schema::table('contas_receber', function (Blueprint $table) {
    $table->foreign('os_id')
          ->references('id')
          ->on('ordens_servico')
          ->onDelete('set null');
});
```

### 3. Teste Automatizado

Criar teste para garantir que contas criadas sempre têm `os_id`:

```php
public function test_conta_receber_criada_com_os_id()
{
    // Criar OS com crediário
    $os = OrdemServico::factory()->create([
        'pagamentos' => [
            ['metodo' => 'Crediário', 'valor' => 100]
        ]
    ]);

    // Finalizar OS
    $controller = new OrdemServicoController();
    $controller->update(request(), $os->id);

    // Verificar conta a receber
    $conta = ContaReceber::where('os_id', $os->id)->first();
    $this->assertNotNull($conta);
    $this->assertEquals($os->id, $conta->os_id);
}
```

## 📈 Resultados

| Métrica | Antes | Depois |
|---------|-------|--------|
| Contas sem vínculo | 46 | 5* |
| Contas corrigidas | 0 | 41 |
| Integridade de dados | ❌ 89% | ✅ 99% |

\* As 5 contas restantes têm OS deletadas (soft delete), o que é esperado.

## 📝 Recomendações

1. ✅ **Executar verificação periódica** com o comando criado
2. ⚠️ **Monitorar logs** do Laravel para erros ao criar contas
3. 📊 **Adicionar dashboard** mostrando contas sem vínculo
4. 🔔 **Criar alerta** quando houver mais de 5 contas sem vínculo
5. 📚 **Documentar** para a equipe a diferença entre ID da conta e ID da OS

## 🔗 Arquivos Relacionados

- `/backend/app/Models/ContaReceber.php`
- `/backend/app/Models/OrdemServico.php`
- `/backend/app/Http/Controllers/Api/OrdemServicoController.php` (linha 1560)
- `/backend/app/Console/Commands/VerificarContasReceberOS.php` (novo)
- `/src/hooks/os/osLifecycleHandlers.js`

## ✅ Checklist de Implementação

- [x] Identificar causa raiz
- [x] Corrigir contas existentes (41 de 46)
- [x] Criar comando de verificação
- [x] Documentar problema e solução
- [ ] Adicionar ao cron diário
- [ ] Criar teste automatizado
- [ ] Adicionar constraint foreign key
- [ ] Criar dashboard de monitoramento

---

**Autor:** Sistema Automatizado  
**Revisado por:** [Nome do Desenvolvedor]  
**Aprovado em:** [Data]

