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
        Schema::table('empresas', function (Blueprint $table) {
            // Campos de endereço separados (necessários para emissão de NF)
            $table->string('logradouro')->nullable()->after('endereco_completo');
            $table->string('numero_endereco', 20)->nullable()->after('logradouro');
            $table->string('complemento')->nullable()->after('numero_endereco');
            $table->string('bairro')->nullable()->after('complemento');
            $table->string('cidade')->nullable()->after('bairro');
            $table->string('estado', 2)->nullable()->after('cidade');
            $table->string('cep', 10)->nullable()->after('estado');
            $table->string('codigo_municipio_ibge', 10)->nullable()->after('cep');
            
            // Regime tributário (necessário para NFe)
            $table->string('regime_tributario', 1)->nullable()->after('codigo_municipio_ibge');
        });

        // Também adicionar código IBGE na tabela de clientes
        if (Schema::hasTable('clientes') && !Schema::hasColumn('clientes', 'codigo_municipio_ibge')) {
            Schema::table('clientes', function (Blueprint $table) {
                $table->string('codigo_municipio_ibge', 10)->nullable()->after('estado');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn([
                'logradouro',
                'numero_endereco',
                'complemento',
                'bairro',
                'cidade',
                'estado',
                'cep',
                'codigo_municipio_ibge',
                'regime_tributario',
            ]);
        });

        if (Schema::hasTable('clientes') && Schema::hasColumn('clientes', 'codigo_municipio_ibge')) {
            Schema::table('clientes', function (Blueprint $table) {
                $table->dropColumn('codigo_municipio_ibge');
            });
        }
    }
};
