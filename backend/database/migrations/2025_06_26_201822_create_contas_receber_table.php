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
        Schema::create('contas_receber', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('descricao');
            $table->decimal('valor_original', 10, 2);
            $table->decimal('valor_pendente', 10, 2);
            $table->date('data_vencimento');
            $table->date('data_emissao');
            $table->date('data_quitacao')->nullable();
            $table->enum('status', ['pendente', 'parcial', 'quitada'])->default('pendente');
            $table->decimal('juros_aplicados', 10, 2)->default(0);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('cliente_id');
            $table->index('user_id');
            $table->index('status');
            $table->index('data_vencimento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contas_receber');
    }
};
