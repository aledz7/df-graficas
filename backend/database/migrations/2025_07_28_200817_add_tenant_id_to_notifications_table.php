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
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('id');
            $table->index(['tenant_id', 'read']);
            $table->index(['tenant_id', 'type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'read']);
            $table->dropIndex(['tenant_id', 'type', 'created_at']);
            $table->dropColumn('tenant_id');
        });
    }
};
