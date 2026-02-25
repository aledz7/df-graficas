<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\CursoProva;
use App\Models\CursoProvaQuestao;
use App\Models\CursoProvaTentativa;
use App\Models\CursoProvaResposta;
use App\Models\CursoProgresso;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class CursoProvaController extends Controller
{
    /**
     * Obter ou criar configuração da prova
     */
    public function getConfiguracao(Request $request, $cursoId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $curso = Curso::where('tenant_id', $tenantId)
                ->where('id', $cursoId)
                ->first();

            if (!$curso) {
                return response()->json([
                    'success' => false,
                    'message' => 'Curso não encontrado',
                ], 404);
            }

            $prova = CursoProva::where('tenant_id', $tenantId)
                ->where('curso_id', $cursoId)
                ->with('questoes')
                ->first();

            if (!$prova) {
                // Criar prova vazia se não existir
                $prova = CursoProva::create([
                    'tenant_id' => $tenantId,
                    'curso_id' => $cursoId,
                    'titulo' => 'Prova Final',
                    'nota_minima' => 70.00,
                    'exigir_aprovacao_certificado' => true,
                    'exigir_aprovacao_conclusao' => true,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'prova' => $prova,
                    'questoes' => $prova->questoes,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter configuração da prova',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Salvar configuração da prova
     */
    public function salvarConfiguracao(Request $request, $cursoId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'titulo' => 'nullable|string|max:255',
                'descricao' => 'nullable|string',
                'nota_minima' => 'required|numeric|min:0|max:100',
                'tempo_limite_minutos' => 'nullable|integer|min:1',
                'numero_maximo_tentativas' => 'nullable|integer|min:1',
                'exigir_aprovacao_certificado' => 'required|boolean',
                'exigir_aprovacao_conclusao' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;

            $curso = Curso::where('tenant_id', $tenantId)
                ->where('id', $cursoId)
                ->first();

            if (!$curso) {
                return response()->json([
                    'success' => false,
                    'message' => 'Curso não encontrado',
                ], 404);
            }

            DB::transaction(function () use ($tenantId, $cursoId, $request, $curso) {
                $prova = CursoProva::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'curso_id' => $cursoId,
                    ],
                    [
                        'titulo' => $request->titulo ?? 'Prova Final',
                        'descricao' => $request->descricao,
                        'nota_minima' => $request->nota_minima,
                        'tempo_limite_minutos' => $request->tempo_limite_minutos,
                        'numero_maximo_tentativas' => $request->numero_maximo_tentativas,
                        'exigir_aprovacao_certificado' => $request->exigir_aprovacao_certificado,
                        'exigir_aprovacao_conclusao' => $request->exigir_aprovacao_conclusao,
                    ]
                );

                // Atualizar flag no curso
                $curso->update([
                    'possui_prova_final' => true,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Configuração da prova salva com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar configuração',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Salvar questão
     */
    public function salvarQuestao(Request $request, $cursoId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'id' => 'nullable|exists:curso_prova_questoes,id',
                'tipo' => 'required|in:multipla_escolha_uma,multipla_escolha_multiplas,verdadeiro_falso,dissertativa',
                'enunciado' => 'required|string',
                'alternativas' => 'nullable|array',
                'alternativas.*.id' => 'nullable|string',
                'alternativas.*.texto' => 'required|string',
                'alternativas.*.correta' => 'nullable|boolean',
                'respostas_corretas' => 'nullable|array',
                'peso' => 'nullable|numeric|min:0.01',
                'ordem' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;

            $prova = CursoProva::where('tenant_id', $tenantId)
                ->where('curso_id', $cursoId)
                ->first();

            if (!$prova) {
                return response()->json([
                    'success' => false,
                    'message' => 'Prova não encontrada. Configure a prova primeiro.',
                ], 404);
            }

            // Processar respostas corretas
            $respostasCorretas = [];
            if ($request->tipo !== 'dissertativa') {
                if ($request->alternativas) {
                    foreach ($request->alternativas as $index => $alt) {
                        if (isset($alt['correta']) && $alt['correta']) {
                            $respostasCorretas[] = $alt['id'] ?? $index;
                        }
                    }
                }
            }

            $questao = CursoProvaQuestao::updateOrCreate(
                [
                    'id' => $request->id,
                    'tenant_id' => $tenantId,
                    'curso_prova_id' => $prova->id,
                ],
                [
                    'tipo' => $request->tipo,
                    'enunciado' => $request->enunciado,
                    'alternativas' => $request->alternativas,
                    'respostas_corretas' => $respostasCorretas,
                    'peso' => $request->peso ?? 1.00,
                    'ordem' => $request->ordem ?? 0,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $questao,
                'message' => $request->id ? 'Questão atualizada com sucesso' : 'Questão criada com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar questão',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Excluir questão
     */
    public function excluirQuestao(Request $request, $cursoId, $questaoId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $prova = CursoProva::where('tenant_id', $tenantId)
                ->where('curso_id', $cursoId)
                ->first();

            if (!$prova) {
                return response()->json([
                    'success' => false,
                    'message' => 'Prova não encontrada',
                ], 404);
            }

            $questao = CursoProvaQuestao::where('tenant_id', $tenantId)
                ->where('curso_prova_id', $prova->id)
                ->where('id', $questaoId)
                ->first();

            if (!$questao) {
                return response()->json([
                    'success' => false,
                    'message' => 'Questão não encontrada',
                ], 404);
            }

            $questao->delete();

            return response()->json([
                'success' => true,
                'message' => 'Questão excluída com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir questão',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reordenar questões
     */
    public function reordenarQuestoes(Request $request, $cursoId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'questoes' => 'required|array',
                'questoes.*.id' => 'required|exists:curso_prova_questoes,id',
                'questoes.*.ordem' => 'required|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;

            DB::transaction(function () use ($request, $tenantId) {
                foreach ($request->questoes as $questaoData) {
                    CursoProvaQuestao::where('tenant_id', $tenantId)
                        ->where('id', $questaoData['id'])
                        ->update(['ordem' => $questaoData['ordem']]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Questões reordenadas com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao reordenar questões',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Iniciar prova (para o colaborador)
     */
    public function iniciarProva(Request $request, $cursoId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $curso = Curso::where('tenant_id', $tenantId)
                ->where('id', $cursoId)
                ->with('prova.questoes')
                ->first();

            if (!$curso || !$curso->possui_prova_final || !$curso->prova) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este curso não possui prova final',
                ], 404);
            }

            // Verificar se o colaborador concluiu o conteúdo
            $progresso = CursoProgresso::where('tenant_id', $tenantId)
                ->where('usuario_id', $usuarioId)
                ->where('curso_id', $cursoId)
                ->first();

            if (!$progresso || $progresso->percentual_concluido < 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Você precisa concluir todo o conteúdo do treinamento antes de iniciar a prova',
                ], 403);
            }

            // Verificar tentativas anteriores
            $tentativasAnteriores = CursoProvaTentativa::where('tenant_id', $tenantId)
                ->where('usuario_id', $usuarioId)
                ->where('curso_id', $cursoId)
                ->where('status', '!=', 'em_andamento')
                ->count();

            // Verificar limite de tentativas
            if ($curso->prova->temLimiteTentativas()) {
                if ($tentativasAnteriores >= $curso->prova->numero_maximo_tentativas) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Você atingiu o número máximo de tentativas',
                    ], 403);
                }
            }

            // Verificar se há tentativa em andamento
            $tentativaEmAndamento = CursoProvaTentativa::where('tenant_id', $tenantId)
                ->where('usuario_id', $usuarioId)
                ->where('curso_id', $cursoId)
                ->where('status', 'em_andamento')
                ->first();

            if ($tentativaEmAndamento) {
                // Verificar se expirou
                if ($tentativaEmAndamento->verificarExpiracao()) {
                    $tentativaEmAndamento->update([
                        'status' => 'expirada',
                    ]);
                } else {
                    // Retornar tentativa existente
                    return response()->json([
                        'success' => true,
                        'data' => [
                            'tentativa' => $tentativaEmAndamento,
                            'prova' => $curso->prova,
                            'questoes' => $curso->prova->questoes,
                        ],
                    ]);
                }
            }

            // Criar nova tentativa
            $numeroTentativa = $tentativasAnteriores + 1;

            $tentativa = CursoProvaTentativa::create([
                'tenant_id' => $tenantId,
                'curso_id' => $cursoId,
                'curso_prova_id' => $curso->prova->id,
                'usuario_id' => $usuarioId,
                'numero_tentativa' => $numeroTentativa,
                'data_inicio' => now(),
                'status' => 'em_andamento',
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'tentativa' => $tentativa,
                    'prova' => $curso->prova,
                    'questoes' => $curso->prova->questoes,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao iniciar prova',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar respostas da prova
     */
    public function enviarRespostas(Request $request, $cursoId, $tentativaId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'respostas' => 'required|array',
                'respostas.*.questao_id' => 'required|exists:curso_prova_questoes,id',
                'respostas.*.resposta' => 'required',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $tentativa = CursoProvaTentativa::where('tenant_id', $tenantId)
                ->where('id', $tentativaId)
                ->where('usuario_id', $usuarioId)
                ->where('curso_id', $cursoId)
                ->where('status', 'em_andamento')
                ->with('prova.questoes')
                ->first();

            if (!$tentativa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tentativa não encontrada ou já finalizada',
                ], 404);
            }

            // Verificar se expirou
            if ($tentativa->verificarExpiracao()) {
                $tentativa->update(['status' => 'expirada']);
                return response()->json([
                    'success' => false,
                    'message' => 'Tempo limite da prova expirado',
                ], 403);
            }

            DB::transaction(function () use ($tentativa, $request, $tenantId) {
                $totalPontuacao = 0;
                $totalPeso = 0;

                foreach ($request->respostas as $respostaData) {
                    $questao = $tentativa->prova->questoes->find($respostaData['questao_id']);
                    
                    if (!$questao) {
                        continue;
                    }

                    $resposta = $respostaData['resposta'];
                    $correta = false;
                    $pontuacao = 0;

                    // Verificar resposta (exceto dissertativa)
                    if ($questao->tipo !== CursoProvaQuestao::TIPO_DISSERTATIVA) {
                        $correta = $questao->verificarResposta($resposta);
                        $pontuacao = $correta ? $questao->peso : 0;
                    }

                    CursoProvaResposta::create([
                        'tenant_id' => $tenantId,
                        'curso_prova_tentativa_id' => $tentativa->id,
                        'curso_prova_questao_id' => $questao->id,
                        'resposta' => is_array($resposta) ? json_encode($resposta) : $resposta,
                        'correta' => $correta,
                        'pontuacao_obtida' => $pontuacao,
                    ]);

                    $totalPontuacao += $pontuacao;
                    $totalPeso += $questao->peso;
                }

                // Calcular nota final
                $notaMaxima = $tentativa->prova->questoes->sum('peso');
                $notaPercentual = $notaMaxima > 0 ? ($totalPontuacao / $notaMaxima) * 100 : 0;
                $aprovado = $notaPercentual >= $tentativa->prova->nota_minima;

                // Calcular tempo gasto
                $tempoGasto = $tentativa->data_inicio ? now()->diffInSeconds($tentativa->data_inicio) : 0;

                $tentativa->update([
                    'data_envio' => now(),
                    'nota_obtida' => round($notaPercentual, 2),
                    'aprovado' => $aprovado,
                    'status' => 'finalizada',
                    'tempo_gasto_segundos' => $tempoGasto,
                ]);

                // Se aprovado e exigir aprovação para conclusão, atualizar progresso
                if ($aprovado && $tentativa->prova->exigir_aprovacao_conclusao) {
                    $progresso = CursoProgresso::where('tenant_id', $tenantId)
                        ->where('usuario_id', $usuarioId)
                        ->where('curso_id', $cursoId)
                        ->first();

                    if ($progresso && !$progresso->concluido) {
                        $progresso->update([
                            'concluido' => true,
                            'data_conclusao' => now(),
                        ]);
                    }
                }
            });

            $tentativa->refresh();
            $tentativa->load('respostas.questao');

            return response()->json([
                'success' => true,
                'data' => [
                    'tentativa' => $tentativa,
                    'nota_obtida' => $tentativa->nota_obtida,
                    'aprovado' => $tentativa->aprovado,
                    'nota_minima' => $tentativa->prova->nota_minima,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao enviar respostas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter resultado da prova
     */
    public function getResultado(Request $request, $cursoId, $tentativaId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $tentativa = CursoProvaTentativa::where('tenant_id', $tenantId)
                ->where('id', $tentativaId)
                ->where('usuario_id', $usuarioId)
                ->where('curso_id', $cursoId)
                ->with(['prova.questoes', 'respostas.questao'])
                ->first();

            if (!$tentativa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tentativa não encontrada',
                ], 404);
            }

            // Verificar tentativas restantes
            $tentativasRestantes = null;
            if ($tentativa->prova->temLimiteTentativas()) {
                $tentativasUsadas = CursoProvaTentativa::where('tenant_id', $tenantId)
                    ->where('usuario_id', $usuarioId)
                    ->where('curso_id', $cursoId)
                    ->where('status', '!=', 'em_andamento')
                    ->count();
                
                $tentativasRestantes = max(0, $tentativa->prova->numero_maximo_tentativas - $tentativasUsadas);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'tentativa' => $tentativa,
                    'tentativas_restantes' => $tentativasRestantes,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter resultado',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
