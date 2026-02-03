<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Adicionar tenant_id à tabela ordens_servico_itens
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('detalhes');
        });
        
        // Adicionar tenant_id à tabela ordens_servico_anexos
        Schema::table('ordens_servico_anexos', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('tamanho_kb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover tenant_id da tabela ordens_servico_itens
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
        
        // Remover tenant_id da tabela ordens_servico_anexos
        Schema::table('ordens_servico_anexos', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
    }
};
