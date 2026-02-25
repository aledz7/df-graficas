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
        Schema::table('acabamentos', function (Blueprint $table) {
            // Adicionar campo valor (base para cálculo)
            $table->decimal('valor', 10, 2)->nullable()->after('nome_acabamento')->comment('Valor base utilizado no cálculo conforme o tipo selecionado');
            
            // Adicionar campo valor_minimo (obrigatório)
            $table->decimal('valor_minimo', 10, 2)->default(0)->after('valor')->comment('Valor mínimo cobrado, independente da regra de cálculo');
            
            // Adicionar campo prazo_adicional (dias)
            $table->integer('prazo_adicional')->default(0)->after('valor_minimo')->comment('Dias adicionais ao prazo da OS quando este acabamento for incluído');
            
            // Atualizar enum tipo_aplicacao para incluir novos tipos
            // Nota: Laravel não suporta alterar enum diretamente, então vamos fazer via raw SQL se necessário
        });
        
        // Atualizar tipo_aplicacao para incluir novos valores (fixo, variável)
        // Como não podemos alterar enum facilmente, vamos usar um approach diferente
        // Vamos adicionar um campo adicional ou modificar a lógica
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acabamentos', function (Blueprint $table) {
            $table->dropColumn(['valor', 'valor_minimo', 'prazo_adicional']);
        });
    }
};
