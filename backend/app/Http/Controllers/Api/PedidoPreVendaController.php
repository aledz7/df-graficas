<?php

namespace App\Http\Controllers\Api;

use App\Models\PedidoPreVenda;
use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class PedidoPreVendaController extends ResourceController
{
    protected $model = PedidoPreVenda::class;
    
    protected $storeRules = [
        'cliente.nome' => 'required|string|max:255',
        'cliente.telefone' => 'required|string|max:20',
        'cliente.email' => 'nullable|email|max:255',
        'cliente.endereco' => 'nullable|string|max:500',
        'itens' => 'required|array|min:1',
        'itens.*.produto_id' => 'required|exists:produtos,id',
        'itens.*.nome' => 'required|string|max:255',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.preco_unitario' => 'required|numeric|min:0',
        'itens.*.preco_total' => 'required|numeric|min:0',
        'total' => 'required|numeric|min:0',
        'status' => 'nullable|string|in:pendente,aprovado,rejeitado,cancelado,finalizado',
        'origem' => 'nullable|string|max:100',
        'observacoes' => 'nullable|string|max:1000',
    ];

    protected $updateRules = [
        'cliente.nome' => 'sometimes|string|max:255',
        'cliente.telefone' => 'sometimes|string|max:20',
        'cliente.email' => 'nullable|email|max:255',
        'cliente.endereco' => 'nullable|string|max:500',
        'itens' => 'sometimes|array|min:1',
        'itens.*.produto_id' => 'required|exists:produtos,id',
        'itens.*.nome' => 'required|string|max:255',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.preco_unitario' => 'required|numeric|min:0',
        'itens.*.preco_total' => 'required|numeric|min:0',
        'total' => 'sometimes|numeric|min:0',
        'status' => 'sometimes|string|in:pendente,aprovado,rejeitado,cancelado,finalizado',
        'origem' => 'sometimes|string|max:100',
        'observacoes' => 'nullable|string|max:1000',
    ];

    protected $with = ['usuarioAprovacao', 'vendaGerada'];

    /**
     * Sobrescreve o método store para processar dados do cliente e itens
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        return DB::transaction(function () use ($request) {
            // Preparar dados do pedido
            $data = [
                'tenant_id' => $request->user()->tenant_id,
                'cliente_nome' => $request->input('cliente.nome'),
                'cliente_email' => $request->input('cliente.email'),
                'cliente_telefone' => $request->input('cliente.telefone'),
                'cliente_endereco' => $request->input('cliente.endereco'),
                'total' => $request->input('total'),
                'status' => $request->input('status', PedidoPreVenda::STATUS_PENDENTE),
                'origem' => $request->input('origem', 'catalogo_publico'),
                'observacoes' => $request->input('observacoes'),
                'dados_cliente' => $request->input('cliente'),
                'dados_itens' => $request->input('itens'),
                'metadados' => [
                    'ip_cliente' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'data_criacao' => now()->toDateTimeString(),
                ]
            ];

            // Criar o pedido
            $pedido = $this->model::create($data);

            // Log para debug
            \Log::info('Pedido de pré-venda criado:', [
                'pedido_id' => $pedido->id,
                'codigo' => $pedido->codigo,
                'cliente' => $pedido->cliente_nome,
                'total' => $pedido->total,
                'origem' => $pedido->origem
            ]);

            // Recarregar o pedido com os relacionamentos
            $pedido->load($this->with);

            return $this->success($pedido, 'Pedido de pré-venda criado com sucesso', 201);
        });
    }

    /**
     * Aprova um pedido de pré-venda
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function aprovar(Request $request, $id): JsonResponse
    {
        $pedido = $this->model::find($id);

        if (!$pedido) {
            return $this->notFound('Pedido não encontrado');
        }

        if (!$pedido->podeSerAprovado()) {
            return $this->error('Pedido não pode ser aprovado no status atual', 422);
        }

        $usuario = $request->user();
        $pedido->aprovar($usuario->id, $usuario->name);

        return $this->success($pedido, 'Pedido aprovado com sucesso');
    }

    /**
     * Rejeita um pedido de pré-venda
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function rejeitar(Request $request, $id): JsonResponse
    {
        $pedido = $this->model::find($id);

        if (!$pedido) {
            return $this->notFound('Pedido não encontrado');
        }

        if (!$pedido->podeSerRejeitado()) {
            return $this->error('Pedido não pode ser rejeitado no status atual', 422);
        }

        $usuario = $request->user();
        $motivo = $request->input('motivo');
        $pedido->rejeitar($usuario->id, $usuario->name, $motivo);

        return $this->success($pedido, 'Pedido rejeitado com sucesso');
    }

    /**
     * Cancela um pedido de pré-venda
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancelar(Request $request, $id): JsonResponse
    {
        $pedido = $this->model::find($id);

        if (!$pedido) {
            return $this->notFound('Pedido não encontrado');
        }

        if (!$pedido->podeSerCancelado()) {
            return $this->error('Pedido não pode ser cancelado no status atual', 422);
        }

        $motivo = $request->input('motivo');
        $pedido->cancelar($motivo);

        return $this->success($pedido, 'Pedido cancelado com sucesso');
    }

    /**
     * Converte um pedido aprovado em venda
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function converterEmVenda(Request $request, $id): JsonResponse
    {
        $pedido = $this->model::find($id);

        if (!$pedido) {
            return $this->notFound('Pedido não encontrado');
        }

        if ($pedido->status !== PedidoPreVenda::STATUS_APROVADO) {
            return $this->error('Apenas pedidos aprovados podem ser convertidos em venda', 422);
        }

        return DB::transaction(function () use ($pedido, $request) {
            // Buscar ou criar cliente
            $cliente = Cliente::where('tenant_id', $pedido->tenant_id)
                ->where('telefone_principal', $pedido->cliente_telefone)
                ->first();

            if (!$cliente) {
                // Criar novo cliente
                $cliente = Cliente::create([
                    'tenant_id' => $pedido->tenant_id,
                    'nome_completo' => $pedido->cliente_nome,
                    'email' => $pedido->cliente_email,
                    'telefone_principal' => $pedido->cliente_telefone,
                    'status' => true,
                    'metadados' => [
                        'criado_via_pedido_pre_venda' => true,
                        'pedido_id' => $pedido->id
                    ]
                ]);
            }

            // Criar venda
            $usuario = $request->user();
            $venda = Venda::create([
                'tenant_id' => $pedido->tenant_id,
                'cliente_id' => $cliente->id,
                'usuario_id' => $usuario->id,
                'vendedor_id' => $usuario->id,
                'tipo_documento' => Venda::TIPO_VENDA,
                'status' => Venda::STATUS_ABERTA,
                'status_pagamento' => Venda::PAGAMENTO_PENDENTE,
                'cliente_nome' => $pedido->cliente_nome,
                'cliente_telefone' => $pedido->cliente_telefone,
                'cliente_email' => $pedido->cliente_email,
                'subtotal' => $pedido->total,
                'valor_total' => $pedido->total,
                'valor_restante' => $pedido->total,
                'observacoes' => "Venda gerada a partir do pedido de pré-venda {$pedido->codigo}",
                'vendedor_nome' => $usuario->name,
                'metadados' => [
                    'pedido_pre_venda_id' => $pedido->id,
                    'pedido_pre_venda_codigo' => $pedido->codigo
                ]
            ]);

            // Criar itens da venda
            foreach ($pedido->dados_itens as $item) {
                ItemVenda::create([
                    'tenant_id' => $pedido->tenant_id,
                    'venda_id' => $venda->id,
                    'produto_id' => $item['produto_id'],
                    'produto_nome' => $item['nome'],
                    'quantidade' => $item['quantidade'],
                    'valor_unitario' => $item['preco_unitario'],
                    'valor_total' => $item['preco_total'],
                    'observacoes' => "Item do pedido de pré-venda {$pedido->codigo}"
                ]);
            }

            // Finalizar o pedido
            $pedido->finalizar($venda->id, $venda->codigo);

            return $this->success([
                'pedido' => $pedido,
                'venda' => $venda
            ], 'Pedido convertido em venda com sucesso');
        });
    }

    /**
     * Envia pedido via WhatsApp ou email
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function enviar(Request $request, $id): JsonResponse
    {
        $pedido = $this->model::find($id);

        if (!$pedido) {
            return $this->notFound('Pedido não encontrado');
        }

        $metodo = $request->input('metodo', 'whatsapp');

        // Aqui você pode implementar a lógica para enviar via WhatsApp ou email
        // Por enquanto, vamos apenas simular o envio

        $mensagem = $this->gerarMensagemPedido($pedido);

        if ($metodo === 'whatsapp') {
            // Implementar envio via WhatsApp
            $whatsappUrl = $this->gerarUrlWhatsApp($pedido->cliente_telefone, $mensagem);
            
            return $this->success([
                'pedido' => $pedido,
                'whatsapp_url' => $whatsappUrl,
                'mensagem' => $mensagem
            ], 'URL do WhatsApp gerada com sucesso');
        } else {
            // Implementar envio via email
            // Mail::to($pedido->cliente_email)->send(new PedidoPreVendaMail($pedido));
            
            return $this->success([
                'pedido' => $pedido,
                'mensagem' => $mensagem
            ], 'Email enviado com sucesso');
        }
    }

    /**
     * Gera mensagem do pedido para envio
     */
    private function gerarMensagemPedido(PedidoPreVenda $pedido): string
    {
        $mensagem = "🛒 *Novo Pedido Recebido*\n\n";
        $mensagem .= "📋 *Código:* {$pedido->codigo}\n";
        $mensagem .= "👤 *Cliente:* {$pedido->cliente_nome}\n";
        $mensagem .= "📞 *Telefone:* {$pedido->cliente_telefone}\n";
        
        if ($pedido->cliente_email) {
            $mensagem .= "📧 *Email:* {$pedido->cliente_email}\n";
        }
        
        $mensagem .= "💰 *Total:* R$ " . number_format($pedido->total, 2, ',', '.') . "\n\n";
        $mensagem .= "📦 *Itens:*\n";
        
        foreach ($pedido->dados_itens as $item) {
            $mensagem .= "• {$item['nome']} - Qtd: {$item['quantidade']} - R$ " . number_format($item['preco_total'], 2, ',', '.') . "\n";
        }
        
        if ($pedido->observacoes) {
            $mensagem .= "\n📝 *Observações:* {$pedido->observacoes}\n";
        }
        
        $mensagem .= "\n📅 *Data:* " . $pedido->data_pedido->format('d/m/Y H:i') . "\n";
        $mensagem .= "🌐 *Origem:* {$pedido->origem}\n";
        
        return $mensagem;
    }

    /**
     * Gera URL do WhatsApp
     */
    private function gerarUrlWhatsApp(string $telefone, string $mensagem): string
    {
        $telefoneLimpo = preg_replace('/[^0-9]/', '', $telefone);
        $mensagemCodificada = urlencode($mensagem);
        
        return "https://wa.me/{$telefoneLimpo}?text={$mensagemCodificada}";
    }

    /**
     * Aplica filtros à consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filtrar por origem
        if ($request->has('origem')) {
            $query->where('origem', $request->input('origem'));
        }

        // Filtrar por termo de busca
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('codigo', 'like', "%{$search}%")
                  ->orWhere('cliente_nome', 'like', "%{$search}%")
                  ->orWhere('cliente_telefone', 'like', "%{$search}%")
                  ->orWhere('cliente_email', 'like', "%{$search}%");
            });
        }

        // Filtrar por data
        if ($request->has('data_inicio')) {
            $query->where('data_pedido', '>=', $request->input('data_inicio'));
        }

        if ($request->has('data_fim')) {
            $query->where('data_pedido', '<=', $request->input('data_fim'));
        }

        return $query;
    }
} 