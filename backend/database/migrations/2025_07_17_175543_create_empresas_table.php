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
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Dados Cadastrais
            $table->string('nome_fantasia');
            $table->string('razao_social')->nullable();
            $table->string('cnpj', 20)->nullable();
            $table->string('inscricao_estadual', 20)->nullable();
            $table->string('inscricao_municipal', 20)->nullable();
            
            // Contato
            $table->string('email')->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            
            // Endereço
            $table->text('endereco_completo')->nullable();
            $table->string('instagram')->nullable();
            $table->string('site')->nullable();
            
            // Identidade Visual
            $table->string('logo_url')->nullable();
            $table->string('nome_sistema')->default('GráficaPro');
            $table->text('mensagem_rodape')->nullable();
            
            // Segurança
            $table->string('senha_supervisor')->nullable();
            
            // Documentos
            $table->text('termos_servico')->nullable();
            $table->text('politica_privacidade')->nullable();
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id']);
            $table->unique(['tenant_id']); // Uma empresa por tenant
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empresas');
    }
};
