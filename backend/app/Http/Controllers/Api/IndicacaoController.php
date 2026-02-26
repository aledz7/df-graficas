<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class IndicacaoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_nome' => 'required|string|max:255',
            'responsavel_nome' => 'required|string|max:255',
            'whatsapp' => ['required', 'string', 'regex:/^\+?[0-9\-\s\(\)]{10,20}$/'],
        ]);

        $user = $request->user();

        $dadosIndicacao = [
            'empresa_nome' => $validated['empresa_nome'],
            'responsavel_nome' => $validated['responsavel_nome'],
            'whatsapp' => $validated['whatsapp'],
            'indicador' => [
                'id' => $user?->id,
                'nome' => $user?->name,
                'email' => $user?->email,
                'tenant_id' => $user?->tenant_id,
            ],
        ];

        try {
            $admins = User::query()
                ->where('is_admin', true)
                ->get(['id']);

            if ($admins->isEmpty()) {
                Notification::create([
                    'type' => 'indicacao_whatsapp',
                    'title' => 'Nova indicação recebida',
                    'message' => "Empresa indicada: {$validated['empresa_nome']} | Responsável: {$validated['responsavel_nome']}",
                    'data' => $dadosIndicacao,
                ]);
            } else {
                foreach ($admins as $admin) {
                    Notification::create([
                        'type' => 'indicacao_whatsapp',
                        'title' => 'Nova indicação recebida',
                        'message' => "Empresa indicada: {$validated['empresa_nome']} | Responsável: {$validated['responsavel_nome']}",
                        'data' => $dadosIndicacao,
                        'user_id' => (string) $admin->id,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Erro ao criar notificação de indicação', [
                'erro' => $e->getMessage(),
                'user_id' => $user?->id,
            ]);
        }

        $emailDestino = 'alessandro@dfinformatica.com.br';
        $mensagemEmail = implode("\n", [
            'Nova indicação pelo WhatsApp recebida.',
            '',
            "Empresa indicada: {$validated['empresa_nome']}",
            "Responsável indicado: {$validated['responsavel_nome']}",
            "WhatsApp indicado: {$validated['whatsapp']}",
            '',
            'Dados de quem indicou:',
            'Nome: ' . ($user?->name ?? '-'),
            'E-mail: ' . ($user?->email ?? '-'),
            'Tenant ID: ' . ($user?->tenant_id ?? '-'),
        ]);

        defer(function () use ($emailDestino, $mensagemEmail, $validated): void {
            try {
                Mail::raw($mensagemEmail, function ($message) use ($emailDestino, $validated): void {
                    $message->to($emailDestino)
                        ->subject('Nova indicação recebida - ' . $validated['empresa_nome']);
                });
            } catch (\Throwable $e) {
                Log::error('Erro ao enviar e-mail de indicação', [
                    'erro' => $e->getMessage(),
                    'email_destino' => $emailDestino,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Indicação enviada com sucesso. Nossa equipe entrará em contato.',
        ]);
    }
}
