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
        Schema::table('contas_receber', function (Blueprint $table) {
            // Campos para parcelamento
            if (!Schema::hasColumn('contas_receber', 'conta_origem_id')) {
                $table->unsignedBigInteger('conta_origem_id')->nullable()->after('venda_id');
            }
            
            // Campos para histórico de pagamentos
            if (!Schema::hasColumn('contas_receber', 'historico_pagamentos')) {
                $table->json('historico_pagamentos')->nullable()->after('historico_juros');
            }
            
            // Índices para melhorar performance
            if (!Schema::hasIndex('contas_receber', 'contas_receber_conta_origem_id_index')) {
                $table->index('conta_origem_id');
            }
            
            // Foreign key para conta origem
            if (!Schema::hasColumn('contas_receber', 'conta_origem_id')) {
                $table->foreign('conta_origem_id')->references('id')->on('contas_receber')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->dropForeign(['conta_origem_id']);
            $table->dropIndex(['conta_origem_id']);
            
            $table->dropColumn([
                'conta_origem_id',
                'parcelamento_info',
                'historico_pagamentos'
            ]);
        });
    }
}; 