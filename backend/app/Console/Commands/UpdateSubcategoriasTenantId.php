<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Subcategoria;
use App\Models\Categoria;

class UpdateSubcategoriasTenantId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subcategorias:update-tenant';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Atualiza o tenant_id das subcategorias baseado na categoria pai';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando atualização dos tenant_ids das subcategorias...');

        $subcategorias = Subcategoria::whereNull('tenant_id')->get();
        $total = $subcategorias->count();
        $updated = 0;

        $this->info("Encontradas {$total} subcategorias para atualizar.");

        foreach ($subcategorias as $subcategoria) {
            $categoria = Categoria::find($subcategoria->categoria_id);
            
            if ($categoria) {
                $subcategoria->tenant_id = $categoria->tenant_id;
                $subcategoria->save();
                $updated++;
                
                $this->info("Subcategoria ID {$subcategoria->id} atualizada com tenant_id {$categoria->tenant_id}");
            } else {
                $this->error("Categoria não encontrada para subcategoria ID {$subcategoria->id}");
            }
        }

        $this->info("Atualização concluída! {$updated} de {$total} subcategorias foram atualizadas.");
    }
} 