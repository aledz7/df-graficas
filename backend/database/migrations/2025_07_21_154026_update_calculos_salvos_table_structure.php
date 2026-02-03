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
        Schema::table('calculos_salvos', function (Blueprint $table) {
            // Adicionar apenas os campos que não existem
            $table->json('itens')->nullable()->comment('Lista de itens do orçamento')->after('resultado');
            $table->json('produtos')->nullable()->comment('Lista de produtos do orçamento')->after('itens');
            $table->json('servicos_adicionais')->nullable()->comment('Serviços adicionais selecionados')->after('produtos');
            $table->unsignedBigInteger('tenant_id')->nullable()->comment('ID do tenant')->after('user_id');
            $table->string('status')->default('ativo')->comment('Status do orçamento')->after('tenant_id');
            $table->timestamp('data_criacao')->useCurrent()->comment('Data de criação')->after('status');
            $table->timestamp('data_atualizacao')->useCurrentOnUpdate()->nullable()->comment('Data de atualização')->after('data_criacao');
            
            // Adicionar índices
            $table->index(['tenant_id', 'user_id']);
            $table->index(['status', 'data_criacao']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('calculos_salvos', function (Blueprint $table) {
            // Remover campos adicionados
            $table->dropColumn([
                'itens',
                'produtos',
                'servicos_adicionais',
                'tenant_id',
                'status',
                'data_criacao',
                'data_atualizacao'
            ]);
            
            // Remover índices
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropIndex(['status', 'data_criacao']);
        });
    }
};
