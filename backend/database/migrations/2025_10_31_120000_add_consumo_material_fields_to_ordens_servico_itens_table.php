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
            $table->string('consumo_material_utilizado')->nullable()->after('detalhes');
            $table->decimal('consumo_largura_peca', 10, 2)->nullable()->after('consumo_material_utilizado');
            $table->decimal('consumo_altura_peca', 10, 2)->nullable()->after('consumo_largura_peca');
            $table->integer('consumo_quantidade_solicitada')->nullable()->after('consumo_altura_peca');
            $table->decimal('consumo_largura_chapa', 10, 2)->nullable()->after('consumo_quantidade_solicitada');
            $table->decimal('consumo_altura_chapa', 10, 2)->nullable()->after('consumo_largura_chapa');
            $table->decimal('consumo_valor_unitario_chapa', 10, 2)->nullable()->after('consumo_altura_chapa');
            $table->integer('consumo_pecas_por_chapa')->nullable()->after('consumo_valor_unitario_chapa');
            $table->integer('consumo_chapas_necessarias')->nullable()->after('consumo_pecas_por_chapa');
            $table->decimal('consumo_custo_total', 12, 2)->nullable()->after('consumo_chapas_necessarias');
            $table->decimal('consumo_custo_unitario', 12, 4)->nullable()->after('consumo_custo_total');
            $table->decimal('consumo_aproveitamento_percentual', 5, 2)->nullable()->after('consumo_custo_unitario');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            $table->dropColumn([
                'consumo_material_utilizado',
                'consumo_largura_peca',
                'consumo_altura_peca',
                'consumo_quantidade_solicitada',
                'consumo_largura_chapa',
                'consumo_altura_chapa',
                'consumo_valor_unitario_chapa',
                'consumo_pecas_por_chapa',
                'consumo_chapas_necessarias',
                'consumo_custo_total',
                'consumo_custo_unitario',
                'consumo_aproveitamento_percentual',
            ]);
        });
    }
};

