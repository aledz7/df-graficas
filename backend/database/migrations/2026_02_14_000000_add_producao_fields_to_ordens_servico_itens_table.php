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
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            // Adicionar campos de produção se não existirem
            if (!Schema::hasColumn('ordens_servico_itens', 'data_inicio_producao')) {
                $table->datetime('data_inicio_producao')->nullable()->after('detalhes');
            }
            
            if (!Schema::hasColumn('ordens_servico_itens', 'data_conclusao_producao')) {
                $table->datetime('data_conclusao_producao')->nullable()->after('data_inicio_producao');
            }
            
            if (!Schema::hasColumn('ordens_servico_itens', 'is_refacao')) {
                $table->boolean('is_refacao')->default(false)->after('data_conclusao_producao');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            if (Schema::hasColumn('ordens_servico_itens', 'is_refacao')) {
                $table->dropColumn('is_refacao');
            }
            
            if (Schema::hasColumn('ordens_servico_itens', 'data_conclusao_producao')) {
                $table->dropColumn('data_conclusao_producao');
            }
            
            if (Schema::hasColumn('ordens_servico_itens', 'data_inicio_producao')) {
                $table->dropColumn('data_inicio_producao');
            }
        });
    }
};
