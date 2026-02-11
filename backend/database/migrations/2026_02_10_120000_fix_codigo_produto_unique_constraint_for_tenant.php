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
     * Corrige a constraint unique do codigo_produto para considerar tenant_id.
     * Antes: codigo_produto era único globalmente
     * Depois: codigo_produto é único por tenant (cada tenant pode ter seu próprio código)
     */
    public function up(): void
    {
        // Verificar se o índice antigo existe e removê-lo
        $indexExists = DB::select("SHOW INDEX FROM produtos WHERE Key_name = 'produtos_codigo_produto_unique'");
        if (!empty($indexExists)) {
            Schema::table('produtos', function (Blueprint $table) {
                $table->dropUnique('produtos_codigo_produto_unique');
            });
        }
        
        // Verificar se o novo índice já existe antes de criar
        $newIndexExists = DB::select("SHOW INDEX FROM produtos WHERE Key_name = 'produtos_tenant_codigo_produto_unique'");
        if (empty($newIndexExists)) {
            Schema::table('produtos', function (Blueprint $table) {
                $table->unique(['tenant_id', 'codigo_produto'], 'produtos_tenant_codigo_produto_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            // Remover a constraint composta
            $table->dropUnique('produtos_tenant_codigo_produto_unique');
            
            // Restaurar a constraint original (codigo_produto único globalmente)
            $table->unique('codigo_produto', 'produtos_codigo_produto_unique');
        });
    }
};
