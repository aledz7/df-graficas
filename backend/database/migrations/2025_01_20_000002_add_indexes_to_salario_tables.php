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
        // Adicionar índices à tabela funcionario_salario_historico
        if (Schema::hasTable('funcionario_salario_historico')) {
            Schema::table('funcionario_salario_historico', function (Blueprint $table) {
                if (!Schema::hasIndex('funcionario_salario_historico', 'idx_func_salario_hist')) {
                    $table->index(['funcionario_id', 'data_alteracao'], 'idx_func_salario_hist');
                }
            });
        }

        // Adicionar índices à tabela funcionario_relatorios_mensais
        if (Schema::hasTable('funcionario_relatorios_mensais')) {
            Schema::table('funcionario_relatorios_mensais', function (Blueprint $table) {
                if (!Schema::hasIndex('funcionario_relatorios_mensais', 'idx_func_relatorio_unique')) {
                    $table->unique(['funcionario_id', 'mes', 'ano'], 'idx_func_relatorio_unique');
                }
                if (!Schema::hasIndex('funcionario_relatorios_mensais', 'idx_func_relatorio_ano_mes')) {
                    $table->index(['funcionario_id', 'ano', 'mes'], 'idx_func_relatorio_ano_mes');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover índices da tabela funcionario_salario_historico
        if (Schema::hasTable('funcionario_salario_historico')) {
            Schema::table('funcionario_salario_historico', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_func_salario_hist');
            });
        }

        // Remover índices da tabela funcionario_relatorios_mensais
        if (Schema::hasTable('funcionario_relatorios_mensais')) {
            Schema::table('funcionario_relatorios_mensais', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_func_relatorio_unique');
                $table->dropIndexIfExists('idx_func_relatorio_ano_mes');
            });
        }
    }
}; 