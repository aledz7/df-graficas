<?php

namespace App\Http\Controllers\Api;

use App\Models\Configuracao;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ConfiguracaoController extends ResourceController
{
    protected $model = Configuracao::class;
    
    protected $storeRules = [
        'chave' => 'required|string|max:100|unique:configuracoes,chave',
        'valor' => 'required',
        'tipo' => 'required|in:string,text,integer,float,boolean,json,date,datetime,time,array,object',
        'grupo' => 'required|string|max:50',
        'nome' => 'required|string|max:100',
        'descricao' => 'nullable|string|max:255',
        'opcoes' => 'nullable|json',
        'validacao' => 'nullable|string|max:255',
        'ordem' => 'nullable|integer|min:0',
        'editavel' => 'boolean',
        'visivel' => 'boolean',
    ];

    protected $updateRules = [
        'valor' => 'required',
        'tipo' => 'sometimes|in:string,text,integer,float,boolean,json,date,datetime,time,array,object',
        'grupo' => 'sometimes|string|max:50',
        'nome' => 'sometimes|string|max:100',
        'descricao' => 'nullable|string|max:255',
        'opcoes' => 'nullable|json',
        'validacao' => 'nullable|string|max:255',
        'ordem' => 'nullable|integer|min:0',
        'editavel' => 'boolean',
        'visivel' => 'boolean',
    ];

    /**
     * Retorna todas as configurações agrupadas por grupo
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $query = $this->model::query();
        
        // Aplica filtros
        if ($request->has('grupo')) {
            $query->where('grupo', $request->input('grupo'));
        }
        
        if ($request->has('visivel')) {
            $query->where('visivel', $request->boolean('visivel'));
        }
        
        if ($request->has('editavel')) {
            $query->where('editavel', $request->boolean('editavel'));
        }
        
        // Ordena por grupo e ordem
        $query->orderBy('grupo')->orderBy('ordem');
        
        $configuracoes = $query->get();
        
        // Agrupa por grupo
        $agrupado = $configuracoes->groupBy('grupo')->map(function ($itens) {
            return $itens->mapWithKeys(function ($item) {
                return [$item->chave => $this->formatarValor($item)];
            });
        });
        
        return $this->success($agrupado->toArray());
    }
    
    /**
     * Retorna o valor de uma configuração específica
     * 
     * @param string $chave
     * @return JsonResponse
     */
    public function show($chave): \Illuminate\Http\JsonResponse
    {
        $configuracao = $this->model::where('chave', $chave)->first();
        
        if (!$configuracao) {
            return $this->notFound();
        }
        
        return $this->success([
            'chave' => $configuracao->chave,
            'valor' => $this->formatarValor($configuracao),
            'tipo' => $configuracao->tipo,
            'grupo' => $configuracao->grupo,
            'nome' => $configuracao->nome,
            'descricao' => $configuracao->descricao,
            'opcoes' => $configuracao->opcoes,
            'editavel' => $configuracao->editavel,
            'visivel' => $configuracao->visivel,
            'criado_em' => $configuracao->created_at,
            'atualizado_em' => $configuracao->updated_at,
        ]);
    }
    
    /**
     * Atualiza o valor de uma configuração existente
     * 
     * @param Request $request
     * @param string $chave
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $chave): \Illuminate\Http\JsonResponse
    {
        $configuracao = $this->model::where('chave', $chave)->first();
        
        if (!$configuracao) {
            return $this->notFound();
        }
        
        // Se a configuração não for editável, retorna erro
        if (!$configuracao->editavel) {
            return $this->error('Esta configuração não pode ser editada', 403);
        }
        
        $validator = Validator::make($request->all(), [
            'valor' => 'required',
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        // Valida o valor de acordo com o tipo
        $valor = $request->input('valor');
        $erro = $this->validarValor($valor, $configuracao->tipo, $configuracao->validacao, $configuracao->opcoes);
        
        if ($erro) {
            return $this->error($erro, 422);
        }
        
        // Converte o valor para o formato de armazenamento
        $valorParaSalvar = $this->converterValorParaArmazenamento($valor, $configuracao->tipo);
        
        // Atualiza a configuração
        $configuracao->update([
            'valor' => $valorParaSalvar
        ]);
        
        return $this->success([
            'chave' => $configuracao->chave,
            'valor' => $this->formatarValor($configuracao)
        ], 'Configuração atualizada com sucesso');
    }
    
    /**
     * Remover uma configuração específica
     *
     * @param string $chave
     * @return JsonResponse
     */
    public function destroy($chave): \Illuminate\Http\JsonResponse
    {
        $configuracao = $this->model::where('chave', $chave)->first();

        if (!$configuracao) {
            return $this->notFound('Configuração não encontrada');
        }

        // Verificar se a configuração pode ser excluída (deve ser editável)
        if (!$configuracao->editavel) {
            return $this->error('Esta configuração não pode ser excluída', 422);
        }

        try {
            $configuracao->delete();
            return $this->success(null, 'Configuração removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a configuração: ' . $e->getMessage());
        }
    }

    /**
     * Define múltiplas configurações de uma vez
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdate(Request $request)
    {
        $dados = $request->all();
        
        if (empty($dados)) {
            return $this->error('Nenhum dado fornecido para atualização', 400);
        }
        
        $erros = [];
        $atualizadas = [];
        
        foreach ($dados as $chave => $valor) {
            $configuracao = $this->model::where('chave', $chave)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();
            
            if (!$configuracao) {
                $erros[$chave] = 'Configuração não encontrada';
                continue;
            }
            
            // Se a configuração não for editável, adiciona aos erros
            if (!$configuracao->editavel) {
                $erros[$chave] = 'Esta configuração não pode ser editada';
                continue;
            }
            
            // Valida o valor de acordo com o tipo
            $erro = $this->validarValor($valor, $configuracao->tipo, $configuracao->validacao, $configuracao->opcoes);
            
            if ($erro) {
                $erros[$chave] = $erro;
                continue;
            }
            
            // Atualiza a configuração usando o accessor
            $configuracao->valor = $valor;
            $configuracao->save();
            
            $atualizadas[$chave] = $this->formatarValor($configuracao);
        }
        
        $resposta = [
            'atualizadas' => $atualizadas,
            'erros' => $erros
        ];
        
        if (!empty($erros) && !empty($atualizadas)) {
            return $this->success($resposta, 'Algumas configurações foram atualizadas, mas ocorreram erros', 207);
        } elseif (!empty($erros)) {
            return $this->error('Erro ao atualizar as configurações', 400, $resposta);
        } else {
            return $this->success($resposta, 'Configurações atualizadas com sucesso');
        }
    }
    
    /**
     * Retorna as configurações de um grupo específico
     * 
     * @param string $grupo
     * @return JsonResponse
     */
    public function grupo($grupo)
    {
        $configuracoes = $this->model::where('grupo', $grupo)
            ->where('tenant_id', auth()->user()->tenant_id)
            ->where('visivel', true)
            ->orderBy('ordem')
            ->get();
            
        if ($configuracoes->isEmpty()) {
            return $this->notFound();
        }
        
        $resultado = [];
        
        foreach ($configuracoes as $config) {
            $resultado[$config->chave] = $this->formatarValor($config);
        }
        
        return $this->success($resultado);
    }

    /**
     * Cria/atualiza configurações de um grupo em modo upsert.
     *
     * Payload esperado:
     * {
     *   "configuracoes": [
     *     {
     *       "chave": "minha_chave",
     *       "valor": true,
     *       "tipo": "boolean",
     *       "nome": "Nome amigável",
     *       "descricao": "Descrição opcional",
     *       "ordem": 10,
     *       "visivel": true,
     *       "editavel": true,
     *       "obrigatorio": false
     *     }
     *   ]
     * }
     */
    public function upsertGrupo(Request $request, $grupo): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'configuracoes' => 'required|array|min:1',
            'configuracoes.*.chave' => 'required|string|max:100',
            'configuracoes.*.valor' => 'nullable',
            'configuracoes.*.tipo' => 'nullable|in:string,text,integer,float,boolean,json,date,datetime,time,array,object,texto,numero,booleano,data,data_hora,hora,select,multiselect',
            'configuracoes.*.nome' => 'nullable|string|max:100',
            'configuracoes.*.descricao' => 'nullable|string|max:255',
            'configuracoes.*.ordem' => 'nullable|integer|min:0',
            'configuracoes.*.visivel' => 'nullable|boolean',
            'configuracoes.*.editavel' => 'nullable|boolean',
            'configuracoes.*.obrigatorio' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $tenantId = auth()->user()->tenant_id;
        $atualizadas = [];

        DB::beginTransaction();
        try {
            foreach ($request->input('configuracoes', []) as $item) {
                $chave = $item['chave'];
                $valor = $item['valor'] ?? null;

                $config = $this->model::firstOrNew([
                    'tenant_id' => $tenantId,
                    'grupo' => $grupo,
                    'chave' => $chave,
                ]);

                $config->nome = $item['nome'] ?? $config->nome ?? ucfirst(str_replace('_', ' ', $chave));
                $config->descricao = $item['descricao'] ?? $config->descricao;
                $config->tipo = $item['tipo'] ?? $config->tipo ?? $this->inferirTipoPorValor($valor);
                $config->ordem = array_key_exists('ordem', $item) ? $item['ordem'] : ($config->ordem ?? 0);
                $config->visivel = array_key_exists('visivel', $item) ? (bool)$item['visivel'] : ($config->visivel ?? true);
                $config->editavel = array_key_exists('editavel', $item) ? (bool)$item['editavel'] : ($config->editavel ?? true);
                $config->obrigatorio = array_key_exists('obrigatorio', $item) ? (bool)$item['obrigatorio'] : ($config->obrigatorio ?? false);
                $config->valor = $valor;
                $config->save();

                $atualizadas[$chave] = $this->formatarValor($config);
            }

            DB::commit();
            return $this->success($atualizadas, 'Configurações atualizadas com sucesso');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Erro ao atualizar configurações do grupo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Inferência simples de tipo para criação de novas configurações.
     */
    protected function inferirTipoPorValor($valor): string
    {
        if (is_bool($valor)) return 'boolean';
        if (is_int($valor)) return 'integer';
        if (is_float($valor)) return 'float';
        if (is_array($valor) || is_object($valor)) return 'json';
        return 'string';
    }
    
    /**
     * Formata o valor da configuração de acordo com o tipo
     * 
     * @param Configuracao $configuracao
     * @return mixed
     */
    protected function formatarValor($configuracao)
    {
        // Usa o accessor que já formata corretamente
        return $configuracao->valor;
    }
    
    /**
     * Valida um valor de acordo com o tipo e regras fornecidas
     * 
     * @param mixed $valor
     * @param string $tipo
     * @param string|null $regras
     * @param array|null $opcoes
     * @return string|null Mensagem de erro ou null se válido
     */
    protected function validarValor($valor, $tipo, $regras = null, $opcoes = null)
    {
        // Se houver regras de validação, aplica-as
        if ($regras && is_string($regras)) {
            $regrasArray = explode('|', $regras);
            
            foreach ($regrasArray as $regra) {
                $partes = explode(':', $regra, 2);
                $nomeRegra = $partes[0];
                $parametros = isset($partes[1]) ? explode(',', $partes[1]) : [];
                
                switch ($nomeRegra) {
                    case 'required':
                        if (empty($valor) && $valor !== '0' && $valor !== 0 && $valor !== false) {
                            return 'O valor é obrigatório';
                        }
                        break;
                        
                    case 'min':
                        $min = $parametros[0] ?? null;
                        if ($min !== null) {
                            if (is_numeric($valor) && $valor < $min) {
                                return "O valor deve ser no mínimo {$min}";
                            } elseif (is_string($valor) && mb_strlen($valor) < $min) {
                                return "O valor deve ter no mínimo {$min} caracteres";
                            }
                        }
                        break;
                        
                    case 'max':
                        $max = $parametros[0] ?? null;
                        if ($max !== null) {
                            if (is_numeric($valor) && $valor > $max) {
                                return "O valor deve ser no máximo {$max}";
                            } elseif (is_string($valor) && mb_strlen($valor) > $max) {
                                return "O valor deve ter no máximo {$max} caracteres";
                            }
                        }
                        break;
                        
                    case 'in':
                        if (!empty($parametros) && !in_array($valor, $parametros)) {
                            $opcoes = implode(', ', $parametros);
                            return "O valor deve ser um dos seguintes: {$opcoes}";
                        }
                        break;
                        
                    // Adicione outras regras de validação conforme necessário
                }
            }
        }
        
        // Validação baseada no tipo
        switch ($tipo) {
            case 'integer':
                if (!is_numeric($valor) || (int)$valor != $valor) {
                    return 'O valor deve ser um número inteiro';
                }
                break;
                
            case 'float':
                if (!is_numeric($valor)) {
                    return 'O valor deve ser um número';
                }
                break;
                
            case 'boolean':
                if (!is_bool($valor) && $valor !== 0 && $valor !== 1 && $valor !== '0' && $valor !== '1') {
                    return 'O valor deve ser verdadeiro ou falso';
                }
                break;
                
            case 'json':
            case 'array':
            case 'object':
                if (!is_array($valor) && !is_object($valor)) {
                    json_decode($valor);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        return 'O valor deve ser um JSON válido';
                    }
                }
                break;
                
            case 'date':
                if (!strtotime($valor)) {
                    return 'O valor deve ser uma data válida';
                }
                break;
                
            case 'datetime':
                if (!strtotime($valor)) {
                    return 'O valor deve ser uma data/hora válida';
                }
                break;
                
            case 'time':
                if (!preg_match('/^(?:2[0-3]|[01][0-9]):[0-5][0-9](?::[0-5][0-9])?$/', $valor)) {
                    return 'O valor deve ser um horário válido (HH:MM ou HH:MM:SS)';
                }
                break;
        }
        
        // Se houver opções definidas, verifica se o valor está entre as opções
        if (!empty($opcoes) && is_array($opcoes)) {
            if (!in_array($valor, array_column($opcoes, 'value'))) {
                return 'O valor fornecido não está entre as opções permitidas';
            }
        }
        
        return null;
    }
    
    /**
     * Converte o valor para o formato de armazenamento
     * 
     * @param mixed $valor
     * @param string $tipo
     * @return string
     */
    protected function converterValorParaArmazenamento($valor, $tipo)
    {
        switch ($tipo) {
            case 'integer':
                return (string)(int)$valor;
                
            case 'float':
                return (string)(float)$valor;
                
            case 'boolean':
                return $valor ? '1' : '0';
                
            case 'json':
            case 'array':
            case 'object':
                return is_string($valor) ? $valor : json_encode($valor, JSON_UNESCAPED_UNICODE);
                
            default:
                return (string)$valor;
        }
    }

    /**
     * Upload de logo da empresa
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|max:2048', // 2MB max
        ]);

        try {
            $tenant_id = auth()->user()->tenant_id;
            $image = $request->file('logo');
            $filename = 'logo_empresa_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/empresa',
                $image,
                $filename
            );
            
            // Atualiza a configuração da logo no banco
            $configuracao = $this->model::where('chave', 'logo')
                ->where('grupo', 'empresa')
                ->where('tenant_id', $tenant_id)
                ->first();

            if ($configuracao) {
                // Remove a logo anterior se existir
                if ($configuracao->valor && Storage::disk('public')->exists($configuracao->valor)) {
                    Storage::disk('public')->delete($configuracao->valor);
                }
                
                // Atualiza com o novo caminho
                $configuracao->update(['valor' => $path]);
            } else {
                // Cria nova configuração se não existir
                $this->model::create([
                    'tenant_id' => $tenant_id,
                    'grupo' => 'empresa',
                    'chave' => 'logo',
                    'nome' => 'Logo da Empresa',
                    'descricao' => 'Logo da empresa para uso em documentos e sistema',
                    'valor' => $path,
                    'tipo' => 'imagem',
                    'ordem' => 170,
                    'visivel' => true,
                    'editavel' => true,
                    'obrigatorio' => false,
                ]);
            }
            
            return response()->json([
                'success' => true,
                'url' => Storage::url($path),
                'path' => $path,
                'message' => 'Logo atualizada com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da logo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter configurações da empresa por tenant (rota pública)
     *
     * @param Request $request
     * @param int $tenantId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEmpresaByTenant(Request $request, $tenantId): \Illuminate\Http\JsonResponse
    {
        try {
            // Usar withoutTenant() para remover o escopo de tenant nas rotas públicas
            $configuracoes = Configuracao::withoutTenant()
                                       ->where('tenant_id', $tenantId)
                                       ->where('grupo', 'empresa')
                                       ->where('visivel', true)
                                       ->orderBy('ordem')
                                       ->get();

            $empresa = $configuracoes->mapWithKeys(function ($item) {
                return [$item->chave => $this->formatarValor($item)];
            });

            return $this->success($empresa->toArray(), 'Configurações da empresa recuperadas com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar configurações da empresa por tenant:', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage()
            ]);
            return $this->error('Erro ao carregar configurações da empresa');
        }
    }
}
