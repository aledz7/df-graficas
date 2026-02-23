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
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'setor')) {
                $table->enum('setor', ['atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral'])->nullable()->after('cargo');
            }

            if (!Schema::hasColumn('users', 'nivel_treinamento_liberado')) {
                $table->enum('nivel_treinamento_liberado', ['iniciante', 'intermediario', 'avancado'])->default('iniciante')->after('setor');
            }

            if (!Schema::hasColumn('users', 'progresso_treinamento')) {
                $table->decimal('progresso_treinamento', 5, 2)->default(0)->comment('Percentual de progresso no treinamento')->after('nivel_treinamento_liberado');
            }

            if (!Schema::hasColumn('users', 'ultimo_acesso_treinamento')) {
                $table->timestamp('ultimo_acesso_treinamento')->nullable()->after('progresso_treinamento');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'setor')) {
                $table->dropColumn('setor');
            }

            if (Schema::hasColumn('users', 'nivel_treinamento_liberado')) {
                $table->dropColumn('nivel_treinamento_liberado');
            }

            if (Schema::hasColumn('users', 'progresso_treinamento')) {
                $table->dropColumn('progresso_treinamento');
            }

            if (Schema::hasColumn('users', 'ultimo_acesso_treinamento')) {
                $table->dropColumn('ultimo_acesso_treinamento');
            }
        });
    }
};
