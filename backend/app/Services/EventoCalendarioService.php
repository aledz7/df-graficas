<?php

namespace App\Services;

use App\Models\EventoCalendario;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class EventoCalendarioService
{
    /**
     * Listar eventos do calendário
     */
    public function listarEventos(int $tenantId, array $filtros = []): array
    {
        $query = EventoCalendario::where('tenant_id', $tenantId);

        // Filtro por período
        if (isset($filtros['data_inicio']) && isset($filtros['data_fim'])) {
            $dataInicio = Carbon::parse($filtros['data_inicio'])->startOfDay();
            $dataFim = Carbon::parse($filtros['data_fim'])->endOfDay();
            $query->noPeriodo($dataInicio, $dataFim);
        } elseif (isset($filtros['mes']) && isset($filtros['ano'])) {
            $dataInicio = Carbon::create($filtros['ano'], $filtros['mes'], 1)->startOfMonth();
            $dataFim = $dataInicio->copy()->endOfMonth();
            $query->noPeriodo($dataInicio, $dataFim);
        }

        // Filtro por tipo
        if (isset($filtros['tipo'])) {
            $query->porTipo($filtros['tipo']);
        }

        // Filtro por impacto
        if (isset($filtros['impacto'])) {
            $query->porImpacto($filtros['impacto']);
        }

        // Apenas ativos por padrão
        if (!isset($filtros['incluir_inativos']) || !$filtros['incluir_inativos']) {
            $query->ativos();
        }

        $eventos = $query->orderBy('data_inicio', 'asc')->get();

        // Processar eventos recorrentes
        $eventosProcessados = [];
        foreach ($eventos as $evento) {
            if ($evento->recorrente && $evento->ano_base) {
                // Gerar ocorrências do evento recorrente
                $ocorrencias = $this->gerarOcorrenciasRecorrentes($evento, $filtros);
                $eventosProcessados = array_merge($eventosProcessados, $ocorrencias);
            } else {
                $eventosProcessados[] = $this->formatarEvento($evento);
            }
        }

        return $eventosProcessados;
    }

    /**
     * Gerar ocorrências de eventos recorrentes
     */
    protected function gerarOcorrenciasRecorrentes(EventoCalendario $evento, array $filtros): array
    {
        $ocorrencias = [];
        $anoAtual = Carbon::now()->year;
        $anos = isset($filtros['anos']) ? $filtros['anos'] : [$anoAtual, $anoAtual + 1];

        foreach ($anos as $ano) {
            $dataBase = Carbon::create($ano, $evento->data_inicio->month, $evento->data_inicio->day);
            
            if (isset($filtros['data_inicio']) && isset($filtros['data_fim'])) {
                $dataInicio = Carbon::parse($filtros['data_inicio']);
                $dataFim = Carbon::parse($filtros['data_fim']);
                
                if ($dataBase->between($dataInicio, $dataFim)) {
                    $ocorrencias[] = $this->formatarEvento($evento, $dataBase);
                }
            } else {
                $ocorrencias[] = $this->formatarEvento($evento, $dataBase);
            }
        }

        return $ocorrencias;
    }

    /**
     * Formatar evento para resposta
     */
    protected function formatarEvento(EventoCalendario $evento, ?Carbon $dataEspecifica = null): array
    {
        $dataInicio = $dataEspecifica ?? $evento->data_inicio;
        $dataFim = $evento->data_fim 
            ? ($dataEspecifica ? $dataEspecifica->copy()->addDays($evento->data_inicio->diffInDays($evento->data_fim)) : $evento->data_fim)
            : null;

        return [
            'id' => $evento->id,
            'titulo' => $evento->titulo,
            'descricao' => $evento->descricao,
            'data_inicio' => $dataInicio->format('Y-m-d'),
            'data_fim' => $dataFim ? $dataFim->format('Y-m-d') : null,
            'tipo' => $evento->tipo,
            'impacto' => $evento->impacto,
            'recorrente' => $evento->recorrente,
            'frequencia_recorrencia' => $evento->frequencia_recorrencia,
            'ativo' => $evento->ativo,
            'observacoes' => $evento->observacoes,
            'cor' => $evento->cor_evento,
            'icone' => $evento->icone_evento,
            'metadados' => $evento->metadados,
        ];
    }

    /**
     * Criar evento
     */
    public function criarEvento(int $tenantId, array $dados): EventoCalendario
    {
        $dados['tenant_id'] = $tenantId;
        
        // Se for recorrente, definir ano_base
        if (isset($dados['recorrente']) && $dados['recorrente'] && isset($dados['data_inicio'])) {
            $dataInicio = Carbon::parse($dados['data_inicio']);
            $dados['ano_base'] = $dataInicio->year;
        }

        return EventoCalendario::create($dados);
    }

    /**
     * Atualizar evento
     */
    public function atualizarEvento(int $tenantId, int $eventoId, array $dados): EventoCalendario
    {
        $evento = EventoCalendario::where('tenant_id', $tenantId)->findOrFail($eventoId);

        // Se for recorrente, atualizar ano_base
        if (isset($dados['recorrente']) && $dados['recorrente'] && isset($dados['data_inicio'])) {
            $dataInicio = Carbon::parse($dados['data_inicio']);
            $dados['ano_base'] = $dataInicio->year;
        }

        $evento->update($dados);

        return $evento->fresh();
    }

    /**
     * Excluir evento
     */
    public function excluirEvento(int $tenantId, int $eventoId): bool
    {
        $evento = EventoCalendario::where('tenant_id', $tenantId)->findOrFail($eventoId);
        return $evento->delete();
    }

    /**
     * Obter eventos próximos (próximos 30 dias)
     */
    public function obterEventosProximos(int $tenantId, int $dias = 30): array
    {
        $dataInicio = Carbon::now();
        $dataFim = Carbon::now()->addDays($dias);

        return $this->listarEventos($tenantId, [
            'data_inicio' => $dataInicio->format('Y-m-d'),
            'data_fim' => $dataFim->format('Y-m-d'),
        ]);
    }
}
