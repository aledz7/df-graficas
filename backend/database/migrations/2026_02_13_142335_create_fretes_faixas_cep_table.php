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
        if (Schema::hasTable('fretes_faixas_cep')) {
            return;
        }

        Schema::create('fretes_faixas_cep', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opcao_frete_id')->constrained('opcoes_frete')->onDelete('cascade');
            $table->string('cep_inicio', 10);
            $table->string('cep_fim', 10);
            $table->timestamps();
            
            $table->index(['opcao_frete_id']);
            $table->index(['cep_inicio', 'cep_fim']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fretes_faixas_cep');
    }
};
