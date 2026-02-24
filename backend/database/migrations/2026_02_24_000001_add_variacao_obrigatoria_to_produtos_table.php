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
        if (!Schema::hasColumn('produtos', 'variacao_obrigatoria')) {
            Schema::table('produtos', function (Blueprint $table) {
                $table->boolean('variacao_obrigatoria')->default(true)->after('variacoes_ativa');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('produtos', 'variacao_obrigatoria')) {
            Schema::table('produtos', function (Blueprint $table) {
                $table->dropColumn('variacao_obrigatoria');
            });
        }
    }
};
