<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;
use Carbon\Carbon;

class EventoCalendario extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'eventos_calendario';

    protected $fillable = [
        'tenant_id',
        'titulo',
        'descricao',
        'data_inicio',
        'data_fim',
        'tipo',
        'impacto',
        'recorrente',
        'frequencia_recorrencia',
        'ano_base',
        'ativo',
        'observacoes',
        'metadados',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'recorrente' => 'boolean',
        'ativo' => 'boolean',
        'metadados' => 'array',
    ];

    /**
     * Scope para eventos ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope para eventos em um período
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->where(function($q) use ($dataInicio, $dataFim) {
            $q->whereBetween('data_inicio', [$dataInicio, $dataFim])
              ->orWhere(function($q2) use ($dataInicio, $dataFim) {
                  $q2->whereNotNull('data_fim')
                     ->whereBetween('data_fim', [$dataInicio, $dataFim]);
              })
              ->orWhere(function($q3) use ($dataInicio, $dataFim) {
                  $q3->where('data_inicio', '<=', $dataInicio)
                     ->where(function($q4) use ($dataFim) {
                         $q4->whereNull('data_fim')
                            ->orWhere('data_fim', '>=', $dataFim);
                     });
              });
        });
    }

    /**
     * Scope para eventos por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Scope para eventos por impacto
     */
    public function scopePorImpacto($query, $impacto)
    {
        return $query->where('impacto', $impacto);
    }

    /**
     * Verificar se o evento está ativo na data especificada
     */
    public function estaAtivoNaData($data = null)
    {
        $data = $data ? Carbon::parse($data) : Carbon::now();
        
        if (!$this->ativo) {
            return false;
        }

        if ($this->data_inicio->isSameDay($data)) {
            return true;
        }

        if ($this->data_fim && $data->between($this->data_inicio, $this->data_fim)) {
            return true;
        }

        // Se for recorrente, verificar
        if ($this->recorrente) {
            return $this->verificarRecorrencia($data);
        }

        return false;
    }

    /**
     * Verificar se o evento ocorre na data por recorrência
     */
    protected function verificarRecorrencia($data)
    {
        if (!$this->ano_base) {
            return false;
        }

        $anoBase = Carbon::create($this->ano_base, $this->data_inicio->month, $this->data_inicio->day);
        
        switch ($this->frequencia_recorrencia) {
            case 'anual':
                return $data->month === $anoBase->month && $data->day === $anoBase->day;
            case 'mensal':
                return $data->day === $anoBase->day;
            case 'semanal':
                return $data->dayOfWeek === $anoBase->dayOfWeek;
            default:
                return false;
        }
    }

    /**
     * Obter cor do evento baseado no tipo
     */
    public function getCorEventoAttribute()
    {
        $cores = [
            'volta_aulas' => '#3B82F6', // Azul
            'eleicoes' => '#10B981', // Verde
            'datas_comerciais' => '#F59E0B', // Amarelo/Laranja
            'feriado' => '#EF4444', // Vermelho
            'evento_especial' => '#8B5CF6', // Roxo
            'outro' => '#6B7280', // Cinza
        ];

        return $cores[$this->tipo] ?? $cores['outro'];
    }

    /**
     * Obter ícone do evento baseado no tipo
     */
    public function getIconeEventoAttribute()
    {
        $icones = [
            'volta_aulas' => 'GraduationCap',
            'eleicoes' => 'Vote',
            'datas_comerciais' => 'ShoppingBag',
            'feriado' => 'Calendar',
            'evento_especial' => 'Star',
            'outro' => 'Calendar',
        ];

        return $icones[$this->tipo] ?? $icones['outro'];
    }
}
