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
        if (!Schema::hasTable('vendas')) {
            return;
        }

        Schema::table('vendas', function (Blueprint $table) {
            if (!Schema::hasColumn('vendas', 'opcao_frete_id')) {
                $table->foreignId('opcao_frete_id')->nullable()->after('tipo_pedido')->constrained('opcoes_frete')->onDelete('set null');
            }

            if (!Schema::hasColumn('vendas', 'valor_frete')) {
                $table->decimal('valor_frete', 10, 2)->nullable()->after('opcao_frete_id');
            }

            if (!Schema::hasColumn('vendas', 'prazo_frete')) {
                $table->integer('prazo_frete')->nullable()->after('valor_frete')->comment('Prazo em dias');
            }

            if (!Schema::hasColumn('vendas', 'entregador_id')) {
                $table->foreignId('entregador_id')->nullable()->after('prazo_frete')->constrained('entregadores')->onDelete('set null');
            }

            if (!Schema::hasColumn('vendas', 'bairro_entrega')) {
                $table->string('bairro_entrega')->nullable()->after('entregador_id');
            }

            if (!Schema::hasColumn('vendas', 'cidade_entrega')) {
                $table->string('cidade_entrega')->nullable()->after('bairro_entrega');
            }

            if (!Schema::hasColumn('vendas', 'estado_entrega')) {
                $table->string('estado_entrega', 2)->nullable()->after('cidade_entrega');
            }

            if (!Schema::hasColumn('vendas', 'cep_entrega')) {
                $table->string('cep_entrega', 10)->nullable()->after('estado_entrega');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('vendas')) {
            return;
        }

        Schema::table('vendas', function (Blueprint $table) {
            if (Schema::hasColumn('vendas', 'opcao_frete_id')) {
                $table->dropForeign(['opcao_frete_id']);
                $table->dropColumn('opcao_frete_id');
            }

            if (Schema::hasColumn('vendas', 'entregador_id')) {
                $table->dropForeign(['entregador_id']);
                $table->dropColumn('entregador_id');
            }

            if (Schema::hasColumn('vendas', 'valor_frete')) {
                $table->dropColumn('valor_frete');
            }

            if (Schema::hasColumn('vendas', 'prazo_frete')) {
                $table->dropColumn('prazo_frete');
            }

            if (Schema::hasColumn('vendas', 'bairro_entrega')) {
                $table->dropColumn('bairro_entrega');
            }

            if (Schema::hasColumn('vendas', 'cidade_entrega')) {
                $table->dropColumn('cidade_entrega');
            }

            if (Schema::hasColumn('vendas', 'estado_entrega')) {
                $table->dropColumn('estado_entrega');
            }

            if (Schema::hasColumn('vendas', 'cep_entrega')) {
                $table->dropColumn('cep_entrega');
            }
        });
    }
};
