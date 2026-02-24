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
        // Tabela de threads (conversas)
        if (!Schema::hasTable('chat_threads')) {
            Schema::create('chat_threads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('tipo')->default('direto'); // direto, grupo, os
                $table->string('nome')->nullable(); // Nome do grupo ou null para conversa direta
                $table->string('setor')->nullable(); // Comercial, Criacao, Producao, Financeiro, Logistica
                $table->unsignedBigInteger('ordem_servico_id')->nullable(); // Se for chat de OS
                $table->unsignedBigInteger('criado_por')->nullable(); // Usuário que criou
                $table->boolean('is_privado')->default(false);
                $table->text('descricao')->nullable(); // Descrição do grupo
                $table->string('icone')->nullable(); // Ícone do grupo
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
                $table->foreign('criado_por')->references('id')->on('users')->onDelete('set null');
                $table->index(['tenant_id', 'tipo'], 'idx_chat_threads_tenant_tipo');
                $table->index(['ordem_servico_id'], 'idx_chat_threads_os');
            });
        }

        // Tabela de membros das threads
        if (!Schema::hasTable('chat_thread_members')) {
            Schema::create('chat_thread_members', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('thread_id');
                $table->unsignedBigInteger('user_id');
                $table->string('role')->default('member'); // admin, member
                $table->timestamp('joined_at')->useCurrent();
                $table->timestamp('last_read_at')->nullable();
                $table->boolean('is_muted')->default(false);
                $table->timestamps();
                
                $table->foreign('thread_id')->references('id')->on('chat_threads')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['thread_id', 'user_id'], 'unique_thread_user');
                $table->index(['user_id', 'thread_id'], 'idx_chat_members_user_thread');
            });
        }

        // Tabela de mensagens
        if (!Schema::hasTable('chat_messages')) {
            Schema::create('chat_messages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('thread_id');
                $table->unsignedBigInteger('user_id');
                $table->text('texto')->nullable();
                $table->string('tipo')->default('texto'); // texto, arquivo, audio, os_card
                $table->unsignedBigInteger('reply_to')->nullable(); // Mensagem respondida
                $table->unsignedBigInteger('forwarded_from')->nullable(); // Mensagem encaminhada
                $table->boolean('is_importante')->default(false);
                $table->boolean('is_urgente')->default(false);
                $table->timestamp('edited_at')->nullable();
                $table->timestamps();
                
                $table->foreign('thread_id')->references('id')->on('chat_threads')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('reply_to')->references('id')->on('chat_messages')->onDelete('set null');
                $table->foreign('forwarded_from')->references('id')->on('chat_messages')->onDelete('set null');
                $table->index(['thread_id', 'created_at'], 'idx_chat_msg_thread_created');
                $table->index(['user_id'], 'idx_chat_msg_user');
            });
        }

        // Tabela de leituras de mensagens
        if (!Schema::hasTable('chat_message_reads')) {
            Schema::create('chat_message_reads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('message_id');
                $table->unsignedBigInteger('user_id');
                $table->timestamp('read_at')->useCurrent();
                
                $table->foreign('message_id')->references('id')->on('chat_messages')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['message_id', 'user_id'], 'unique_message_user_read');
                $table->index(['user_id', 'read_at'], 'idx_chat_reads_user_read');
            });
        }

        // Tabela de anexos
        if (!Schema::hasTable('chat_attachments')) {
            Schema::create('chat_attachments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('message_id');
                $table->string('file_url');
                $table->string('file_type'); // pdf, imagem, cdr, ai, zip, audio
                $table->string('file_name');
                $table->bigInteger('file_size')->default(0); // em bytes
                $table->string('mime_type')->nullable();
                $table->text('thumbnail_url')->nullable(); // Para imagens
                $table->timestamps();
                
                $table->foreign('message_id')->references('id')->on('chat_messages')->onDelete('cascade');
                $table->index(['message_id'], 'idx_chat_attach_msg');
            });
        }

        // Tabela de cards de OS (quando anexar OS no chat)
        if (!Schema::hasTable('chat_os_cards')) {
            Schema::create('chat_os_cards', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('message_id');
                $table->unsignedBigInteger('ordem_servico_id');
                $table->text('preview_data')->nullable(); // JSON com dados da OS para preview
                $table->timestamps();
                
                $table->foreign('message_id')->references('id')->on('chat_messages')->onDelete('cascade');
                $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
                $table->unique(['message_id'], 'unique_msg_os_card');
            });
        }

        // Tabela de notificações do chat
        if (!Schema::hasTable('chat_notifications')) {
            Schema::create('chat_notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('message_id');
                $table->string('prioridade')->default('normal'); // normal, alta, urgente
                $table->boolean('lida')->default(false);
                $table->timestamp('lida_em')->nullable();
                $table->timestamps();
                
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('message_id')->references('id')->on('chat_messages')->onDelete('cascade');
                $table->index(['user_id', 'lida'], 'idx_chat_notif_user_lida');
                $table->index(['message_id'], 'idx_chat_notif_msg');
            });
        }

        // Tabela de status "digitando..."
        if (!Schema::hasTable('chat_typing_status')) {
            Schema::create('chat_typing_status', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('thread_id');
                $table->unsignedBigInteger('user_id');
                $table->timestamp('typing_at')->useCurrent();
                
                $table->foreign('thread_id')->references('id')->on('chat_threads')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['thread_id', 'user_id'], 'unique_thread_user_typing');
                $table->index(['thread_id', 'typing_at'], 'idx_chat_typing_thread');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_typing_status');
        Schema::dropIfExists('chat_notifications');
        Schema::dropIfExists('chat_os_cards');
        Schema::dropIfExists('chat_attachments');
        Schema::dropIfExists('chat_message_reads');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_thread_members');
        Schema::dropIfExists('chat_threads');
    }
};
