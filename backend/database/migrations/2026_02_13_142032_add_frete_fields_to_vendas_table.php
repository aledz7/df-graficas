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
        Schema::table('vendas', function (Blueprint $table) {
            $table->foreignId('opcao_frete_id')->nullable()->after('tipo_pedido')->constrained('opcoes_frete')->onDelete('set null');
            $table->decimal('valor_frete', 10, 2)->nullable()->after('opcao_frete_id');
            $table->integer('prazo_frete')->nullable()->after('valor_frete')->comment('Prazo em dias');
            $table->foreignId('entregador_id')->nullable()->after('prazo_frete')->constrained('entregadores')->onDelete('set null');
            $table->string('bairro_entrega')->nullable()->after('entregador_id');
            $table->string('cidade_entrega')->nullable()->after('bairro_entrega');
            $table->string('estado_entrega', 2)->nullable()->after('cidade_entrega');
            $table->string('cep_entrega', 10)->nullable()->after('estado_entrega');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->dropForeign(['opcao_frete_id']);
            $table->dropForeign(['entregador_id']);
            $table->dropColumn([
                'opcao_frete_id',
                'valor_frete',
                'prazo_frete',
                'entregador_id',
                'bairro_entrega',
                'cidade_entrega',
                'estado_entrega',
                'cep_entrega'
            ]);
        });
    }
};
