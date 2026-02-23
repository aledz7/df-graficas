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
        if (!Schema::hasTable('empresas')) {
            return;
        }

        Schema::table('empresas', function (Blueprint $table) {
            // Campos de endereço separados (necessários para emissão de NF)
            if (!Schema::hasColumn('empresas', 'logradouro')) {
                $table->string('logradouro')->nullable()->after('endereco_completo');
            }

            if (!Schema::hasColumn('empresas', 'numero_endereco')) {
                $table->string('numero_endereco', 20)->nullable()->after('logradouro');
            }

            if (!Schema::hasColumn('empresas', 'complemento')) {
                $table->string('complemento')->nullable()->after('numero_endereco');
            }

            if (!Schema::hasColumn('empresas', 'bairro')) {
                $table->string('bairro')->nullable()->after('complemento');
            }

            if (!Schema::hasColumn('empresas', 'cidade')) {
                $table->string('cidade')->nullable()->after('bairro');
            }

            if (!Schema::hasColumn('empresas', 'estado')) {
                $table->string('estado', 2)->nullable()->after('cidade');
            }

            if (!Schema::hasColumn('empresas', 'cep')) {
                $table->string('cep', 10)->nullable()->after('estado');
            }

            if (!Schema::hasColumn('empresas', 'codigo_municipio_ibge')) {
                $table->string('codigo_municipio_ibge', 10)->nullable()->after('cep');
            }
            
            // Regime tributário (necessário para NFe)
            if (!Schema::hasColumn('empresas', 'regime_tributario')) {
                $table->string('regime_tributario', 1)->nullable()->after('codigo_municipio_ibge');
            }
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
        if (!Schema::hasTable('empresas')) {
            return;
        }

        Schema::table('empresas', function (Blueprint $table) {
            if (Schema::hasColumn('empresas', 'logradouro')) {
                $table->dropColumn('logradouro');
            }

            if (Schema::hasColumn('empresas', 'numero_endereco')) {
                $table->dropColumn('numero_endereco');
            }

            if (Schema::hasColumn('empresas', 'complemento')) {
                $table->dropColumn('complemento');
            }

            if (Schema::hasColumn('empresas', 'bairro')) {
                $table->dropColumn('bairro');
            }

            if (Schema::hasColumn('empresas', 'cidade')) {
                $table->dropColumn('cidade');
            }

            if (Schema::hasColumn('empresas', 'estado')) {
                $table->dropColumn('estado');
            }

            if (Schema::hasColumn('empresas', 'cep')) {
                $table->dropColumn('cep');
            }

            if (Schema::hasColumn('empresas', 'codigo_municipio_ibge')) {
                $table->dropColumn('codigo_municipio_ibge');
            }

            if (Schema::hasColumn('empresas', 'regime_tributario')) {
                $table->dropColumn('regime_tributario');
            }
        });

        if (Schema::hasTable('clientes') && Schema::hasColumn('clientes', 'codigo_municipio_ibge')) {
            Schema::table('clientes', function (Blueprint $table) {
                $table->dropColumn('codigo_municipio_ibge');
            });
        }
    }
};
