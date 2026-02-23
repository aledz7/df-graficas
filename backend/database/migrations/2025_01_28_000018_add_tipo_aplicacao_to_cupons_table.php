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
        if (!Schema::hasTable('cupons')) {
            return;
        }

        Schema::table('cupons', function (Blueprint $table) {
            if (!Schema::hasColumn('cupons', 'tipo_aplicacao')) {
                $table->enum('tipo_aplicacao', ['todos_itens', 'categoria', 'item_especifico'])->default('todos_itens')->after('produto_ids');
            }

            if (!Schema::hasColumn('cupons', 'categoria_id')) {
                $table->unsignedBigInteger('categoria_id')->nullable()->after('tipo_aplicacao');
                $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('set null');
            }

            $table->index(['tenant_id', 'tipo_aplicacao', 'categoria_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('cupons')) {
            return;
        }

        Schema::table('cupons', function (Blueprint $table) {
            if (Schema::hasColumn('cupons', 'categoria_id')) {
                $table->dropForeign(['categoria_id']);
            }

            if (Schema::hasColumn('cupons', 'tipo_aplicacao')) {
                $table->dropColumn('tipo_aplicacao');
            }

            if (Schema::hasColumn('cupons', 'categoria_id')) {
                $table->dropColumn('categoria_id');
            }
        });
    }
};
