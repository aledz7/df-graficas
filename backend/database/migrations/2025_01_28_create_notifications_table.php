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
        if (Schema::hasTable('notifications')) {
            return;
        }

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // pre-venda, sistema, etc
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // dados adicionais da notificação
            $table->boolean('read')->default(false);
            $table->string('user_id')->nullable(); // ID do usuário que deve receber a notificação
            $table->timestamps();
            
            $table->index(['user_id', 'read']);
            $table->index(['type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
}; 