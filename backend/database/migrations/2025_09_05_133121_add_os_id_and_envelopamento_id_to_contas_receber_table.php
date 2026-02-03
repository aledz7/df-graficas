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
            // Adicionar colunas os_id e envelopamento_id após venda_id
            $table->unsignedBigInteger('os_id')->nullable()->after('venda_id');
            $table->unsignedBigInteger('envelopamento_id')->nullable()->after('os_id');
            
            // Adicionar índices para melhorar performance
            $table->index('os_id');
            $table->index('envelopamento_id');
            
            // Adicionar foreign keys
            $table->foreign('os_id')->references('id')->on('ordens_servico')->onDelete('set null');
            $table->foreign('envelopamento_id')->references('id')->on('envelopamentos')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contas_receber', function (Blueprint $table) {
            // Remover foreign keys
            $table->dropForeign(['os_id']);
            $table->dropForeign(['envelopamento_id']);
            
            // Remover índices
            $table->dropIndex(['os_id']);
            $table->dropIndex(['envelopamento_id']);
            
            // Remover colunas
            $table->dropColumn(['os_id', 'envelopamento_id']);
        });
    }
};
