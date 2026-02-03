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
        Schema::table('servicos_adicionais', function (Blueprint $table) {
            $table->enum('tipo', ['envelopamento', 'calculadora'])->default('envelopamento')->after('categoria');
            $table->index(['tipo', 'ativo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servicos_adicionais', function (Blueprint $table) {
            $table->dropIndex(['tipo', 'ativo']);
            $table->dropColumn('tipo');
        });
    }
};
