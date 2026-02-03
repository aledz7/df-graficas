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
            $table->decimal('desconto_terceirizado_percentual', 5, 2)->default(0)->after('valor_total_os');
            $table->string('desconto_geral_tipo')->default('percentual')->after('desconto_terceirizado_percentual');
            $table->decimal('desconto_geral_valor', 10, 2)->default(0)->after('desconto_geral_tipo');
            $table->decimal('frete_valor', 10, 2)->default(0)->after('desconto_geral_valor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropColumn([
                'desconto_terceirizado_percentual',
                'desconto_geral_tipo',
                'desconto_geral_valor',
                'frete_valor'
            ]);
        });
    }
}; 