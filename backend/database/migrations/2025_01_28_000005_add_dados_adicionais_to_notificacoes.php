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
        if (!Schema::hasTable('notificacoes') || Schema::hasColumn('notificacoes', 'dados_adicionais')) {
            return;
        }

        Schema::table('notificacoes', function (Blueprint $table) {
            $table->json('dados_adicionais')->nullable()->after('percentual_atual');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('notificacoes') || !Schema::hasColumn('notificacoes', 'dados_adicionais')) {
            return;
        }

        Schema::table('notificacoes', function (Blueprint $table) {
            $table->dropColumn('dados_adicionais');
        });
    }
};
