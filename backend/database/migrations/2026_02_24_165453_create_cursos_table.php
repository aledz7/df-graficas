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
        if (Schema::hasTable('cursos')) {
            return;
        }

        Schema::create('cursos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // 1. Informações Básicas
            $table->string('titulo')->comment('Título do treinamento');
            $table->text('descricao')->nullable()->comment('Descrição resumida');
            $table->string('capa_url')->nullable()->comment('URL da capa do treinamento');
            $table->enum('setor', ['administrativo', 'financeiro', 'comercial', 'criacao', 'producao', 'logistica', 'efc'])->default('comercial');
            $table->enum('nivel', ['basico', 'intermediario', 'avancado'])->default('basico');
            $table->boolean('obrigatorio')->default(false)->comment('Treinamento obrigatório');
            $table->enum('status', ['rascunho', 'publicado', 'arquivado'])->default('rascunho');
            
            // 2. Tipo de Conteúdo
            $table->enum('tipo_conteudo', ['texto', 'arquivo', 'video', 'link_video'])->default('texto');
            $table->longText('conteudo_texto')->nullable()->comment('Conteúdo criado no sistema');
            $table->string('arquivo_url')->nullable()->comment('URL do arquivo (Word, PowerPoint, PDF)');
            $table->string('arquivo_nome')->nullable()->comment('Nome original do arquivo');
            $table->string('video_url')->nullable()->comment('URL do vídeo ou link YouTube/Vimeo');
            $table->string('video_arquivo_url')->nullable()->comment('URL do arquivo de vídeo MP4');
            
            // 3. Continuação de Treinamento
            $table->boolean('eh_continuacao')->default(false);
            $table->foreignId('treinamento_anterior_id')->nullable()->constrained('cursos')->onDelete('set null');
            $table->string('parte_modulo')->nullable()->comment('Ex: Parte 2 - Módulo 1');
            
            // 4. Regras de Liberação
            $table->enum('tipo_liberacao', ['agora', 'data_especifica', 'periodo', 'sempre_ativo'])->default('agora');
            $table->dateTime('data_liberacao')->nullable()->comment('Data específica de liberação');
            $table->dateTime('data_inicio_periodo')->nullable()->comment('Início do período');
            $table->dateTime('data_fim_periodo')->nullable()->comment('Fim do período');
            
            // 5. Público-alvo
            $table->enum('publico_alvo', ['todos', 'area_especifica', 'usuarios_especificos'])->default('todos');
            $table->json('setores_publico')->nullable()->comment('Setores selecionados para público-alvo');
            $table->json('usuarios_publico')->nullable()->comment('IDs de usuários específicos');
            
            // 6. Notificação
            $table->enum('tipo_notificacao', ['todos', 'area_especifica', 'nenhum'])->default('nenhum');
            $table->json('setores_notificacao')->nullable()->comment('Setores para notificar');
            $table->boolean('notificacao_enviada')->default(false);
            $table->dateTime('data_notificacao')->nullable();
            
            // 7. Configurações Extras
            $table->boolean('exigir_confirmacao_leitura')->default(false);
            $table->boolean('exigir_conclusao_obrigatoria')->default(false);
            $table->date('prazo_conclusao')->nullable()->comment('Prazo para conclusão obrigatória');
            $table->boolean('permitir_comentarios')->default(false);
            $table->boolean('permitir_download')->default(false);
            $table->boolean('ativar_certificado')->default(false);
            $table->boolean('dividir_em_modulos')->default(false);
            $table->boolean('permitir_anexos_adicionais')->default(false);
            
            // Metadados
            $table->foreignId('usuario_criacao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_edicao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->integer('visualizacoes')->default(0);
            $table->integer('conclusoes')->default(0);
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'status', 'tipo_liberacao']);
            $table->index(['tenant_id', 'setor', 'nivel']);
            $table->index(['tenant_id', 'obrigatorio', 'status']);
            $table->index(['treinamento_anterior_id']);
            $table->fullText(['titulo', 'descricao']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cursos');
    }
};
