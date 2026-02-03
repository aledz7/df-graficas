<?php

namespace App\Http\Controllers\Api;

use App\Models\DadosUsuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DadosUsuarioController extends BaseController
{
    /**
     * Retorna todos os dados do usuário
     */
    public function index(Request $request)
    {
        try {
            $dados = DadosUsuario::where('user_id', auth()->id())
                ->get()
                ->keyBy('chave')
                ->map(function ($item) {
                    $valor = $item->valor;
                    // Decodifica JSON se necessário
                    if (is_string($valor)) {
                        $decoded = json_decode($valor, true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $valor = $decoded;
                        }
                    }
                    return $valor;
                });

            return $this->success($dados->toArray());
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar dados do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Retorna um dado específico do usuário
     */
    public function show($chave)
    {
        try {
            $dado = DadosUsuario::where('user_id', auth()->id())
                ->where('chave', $chave)
                ->first();

            if (!$dado) {
                return $this->success(null);
            }

            // Decodifica JSON se necessário
            $valor = $dado->valor;
            if (is_string($valor)) {
                $decoded = json_decode($valor, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $valor = $decoded;
                }
            }

            return $this->success($valor);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar dado do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Armazena um novo dado do usuário
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'chave' => 'required|string|max:255',
            'valor' => 'required',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $valor = $request->valor;
            
            // Codifica arrays e objetos para JSON
            if (is_array($valor) || is_object($valor)) {
                $valor = json_encode($valor, JSON_UNESCAPED_UNICODE);
            }

            $dado = DadosUsuario::updateOrCreate(
                [
                    'user_id' => auth()->id(),
                    'chave' => $request->chave,
                ],
                [
                    'valor' => $valor,
                ]
            );

            // Decodifica para retornar
            $valorRetorno = $dado->valor;
            if (is_string($valorRetorno)) {
                $decoded = json_decode($valorRetorno, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $valorRetorno = $decoded;
                }
            }

            return $this->success($valorRetorno, 'Dado salvo com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao salvar dado do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza um dado específico do usuário
     */
    public function update(Request $request, $chave)
    {
        // Removido log verboso de requisição para reduzir ruído no laravel.log

        $validator = Validator::make($request->all(), [
            'valor' => 'required',
        ]);

        if ($validator->fails()) {
            \Log::error("Erro de validação para chave {$chave}:", [
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->all(),
                'user_id' => auth()->id() ?? 'não autenticado'
            ]);
            return $this->validationError($validator->errors());
        }

        try {
            // Removido log informativo de atualização
            
            $valor = $request->valor;
            
            // Se for um array ou objeto, converte para JSON
            if (is_array($valor) || is_object($valor)) {
                // Validação específica para preços
                if ($chave === 'adminAdicionaisSettings') {
                    foreach ($valor as $key => $price) {
                        if (!is_numeric($price) || $price < 0) {
                            return $this->error("O valor para {$key} deve ser um número positivo", 422);
                        }
                    }
                }
                
                $jsonString = json_encode($valor, JSON_UNESCAPED_UNICODE);
                
                if (strlen($jsonString) > 16777215) {
                    \Log::warning("Dado {$chave} muito grande: " . strlen($jsonString) . " bytes");
                    return $this->error('Dados muito grandes. O tamanho máximo permitido é 16MB.', 422);
                }
                $valor = $jsonString;
            }

            $dado = DadosUsuario::updateOrCreate(
                [
                    'user_id' => auth()->id(),
                    'chave' => $chave,
                ],
                [
                    'valor' => $valor,
                ]
            );

            // Decodifica para retornar
            $valorRetorno = $dado->valor;
            if (is_string($valorRetorno)) {
                $decoded = json_decode($valorRetorno, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $valorRetorno = $decoded;
                }
            }

            // Removido log de sucesso
            
            return $this->success($valorRetorno, 'Dado atualizado com sucesso');
        } catch (\Exception $e) {
            \Log::error("Erro ao atualizar dado {$chave}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'request_data' => $request->all()
            ]);
            return $this->error('Erro ao atualizar dado do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Remove um dado específico do usuário
     */
    public function destroy($chave)
    {
        try {
            $deleted = DadosUsuario::where('user_id', auth()->id())
                ->where('chave', $chave)
                ->delete();

            if ($deleted) {
                return $this->success(null, 'Dado removido com sucesso');
            } else {
                return $this->success(null, 'Dado não encontrado');
            }
        } catch (\Exception $e) {
            return $this->error('Erro ao remover dado do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza múltiplos dados de uma vez
     */
    public function bulkUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dados' => 'required|array',
            'dados.*.chave' => 'required|string|max:255',
            'dados.*.valor' => 'required',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $dados = [];
            
            foreach ($request->dados as $item) {
                $valor = $item['valor'];
                
                // Codifica arrays e objetos para JSON
                if (is_array($valor) || is_object($valor)) {
                    $valor = json_encode($valor, JSON_UNESCAPED_UNICODE);
                }

                $dado = DadosUsuario::updateOrCreate(
                    [
                        'user_id' => auth()->id(),
                        'chave' => $item['chave'],
                    ],
                    [
                        'valor' => $valor,
                    ]
                );
                
                // Decodifica para retornar
                $valorRetorno = $dado->valor;
                if (is_string($valorRetorno)) {
                    $decoded = json_decode($valorRetorno, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $valorRetorno = $decoded;
                    }
                }
                
                $dados[$item['chave']] = $valorRetorno;
            }

            return $this->success($dados, 'Dados atualizados com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar dados do usuário: ' . $e->getMessage());
        }
    }

    /**
     * Busca fornecedores para o select
     */
    public function fornecedores()
    {
        try {
            $dado = DadosUsuario::where('user_id', auth()->id())
                               ->where('chave', 'fornecedores')
                               ->first();

            if (!$dado) {
                return $this->success([]);
            }

            // Decodifica JSON se necessário
            $valor = $dado->valor;
            if (is_string($valor)) {
                $decoded = json_decode($valor, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $valor = $decoded;
                }
            }

            $resultado = $valor ?: [];
            return $this->success($resultado);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar fornecedores: ' . $e->getMessage());
        }
    }
} 