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
        Schema::create('admin_configuracoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Configurações do sistema
            $table->string('nome_sistema')->default('GráficaPro');
            $table->text('senha_master')->nullable(); // Senha master global criptografada
            
            // Configurações de backup e segurança
            $table->boolean('backup_automatico')->default(false);
            $table->integer('intervalo_backup_dias')->default(7);
            $table->boolean('log_alteracoes')->default(true);
            $table->boolean('notificacoes_email')->default(false);
            
            // Configurações de sessão
            $table->integer('tempo_sessao_minutos')->default(480); // 8 horas
            $table->boolean('sessao_unica')->default(false);
            $table->boolean('forcar_logout_inativo')->default(true);
            
            // Configurações de interface
            $table->string('tema_padrao')->default('light');
            $table->string('idioma_padrao')->default('pt-BR');
            $table->boolean('modo_escuro_padrao')->default(false);
            
            // Configurações de segurança
            $table->boolean('exigir_senha_forte')->default(true);
            $table->integer('tentativas_login_max')->default(5);
            $table->integer('bloqueio_temporario_minutos')->default(30);
            $table->boolean('autenticacao_2fatores')->default(false);
            
            // Configurações de notificações
            $table->json('notificacoes_config')->nullable();
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id']);
            $table->unique(['tenant_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_configuracoes');
    }
};
