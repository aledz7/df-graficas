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
        Schema::create('historico_fechamento_mes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Tipo de ação: 'fechamento' ou 'abertura' ou 'reabertura'
            $table->enum('tipo', ['fechamento', 'abertura', 'reabertura'])->default('fechamento');
            
            // Mês e ano referente ao fechamento/abertura
            $table->integer('mes');
            $table->integer('ano');
            
            // Data/hora em que a ação foi realizada
            $table->timestamp('data_acao');
            
            // Usuário que realizou a ação (null se foi automático)
            $table->foreignId('usuario_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Se foi automático ou manual
            $table->boolean('automatico')->default(false);
            
            // Quantidade de holerites gerados/afetados
            $table->integer('quantidade_holerites')->default(0);
            
            // Observações
            $table->text('observacoes')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index('tenant_id');
            $table->index('tipo');
            $table->index(['mes', 'ano']);
            $table->index('data_acao');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historico_fechamento_mes');
    }
};

