<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\OrdemServico;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class NotificationOSService
{
    /**
     * Verificar OS com arte atrasada e criar notificações
     */
    public function verificarArteAtrasada()
    {
        try {
            // Buscar OS direcionadas para Criação com prazo específico vencido
            $osAtrasadas = OrdemServico::where('destino_os', 'CRIACAO')
                ->where('prazo_tipo', 'ESPECIFICO')
                ->whereNotNull('prazo_datahora')
                ->where('prazo_datahora', '<', now())
                ->whereNotNull('responsavel_criacao')
                ->where('status_os', '!=', 'Entregue')
                ->get();

            foreach ($osAtrasadas as $os) {
                // Verificar se já existe notificação de atraso para esta OS
                $notificacaoExistente = Notification::where('os_id', $os->id)
                    ->where('type', 'arte_atrasada')
                    ->where('read', false)
                    ->first();

                if (!$notificacaoExistente) {
                    $idOS = $os->id_os ?? $os->numero_os ?? "#{$os->id}";
                    $prazoFormatado = Carbon::parse($os->prazo_datahora)->format('d/m/Y H:i');

                    Notification::create([
                        'type' => 'arte_atrasada',
                        'priority' => 'CRITICA',
                        'title' => "OS {$idOS} está com arte atrasada",
                        'message' => "O prazo definido foi ultrapassado. Prazo era: {$prazoFormatado}",
                        'user_id' => $os->responsavel_criacao,
                        'tenant_id' => $os->tenant_id,
                        'os_id' => $os->id,
                        'data' => [
                            'os_id' => $os->id,
                            'id_os' => $idOS,
                            'prazo_datahora' => $os->prazo_datahora ? Carbon::parse($os->prazo_datahora)->toIso8601String() : null,
                        ],
                        'read' => false,
                    ]);
                }
            }

            return count($osAtrasadas);
        } catch (\Exception $e) {
            Log::error('Erro ao verificar arte atrasada:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 0;
        }
    }

    /**
     * Criar notificação quando OS entra em produção
     */
    public function notificarOSEmProducao(OrdemServico $os)
    {
        try {
            $idOS = $os->id_os ?? $os->numero_os ?? "#{$os->id}";

            Notification::create([
                'type' => 'os_producao',
                'priority' => 'MEDIA',
                'title' => "OS {$idOS} está em Produção",
                'message' => "A produção foi iniciada.",
                'user_id' => null, // Notificação global para produção
                'tenant_id' => $os->tenant_id,
                'os_id' => $os->id,
                'data' => [
                    'os_id' => $os->id,
                    'id_os' => $idOS,
                ],
                'read' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao criar notificação de OS em produção:', [
                'os_id' => $os->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Criar notificação quando OS é entregue
     */
    public function notificarOSEntregue(OrdemServico $os)
    {
        try {
            $idOS = $os->id_os ?? $os->numero_os ?? "#{$os->id}";

            Notification::create([
                'type' => 'os_entregue',
                'priority' => 'BAIXA',
                'title' => "OS {$idOS} foi entregue",
                'message' => "O pedido foi marcado como entregue.",
                'user_id' => $os->vendedor_id, // Notificar o vendedor
                'tenant_id' => $os->tenant_id,
                'os_id' => $os->id,
                'data' => [
                    'os_id' => $os->id,
                    'id_os' => $idOS,
                ],
                'read' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao criar notificação de OS entregue:', [
                'os_id' => $os->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
