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
        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo_produto')->unique();
            $table->string('nome');
            $table->boolean('status')->default(true);
            $table->string('unidade_medida')->default('unidade');
            $table->string('tipo_produto')->default('unidade'); // 'unidade' ou 'm2'
            $table->string('categoria_id')->nullable();
            $table->string('subcategoria_id')->nullable();
            $table->text('descricao_curta')->nullable();
            $table->text('descricao_longa')->nullable();
            $table->string('localizacao')->nullable();
            $table->string('codigo_barras')->nullable();
            $table->string('imagem_principal')->nullable();
            $table->json('galeria_urls')->nullable();
            $table->decimal('preco_custo', 10, 2)->default(0);
            $table->decimal('preco_m2', 10, 2)->nullable();
            $table->decimal('margem_lucro', 5, 2)->default(0);
            $table->decimal('preco_venda', 10, 2)->default(0);
            $table->boolean('promocao_ativa')->default(false);
            $table->decimal('preco_promocional', 10, 2)->nullable();
            $table->dateTime('promo_data_inicio')->nullable();
            $table->dateTime('promo_data_fim')->nullable();
            $table->boolean('permite_comissao')->default(false);
            $table->decimal('percentual_comissao', 5, 2)->default(0);
            $table->decimal('estoque', 10, 2)->default(0);
            $table->decimal('estoque_minimo', 10, 2)->default(1);
            $table->boolean('variacoes_ativa')->default(false);
            $table->json('variacoes')->nullable();
            $table->boolean('is_composto')->default(false);
            $table->json('composicao')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
