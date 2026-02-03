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
        Schema::create('comissoes_os', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('funcionario_id')->constrained('funcionarios')->onDelete('cascade');
            $table->foreignId('ordem_servico_id')->constrained('ordens_servico')->onDelete('cascade');
            $table->decimal('valor_os', 10, 2); // Valor total da OS
            $table->decimal('percentual_comissao', 5, 2); // Percentual de comissão aplicado
            $table->decimal('valor_comissao', 10, 2); // Valor da comissão calculada
            $table->string('status_pagamento'); // Pago, Pendente, Cancelado
            $table->date('data_os_finalizada'); // Data em que a OS foi finalizada
            $table->date('data_os_paga')->nullable(); // Data em que a OS foi paga
            $table->date('data_comissao_paga')->nullable(); // Data em que a comissão foi paga
            $table->text('observacoes')->nullable(); // Observações sobre a comissão
            $table->timestamps();
            
            // Índices para melhor performance
            $table->index(['tenant_id', 'funcionario_id']);
            $table->index(['tenant_id', 'ordem_servico_id']);
            $table->index(['tenant_id', 'status_pagamento']);
            $table->index(['tenant_id', 'data_os_finalizada']);
            $table->index(['tenant_id', 'data_os_paga']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comissoes_os');
    }
};
