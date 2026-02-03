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
        Schema::table('users', function (Blueprint $table) {
            // Dados pessoais do funcionário
            $table->date('data_nascimento')->nullable()->after('email');
            $table->string('cpf', 14)->nullable()->after('data_nascimento');
            $table->string('rg', 20)->nullable()->after('cpf');
            $table->string('emissor_rg', 10)->nullable()->after('rg');
            
            // Endereço
            $table->string('cep', 10)->nullable()->after('emissor_rg');
            $table->string('endereco')->nullable()->after('cep');
            $table->string('numero', 20)->nullable()->after('endereco');
            $table->string('complemento')->nullable()->after('numero');
            $table->string('bairro')->nullable()->after('complemento');
            $table->string('cidade')->nullable()->after('bairro');
            $table->char('uf', 2)->nullable()->after('cidade');
            
            // Dados profissionais
            $table->string('cargo')->nullable()->after('uf');
            $table->string('telefone', 20)->nullable()->after('cargo');
            $table->string('whatsapp', 20)->nullable()->after('telefone');
            $table->string('celular', 20)->nullable()->after('whatsapp');
            
            // Comissões
            $table->decimal('comissao_dropshipping', 5, 2)->default(0)->after('celular');
            $table->decimal('comissao_servicos', 5, 2)->default(0)->after('comissao_dropshipping');
            $table->boolean('permite_receber_comissao')->default(false)->after('comissao_servicos');
            
            // Salário e benefícios
            $table->decimal('salario_base', 10, 2)->default(0)->after('permite_receber_comissao');
            $table->json('vales')->nullable()->after('salario_base'); // Array de vales
            $table->json('faltas')->nullable()->after('vales'); // Array de faltas
            
            // Permissões e credenciais
            $table->json('permissions')->nullable()->after('faltas'); // Permissões do funcionário
            $table->string('login')->nullable()->after('permissions');
            $table->string('senha')->nullable()->after('login');
            
            // Status e controle
            $table->boolean('status')->default(true)->after('senha');
            $table->string('foto_url')->nullable()->after('status');
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null')->after('foto_url');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null')->after('usuario_cadastro_id');
            
            // Índices
            $table->index('cpf');
            $table->index('cargo');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remover índices
            $table->dropIndex(['cpf']);
            $table->dropIndex(['cargo']);
            $table->dropIndex(['status']);
            
            // Remover campos
            $table->dropForeign(['usuario_cadastro_id']);
            $table->dropForeign(['usuario_alteracao_id']);
            
            $table->dropColumn([
                'data_nascimento', 'cpf', 'rg', 'emissor_rg',
                'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
                'cargo', 'telefone', 'whatsapp', 'celular',
                'comissao_dropshipping', 'comissao_servicos', 'permite_receber_comissao',
                'salario_base', 'vales', 'faltas', 'permissions', 'login', 'senha',
                'status', 'foto_url', 'usuario_cadastro_id', 'usuario_alteracao_id'
            ]);
        });
    }
};
