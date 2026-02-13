<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\NotaFiscal;
use App\Models\OrdemServico;
use App\Models\Configuracao;
use App\Services\FocusNfeService;

class NotaFiscalController extends Controller
{
    protected FocusNfeService $focusNfeService;

    public function __construct(FocusNfeService $focusNfeService)
    {
        $this->focusNfeService = $focusNfeService;
    }

    /**
     * Listar notas fiscais
     */
    public function index(Request $request)
    {
        try {
            $query = NotaFiscal::with(['ordemServico', 'usuarioCadastro'])
                ->orderBy('created_at', 'desc');

            // Filtros
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('tipo')) {
                $query->where('tipo', $request->tipo);
            }
            if ($request->filled('ordem_servico_id')) {
                $query->where('ordem_servico_id', $request->ordem_servico_id);
            }
            if ($request->filled('busca')) {
                $busca = $request->busca;
                $query->where(function ($q) use ($busca) {
                    $q->where('referencia', 'like', "%{$busca}%")
                      ->orWhere('numero', 'like', "%{$busca}%")
                      ->orWhere('chave_nfe', 'like', "%{$busca}%");
                });
            }

            $perPage = $request->input('per_page', 20);
            $notas = $query->paginate($perPage);

            return response()->json($notas);
        } catch (\Exception $e) {
            Log::error('Erro ao listar notas fiscais: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao listar notas fiscais.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar notas fiscais de uma OS específica
     */
    public function porOrdemServico($ordemServicoId)
    {
        try {
            $notas = NotaFiscal::where('ordem_servico_id', $ordemServicoId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'data' => $notas,
            ]);
        } catch (\Exception $e) {
            Log::error("Erro ao buscar notas da OS {$ordemServicoId}: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao buscar notas fiscais da OS.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Emitir nota fiscal
     */
    public function emitir(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ordem_servico_id' => 'required|integer|exists:ordens_servico,id',
            'tipo' => 'required|in:nfe,nfse',
            'dados_adicionais' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $os = OrdemServico::with(['cliente', 'itens'])->findOrFail($request->ordem_servico_id);
            $tipo = $request->tipo;
            $dadosAdicionais = $request->dados_adicionais ?? [];

            // Verificar se já existe nota em processamento para esta OS
            $notaExistente = NotaFiscal::where('ordem_servico_id', $os->id)
                ->where('tipo', $tipo)
                ->whereIn('status', ['processando_autorizacao', 'autorizada'])
                ->first();

            if ($notaExistente) {
                $statusLabel = $notaExistente->status === 'autorizada' ? 'autorizada' : 'em processamento';
                $tipoLabel = $tipo === 'nfse' ? 'NFSe' : 'NFe';
                return response()->json([
                    'message' => "Já existe uma {$tipoLabel} {$statusLabel} para esta OS.",
                    'nota_fiscal' => $notaExistente,
                ], 422);
            }

            // Emitir via service
            $resultado = $this->focusNfeService->emitir($os, $tipo, $dadosAdicionais);

            if (!($resultado['sucesso'] ?? false)) {
                return response()->json([
                    'message' => $resultado['erro'] ?? 'Erro ao emitir nota fiscal.',
                    'detalhes' => $resultado['erros'] ?? [],
                    'dados' => $resultado['dados'] ?? null,
                    'debug' => $resultado['debug'] ?? null,
                ], 400);
            }

            // Criar registro no banco
            $nota = NotaFiscal::create([
                'ordem_servico_id' => $os->id,
                'tipo' => $tipo,
                'referencia' => $resultado['referencia'],
                'status' => 'processando_autorizacao',
                'valor_total' => (float) ($os->valor_total_os ?? 0),
                'dados_envio' => $resultado['payload_enviado'] ?? null,
                'dados_retorno' => $resultado['dados'] ?? null,
                'data_emissao' => now(),
            ]);

            Log::info("Nota fiscal emitida: tipo={$tipo}, ref={$nota->referencia}, os={$os->id}");

            return response()->json([
                'message' => 'Nota fiscal enviada para processamento.',
                'nota_fiscal' => $nota,
                'debug' => $resultado['debug'] ?? null,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erro ao emitir nota fiscal: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Erro ao emitir nota fiscal.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Consultar status de uma nota fiscal
     */
    public function consultar($id)
    {
        try {
            $nota = NotaFiscal::findOrFail($id);

            // Se já está autorizada ou cancelada, retornar sem consultar novamente
            if (in_array($nota->status, ['autorizada', 'cancelada'])) {
                return response()->json([
                    'nota_fiscal' => $nota,
                    'atualizado' => false,
                ]);
            }

            // Consultar na API externa e atualizar
            $nota = $this->focusNfeService->atualizarNotaFiscal($nota);

            return response()->json([
                'nota_fiscal' => $nota,
                'atualizado' => true,
            ]);

        } catch (\Exception $e) {
            Log::error("Erro ao consultar nota fiscal {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao consultar nota fiscal.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar uma nota fiscal
     */
    public function cancelar(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'justificativa' => 'required|string|min:15|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Justificativa é obrigatória (mínimo 15 caracteres).',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $nota = NotaFiscal::findOrFail($id);

            if (!$nota->podeCancelar()) {
                return response()->json([
                    'message' => 'Esta nota fiscal não pode ser cancelada. Status atual: ' . $nota->status,
                ], 422);
            }

            $tipoIntegracao = $nota->dados_envio['_tipo_integracao'] ?? null;
            $resultado = $this->focusNfeService->cancelar(
                $nota->referencia,
                $nota->tipo,
                $request->justificativa,
                $tipoIntegracao
            );

            if (!($resultado['sucesso'] ?? false)) {
                return response()->json([
                    'message' => $resultado['erro'] ?? 'Erro ao cancelar nota fiscal.',
                    'detalhes' => $resultado['erros'] ?? [],
                ], 400);
            }

            $nota->status = 'cancelada';
            $nota->data_cancelamento = now();
            $nota->justificativa_cancelamento = $request->justificativa;
            $nota->dados_retorno = $resultado['dados'] ?? $nota->dados_retorno;
            $nota->save();

            Log::info("Nota fiscal cancelada: ref={$nota->referencia}");

            return response()->json([
                'message' => 'Nota fiscal cancelada com sucesso.',
                'nota_fiscal' => $nota,
            ]);

        } catch (\Exception $e) {
            Log::error("Erro ao cancelar nota fiscal {$id}: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao cancelar nota fiscal.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Testar conexão com a API de emissão
     */
    public function testarConexao()
    {
        try {
            $resultado = $this->focusNfeService->testarConexao();

            return response()->json($resultado, $resultado['sucesso'] ? 200 : 400);
        } catch (\Exception $e) {
            Log::error('Erro ao testar conexão: ' . $e->getMessage());
            return response()->json([
                'sucesso' => false,
                'erro' => 'Erro ao testar conexão: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Salvar configurações de Nota Fiscal (upsert - cria se não existe)
     */
    public function salvarConfiguracoes(Request $request)
    {
        try {
            $dados = $request->all();
            $tenantId = auth()->user()->tenant_id;

            // Mapeamento de chave => [nome, tipo, ordem]
            $camposPermitidos = [
                'token_api'                   => ['Token da API de Emissão', 'password', 5],
                'ambiente'                    => ['Ambiente', 'select', 10],
                'serie'                       => ['Série', 'texto', 20],
                'regime_tributario'           => ['Regime Tributário', 'select', 15],
                'natureza_operacao'           => ['Natureza da Operação Padrão', 'texto', 25],
                'cfop_padrao'                 => ['CFOP Padrão', 'texto', 26],
                'codigo_ncm_padrao'           => ['NCM Padrão', 'texto', 27],
                'icms_situacao_tributaria'    => ['Situação Tributária ICMS', 'texto', 28],
                'pis_situacao_tributaria'     => ['Situação Tributária PIS', 'texto', 29],
                'cofins_situacao_tributaria'  => ['Situação Tributária COFINS', 'texto', 30],
                'tipo_nfse'                   => ['Tipo de Integração NFSe', 'select', 170],
                'natureza_operacao_nfse'      => ['Natureza da Operação NFSe (1-6)', 'select', 175],
                'optante_simples_nacional'   => ['Optante Simples Nacional', 'select', 176],
                'regime_especial_tributacao'  => ['Regime Especial de Tributação', 'select', 177],
                'regime_tributario_simples_nacional' => ['Regime de Apuração SN', 'select', 178],
                'incentivo_fiscal'            => ['Incentivo Fiscal (NFSe)', 'select', 179],
                'tributacao_iss'              => ['Tributação do ISSQN (NFSe Nacional)', 'select', 181],
                'tipo_retencao_iss'           => ['Tipo Retenção ISSQN (NFSe Nacional)', 'select', 182],
                'codigo_tributario_municipio' => ['Código Tributário do Município (NFSe)', 'texto', 180],
                'item_lista_servico'          => ['Item da Lista de Serviço / cTribNac (NFSe)', 'texto', 190],
                'codigo_cnae'                 => ['Código CNAE (NFSe)', 'texto', 195],
                'codigo_nbs'                  => ['Código NBS (NFSe)', 'texto', 196],
                'aliquota_iss'                => ['Alíquota ISS % (NFSe)', 'texto', 200],
            ];

            $atualizadas = [];
            $erros = [];

            foreach ($dados as $chave => $valor) {
                if (!isset($camposPermitidos[$chave])) {
                    continue; // Ignorar campos desconhecidos
                }

                $meta = $camposPermitidos[$chave];

                try {
                    // Buscar configuração existente ou criar nova
                    $config = Configuracao::withoutGlobalScopes()
                        ->where('tenant_id', $tenantId)
                        ->where('grupo', 'nfe')
                        ->where('chave', $chave)
                        ->first();

                    if ($config) {
                        // Atualizar existente
                        $config->valor = $valor;
                        $config->save();
                    } else {
                        // Criar nova
                        $config = new Configuracao();
                        $config->tenant_id = $tenantId;
                        $config->grupo = 'nfe';
                        $config->chave = $chave;
                        $config->nome = $meta[0];
                        $config->tipo = $meta[1];
                        $config->ordem = $meta[2];
                        $config->visivel = true;
                        $config->editavel = true;
                        $config->obrigatorio = false;
                        $config->valor = $valor;
                        $config->save();
                    }

                    $atualizadas[] = $chave;
                } catch (\Exception $e) {
                    $erros[$chave] = $e->getMessage();
                }
            }

            if (!empty($erros)) {
                return response()->json([
                    'message' => 'Algumas configurações não puderam ser salvas.',
                    'atualizadas' => $atualizadas,
                    'erros' => $erros,
                ], 207);
            }

            return response()->json([
                'message' => 'Configurações de Nota Fiscal salvas com sucesso.',
                'atualizadas' => $atualizadas,
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao salvar configurações NFe: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao salvar configurações: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Carregar configurações de Nota Fiscal
     */
    public function carregarConfiguracoes()
    {
        try {
            $tenantId = auth()->user()->tenant_id;

            $configs = Configuracao::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('grupo', 'nfe')
                ->where('visivel', true)
                ->orderBy('ordem')
                ->get();

            $resultado = [];
            foreach ($configs as $config) {
                $resultado[$config->chave] = $config->valor;
            }

            return response()->json([
                'data' => $resultado,
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao carregar configurações NFe: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao carregar configurações.',
            ], 500);
        }
    }
}
