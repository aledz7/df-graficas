<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cupom;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CupomController extends Controller
{
    /**
     * Listar todos os cupons
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Cupom::query();
            
            $tenantId = auth()->user()->tenant_id ?? null;
            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }
            
            // Filtros
            if ($request->has('ativo')) {
                $query->where('ativo', $request->boolean('ativo'));
            }
            
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('codigo', 'like', "%{$search}%")
                      ->orWhere('descricao', 'like', "%{$search}%");
                });
            }
            
            $query->with('cliente:id,nome');
            $query->orderBy('created_at', 'desc');
            
            if ($request->has('per_page')) {
                $cupons = $query->paginate($request->per_page);
            } else {
                $cupons = $query->get();
            }
            
            return response()->json([
                'success' => true,
                'data' => $cupons
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar cupons',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar novo cupom
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'codigo' => 'nullable|string|max:50',
                'descricao' => 'nullable|string|max:255',
                'tipo_desconto' => 'required|in:percentual,valor_fixo',
                'valor_desconto' => 'required|numeric|min:0.01',
                'valor_minimo' => 'nullable|numeric|min:0',
                'limite_uso' => 'required|in:ilimitado,uma_vez_por_cliente,primeira_compra,quantidade_fixa',
                'quantidade_limite' => 'nullable|integer|min:1',
                'cliente_id' => 'nullable|integer|exists:clientes,id',
                'produto_ids' => 'nullable|array',
                'primeira_compra' => 'boolean',
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'ativo' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            $data['tenant_id'] = auth()->user()->tenant_id ?? null;
            
            // Gerar código único se não informado
            if (empty($data['codigo'])) {
                $data['codigo'] = $this->gerarCodigoUnico();
            } else {
                // Verificar se código já existe
                $existente = Cupom::where('tenant_id', $data['tenant_id'])
                    ->where('codigo', $data['codigo'])
                    ->first();
                if ($existente) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Código de cupom já existe.'
                    ], 422);
                }
            }
            
            // Validar porcentagem máxima
            if ($data['tipo_desconto'] === 'percentual' && $data['valor_desconto'] > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Desconto percentual não pode ser maior que 100%.'
                ], 422);
            }

            $cupom = Cupom::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Cupom criado com sucesso',
                'data' => $cupom
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar cupom',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exibir um cupom específico
     */
    public function show($id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $cupom = Cupom::where('tenant_id', $tenantId)
                ->with('cliente:id,nome')
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $cupom
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cupom não encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Atualizar um cupom
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $cupom = Cupom::where('tenant_id', $tenantId)->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'codigo' => 'nullable|string|max:50',
                'descricao' => 'nullable|string|max:255',
                'tipo_desconto' => 'sometimes|required|in:percentual,valor_fixo',
                'valor_desconto' => 'sometimes|required|numeric|min:0.01',
                'valor_minimo' => 'nullable|numeric|min:0',
                'limite_uso' => 'sometimes|required|in:ilimitado,uma_vez_por_cliente,quantidade_fixa',
                'quantidade_limite' => 'nullable|integer|min:1',
                'cliente_id' => 'nullable|integer|exists:clientes,id',
                'produto_ids' => 'nullable|array',
                'primeira_compra' => 'boolean',
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'ativo' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            
            // Verificar código duplicado
            if (!empty($data['codigo']) && $data['codigo'] !== $cupom->codigo) {
                $existente = Cupom::where('tenant_id', $tenantId)
                    ->where('codigo', $data['codigo'])
                    ->where('id', '!=', $id)
                    ->first();
                if ($existente) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Código de cupom já existe.'
                    ], 422);
                }
            }

            $cupom->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Cupom atualizado com sucesso',
                'data' => $cupom
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar cupom',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir um cupom
     */
    public function destroy($id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $cupom = Cupom::where('tenant_id', $tenantId)->findOrFail($id);
            $cupom->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cupom excluído com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir cupom',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar cupom (rota pública para o catálogo)
     */
    public function validarCupom(Request $request, $tenantId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'codigo' => 'required|string',
                'total_pedido' => 'required|numeric|min:0',
                'cliente_id' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $codigo = strtoupper(trim($request->codigo));
            $totalPedido = $request->total_pedido;
            $clienteId = $request->cliente_id;

            // Buscar cupom
            $cupom = Cupom::where('tenant_id', $tenantId)
                ->where('codigo', $codigo)
                ->first();

            if (!$cupom) {
                return response()->json([
                    'success' => false,
                    'valido' => false,
                    'message' => 'Cupom não encontrado.'
                ]);
            }

            // Validar se pode ser usado
            $validacao = $cupom->podeSerUsado($clienteId, $totalPedido);
            
            if (!$validacao['valido']) {
                return response()->json([
                    'success' => false,
                    'valido' => false,
                    'message' => $validacao['mensagem']
                ]);
            }

            // Calcular desconto
            $valorDesconto = $cupom->calcularDesconto($totalPedido);

            return response()->json([
                'success' => true,
                'valido' => true,
                'message' => 'Cupom aplicado com sucesso!',
                'data' => [
                    'cupom_id' => $cupom->id,
                    'codigo' => $cupom->codigo,
                    'tipo_desconto' => $cupom->tipo_desconto,
                    'valor_desconto_original' => $cupom->valor_desconto,
                    'valor_desconto_calculado' => round($valorDesconto, 2),
                    'descricao' => $cupom->descricao
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao validar cupom',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registrar uso do cupom
     */
    public function registrarUso(Request $request, $tenantId): JsonResponse
    {
        try {
            $cupomId = $request->cupom_id;
            
            $cupom = Cupom::where('tenant_id', $tenantId)
                ->findOrFail($cupomId);
            
            $cupom->registrarUso();

            return response()->json([
                'success' => true,
                'message' => 'Uso do cupom registrado'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao registrar uso do cupom',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar código único para cupom
     */
    private function gerarCodigoUnico(): string
    {
        do {
            $codigo = strtoupper(Str::random(4) . '-' . Str::random(4) . '-' . Str::random(4));
        } while (Cupom::where('codigo', $codigo)->exists());
        
        return $codigo;
    }

    /**
     * Gerar novo código (endpoint)
     */
    public function gerarCodigo(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'codigo' => $this->gerarCodigoUnico()
        ]);
    }
}
