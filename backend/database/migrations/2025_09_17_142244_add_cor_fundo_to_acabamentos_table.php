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
        Schema::table('acabamentos', function (Blueprint $table) {
            if (!Schema::hasColumn('acabamentos', 'cor_fundo')) {
                $table->string('cor_fundo', 7)->default('#ffffff')->after('observacoes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acabamentos', function (Blueprint $table) {
            $table->dropColumn('cor_fundo');
        });
    }
};
