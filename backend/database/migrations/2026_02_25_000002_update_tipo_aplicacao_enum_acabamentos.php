<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Alterar enum para incluir novos valores: fixo, variável, metro_linear
        // MySQL não permite alterar enum diretamente, então precisamos fazer via raw SQL
        DB::statement("ALTER TABLE acabamentos MODIFY COLUMN tipo_aplicacao ENUM('fixo', 'variável', 'area_total', 'perimetro', 'unidade', 'metro_linear') DEFAULT 'area_total'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverter para os valores originais
        DB::statement("ALTER TABLE acabamentos MODIFY COLUMN tipo_aplicacao ENUM('area_total', 'perimetro', 'unidade') DEFAULT 'area_total'");
    }
};
