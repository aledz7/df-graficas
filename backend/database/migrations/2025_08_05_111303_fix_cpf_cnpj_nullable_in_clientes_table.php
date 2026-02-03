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
            // Primeiro remover a constraint unique
            $table->dropUnique(['cpf_cnpj']);
            
            // Tornar o campo nullable
            $table->string('cpf_cnpj', 20)->nullable()->change();
            
            // Adicionar a constraint unique novamente, mas permitindo valores null
            $table->unique('cpf_cnpj');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            // Remover a constraint unique
            $table->dropUnique(['cpf_cnpj']);
            
            // Tornar o campo não nullable novamente
            $table->string('cpf_cnpj', 20)->nullable(false)->change();
            
            // Adicionar a constraint unique novamente
            $table->unique('cpf_cnpj');
        });
    }
};
