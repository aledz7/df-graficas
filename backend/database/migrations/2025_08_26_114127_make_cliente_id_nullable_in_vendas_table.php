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
            // Tornar cliente_id nullable para permitir vendas para funcionários
            $table->unsignedBigInteger('cliente_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            // Reverter cliente_id para NOT NULL
            $table->unsignedBigInteger('cliente_id')->nullable(false)->change();
        });
    }
};
