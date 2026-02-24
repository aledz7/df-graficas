<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatOSCard extends Model
{
    use HasFactory;

    protected $table = 'chat_os_cards';
    
    protected $fillable = [
        'message_id',
        'ordem_servico_id',
        'preview_data',
    ];
    
    protected $casts = [
        'preview_data' => 'array',
    ];

    /**
     * Relacionamento com mensagem
     */
    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    /**
     * Relacionamento com OS
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }
}
