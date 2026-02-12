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
        Schema::table('cupons', function (Blueprint $table) {
            $table->enum('tipo_aplicacao', ['todos_itens', 'categoria', 'item_especifico'])->default('todos_itens')->after('produto_ids');
            $table->unsignedBigInteger('categoria_id')->nullable()->after('tipo_aplicacao');
            
            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('set null');
            $table->index(['tenant_id', 'tipo_aplicacao', 'categoria_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cupons', function (Blueprint $table) {
            $table->dropForeign(['categoria_id']);
            $table->dropIndex(['tenant_id', 'tipo_aplicacao', 'categoria_id']);
            $table->dropColumn(['tipo_aplicacao', 'categoria_id']);
        });
    }
};
