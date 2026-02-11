<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Corrige a constraint unique do id_os para considerar tenant_id.
     * Antes: id_os era único globalmente
     * Depois: id_os é único por tenant (cada tenant pode ter seu próprio OS-1)
     */
    public function up(): void
    {
        // Verificar se o índice antigo existe e removê-lo
        $indexExists = DB::select("SHOW INDEX FROM ordens_servico WHERE Key_name = 'ordens_servico_id_os_unique'");
        if (!empty($indexExists)) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                $table->dropUnique('ordens_servico_id_os_unique');
            });
        }
        
        // Verificar se o novo índice já existe antes de criar
        $newIndexExists = DB::select("SHOW INDEX FROM ordens_servico WHERE Key_name = 'ordens_servico_tenant_id_os_unique'");
        if (empty($newIndexExists)) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                $table->unique(['tenant_id', 'id_os'], 'ordens_servico_tenant_id_os_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Remover a constraint composta
            $table->dropUnique('ordens_servico_tenant_id_os_unique');
            
            // Restaurar a constraint original (id_os único globalmente)
            $table->unique('id_os', 'ordens_servico_id_os_unique');
        });
    }
};
