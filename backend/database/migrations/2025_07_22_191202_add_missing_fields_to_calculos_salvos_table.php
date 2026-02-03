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
            // Adicionar campos que estão faltando
            if (!Schema::hasColumn('calculos_salvos', 'cliente')) {
                $table->json('cliente')->nullable()->after('nome');
            }
            if (!Schema::hasColumn('calculos_salvos', 'config')) {
                $table->json('config')->nullable()->after('cliente');
            }
            if (!Schema::hasColumn('calculos_salvos', 'itens')) {
                $table->json('itens')->nullable()->after('dados_calculo');
            }
            if (!Schema::hasColumn('calculos_salvos', 'produtos')) {
                $table->json('produtos')->nullable()->after('itens');
            }
            if (!Schema::hasColumn('calculos_salvos', 'servicos_adicionais')) {
                $table->json('servicos_adicionais')->nullable()->after('produtos');
            }
            if (!Schema::hasColumn('calculos_salvos', 'tenant_id')) {
                $table->unsignedBigInteger('tenant_id')->nullable()->after('user_id');
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            }
            if (!Schema::hasColumn('calculos_salvos', 'status')) {
                $table->string('status')->default('ativo')->after('servicos_adicionais');
            }
            if (!Schema::hasColumn('calculos_salvos', 'data_criacao')) {
                $table->timestamp('data_criacao')->nullable()->after('status');
            }
            if (!Schema::hasColumn('calculos_salvos', 'data_atualizacao')) {
                $table->timestamp('data_atualizacao')->nullable()->after('data_criacao');
            }
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
                'cliente',
                'config', 
                'itens',
                'produtos',
                'servicos_adicionais',
                'tenant_id',
                'status',
                'data_criacao',
                'data_atualizacao'
            ]);
        });
    }
};
