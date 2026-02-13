<?php

namespace App\Http\Controllers\Api;

use App\Models\Romaneio;
use App\Models\RomaneioEntrega;
use App\Models\Venda;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RomaneioController extends BaseController
{
    /**
     * Listar romaneios com filtros
     */
    public function index(Request $request): JsonResponse
    {
        $query = Romaneio::where('tenant_id', auth()->user()->tenant_id)
            ->with(['entregador', 'entregas.venda.cliente', 'usuarioCriacao']);

        // Filtros
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('entregador_id')) {
            $query->where('entregador_id', $request->entregador_id);
        }

        if ($request->has('data_inicio')) {
            $query->where('data_romaneio', '>=', $request->data_inicio);
        }

        if ($request->has('data_fim')) {
            $query->where('data_romaneio', '<=', $request->data_fim);
        }

        $perPage = min($request->input('per_page', 15), 1000);
        $romaneios = $query->orderBy('data_romaneio', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return $this->success($romaneios);
    }

    /**
     * Buscar pedidos disponíveis para romaneio
     */
    public function pedidosDisponiveis(Request $request): JsonResponse
    {
        $query = Venda::where('tenant_id', auth()->user()->tenant_id)
            ->where('status', 'finalizada')
            ->where('tipo_documento', 'venda')
            ->whereDoesntHave('romaneioEntregas', function($q) {
                $q->where('status', '!=', 'cancelado');
            }) // Pedidos que ainda não estão em romaneio (ou estão cancelados)
            ->with(['cliente', 'entregador', 'opcaoFrete']);

        // Filtros
        if ($request->has('data_entrega')) {
            // Se tiver prazo_entrega_dias, calcular data esperada
            // Por enquanto, filtrar por data de finalização
            $query->whereDate('data_finalizacao', $request->data_entrega);
        }

        if ($request->has('bairro')) {
            $query->where('bairro_entrega', 'like', '%' . $request->bairro . '%');
        }

        if ($request->has('cidade')) {
            $query->where('cidade_entrega', 'like', '%' . $request->cidade . '%');
        }

        if ($request->has('entregador_id')) {
            $query->where('entregador_id', $request->entregador_id);
        }

        if ($request->has('valor_frete_min')) {
            $query->where('valor_frete', '>=', $request->valor_frete_min);
        }

        $pedidos = $query->orderBy('data_finalizacao', 'asc')
            ->get()
            ->map(function ($venda) {
                return [
                    'id' => $venda->id,
                    'codigo_venda' => $venda->codigo,
                    'cliente' => $venda->cliente ? [
                        'id' => $venda->cliente->id,
                        'nome' => $venda->cliente->nome_completo ?? $venda->cliente->nome,
                        'telefone' => $venda->cliente->telefone,
                    ] : null,
                    'endereco' => $venda->cliente ? [
                        'logradouro' => $venda->cliente->logradouro,
                        'numero' => $venda->cliente->numero,
                        'complemento' => $venda->cliente->complemento,
                        'bairro' => $venda->bairro_entrega ?? $venda->cliente->bairro,
                        'cidade' => $venda->cidade_entrega ?? $venda->cliente->cidade,
                        'estado' => $venda->estado_entrega ?? $venda->cliente->estado,
                        'cep' => $venda->cep_entrega ?? $venda->cliente->cep,
                        'endereco_completo' => $venda->cliente->endereco_completo,
                    ] : null,
                    'valor_frete' => $venda->valor_frete ?? 0,
                    'observacoes' => $venda->observacoes,
                    'data_finalizacao' => $venda->data_finalizacao,
                    'entregador' => $venda->entregador ? [
                        'id' => $venda->entregador->id,
                        'nome' => $venda->entregador->nome,
                    ] : null,
                ];
            });

        return $this->success($pedidos);
    }

    /**
     * Calcular rota sugerida (modo simples)
     */
    public function calcularRota(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'venda_ids' => 'required|array',
            'venda_ids.*' => 'exists:vendas,id',
            'endereco_origem' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $vendaIds = $request->venda_ids;
        $enderecoOrigem = $request->endereco_origem;

        // Buscar vendas com endereços
        $vendas = Venda::whereIn('id', $vendaIds)
            ->where('tenant_id', auth()->user()->tenant_id)
            ->with('cliente')
            ->get();

        // Ordenar por bairro/cidade (modo simples)
        $vendasOrdenadas = $this->ordenarRotaSimples($vendas, $enderecoOrigem);

        $rota = [
            'origem' => $enderecoOrigem,
            'paradas' => $vendasOrdenadas,
            'total_paradas' => count($vendasOrdenadas),
            'distancia_estimada_km' => null, // Será calculado no modo avançado
            'tempo_estimado_minutos' => null, // Será calculado no modo avançado
        ];

        return $this->success($rota);
    }

    /**
     * Criar romaneio
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'entregador_id' => 'nullable|exists:entregadores,id',
            'data_romaneio' => 'required|date',
            'venda_ids' => 'required|array|min:1',
            'venda_ids.*' => 'exists:vendas,id',
            'rota_sugerida' => 'nullable|array',
            'observacoes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        return DB::transaction(function () use ($request) {
            // Buscar endereço da gráfica
            $empresa = Empresa::where('tenant_id', auth()->user()->tenant_id)->first();
            $enderecoOrigem = $empresa->endereco_grafica ?? $empresa->endereco_completo ?? '';

            // Gerar número do romaneio
            $numeroRomaneio = Romaneio::gerarNumeroRomaneio(auth()->user()->tenant_id);

            // Criar romaneio
            $romaneio = Romaneio::create([
                'tenant_id' => auth()->user()->tenant_id,
                'numero_romaneio' => $numeroRomaneio,
                'entregador_id' => $request->entregador_id,
                'data_romaneio' => $request->data_romaneio,
                'status' => 'aberto',
                'quantidade_entregas' => count($request->venda_ids),
                'entregas_pendentes' => count($request->venda_ids),
                'rota_sugerida' => $request->rota_sugerida,
                'endereco_origem' => $enderecoOrigem,
                'observacoes' => $request->observacoes,
                'usuario_criacao_id' => auth()->id(),
            ]);

            // Criar entregas
            $ordem = 1;
            foreach ($request->venda_ids as $vendaId) {
                RomaneioEntrega::create([
                    'romaneio_id' => $romaneio->id,
                    'venda_id' => $vendaId,
                    'ordem_entrega' => $ordem++,
                    'status' => 'pendente',
                ]);
            }

            $romaneio->load(['entregador', 'entregas.venda.cliente', 'usuarioCriacao']);

            return $this->success($romaneio, 'Romaneio criado com sucesso', 201);
        });
    }

    /**
     * Exibir romaneio específico
     */
    public function show($id): JsonResponse
    {
        $romaneio = Romaneio::where('tenant_id', auth()->user()->tenant_id)
            ->with(['entregador', 'entregas.venda.cliente', 'entregas.usuarioConfirmacao', 'usuarioCriacao'])
            ->findOrFail($id);

        return $this->success($romaneio);
    }

    /**
     * Atualizar status do romaneio
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:aberto,em_rota,finalizado,cancelado',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $romaneio = Romaneio::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        $romaneio->status = $request->status;

        if ($request->status === 'em_rota' && !$romaneio->hora_saida) {
            $romaneio->hora_saida = now();
        }

        if ($request->status === 'finalizado' && !$romaneio->hora_retorno) {
            $romaneio->hora_retorno = now();
        }

        $romaneio->save();

        return $this->success($romaneio, 'Status do romaneio atualizado');
    }

    /**
     * Confirmar entrega de um pedido
     */
    public function confirmarEntrega(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'romaneio_entrega_id' => 'required|exists:romaneio_entregas,id',
            'status' => 'required|in:entregue,nao_entregue',
            'observacao' => 'nullable|string',
            'motivo_nao_entrega' => 'nullable|string|required_if:status,nao_entregue',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $romaneio = Romaneio::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        $entrega = RomaneioEntrega::where('romaneio_id', $romaneio->id)
            ->findOrFail($request->romaneio_entrega_id);

        $entrega->status = $request->status;
        $entrega->data_hora_entrega = now();
        $entrega->observacao_entrega = $request->observacao;
        $entrega->motivo_nao_entrega = $request->motivo_nao_entrega;
        $entrega->usuario_confirmacao_id = auth()->id();
        $entrega->save();

        // Atualizar contadores do romaneio
        $romaneio->entregas_realizadas = $romaneio->entregas()->where('status', 'entregue')->count();
        $romaneio->entregas_pendentes = $romaneio->entregas()->where('status', 'pendente')->count();
        $romaneio->save();

        return $this->success($entrega->load('venda.cliente'), 'Entrega confirmada');
    }

    /**
     * Ordenar rota de forma simples (por bairro/cidade)
     */
    private function ordenarRotaSimples($vendas, $enderecoOrigem)
    {
        // Agrupar por bairro/cidade
        $agrupado = [];
        foreach ($vendas as $venda) {
            $bairro = $venda->bairro_entrega ?? $venda->cliente->bairro ?? 'Sem bairro';
            $cidade = $venda->cidade_entrega ?? $venda->cliente->cidade ?? 'Sem cidade';
            $chave = $cidade . ' - ' . $bairro;

            if (!isset($agrupado[$chave])) {
                $agrupado[$chave] = [];
            }

            $agrupado[$chave][] = $venda;
        }

        // Ordenar grupos e dentro de cada grupo
        ksort($agrupado);

        $ordenado = [];
        $ordem = 1;

        foreach ($agrupado as $grupo) {
            foreach ($grupo as $venda) {
                $ordenado[] = [
                    'ordem' => $ordem++,
                    'venda_id' => $venda->id,
                    'codigo_venda' => $venda->codigo,
                    'cliente' => $venda->cliente ? ($venda->cliente->nome_completo ?? $venda->cliente->nome) : 'Cliente não encontrado',
                    'endereco' => $venda->cliente ? ($venda->cliente->endereco_completo ?? '') : '',
                    'bairro' => $venda->bairro_entrega ?? $venda->cliente->bairro ?? '',
                    'cidade' => $venda->cidade_entrega ?? $venda->cliente->cidade ?? '',
                ];
            }
        }

        return $ordenado;
    }
}
