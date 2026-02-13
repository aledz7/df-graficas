<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Romaneio extends Model
{
    use SoftDeletes, Tenantable;

    protected $table = 'romaneios';

    protected $fillable = [
        'tenant_id',
        'numero_romaneio',
        'entregador_id',
        'data_romaneio',
        'hora_saida',
        'hora_retorno',
        'status',
        'quantidade_entregas',
        'entregas_realizadas',
        'entregas_pendentes',
        'observacoes',
        'rota_sugerida',
        'distancia_total_km',
        'tempo_estimado_minutos',
        'endereco_origem',
        'usuario_criacao_id',
    ];

    protected $casts = [
        'data_romaneio' => 'date',
        'hora_saida' => 'datetime',
        'hora_retorno' => 'datetime',
        'quantidade_entregas' => 'integer',
        'entregas_realizadas' => 'integer',
        'entregas_pendentes' => 'integer',
        'rota_sugerida' => 'array',
        'distancia_total_km' => 'decimal:2',
        'tempo_estimado_minutos' => 'integer',
    ];

    /**
     * Relacionamento com entregador
     */
    public function entregador()
    {
        return $this->belongsTo(Entregador::class);
    }

    /**
     * Relacionamento com entregas do romaneio
     */
    public function entregas()
    {
        return $this->hasMany(RomaneioEntrega::class);
    }

    /**
     * Relacionamento com vendas através de romaneio_entregas
     */
    public function vendas()
    {
        return $this->belongsToMany(Venda::class, 'romaneio_entregas', 'romaneio_id', 'venda_id')
            ->withPivot(['ordem_entrega', 'status', 'data_hora_entrega', 'observacao_entrega', 'motivo_nao_entrega'])
            ->withTimestamps();
    }

    /**
     * Relacionamento com usuário que criou o romaneio
     */
    public function usuarioCriacao()
    {
        return $this->belongsTo(User::class, 'usuario_criacao_id');
    }

    /**
     * Scope para romaneios abertos
     */
    public function scopeAbertos($query)
    {
        return $query->where('status', 'aberto');
    }

    /**
     * Scope para romaneios em rota
     */
    public function scopeEmRota($query)
    {
        return $query->where('status', 'em_rota');
    }

    /**
     * Scope para romaneios finalizados
     */
    public function scopeFinalizados($query)
    {
        return $query->where('status', 'finalizado');
    }

    /**
     * Gera o próximo número de romaneio
     */
    public static function gerarNumeroRomaneio($tenantId)
    {
        $ano = date('Y');
        $ultimoRomaneio = self::where('tenant_id', $tenantId)
            ->whereYear('created_at', $ano)
            ->orderBy('id', 'desc')
            ->first();

        if ($ultimoRomaneio) {
            $numero = (int) substr($ultimoRomaneio->numero_romaneio, -6) + 1;
        } else {
            $numero = 1;
        }

        return 'ROM-' . $ano . '-' . str_pad($numero, 6, '0', STR_PAD_LEFT);
    }
}
