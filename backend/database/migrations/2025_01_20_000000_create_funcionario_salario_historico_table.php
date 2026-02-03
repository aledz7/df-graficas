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
        Schema::create('funcionario_salario_historico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('funcionario_id')->constrained('users')->onDelete('cascade');
            $table->decimal('salario_anterior', 10, 2);
            $table->decimal('novo_salario', 10, 2);
            $table->decimal('diferenca', 10, 2);
            $table->string('motivo', 500)->nullable();
            $table->date('data_alteracao');
            $table->timestamps();
            
            $table->index(['funcionario_id', 'data_alteracao'], 'idx_func_salario_hist');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('funcionario_salario_historico');
    }
}; 