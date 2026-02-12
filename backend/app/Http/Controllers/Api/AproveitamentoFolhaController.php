<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AproveitamentoFolhaService;
use App\Models\ImpressoraConfig;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class AproveitamentoFolhaController extends Controller
{
    protected $aproveitamentoService;

    public function __construct(AproveitamentoFolhaService $aproveitamentoService)
    {
        $this->aproveitamentoService = $aproveitamentoService;
    }

    /**
     * Calcular aproveitamento da folha
     */
    public function calcular(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'tipo_folha' => 'required|in:A4,A3,personalizado',
                'largura_folha' => 'required_if:tipo_folha,personalizado|numeric|min:1',
                'altura_folha' => 'required_if:tipo_folha,personalizado|numeric|min:1',
                'item_largura_mm' => 'required|numeric|min:0.1',
                'item_altura_mm' => 'required|numeric|min:0.1',
                'margem_superior_mm' => 'nullable|numeric|min:0',
                'margem_inferior_mm' => 'nullable|numeric|min:0',
                'margem_esquerda_mm' => 'nullable|numeric|min:0',
                'margem_direita_mm' => 'nullable|numeric|min:0',
                'sangria_mm' => 'nullable|numeric|min:0',
                'espacamento_mm' => 'nullable|numeric|min:0',
                'impressora_config_id' => 'nullable|exists:impressoras_config,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $dados = $validator->validated();

            // Se foi informado impressora_config_id, buscar margens da configuração
            if (!empty($dados['impressora_config_id'])) {
                $impressora = ImpressoraConfig::where('tenant_id', $request->user()->tenant_id)
                    ->findOrFail($dados['impressora_config_id']);

                $dados['margem_superior_mm'] = $dados['margem_superior_mm'] ?? $impressora->margem_superior_mm;
                $dados['margem_inferior_mm'] = $dados['margem_inferior_mm'] ?? $impressora->margem_inferior_mm;
                $dados['margem_esquerda_mm'] = $dados['margem_esquerda_mm'] ?? $impressora->margem_esquerda_mm;
                $dados['margem_direita_mm'] = $dados['margem_direita_mm'] ?? $impressora->margem_direita_mm;
            }

            // Se não tem margens, usar configuração padrão
            if (empty($dados['margem_superior_mm']) && empty($dados['margem_inferior_mm']) 
                && empty($dados['margem_esquerda_mm']) && empty($dados['margem_direita_mm'])) {
                
                $impressoraPadrao = ImpressoraConfig::getPadrao($request->user()->tenant_id);
                if ($impressoraPadrao) {
                    $dados['margem_superior_mm'] = $impressoraPadrao->margem_superior_mm;
                    $dados['margem_inferior_mm'] = $impressoraPadrao->margem_inferior_mm;
                    $dados['margem_esquerda_mm'] = $impressoraPadrao->margem_esquerda_mm;
                    $dados['margem_direita_mm'] = $impressoraPadrao->margem_direita_mm;
                }
            }

            $resultado = $this->aproveitamentoService->calcular($dados);

            return response()->json([
                'success' => true,
                'data' => $resultado
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao calcular aproveitamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar configurações de impressora
     */
    public function listarImpressoras(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $impressoras = ImpressoraConfig::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->orderBy('padrao', 'desc')
                ->orderBy('nome')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $impressoras
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar impressoras',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar/atualizar configuração de impressora
     */
    public function salvarImpressora(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'id' => 'nullable|exists:impressoras_config,id',
                'nome' => 'required|string|max:255',
                'margem_superior_mm' => 'required|numeric|min:0',
                'margem_inferior_mm' => 'required|numeric|min:0',
                'margem_esquerda_mm' => 'required|numeric|min:0',
                'margem_direita_mm' => 'required|numeric|min:0',
                'padrao' => 'boolean',
                'ativo' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $dados = $validator->validated();
            $dados['tenant_id'] = $request->user()->tenant_id;

            if (!empty($dados['id'])) {
                $impressora = ImpressoraConfig::where('tenant_id', $dados['tenant_id'])
                    ->findOrFail($dados['id']);
                $impressora->update($dados);
            } else {
                unset($dados['id']);
                $impressora = ImpressoraConfig::create($dados);
            }

            // Se marcou como padrão, definir como padrão
            if (!empty($dados['padrao'])) {
                $impressora->definirComoPadrao();
            }

            return response()->json([
                'success' => true,
                'message' => !empty($request->input('id')) ? 'Impressora atualizada com sucesso' : 'Impressora criada com sucesso',
                'data' => $impressora->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar impressora',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir configuração de impressora
     */
    public function excluirImpressora(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $impressora = ImpressoraConfig::where('tenant_id', $tenantId)->findOrFail($id);
            $impressora->delete();

            return response()->json([
                'success' => true,
                'message' => 'Impressora excluída com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir impressora',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
