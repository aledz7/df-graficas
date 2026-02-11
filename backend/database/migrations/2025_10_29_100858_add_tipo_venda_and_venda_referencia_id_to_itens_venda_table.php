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
        // Verificar e remover foreign key se necessário
        try {
            Schema::table('itens_venda', function (Blueprint $table) {
                $table->dropForeign(['venda_id']);
            });
        } catch (\Exception $e) {
            // Foreign key não existe ou já foi removida, ignorar
        }
        
        // Tornar venda_id nullable e adicionar novos campos
        Schema::table('itens_venda', function (Blueprint $table) {
            // Tornar venda_id nullable (para OS, Envelopamento, Marketplace que não estão na tabela vendas)
            if (Schema::hasColumn('itens_venda', 'venda_id')) {
                $table->foreignId('venda_id')->nullable()->change();
            }
            
            // Recriar a foreign key constraint, mas permitindo null
            try {
                $table->foreign('venda_id')->references('id')->on('vendas')->onDelete('cascade');
            } catch (\Exception $e) {
                // Foreign key já existe, ignorar
            }
            
            // Adicionar campo para referenciar o ID da venda original (OS, Envelopamento, etc)
            if (!Schema::hasColumn('itens_venda', 'venda_referencia_id')) {
                $table->unsignedBigInteger('venda_referencia_id')->nullable()->after('venda_id');
            }
            
            // Adicionar campo para identificar o tipo de venda
            if (!Schema::hasColumn('itens_venda', 'tipo_venda')) {
                $table->string('tipo_venda', 20)->default('pdv')->after('venda_referencia_id');
            }
        });
        
        // Adicionar índices separadamente para evitar erros se já existirem
        try {
            Schema::table('itens_venda', function (Blueprint $table) {
                $table->index(['tenant_id', 'tipo_venda'], 'itens_venda_tenant_id_tipo_venda_index');
            });
        } catch (\Exception $e) {
            // Índice já existe, ignorar
        }
        
        try {
            Schema::table('itens_venda', function (Blueprint $table) {
                $table->index(['tenant_id', 'venda_referencia_id'], 'itens_venda_tenant_id_venda_referencia_id_index');
            });
        } catch (\Exception $e) {
            // Índice já existe, ignorar
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itens_venda', function (Blueprint $table) {
            // Remover índices
            $table->dropIndex(['tenant_id', 'tipo_venda']);
            $table->dropIndex(['tenant_id', 'venda_referencia_id']);
            
            // Remover campos
            $table->dropColumn(['venda_referencia_id', 'tipo_venda']);
            
            // Reverter venda_id para não-nullable (se necessário, mas pode causar problemas se houver dados)
            // $table->foreignId('venda_id')->nullable(false)->change();
        });
    }
};
