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
        Schema::table('clientes', function (Blueprint $table) {
            // Remover a constraint unique global do cpf_cnpj
            $table->dropUnique(['cpf_cnpj']);
            
            // Adicionar constraint unique composta (cpf_cnpj + tenant_id)
            // Isso permite que o mesmo CPF/CNPJ exista em tenants diferentes
            $table->unique(['cpf_cnpj', 'tenant_id'], 'clientes_cpf_cnpj_tenant_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique('clientes_cpf_cnpj_tenant_id_unique');
            $table->unique('cpf_cnpj');
        });
    }
};
