<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'os_id')) {
                $table->unsignedBigInteger('os_id')->nullable()->after('user_id');
            }
        });

        $fkExists = DB::selectOne("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND COLUMN_NAME = 'os_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        if (!$fkExists && Schema::hasColumn('notifications', 'os_id') && Schema::hasTable('ordens_servico')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->foreign('os_id')->references('id')->on('ordens_servico')->onDelete('cascade');
            });
        }

        $indexExists = DB::selectOne("
            SELECT INDEX_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND INDEX_NAME = 'notifications_os_id_read_index'
            LIMIT 1
        ");

        if (!$indexExists && Schema::hasColumn('notifications', 'os_id') && Schema::hasColumn('notifications', 'read')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['os_id', 'read'], 'notifications_os_id_read_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $fkExists = DB::selectOne("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND COLUMN_NAME = 'os_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        $indexExists = DB::selectOne("
            SELECT INDEX_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND INDEX_NAME = 'notifications_os_id_read_index'
            LIMIT 1
        ");

        Schema::table('notifications', function (Blueprint $table) use ($fkExists, $indexExists) {
            if ($fkExists && Schema::hasColumn('notifications', 'os_id')) {
                $table->dropForeign(['os_id']);
            }
            if ($indexExists) {
                $table->dropIndex('notifications_os_id_read_index');
            }
            if (Schema::hasColumn('notifications', 'os_id')) {
                $table->dropColumn('os_id');
            }
        });
    }
};
