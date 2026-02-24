<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatNotification extends Model
{
    use HasFactory;

    protected $table = 'chat_notifications';
    
    protected $fillable = [
        'user_id',
        'message_id',
        'prioridade',
        'lida',
        'lida_em',
    ];
    
    protected $casts = [
        'lida' => 'boolean',
        'lida_em' => 'datetime',
    ];

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relacionamento com mensagem
     */
    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    /**
     * Marcar como lida
     */
    public function markAsRead()
    {
        $this->update([
            'lida' => true,
            'lida_em' => now(),
        ]);
    }
}
