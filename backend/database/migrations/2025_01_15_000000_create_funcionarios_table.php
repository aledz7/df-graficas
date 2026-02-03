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
        Schema::create('funcionarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Dados pessoais
            $table->string('nome');
            $table->date('data_nascimento')->nullable();
            $table->string('cpf', 14)->nullable();
            $table->string('rg', 20)->nullable();
            $table->string('emissor_rg', 10)->nullable();
            
            // Endereço
            $table->string('cep', 10)->nullable();
            $table->string('endereco')->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('complemento')->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->char('uf', 2)->nullable();
            
            // Dados profissionais
            $table->string('cargo')->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('celular', 20)->nullable();
            $table->string('email')->nullable();
            
            // Comissões
            $table->decimal('comissao_dropshipping', 5, 2)->default(0);
            $table->decimal('comissao_servicos', 5, 2)->default(0);
            $table->boolean('permite_receber_comissao')->default(false);
            
            // Salário e benefícios
            $table->decimal('salario_base', 10, 2)->default(0);
            $table->json('vales')->nullable(); // Array de vales
            $table->json('faltas')->nullable(); // Array de faltas
            
            // Permissões e credenciais
            $table->json('permissions')->nullable(); // Permissões do funcionário
            $table->string('login')->nullable();
            $table->string('senha')->nullable();
            
            // Status e controle
            $table->boolean('status')->default(true);
            $table->string('foto_url')->nullable();
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'cargo']);
            $table->index('cpf');
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('funcionarios');
    }
}; 