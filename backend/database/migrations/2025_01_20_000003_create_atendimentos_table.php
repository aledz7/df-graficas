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
        Schema::create('atendimentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('canal', ['WhatsApp', 'Presencial', 'Telefone', 'Outro'])->default('WhatsApp');
            $table->text('observacao');
            $table->json('metadados')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Índices para melhor performance
            $table->index(['tenant_id', 'cliente_id']);
            $table->index(['tenant_id', 'user_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('atendimentos');
    }
}; 