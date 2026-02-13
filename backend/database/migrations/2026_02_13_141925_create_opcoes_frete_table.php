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
        Schema::create('opcoes_frete', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->integer('prazo_entrega')->default(1)->comment('Prazo em dias');
            $table->decimal('taxa_entrega', 10, 2)->default(0);
            $table->decimal('pedido_minimo', 10, 2)->nullable()->comment('Valor mínimo do pedido para liberar este frete');
            
            // Limites de peso
            $table->decimal('peso_minimo', 10, 3)->nullable()->comment('Em kg');
            $table->decimal('peso_maximo', 10, 3)->nullable()->comment('Em kg');
            
            // Limites de tamanho
            $table->decimal('tamanho_minimo', 10, 2)->nullable()->comment('Em cm');
            $table->decimal('tamanho_maximo', 10, 2)->nullable()->comment('Em cm');
            
            // Tipo de limitação geográfica
            $table->enum('tipo_limite_geografico', ['localidade', 'cep', 'distancia'])->default('localidade');
            
            // Limitação por produtos (JSON com array de IDs)
            $table->json('produtos_limitados')->nullable()->comment('IDs dos produtos que podem usar este frete');
            
            $table->boolean('ativo')->default(true);
            $table->integer('ordem')->default(0);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'ativo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opcoes_frete');
    }
};
