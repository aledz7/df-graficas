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
        if (!Schema::hasTable('configuracao_fechamento_mes')) {
            Schema::create('configuracao_fechamento_mes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
                
                // Dia do mês para fechamento automático (1-31)
                $table->integer('dia_fechamento')->default(25);
                
                // Se o fechamento automático está ativo
                $table->boolean('ativo')->default(false);
                
                // Usuário que fez a última configuração
                $table->foreignId('usuario_configuracao_id')->nullable()->constrained('users')->onDelete('set null');
                
                $table->timestamps();
                
                // Índices
                $table->index('tenant_id');
                $table->unique(['tenant_id']); // Apenas uma configuração por tenant
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracao_fechamento_mes');
    }
};

