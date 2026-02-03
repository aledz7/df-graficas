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
        // Adicionar funcionario_id à tabela vendas
        if (Schema::hasTable('vendas') && !Schema::hasColumn('vendas', 'funcionario_id')) {
            Schema::table('vendas', function (Blueprint $table) {
                $table->unsignedBigInteger('funcionario_id')->nullable()->after('cliente_id');
                $table->index('funcionario_id', 'vendas_funcionario_id_idx');
                
                // Verificar se a tabela funcionarios existe antes de criar a FK
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'vendas_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }

        // Adicionar funcionario_id à tabela ordens_servico
        if (Schema::hasTable('ordens_servico') && !Schema::hasColumn('ordens_servico', 'funcionario_id')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                $table->unsignedBigInteger('funcionario_id')->nullable()->after('cliente_id');
                $table->index('funcionario_id', 'os_funcionario_id_idx');
                
                // Verificar se a tabela funcionarios existe antes de criar a FK
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'os_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }

        // Adicionar funcionario_id à tabela envelopamentos
        if (Schema::hasTable('envelopamentos') && !Schema::hasColumn('envelopamentos', 'funcionario_id')) {
            Schema::table('envelopamentos', function (Blueprint $table) {
                $table->unsignedBigInteger('funcionario_id')->nullable()->after('vendedor_id');
                $table->index('funcionario_id', 'env_funcionario_id_idx');
                
                // Verificar se a tabela funcionarios existe antes de criar a FK
                if (Schema::hasTable('funcionarios')) {
                    $table->foreign('funcionario_id', 'env_funcionario_id_fk')
                        ->references('id')->on('funcionarios')
                        ->nullOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover funcionario_id da tabela vendas
        if (Schema::hasTable('vendas') && Schema::hasColumn('vendas', 'funcionario_id')) {
            Schema::table('vendas', function (Blueprint $table) {
                if (Schema::hasTable('funcionarios')) {
                    $table->dropForeign('vendas_funcionario_id_fk');
                }
                $table->dropIndex('vendas_funcionario_id_idx');
                $table->dropColumn('funcionario_id');
            });
        }

        // Remover funcionario_id da tabela ordens_servico
        if (Schema::hasTable('ordens_servico') && Schema::hasColumn('ordens_servico', 'funcionario_id')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                if (Schema::hasTable('funcionarios')) {
                    $table->dropForeign('os_funcionario_id_fk');
                }
                $table->dropIndex('os_funcionario_id_idx');
                $table->dropColumn('funcionario_id');
            });
        }

        // Remover funcionario_id da tabela envelopamentos
        if (Schema::hasTable('envelopamentos') && Schema::hasColumn('envelopamentos', 'funcionario_id')) {
            Schema::table('envelopamentos', function (Blueprint $table) {
                if (Schema::hasTable('funcionarios')) {
                    $table->dropForeign('env_funcionario_id_fk');
                }
                $table->dropIndex('env_funcionario_id_idx');
                $table->dropColumn('funcionario_id');
            });
        }
    }
};