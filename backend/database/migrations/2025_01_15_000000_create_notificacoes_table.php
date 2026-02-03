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
        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('tipo'); // estoque_baixo, alerta, sucesso, etc.
            $table->string('titulo');
            $table->text('mensagem');
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->onDelete('cascade');
            $table->string('produto_nome')->nullable();
            $table->decimal('estoque_atual', 10, 2)->nullable();
            $table->decimal('estoque_minimo', 10, 2)->nullable();
            $table->decimal('percentual_atual', 5, 2)->nullable();
            $table->enum('prioridade', ['baixa', 'media', 'alta'])->default('media');
            $table->boolean('lida')->default(false);
            $table->timestamp('data_criacao')->useCurrent();
            $table->timestamp('data_leitura')->nullable();
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'lida']);
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'data_criacao']);
            $table->index(['user_id', 'lida']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacoes');
    }
}; 