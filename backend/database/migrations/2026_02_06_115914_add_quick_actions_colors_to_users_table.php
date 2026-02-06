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
        Schema::table('users', function (Blueprint $table) {
            // Verificar se a coluna não existe antes de adicionar
            if (!Schema::hasColumn('users', 'quick_actions_colors')) {
                $table->json('quick_actions_colors')->nullable()->after('dashboard_colors');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'quick_actions_colors')) {
                $table->dropColumn('quick_actions_colors');
            }
        });
    }
};
