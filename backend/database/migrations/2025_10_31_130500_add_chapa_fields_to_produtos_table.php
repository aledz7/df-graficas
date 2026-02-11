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
        Schema::table('produtos', function (Blueprint $table) {
            if (!Schema::hasColumn('produtos', 'medida_chapa_largura_cm')) {
                $table->decimal('medida_chapa_largura_cm', 10, 2)->nullable()->after('preco_m2');
            }
            if (!Schema::hasColumn('produtos', 'medida_chapa_altura_cm')) {
                $table->decimal('medida_chapa_altura_cm', 10, 2)->nullable()->after('medida_chapa_largura_cm');
            }
            if (!Schema::hasColumn('produtos', 'valor_chapa')) {
                $table->decimal('valor_chapa', 10, 2)->nullable()->after('medida_chapa_altura_cm');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn([
                'medida_chapa_largura_cm',
                'medida_chapa_altura_cm',
                'valor_chapa',
            ]);
        });
    }
};

