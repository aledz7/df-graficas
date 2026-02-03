<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class SyncDashboardData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dashboard:sync {--user-id= : ID do usuário específico}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincroniza e verifica dados do dashboard';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->option('user-id');
        
        if ($userId) {
            $users = User::where('id', $userId)->get();
        } else {
            $users = User::all();
        }

        foreach ($users as $user) {
            $this->info("Verificando dados para usuário: {$user->name} (ID: {$user->id})");
            
            // Verificar vendas
            $this->checkVendas($user);
            
            // Verificar OS
            $this->checkOrdensServico($user);
            
            // Verificar envelopamentos
            $this->checkEnvelopamentos($user);
            
            // Verificar produtos
            $this->checkProdutos($user);
            
            $this->line('');
        }
        
        $this->info('Verificação concluída!');
    }
    
    private function checkVendas($user)
    {
        $this->line('📊 Verificando vendas...');
        
        // Vendas na tabela vendas
        $vendasTable = DB::table('vendas')
            ->where('tenant_id', $user->tenant_id)
            ->whereJsonContains('metadados->origem', 'PDV')
            ->count();
            
        $this->line("   - Tabela vendas: {$vendasTable} vendas PDV");
        
        // Vendas no localStorage
        $vendasLocalStorage = DB::table('dados_usuario')
            ->where('user_id', $user->id)
            ->where('chave', 'historico_vendas_pdv')
            ->first();
            
        if ($vendasLocalStorage) {
            $vendas = json_decode($vendasLocalStorage->valor, true);
            $this->line("   - localStorage: " . count($vendas) . " vendas");
        } else {
            $this->line("   - localStorage: 0 vendas");
        }
    }
    
    private function checkOrdensServico($user)
    {
        $this->line('📋 Verificando ordens de serviço...');
        
        $osData = DB::table('dados_usuario')
            ->where('user_id', $user->id)
            ->where('chave', 'ordens_servico_salvas')
            ->first();
            
        if ($osData) {
            $os = json_decode($osData->valor, true);
            $this->line("   - Total de OS: " . count($os));
            
            $statusCount = [];
            foreach ($os as $ordem) {
                $status = $ordem['status_os'] ?? 'sem status';
                $statusCount[$status] = ($statusCount[$status] ?? 0) + 1;
            }
            
            foreach ($statusCount as $status => $count) {
                $this->line("     * {$status}: {$count}");
            }
            
            // OS em aberto
            $osAberto = array_filter($os, function($o) {
                return in_array($o['status_os'] ?? '', [
                    'Aguardando Produção', 
                    'Em Produção', 
                    'Aguardando Aprovação Cliente', 
                    'Orçamento Salvo'
                ]);
            });
            
            $this->line("   - OS em aberto: " . count($osAberto));
        } else {
            $this->line("   - Nenhuma OS encontrada");
        }
    }
    
    private function checkEnvelopamentos($user)
    {
        $this->line('🎨 Verificando envelopamentos...');
        
        // Envelopamentos na tabela
        $envelopamentosTable = DB::table('envelopamentos')
            ->where('tenant_id', $user->tenant_id)
            ->count();
            
        $this->line("   - Tabela envelopamentos: {$envelopamentosTable} registros");
        
        // Envelopamentos no localStorage
        $envData = DB::table('dados_usuario')
            ->where('user_id', $user->id)
            ->where('chave', 'envelopamentosOrcamentos')
            ->first();
            
        if ($envData) {
            $envelopamentos = json_decode($envData->valor, true);
            $this->line("   - localStorage: " . count($envelopamentos) . " envelopamentos");
            
            $statusCount = [];
            foreach ($envelopamentos as $env) {
                $status = $env['status'] ?? 'sem status';
                $statusCount[$status] = ($statusCount[$status] ?? 0) + 1;
            }
            
            foreach ($statusCount as $status => $count) {
                $this->line("     * {$status}: {$count}");
            }
            
            // Envelopamentos orçados
            $envOrcados = array_filter($envelopamentos, function($e) {
                return in_array($e['status'] ?? '', ['Orçamento Salvo', 'Rascunho']);
            });
            
            $this->line("   - Envelopamentos orçados: " . count($envOrcados));
        } else {
            $this->line("   - Nenhum envelopamento encontrado");
        }
    }
    
    private function checkProdutos($user)
    {
        $this->line('📦 Verificando produtos...');
        
        // Produtos na tabela produtos
        $produtosTable = DB::table('produtos')
            ->where('tenant_id', $user->tenant_id)
            ->get(['id', 'nome', 'estoque', 'estoque_minimo']);
            
        $this->line("   - Tabela produtos: {$produtosTable->count()} produtos");
        
        // Produtos com estoque baixo
        $estoqueBaixo = $produtosTable->filter(function($p) {
            return floatval($p->estoque) <= floatval($p->estoque_minimo);
        });
        
        $this->line("   - Produtos com estoque baixo: {$estoqueBaixo->count()}");
        
        foreach ($estoqueBaixo as $produto) {
            $this->line("     * {$produto->nome}: estoque={$produto->estoque}, mínimo={$produto->estoque_minimo}");
        }
        
        // Produtos no localStorage
        $produtosLocalStorage = DB::table('dados_usuario')
            ->where('user_id', $user->id)
            ->where('chave', 'produtos')
            ->first();
            
        if ($produtosLocalStorage) {
            $produtos = json_decode($produtosLocalStorage->valor, true);
            $this->line("   - localStorage: " . count($produtos) . " produtos");
            
            $estoqueBaixoLocal = array_filter($produtos, function($p) {
                return isset($p['estoque']) && isset($p['estoque_minimo']) && 
                       floatval($p['estoque']) <= floatval($p['estoque_minimo']);
            });
            
            $this->line("   - Com estoque baixo no localStorage: " . count($estoqueBaixoLocal));
        } else {
            $this->line("   - Nenhum produto encontrado no localStorage");
        }
    }
} 