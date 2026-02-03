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
        // Modificar o ENUM para incluir 'parcelada'
        DB::statement("ALTER TABLE contas_receber MODIFY COLUMN status ENUM('pendente', 'parcial', 'quitada', 'parcelada') DEFAULT 'pendente'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover 'parcelada' do ENUM
        DB::statement("ALTER TABLE contas_receber MODIFY COLUMN status ENUM('pendente', 'parcial', 'quitada') DEFAULT 'pendente'");
    }
};
