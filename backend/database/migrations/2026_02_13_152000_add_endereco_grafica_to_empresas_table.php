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
        Schema::table('empresas', function (Blueprint $table) {
            if (!Schema::hasColumn('empresas', 'endereco_grafica')) {
                $table->text('endereco_grafica')->nullable()->after('endereco_completo')->comment('Endereço fixo da gráfica para ponto de partida das rotas');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            if (Schema::hasColumn('empresas', 'endereco_grafica')) {
                $table->dropColumn('endereco_grafica');
            }
        });
    }
};
