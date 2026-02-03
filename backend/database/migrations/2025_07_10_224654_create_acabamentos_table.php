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
        Schema::create('acabamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->string('nome_acabamento');
            $table->decimal('valor_m2', 10, 2)->nullable();
            $table->decimal('valor_un', 10, 2)->nullable();
            $table->enum('tipo_aplicacao', ['area_total', 'perimetro', 'unidade'])->default('area_total');
            $table->boolean('ativo')->default(true);
            $table->unsignedBigInteger('produto_vinculado_id')->nullable();
            $table->string('produto_vinculado_nome')->nullable();
            $table->decimal('produto_vinculado_custo', 10, 2)->nullable()->default(0.00);
            $table->string('produto_vinculado_unidade_medida')->nullable();
            $table->decimal('produto_vinculado_estoque_no_momento_do_cadastro', 10, 2)->nullable()->default(0);
            $table->decimal('quantidade_produto_por_unidade_acabamento', 10, 2)->nullable()->default(1);
            $table->text('observacoes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acabamentos');
    }
};
