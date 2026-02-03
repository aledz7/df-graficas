<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DadosUsuario extends Model
{
    use HasFactory;

    protected $table = 'dados_usuario';

    protected $fillable = [
        'user_id',
        'chave',
        'valor'
    ];

    /**
     * Relacionamento com o usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para dados do usuário atual
     */
    public function scopeDoUsuario($query, $userId = null)
    {
        $userId = $userId ?? auth()->id();
        return $query->where('user_id', $userId);
    }
} 