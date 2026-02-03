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
        Schema::create('funcionario_relatorios_mensais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('funcionario_id')->constrained('users')->onDelete('cascade');
            $table->integer('mes');
            $table->integer('ano');
            $table->decimal('salario_base', 10, 2);
            $table->decimal('total_vales', 10, 2)->default(0);
            $table->decimal('total_faltas', 10, 2)->default(0);
            $table->decimal('total_consumo_interno', 10, 2)->default(0);
            $table->decimal('salario_liquido', 10, 2);
            $table->timestamps();
            
            $table->unique(['funcionario_id', 'mes', 'ano'], 'idx_func_relatorio_unique');
            $table->index(['funcionario_id', 'ano', 'mes'], 'idx_func_relatorio_ano_mes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('funcionario_relatorios_mensais');
    }
}; 