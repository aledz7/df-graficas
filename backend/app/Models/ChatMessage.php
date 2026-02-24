<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    use HasFactory;

    protected $table = 'chat_messages';
    
    protected $fillable = [
        'thread_id',
        'user_id',
        'texto',
        'tipo',
        'reply_to',
        'forwarded_from',
        'is_importante',
        'is_urgente',
        'edited_at',
    ];
    
    protected $casts = [
        'is_importante' => 'boolean',
        'is_urgente' => 'boolean',
        'edited_at' => 'datetime',
    ];

    /**
     * Relacionamento com thread
     */
    public function thread()
    {
        return $this->belongsTo(ChatThread::class, 'thread_id');
    }

    /**
     * Relacionamento com usuário (remetente)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relacionamento com mensagem respondida
     */
    public function replyTo()
    {
        return $this->belongsTo(ChatMessage::class, 'reply_to');
    }

    /**
     * Relacionamento com mensagem encaminhada
     */
    public function forwardedFrom()
    {
        return $this->belongsTo(ChatMessage::class, 'forwarded_from');
    }

    /**
     * Relacionamento com anexos
     */
    public function attachments()
    {
        return $this->hasMany(ChatAttachment::class, 'message_id');
    }

    /**
     * Relacionamento com card de OS
     */
    public function osCard()
    {
        return $this->hasOne(ChatOSCard::class, 'message_id');
    }

    /**
     * Relacionamento com leituras
     */
    public function reads()
    {
        return $this->hasMany(ChatMessageRead::class, 'message_id');
    }

    /**
     * Verificar se foi lida por usuário
     */
    public function isReadBy($userId)
    {
        return $this->reads()->where('user_id', $userId)->exists();
    }

    /**
     * Marcar como lida
     */
    public function markAsRead($userId)
    {
        return $this->reads()->firstOrCreate([
            'message_id' => $this->id,
            'user_id' => $userId,
        ]);
    }
}
