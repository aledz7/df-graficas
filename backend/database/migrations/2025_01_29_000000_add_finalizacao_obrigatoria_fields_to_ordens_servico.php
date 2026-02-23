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
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Arte pronta
            $table->boolean('tem_arte_pronta')->nullable()->after('observacoes_gerais_os');
            
            // Destino da OS
            $table->enum('destino_os', ['CRIACAO', 'PRODUCAO'])->nullable()->after('tem_arte_pronta');
            
            // Tipo de prazo
            $table->enum('prazo_tipo', ['PADRAO', 'ESPECIFICO'])->nullable()->after('destino_os');
            
            // Data e hora do prazo específico
            $table->timestamp('prazo_datahora')->nullable()->after('prazo_tipo');
            
            // Responsável pela criação (se destino for CRIACAO)
            $table->unsignedBigInteger('responsavel_criacao')->nullable()->after('prazo_datahora');
            
            // Foreign key para responsável
            $table->foreign('responsavel_criacao')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropForeign(['responsavel_criacao']);
            $table->dropColumn([
                'tem_arte_pronta',
                'destino_os',
                'prazo_tipo',
                'prazo_datahora',
                'responsavel_criacao'
            ]);
        });
    }
};
