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
        Schema::table('produtos', function (Blueprint $table) {
            // Tipo de visualização do produto
            if (!Schema::hasColumn('produtos', 'tipo_visualizacao')) {
                $table->enum('tipo_visualizacao', ['vendas', 'catalogo_publico', 'consumo_interno'])
                    ->default('vendas')
                    ->after('uso_interno')
                    ->comment('Tipo de visualização: vendas (Vendas/Comercial), catalogo_publico (Catálogo Público), consumo_interno (Consumo Interno)');
            }

            // Prazo de produção
            if (!Schema::hasColumn('produtos', 'prazo_producao')) {
                $table->string('prazo_producao', 100)->nullable()->after('valor_minimo')
                    ->comment('Prazo de produção do produto (ex: 5 dias, 1 semana)');
            }

            // Prazo de criação de arte
            if (!Schema::hasColumn('produtos', 'prazo_criacao_arte')) {
                $table->string('prazo_criacao_arte', 100)->nullable()->after('prazo_producao')
                    ->comment('Prazo de criação de arte do produto (ex: 3 dias, 48 horas)');
            }

            // Flag para variações usarem preço base
            if (!Schema::hasColumn('produtos', 'variacoes_usa_preco_base')) {
                $table->boolean('variacoes_usa_preco_base')->default(true)->after('variacao_obrigatoria')
                    ->comment('Se true, variações usam o preço base do produto. Se false, cada variação pode ter preço específico.');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            if (Schema::hasColumn('produtos', 'tipo_visualizacao')) {
                $table->dropColumn('tipo_visualizacao');
            }
            if (Schema::hasColumn('produtos', 'prazo_producao')) {
                $table->dropColumn('prazo_producao');
            }
            if (Schema::hasColumn('produtos', 'prazo_criacao_arte')) {
                $table->dropColumn('prazo_criacao_arte');
            }
            if (Schema::hasColumn('produtos', 'variacoes_usa_preco_base')) {
                $table->dropColumn('variacoes_usa_preco_base');
            }
        });
    }
};
