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
        if (!Schema::hasTable('clientes') || Schema::hasColumn('clientes', 'is_cliente_permuta')) {
            return;
        }

        Schema::table('clientes', function (Blueprint $table) {
            $table->boolean('is_cliente_permuta')->default(false)->after('is_terceirizado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('clientes') || !Schema::hasColumn('clientes', 'is_cliente_permuta')) {
            return;
        }

        Schema::table('clientes', function (Blueprint $table) {
            $table->dropColumn('is_cliente_permuta');
        });
    }
};
