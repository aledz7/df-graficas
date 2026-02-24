<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatMessageRead extends Model
{
    use HasFactory;

    protected $table = 'chat_message_reads';
    
    protected $fillable = [
        'message_id',
        'user_id',
        'read_at',
    ];
    
    protected $casts = [
        'read_at' => 'datetime',
    ];

    /**
     * Relacionamento com mensagem
     */
    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
