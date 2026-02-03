<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CalculoSalvo extends Model
{
    use HasFactory;

    protected $table = 'calculos_salvos';

    protected $fillable = [
        'user_id',
        'nome',
        'dados_calculo',
        'resultado',
        'descricao'
    ];

    protected $casts = [
        'dados_calculo' => 'json',
        'resultado' => 'decimal:2'
    ];

    /**
     * Relacionamento com o usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para cálculos do usuário atual
     */
    public function scopeDoUsuario($query, $userId = null)
    {
        $userId = $userId ?? auth()->id();
        return $query->where('user_id', $userId);
    }
} 