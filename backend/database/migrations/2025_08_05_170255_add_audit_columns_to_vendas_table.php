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
            $table->text('justificativa_exclusao')->nullable()->after('observacoes');
            $table->unsignedBigInteger('usuario_exclusao_id')->nullable()->after('justificativa_exclusao');
            $table->string('usuario_exclusao_nome')->nullable()->after('usuario_exclusao_id');
            $table->timestamp('data_exclusao')->nullable()->after('usuario_exclusao_nome');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->dropColumn([
                'justificativa_exclusao',
                'usuario_exclusao_id',
                'usuario_exclusao_nome',
                'data_exclusao'
            ]);
        });
    }
};
