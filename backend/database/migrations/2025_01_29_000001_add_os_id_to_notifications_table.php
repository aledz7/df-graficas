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
            $table->unsignedBigInteger('os_id')->nullable()->after('user_id');
            $table->foreign('os_id')->references('id')->on('ordens_servico')->onDelete('cascade');
            $table->index(['os_id', 'read']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['os_id']);
            $table->dropIndex(['os_id', 'read']);
            $table->dropColumn('os_id');
        });
    }
};
