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
        if (!Schema::hasTable('cursos')) {
            return;
        }

        Schema::table('cursos', function (Blueprint $table) {
            if (!Schema::hasColumn('cursos', 'possui_prova_final')) {
                $table->boolean('possui_prova_final')->default(false)->after('ativar_certificado');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cursos', function (Blueprint $table) {
            if (Schema::hasColumn('cursos', 'possui_prova_final')) {
                $table->dropColumn('possui_prova_final');
            }
        });
    }
};
