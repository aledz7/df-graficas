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
        Schema::table('clientes', function (Blueprint $table) {
            // Tornar campos nullable para permitir cadastros sem informações obrigatórias
            $table->string('nome_completo')->nullable()->change();
            $table->string('telefone_principal')->nullable()->change();
            $table->string('codigo_cliente')->nullable()->change();
            $table->enum('tipo_pessoa', ['Pessoa Física', 'Pessoa Jurídica'])->nullable()->change();
            $table->enum('sexo', ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'])->nullable()->change();
            $table->boolean('autorizado_prazo')->nullable()->change();
            $table->boolean('status')->nullable()->change();
            $table->string('classificacao_cliente')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            // Reverter campos para NOT NULL (se necessário)
            $table->string('nome_completo')->nullable(false)->change();
            $table->string('telefone_principal')->nullable(false)->change();
            $table->string('codigo_cliente')->nullable(false)->change();
            $table->enum('tipo_pessoa', ['Pessoa Física', 'Pessoa Jurídica'])->nullable(false)->change();
            $table->enum('sexo', ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'])->nullable(false)->change();
            $table->boolean('autorizado_prazo')->nullable(false)->change();
            $table->boolean('status')->nullable(false)->change();
            $table->string('classificacao_cliente')->nullable(false)->change();
        });
    }
};
