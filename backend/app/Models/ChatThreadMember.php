<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatThreadMember extends Model
{
    use HasFactory;

    protected $table = 'chat_thread_members';
    
    protected $fillable = [
        'thread_id',
        'user_id',
        'role',
        'joined_at',
        'last_read_at',
        'is_muted',
    ];
    
    protected $casts = [
        'joined_at' => 'datetime',
        'last_read_at' => 'datetime',
        'is_muted' => 'boolean',
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
