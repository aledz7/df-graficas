<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Venda;
use App\Models\User;

class UpdateVendedorNome extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vendas:update-vendedor-nome';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Atualiza o campo vendedor_nome em todas as vendas baseado no vendedor_id ou usuario_id';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando atualização do campo vendedor_nome...');
        
        $vendas = Venda::whereNull('vendedor_nome')
                      ->orWhere('vendedor_nome', '')
                      ->orWhere('vendedor_nome', 'N/A')
                      ->get();
        
        $this->info("Encontradas {$vendas->count()} vendas para atualizar.");
        
        $updated = 0;
        $errors = 0;
        
        foreach ($vendas as $venda) {
            try {
                $vendedorId = $venda->vendedor_id ?? $venda->usuario_id;
                
                if ($vendedorId) {
                    $vendedor = User::find($vendedorId);
                    
                    if ($vendedor) {
                        $venda->vendedor_nome = $vendedor->name;
                        $venda->save();
                        $updated++;
                        
                        $this->line("✓ Venda {$venda->codigo}: {$vendedor->name}");
                    } else {
                        $this->warn("⚠ Venda {$venda->codigo}: Usuário {$vendedorId} não encontrado");
                        $errors++;
                    }
                } else {
                    $this->warn("⚠ Venda {$venda->codigo}: Sem vendedor_id ou usuario_id");
                    $errors++;
                }
            } catch (\Exception $e) {
                $this->error("✗ Erro ao atualizar venda {$venda->codigo}: {$e->getMessage()}");
                $errors++;
            }
        }
        
        $this->info("\nAtualização concluída!");
        $this->info("✓ Vendas atualizadas: {$updated}");
        $this->info("⚠ Erros: {$errors}");
        
        return 0;
    }
}
