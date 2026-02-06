<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Remover a constraint unique antiga do id_os
            $table->dropUnique('ordens_servico_id_os_unique');
            
            // Criar nova constraint unique composta (tenant_id + id_os)
            $table->unique(['tenant_id', 'id_os'], 'ordens_servico_tenant_id_os_unique');
        });
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
