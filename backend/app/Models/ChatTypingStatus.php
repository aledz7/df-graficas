<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatTypingStatus extends Model
{
    use HasFactory;

    protected $table = 'chat_typing_status';
    
    protected $fillable = [
        'thread_id',
        'user_id',
        'typing_at',
    ];
    
    protected $casts = [
        'typing_at' => 'datetime',
    ];

    /**
     * Relacionamento com thread
     */
    public function thread()
    {
        return $this->belongsTo(ChatThread::class, 'thread_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
