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
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('razao_social')->nullable();
            $table->string('cnpj', 20)->unique()->nullable();
            $table->string('inscricao_estadual', 20)->nullable();
            $table->string('email')->unique();
            $table->string('telefone', 20)->nullable();
            $table->string('celular', 20)->nullable();
            
            // Endereço
            $table->string('cep', 10)->nullable();
            $table->string('logradouro')->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('complemento')->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->char('uf', 2)->nullable();
            
            // Configurações
            $table->string('tema')->default('light');
            $table->string('logo_url')->nullable();
            $table->json('configuracoes')->nullable();
            
            // Status
            $table->boolean('ativo')->default(true);
            $table->dateTime('data_ativacao')->nullable();
            $table->dateTime('data_expiracao')->nullable();
            
            // Dados de plano
            $table->string('plano')->default('gratuito');
            $table->integer('limite_usuarios')->default(1);
            $table->integer('limite_armazenamento_mb')->default(100); // 100MB grátis
            
            // Multi-tenancy fields
            $table->string('dominio')->nullable();
            $table->string('database_connection')->default('mysql');
            $table->string('database_name')->nullable();
            
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
