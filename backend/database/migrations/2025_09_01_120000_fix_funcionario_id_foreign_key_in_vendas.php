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
        // Corrigir a foreign key funcionario_id na tabela vendas
        if (Schema::hasTable('vendas') && Schema::hasColumn('vendas', 'funcionario_id')) {
            Schema::table('vendas', function (Blueprint $table) {
                // Remover a foreign key existente que referencia funcionarios
                $table->dropForeign('vendas_funcionario_id_fk');
                
                // Recriar a foreign key para referenciar users
                $table->foreign('funcionario_id', 'vendas_funcionario_id_fk')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            });
        }

        // Corrigir a foreign key funcionario_id na tabela ordens_servico
        if (Schema::hasTable('ordens_servico') && Schema::hasColumn('ordens_servico', 'funcionario_id')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                // Remover a foreign key existente que referencia funcionarios
                $table->dropForeign('os_funcionario_id_fk');
                
                // Recriar a foreign key para referenciar users
                $table->foreign('funcionario_id', 'os_funcionario_id_fk')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            });
        }

        // Corrigir a foreign key funcionario_id na tabela envelopamentos
        if (Schema::hasTable('envelopamentos') && Schema::hasColumn('envelopamentos', 'funcionario_id')) {
            Schema::table('envelopamentos', function (Blueprint $table) {
                // Remover a foreign key existente que referencia funcionarios
                $table->dropForeign('env_funcionario_id_fk');
                
                // Recriar a foreign key para referenciar users
                $table->foreign('funcionario_id', 'env_funcionario_id_fk')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverter as foreign keys para funcionarios (se necessário)
        if (Schema::hasTable('vendas') && Schema::hasColumn('vendas', 'funcionario_id')) {
            Schema::table('vendas', function (Blueprint $table) {
                $table->dropForeign('vendas_funcionario_id_fk');
                
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'vendas_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('ordens_servico') && Schema::hasColumn('ordens_servico', 'funcionario_id')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                $table->dropForeign('os_funcionario_id_fk');
                
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'os_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('envelopamentos') && Schema::hasColumn('envelopamentos', 'funcionario_id')) {
            Schema::table('envelopamentos', function (Blueprint $table) {
                $table->dropForeign('env_funcionario_id_fk');
                
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'env_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }
    }
};
