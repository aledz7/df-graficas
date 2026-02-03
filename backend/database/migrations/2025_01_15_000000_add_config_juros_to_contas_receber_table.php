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
            // Configuração de juros/multas
            $table->enum('tipo_juros', ['percentual', 'fixo'])->nullable()->after('juros_aplicados');
            $table->decimal('valor_juros', 10, 2)->nullable()->after('tipo_juros');
            $table->date('data_inicio_cobranca_juros')->nullable()->after('valor_juros');
            $table->enum('frequencia_juros', ['unica', 'diaria', 'semanal', 'mensal'])->default('unica')->after('data_inicio_cobranca_juros');
            $table->date('ultima_aplicacao_juros')->nullable()->after('frequencia_juros');
            $table->integer('total_aplicacoes_juros')->default(0)->after('ultima_aplicacao_juros');
            $table->json('historico_juros')->nullable()->after('total_aplicacoes_juros');
            
            // Campos adicionais para controle
            $table->string('venda_id')->nullable()->after('user_id');
            $table->json('parcelamento_info')->nullable()->after('venda_id');
            
            // Índices para melhorar performance
            $table->index(['data_inicio_cobranca_juros', 'frequencia_juros']);
            $table->index(['ultima_aplicacao_juros', 'frequencia_juros']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->dropIndex(['data_inicio_cobranca_juros', 'frequencia_juros']);
            $table->dropIndex(['ultima_aplicacao_juros', 'frequencia_juros']);
            
            $table->dropColumn([
                'tipo_juros',
                'valor_juros',
                'data_inicio_cobranca_juros',
                'frequencia_juros',
                'ultima_aplicacao_juros',
                'total_aplicacoes_juros',
                'historico_juros',
                'venda_id',
                'parcelamento_info'
            ]);
        });
    }
}; 