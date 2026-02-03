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
        Schema::table('envelopamentos', function (Blueprint $table) {
            $table->string('desconto_tipo')->default('percentual')->after('orcamento_total'); // percentual ou valor
            $table->decimal('desconto_calculado', 10, 2)->default(0)->after('desconto_tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('envelopamentos', function (Blueprint $table) {
            $table->dropColumn(['desconto_tipo', 'desconto_calculado']);
        });
    }
};
