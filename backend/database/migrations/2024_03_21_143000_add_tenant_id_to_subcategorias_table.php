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
        Schema::table('subcategorias', function (Blueprint $table) {
            $table->foreignId('tenant_id')
                  ->after('id')
                  ->constrained('tenants')
                  ->onDelete('cascade');

            // Adicionando índice composto para garantir unicidade do slug por tenant
            $table->unique(['tenant_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subcategorias', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropUnique(['tenant_id', 'slug']);
            $table->dropColumn('tenant_id');
        });
    }
}; 