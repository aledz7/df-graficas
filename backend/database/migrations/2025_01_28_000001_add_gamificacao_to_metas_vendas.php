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
        if (!Schema::hasTable('metas_vendas')) {
            return;
        }

        Schema::table('metas_vendas', function (Blueprint $table) {
            // Campos de gamificação
            if (!Schema::hasColumn('metas_vendas', 'pontos_meta')) {
                $table->integer('pontos_meta')->default(0)->after('valor_meta')->comment('Pontos ao bater a meta');
            }

            if (!Schema::hasColumn('metas_vendas', 'percentual_proximo_alerta')) {
                $table->decimal('percentual_proximo_alerta', 5, 2)->nullable()->after('pontos_meta')->comment('Percentual para alertar que está próximo (ex: 80)');
            }

            if (!Schema::hasColumn('metas_vendas', 'premiacao')) {
                $table->json('premiacao')->nullable()->after('percentual_proximo_alerta')->comment('Informações sobre premiação (bônus, brinde, folga, etc)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('metas_vendas')) {
            return;
        }

        Schema::table('metas_vendas', function (Blueprint $table) {
            if (Schema::hasColumn('metas_vendas', 'pontos_meta')) {
                $table->dropColumn('pontos_meta');
            }

            if (Schema::hasColumn('metas_vendas', 'percentual_proximo_alerta')) {
                $table->dropColumn('percentual_proximo_alerta');
            }

            if (Schema::hasColumn('metas_vendas', 'premiacao')) {
                $table->dropColumn('premiacao');
            }
        });
    }
};
