<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Treinamento extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'treinamento';

    protected $fillable = [
        'tenant_id',
        'pergunta',
        'resposta',
        'setor',
        'nivel',
        'ordem',
        'ativo',
        'usuario_criacao_id',
        'usuario_edicao_id',
    ];

    protected $casts = [
        'ordem' => 'integer',
        'ativo' => 'boolean',
    ];

    /**
     * Setores disponíveis
     */
    const SETOR_ATENDIMENTO = 'atendimento';
    const SETOR_VENDAS = 'vendas';
    const SETOR_PRODUCAO = 'producao';
    const SETOR_DESIGN = 'design';
    const SETOR_FINANCEIRO = 'financeiro';
    const SETOR_GERAL = 'geral';

    /**
     * Níveis disponíveis
     */
    const NIVEL_INICIANTE = 'iniciante';
    const NIVEL_INTERMEDIARIO = 'intermediario';
    const NIVEL_AVANCADO = 'avancado';

    /**
     * Relacionamento com usuário que criou
     */
    public function usuarioCriacao()
    {
        return $this->belongsTo(User::class, 'usuario_criacao_id');
    }

    /**
     * Relacionamento com usuário que editou
     */
    public function usuarioEdicao()
    {
        return $this->belongsTo(User::class, 'usuario_edicao_id');
    }

    /**
     * Scope para filtrar por setor
     */
    public function scopePorSetor($query, $setor)
    {
        if ($setor && $setor !== 'todos') {
            return $query->where(function($q) use ($setor) {
                $q->where('setor', $setor)
                  ->orWhere('setor', self::SETOR_GERAL);
            });
        }
        return $query;
    }

    /**
     * Scope para filtrar por nível
     */
    public function scopePorNivel($query, $nivel)
    {
        if ($nivel && $nivel !== 'todos') {
            return $query->where('nivel', $nivel);
        }
        return $query;
    }

    /**
     * Scope para buscar por palavra-chave
     */
    public function scopeBuscar($query, $termo)
    {
        if ($termo) {
            return $query->where(function($q) use ($termo) {
                $q->where('pergunta', 'like', "%{$termo}%")
                  ->orWhere('resposta', 'like', "%{$termo}%");
            });
        }
        return $query;
    }

    /**
     * Scope para apenas ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Obter nome do setor
     */
    public static function nomeSetor($setor)
    {
        return match($setor) {
            self::SETOR_ATENDIMENTO => 'Atendimento',
            self::SETOR_VENDAS => 'Vendas',
            self::SETOR_PRODUCAO => 'Produção',
            self::SETOR_DESIGN => 'Design',
            self::SETOR_FINANCEIRO => 'Financeiro',
            self::SETOR_GERAL => 'Geral',
            default => 'Geral',
        };
    }

    /**
     * Obter nome do nível
     */
    public static function nomeNivel($nivel)
    {
        return match($nivel) {
            self::NIVEL_INICIANTE => 'Iniciante',
            self::NIVEL_INTERMEDIARIO => 'Intermediário',
            self::NIVEL_AVANCADO => 'Avançado',
            default => 'Iniciante',
        };
    }
}
