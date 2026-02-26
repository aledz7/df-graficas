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
        // Adicionar campos de compartilhamento na tabela ordens_servico
        if (Schema::hasTable('ordens_servico')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                if (!Schema::hasColumn('ordens_servico', 'share_token')) {
                    $table->string('share_token', 64)->unique()->nullable()->after('id');
                }
                if (!Schema::hasColumn('ordens_servico', 'share_enabled')) {
                    $table->boolean('share_enabled')->default(false)->after('share_token');
                }
                if (!Schema::hasColumn('ordens_servico', 'share_expires_at')) {
                    $table->timestamp('share_expires_at')->nullable()->after('share_enabled');
                }
            });
        }

        // Adicionar campos de compartilhamento na tabela vendas
        if (Schema::hasTable('vendas')) {
            Schema::table('vendas', function (Blueprint $table) {
                if (!Schema::hasColumn('vendas', 'share_token')) {
                    $table->string('share_token', 64)->unique()->nullable()->after('id');
                }
                if (!Schema::hasColumn('vendas', 'share_enabled')) {
                    $table->boolean('share_enabled')->default(false)->after('share_token');
                }
                if (!Schema::hasColumn('vendas', 'share_expires_at')) {
                    $table->timestamp('share_expires_at')->nullable()->after('share_enabled');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ordens_servico')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                if (Schema::hasColumn('ordens_servico', 'share_token')) {
                    $table->dropColumn('share_token');
                }
                if (Schema::hasColumn('ordens_servico', 'share_enabled')) {
                    $table->dropColumn('share_enabled');
                }
                if (Schema::hasColumn('ordens_servico', 'share_expires_at')) {
                    $table->dropColumn('share_expires_at');
                }
            });
        }

        if (Schema::hasTable('vendas')) {
            Schema::table('vendas', function (Blueprint $table) {
                if (Schema::hasColumn('vendas', 'share_token')) {
                    $table->dropColumn('share_token');
                }
                if (Schema::hasColumn('vendas', 'share_enabled')) {
                    $table->dropColumn('share_enabled');
                }
                if (Schema::hasColumn('vendas', 'share_expires_at')) {
                    $table->dropColumn('share_expires_at');
                }
            });
        }
    }
};
