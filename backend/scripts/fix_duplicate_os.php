<?php

/**
 * Script para identificar e corrigir OSs duplicadas
 * 
 * Este script identifica OSs que podem ter sido criadas com IDs duplicados
 * e sugere correções.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Support\Str;

// Configurar conexão com banco
$capsule = new DB;
$capsule->addConnection([
    'driver' => 'mysql',
    'host' => env('DB_HOST', 'localhost'),
    'database' => env('DB_DATABASE', 'jet_impre'),
    'username' => env('DB_USERNAME', 'root'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'collation' => 'utf8_unicode_ci',
    'prefix' => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

echo "🔍 Verificando OSs duplicadas...\n\n";

// Buscar OSs com IDs similares (mesmo cliente, valor similar, datas próximas)
$osDuplicadas = DB::table('ordens_servico')
    ->select('id', 'id_os', 'cliente_id', 'valor_total_os', 'data_criacao', 'status_os')
    ->orderBy('cliente_id')
    ->orderBy('data_criacao')
    ->get();

$gruposDuplicados = [];
$osProcessadas = [];

foreach ($osDuplicadas as $os) {
    if (in_array($os->id, $osProcessadas)) {
        continue;
    }
    
    $grupo = [];
    
    // Buscar OSs similares
    foreach ($osDuplicadas as $outraOS) {
        if ($outraOS->id === $os->id || in_array($outraOS->id, $osProcessadas)) {
            continue;
        }
        
        // Critérios para considerar duplicada:
        // 1. Mesmo cliente
        // 2. Valor similar (diferença de até R$ 1,00)
        // 3. Data de criação próxima (até 1 hora de diferença)
        // 4. Status similar
        
        $mesmoCliente = $os->cliente_id === $outraOS->cliente_id;
        $valorSimilar = abs($os->valor_total_os - $outraOS->valor_total_os) <= 1.00;
        $dataProxima = abs(strtotime($os->data_criacao) - strtotime($outraOS->data_criacao)) <= 3600; // 1 hora
        $statusSimilar = $os->status_os === $outraOS->status_os;
        
        if ($mesmoCliente && $valorSimilar && $dataProxima && $statusSimilar) {
            $grupo[] = $outraOS;
            $osProcessadas[] = $outraOS->id;
        }
    }
    
    if (!empty($grupo)) {
        $grupo[] = $os;
        $osProcessadas[] = $os->id;
        $gruposDuplicados[] = $grupo;
    }
}

if (empty($gruposDuplicados)) {
    echo "✅ Nenhuma OS duplicada encontrada!\n";
    exit(0);
}

echo "⚠️  Encontradas " . count($gruposDuplicados) . " grupos de OSs possivelmente duplicadas:\n\n";

foreach ($gruposDuplicados as $index => $grupo) {
    echo "Grupo " . ($index + 1) . ":\n";
    echo str_repeat("-", 50) . "\n";
    
    foreach ($grupo as $os) {
        echo sprintf(
            "ID: %d | OS: %s | Cliente: %s | Valor: R$ %.2f | Data: %s | Status: %s\n",
            $os->id,
            $os->id_os,
            $os->cliente_id,
            $os->valor_total_os,
            $os->data_criacao,
            $os->status_os
        );
    }
    echo "\n";
}

echo "📋 Sugestões de correção:\n";
echo "1. Manter a OS com ID menor (mais antiga)\n";
echo "2. Renomear as outras OSs com IDs únicos\n";
echo "3. Verificar se são realmente duplicadas antes de excluir\n\n";

echo "🔧 Para corrigir automaticamente, execute:\n";
echo "php fix_duplicate_os.php --fix\n\n";

// Se o parâmetro --fix foi passado, executar correção
if (isset($argv[1]) && $argv[1] === '--fix') {
    echo "🔧 Iniciando correção automática...\n\n";
    
    foreach ($gruposDuplicados as $index => $grupo) {
        echo "Processando grupo " . ($index + 1) . "...\n";
        
        // Ordenar por ID (manter a mais antiga)
        usort($grupo, function($a, $b) {
            return $a->id - $b->id;
        });
        
        $osPrincipal = array_shift($grupo); // Primeira OS (mais antiga)
        
        foreach ($grupo as $osDuplicada) {
            // Gerar novo ID único
            $novoId = 'OS-' . now()->format('YmdHis') . '-' . Str::random(4);
            
            echo "  Renomeando OS {$osDuplicada->id_os} para {$novoId}...\n";
            
            try {
                DB::table('ordens_servico')
                    ->where('id', $osDuplicada->id)
                    ->update(['id_os' => $novoId]);
                
                echo "  ✅ OS renomeada com sucesso!\n";
            } catch (Exception $e) {
                echo "  ❌ Erro ao renomear OS: " . $e->getMessage() . "\n";
            }
        }
        
        echo "\n";
    }
    
    echo "✅ Correção concluída!\n";
}
