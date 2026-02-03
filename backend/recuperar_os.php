<?php

/**
 * Script para recuperar OS deletada (soft delete)
 * 
 * Uso: php recuperar_os.php [numero_os] [tenant_id]
 * Exemplo: php recuperar_os.php 717 1
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use Illuminate\Support\Facades\DB;

$numeroOS = $argv[1] ?? null;
$tenantId = isset($argv[2]) ? (int)$argv[2] : null;

if (!$numeroOS) {
    echo "❌ Erro: Número da OS não informado.\n";
    echo "Uso: php recuperar_os.php [numero_os] [tenant_id]\n";
    echo "Exemplo: php recuperar_os.php 717 1\n";
    exit(1);
}

echo "🔍 Buscando OS com numero_os = {$numeroOS}...\n\n";

// Buscar todas as OS com esse número (incluindo deletadas)
$query = OrdemServico::withoutTenant()
    ->withTrashed()
    ->where('numero_os', $numeroOS);

if ($tenantId) {
    $query->where('tenant_id', $tenantId);
}

$ordensServico = $query->orderBy('created_at', 'desc')->get();

if ($ordensServico->isEmpty()) {
    echo "❌ Nenhuma OS encontrada com numero_os = {$numeroOS}\n";
    exit(1);
}

echo "📋 OS encontradas:\n";
echo str_repeat("=", 80) . "\n";

foreach ($ordensServico as $index => $os) {
    $status = $os->deleted_at ? "❌ DELETADA" : "✅ ATIVA";
    $deletedInfo = $os->deleted_at ? " (Deletada em: {$os->deleted_at})" : "";
    
    echo "\n[{$index + 1}] {$status}{$deletedInfo}\n";
    echo "   ID: {$os->id}\n";
    echo "   ID_OS: {$os->id_os}\n";
    echo "   Número OS: {$os->numero_os}\n";
    echo "   Status: {$os->status_os}\n";
    echo "   Cliente ID: " . ($os->cliente_id ?? 'N/A') . "\n";
    echo "   Valor Total: R$ " . number_format($os->valor_total_os ?? 0, 2, ',', '.') . "\n";
    echo "   Data Criação: {$os->data_criacao}\n";
    echo "   Tenant ID: {$os->tenant_id}\n";
    
    // Contar itens
    $itensCount = OrdemServicoItem::withoutTenant()
        ->withTrashed()
        ->where('ordem_servico_id', $os->id)
        ->count();
    echo "   Itens: {$itensCount}\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

// Se houver OS deletadas, perguntar se deseja restaurar
$osDeletadas = $ordensServico->whereNotNull('deleted_at');

if ($osDeletadas->isNotEmpty()) {
    echo "\n⚠️  Encontradas " . $osDeletadas->count() . " OS deletada(s).\n";
    echo "Deseja restaurar? (s/n): ";
    
    $handle = fopen("php://stdin", "r");
    $resposta = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($resposta) === 's' || strtolower($resposta) === 'sim') {
        foreach ($osDeletadas as $os) {
            echo "\n🔄 Restaurando OS ID: {$os->id} (ID_OS: {$os->id_os})...\n";
            
            DB::transaction(function () use ($os) {
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
                
                // Verificar se há conflito de id_os
                $conflito = OrdemServico::withoutTenant()
                    ->where('id_os', $os->id_os)
                    ->where('id', '!=', $os->id)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($conflito) {
                    echo "   ⚠️  ATENÇÃO: Existe outra OS ativa com mesmo id_os ({$os->id_os})!\n";
                    echo "   📝 Gerando novo número sequencial para a OS restaurada...\n";
                    
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
                    $os->save();
                    
                    echo "   ✅ Nova OS restaurada com numero_os = {$novoNumero} e id_os = {$os->id_os}\n";
                } else {
                    echo "   ✅ Nenhum conflito detectado\n";
                }
            });
        }
        
        echo "\n✅ Processo concluído!\n";
    } else {
        echo "\n❌ Operação cancelada.\n";
    }
} else {
    echo "\n✅ Nenhuma OS deletada encontrada. Todas as OS estão ativas.\n";
}

