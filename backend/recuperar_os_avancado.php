<?php

/**
 * Script avançado para encontrar e recuperar OS perdida
 * 
 * Uso: php recuperar_os_avancado.php [numero_os] [tenant_id]
 * Exemplo: php recuperar_os_avancado.php 717 1
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

$numeroOS = $argv[1] ?? null;
$tenantId = isset($argv[2]) ? (int)$argv[2] : null;

if (!$numeroOS) {
    echo "❌ Erro: Número da OS não informado.\n";
    echo "Uso: php recuperar_os_avancado.php [numero_os] [tenant_id]\n";
    echo "Exemplo: php recuperar_os_avancado.php 717 1\n";
    exit(1);
}

echo "🔍 Busca avançada por OS {$numeroOS}...\n\n";

// 1. Buscar por numero_os exato
echo "1️⃣ Buscando por numero_os = {$numeroOS}...\n";
$query1 = OrdemServico::withoutTenant()
    ->withTrashed()
    ->where('numero_os', $numeroOS);
if ($tenantId) $query1->where('tenant_id', $tenantId);
$resultados1 = $query1->get();
echo "   Encontradas: {$resultados1->count()}\n\n";

// 2. Buscar por id_os
echo "2️⃣ Buscando por id_os = 'OS-{$numeroOS}'...\n";
$query2 = OrdemServico::withoutTenant()
    ->withTrashed()
    ->where('id_os', "OS-{$numeroOS}");
if ($tenantId) $query2->where('tenant_id', $tenantId);
$resultados2 = $query2->get();
echo "   Encontradas: {$resultados2->count()}\n\n";

// 3. Buscar por números próximos
echo "3️⃣ Buscando por números próximos (715-719)...\n";
$query3 = OrdemServico::withoutTenant()
    ->withTrashed()
    ->whereBetween('numero_os', [$numeroOS - 2, $numeroOS + 2]);
if ($tenantId) $query3->where('tenant_id', $tenantId);
$resultados3 = $query3->orderBy('numero_os')->get();
echo "   Encontradas: {$resultados3->count()}\n\n";

// 4. Buscar OS atualizadas recentemente (últimas 2 horas)
echo "4️⃣ Buscando OS atualizadas nas últimas 2 horas...\n";
$query4 = OrdemServico::withoutTenant()
    ->withTrashed()
    ->where('updated_at', '>=', now()->subHours(2))
    ->whereNull('deleted_at');
if ($tenantId) $query4->where('tenant_id', $tenantId);
$resultados4 = $query4->orderByDesc('updated_at')->limit(20)->get();
echo "   Encontradas: {$resultados4->count()}\n\n";

// 5. Buscar OS deletadas recentemente
echo "5️⃣ Buscando OS deletadas nas últimas 24 horas...\n";
$query5 = OrdemServico::withoutTenant()
    ->onlyTrashed()
    ->where('deleted_at', '>=', now()->subDay());
if ($tenantId) $query5->where('tenant_id', $tenantId);
$resultados5 = $query5->orderByDesc('deleted_at')->get();
echo "   Encontradas: {$resultados5->count()}\n\n";

// Combinar todos os resultados únicos
$todasOS = collect()
    ->merge($resultados1)
    ->merge($resultados2)
    ->merge($resultados3)
    ->merge($resultados4)
    ->merge($resultados5)
    ->unique('id');

echo "📊 RESUMO TOTAL:\n";
echo str_repeat("=", 80) . "\n";
echo "Total de OS encontradas: {$todasOS->count()}\n\n";

if ($todasOS->isEmpty()) {
    echo "❌ Nenhuma OS encontrada com os critérios de busca.\n";
    echo "\n💡 SUGESTÕES:\n";
    echo "   - A OS pode ter sido hard-deleted (removida permanentemente)\n";
    echo "   - O número pode ter sido alterado para outro valor\n";
    echo "   - Verifique os logs do Laravel em storage/logs/laravel.log\n";
    echo "   - Execute as queries SQL em buscar_os_perdida_717.sql para busca mais ampla\n";
    exit(1);
}

// Agrupar por status
$ativas = $todasOS->whereNull('deleted_at');
$deletadas = $todasOS->whereNotNull('deleted_at');

echo "✅ OS Ativas: {$ativas->count()}\n";
echo "❌ OS Deletadas: {$deletadas->count()}\n\n";

// Mostrar detalhes
echo "📋 DETALHES DAS OS ENCONTRADAS:\n";
echo str_repeat("=", 80) . "\n";

foreach ($todasOS->take(20) as $index => $os) {
    $status = $os->deleted_at ? "❌ DELETADA" : "✅ ATIVA";
    $deletedInfo = $os->deleted_at ? " (Deletada: {$os->deleted_at->format('d/m/Y H:i')})" : "";
    
    echo "\n[{$index + 1}] {$status}{$deletedInfo}\n";
    echo "   ID: {$os->id}\n";
    echo "   ID_OS: {$os->id_os}\n";
    echo "   Número OS: {$os->numero_os}\n";
    echo "   Status: {$os->status_os}\n";
    echo "   Cliente ID: " . ($os->cliente_id ?? 'N/A') . "\n";
    echo "   Valor Total: R$ " . number_format($os->valor_total_os ?? 0, 2, ',', '.') . "\n";
    echo "   Criada em: {$os->created_at->format('d/m/Y H:i:s')}\n";
    echo "   Atualizada em: {$os->updated_at->format('d/m/Y H:i:s')}\n";
    
    if ($os->deleted_at) {
        $horasDeletada = $os->deleted_at->diffInHours(now());
        echo "   ⏰ Deletada há: {$horasDeletada} hora(s)\n";
    }
    
    // Contar itens
    $itensCount = OrdemServicoItem::withoutTenant()
        ->withTrashed()
        ->where('ordem_servico_id', $os->id)
        ->count();
    echo "   Itens: {$itensCount}\n";
}

if ($todasOS->count() > 20) {
    echo "\n... e mais " . ($todasOS->count() - 20) . " OS(s)\n";
}

// Se houver OS deletadas, oferecer restaurar
if ($deletadas->isNotEmpty()) {
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "⚠️  Encontradas " . $deletadas->count() . " OS deletada(s).\n";
    echo "Deseja restaurar? (s/n): ";
    
    $handle = fopen("php://stdin", "r");
    $resposta = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($resposta) === 's' || strtolower($resposta) === 'sim') {
        foreach ($deletadas as $os) {
            echo "\n🔄 Restaurando OS ID: {$os->id} (ID_OS: {$os->id_os}, Número: {$os->numero_os})...\n";
            
            try {
                DB::transaction(function () use ($os) {
                    // Verificar conflito antes de restaurar
                    $conflito = OrdemServico::withoutTenant()
                        ->where('id_os', $os->id_os)
                        ->where('id', '!=', $os->id)
                        ->whereNull('deleted_at')
                        ->first();
                    
                    if ($conflito) {
                        echo "   ⚠️  Conflito detectado! Existe outra OS ativa com mesmo id_os.\n";
                        echo "   📝 Gerando novo número sequencial...\n";
                        
                        // Gerar novo número
                        $novoNumero = OrdemServico::withoutTenant()
                            ->withTrashed()
                            ->when($os->tenant_id, function ($query, $tenantId) {
                                $query->where('tenant_id', $tenantId);
                            })
                            ->orderByDesc('numero_os')
                            ->value('numero_os');
                        
                        $novoNumero = ($novoNumero ?? 0) + 1;
                        $os->numero_os = $novoNumero;
                        $os->id_os = "OS-{$novoNumero}";
                        echo "   ✅ Novo número gerado: {$novoNumero}\n";
                    }
                    
                    // Restaurar a OS
                    $os->restore();
                    echo "   ✅ OS restaurada\n";
                    
                    // Restaurar itens
                    $itens = OrdemServicoItem::withoutTenant()
                        ->withTrashed()
                        ->where('ordem_servico_id', $os->id)
                        ->get();
                    
                    foreach ($itens as $item) {
                        $item->restore();
                    }
                    
                    echo "   ✅ {$itens->count()} item(ns) restaurado(s)\n";
                });
                
                echo "   ✅ OS restaurada com sucesso!\n";
            } catch (\Exception $e) {
                echo "   ❌ Erro ao restaurar: {$e->getMessage()}\n";
            }
        }
        
        echo "\n✅ Processo concluído!\n";
    } else {
        echo "\n❌ Operação cancelada.\n";
    }
}

// Verificar logs do Laravel
echo "\n" . str_repeat("=", 80) . "\n";
echo "📝 Verificando logs do Laravel...\n";

$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    echo "   Arquivo de log encontrado: {$logFile}\n";
    echo "   Tamanho: " . number_format(filesize($logFile) / 1024, 2) . " KB\n";
    
    // Buscar últimas linhas do log que mencionam OS 717
    $command = "tail -1000 {$logFile} | grep -i '717\\|OS-717' | tail -20";
    $logResults = shell_exec($command);
    
    if ($logResults) {
        echo "\n   📋 Últimas menções a OS 717 nos logs:\n";
        echo "   " . str_repeat("-", 76) . "\n";
        $lines = explode("\n", trim($logResults));
        foreach (array_slice($lines, -10) as $line) {
            if (trim($line)) {
                echo "   " . substr($line, 0, 76) . "\n";
            }
        }
    } else {
        echo "   ℹ️  Nenhuma menção a OS 717 encontrada nos logs recentes.\n";
    }
} else {
    echo "   ⚠️  Arquivo de log não encontrado.\n";
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "✅ Busca concluída!\n";

