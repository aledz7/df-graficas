<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class ChatThread extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'chat_threads';
    
    protected $fillable = [
        'tenant_id',
        'tipo',
        'nome',
        'setor',
        'ordem_servico_id',
        'criado_por',
        'is_privado',
        'descricao',
        'icone',
    ];
    
    protected $casts = [
        'is_privado' => 'boolean',
    ];

    /**
     * Relacionamento com membros
     */
    public function members()
    {
        return $this->hasMany(ChatThreadMember::class, 'thread_id');
    }

    /**
     * Relacionamento com mensagens
     */
    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'thread_id')->orderBy('created_at', 'asc');
    }

    /**
     * Relacionamento com última mensagem
     */
    public function lastMessage()
    {
        return $this->hasOne(ChatMessage::class, 'thread_id')->latestOfMany();
    }

    /**
     * Relacionamento com OS
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com criador
     */
    public function criador()
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    /**
     * Verificar se usuário é membro
     */
    public function hasMember($userId)
    {
        return $this->members()->where('user_id', $userId)->exists();
    }

    /**
     * Obter contagem de mensagens não lidas para um usuário
     */
    public function getUnreadCount($userId)
    {
        $lastRead = $this->members()
            ->where('user_id', $userId)
            ->value('last_read_at');

        if (!$lastRead) {
            return $this->messages()->count();
        }

        return $this->messages()
            ->where('created_at', '>', $lastRead)
            ->where('user_id', '!=', $userId)
            ->count();
    }
}
