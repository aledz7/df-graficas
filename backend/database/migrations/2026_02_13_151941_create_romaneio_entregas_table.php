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
        Schema::create('romaneio_entregas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('romaneio_id')->constrained('romaneios')->onDelete('cascade');
            $table->foreignId('venda_id')->constrained('vendas')->onDelete('cascade');
            $table->integer('ordem_entrega')->default(0)->comment('Ordem na rota sugerida');
            $table->enum('status', ['pendente', 'entregue', 'nao_entregue', 'cancelado'])->default('pendente');
            $table->dateTime('data_hora_entrega')->nullable();
            $table->text('observacao_entrega')->nullable();
            $table->text('motivo_nao_entrega')->nullable();
            $table->foreignId('usuario_confirmacao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->unique(['romaneio_id', 'venda_id']);
            $table->index(['romaneio_id', 'ordem_entrega']);
            $table->index(['venda_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('romaneio_entregas');
    }
};
