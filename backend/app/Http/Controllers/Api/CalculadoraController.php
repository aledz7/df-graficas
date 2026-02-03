<?php

namespace App\Http\Controllers\Api;

use App\Models\CalculoSavado;
use App\Models\ServicoAdicional;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CalculadoraController extends BaseController
{
    /**
     * Lista todos os cálculos salvos
     */
    public function getCalculosSalvos(Request $request)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $userId = auth()->id();

            $calculos = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->orderBy('data_criacao', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return $this->success($calculos);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar cálculos salvos: ' . $e->getMessage());
        }
    }

    /**
     * Salva um novo cálculo
     */
    public function storeCalculoSalvo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nome' => 'required|string|max:255',
            'dados_calculo' => 'required|array',
            'resultado' => 'required|numeric',
            'descricao' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $calculo = CalculoSavado::create([
                'user_id' => auth()->id(),
                'tenant_id' => auth()->user()->tenant_id,
                'nome' => $request->nome,
                'cliente' => $request->dados_calculo['cliente'] ?? null,
                'config' => $request->dados_calculo['config'] ?? null,
                'dados_calculo' => $request->dados_calculo,
                'resultado' => $request->resultado,
                'itens' => $request->dados_calculo['itens'] ?? null,
                'produtos' => $request->dados_calculo['produtos'] ?? null,
                'servicos_adicionais' => $request->dados_calculo['servicos_adicionais'] ?? null,
                'descricao' => $request->descricao,
                'status' => 'ativo',
                'data_criacao' => now(),
                'data_atualizacao' => now(),
            ]);

            return $this->success($calculo, 'Cálculo salvo com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao salvar cálculo: ' . $e->getMessage());
        }
    }

    /**
     * Remove um cálculo salvo
     */
    public function deleteCalculoSalvo($id)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $userId = auth()->id();

            $calculo = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->where('id', $id)
                ->first();

            if (!$calculo) {
                return $this->error('Cálculo não encontrado', 404);
            }

            $calculo->update(['status' => 'excluido']);
            $calculo->delete();

            return $this->success(null, 'Cálculo removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover cálculo: ' . $e->getMessage());
        }
    }

    /**
     * Lista todos os serviços adicionais
     */
    public function getServicosAdicionais(Request $request)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $servicos = ServicoAdicional::where('ativo', true)
                ->where('tipo', 'calculadora') // Filtrar apenas serviços da calculadora
                ->where('tenant_id', $tenantId) // Filtrar por tenant
                ->orderBy('nome')
                ->get();

            return $this->success($servicos);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar serviços adicionais: ' . $e->getMessage());
        }
    }

    /**
     * Cria um novo serviço adicional ou atualiza um existente
     */
    public function storeServicoAdicional(Request $request)
    {
        // Log para debug
        \Log::info('Dados recebidos para serviço adicional:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'nome' => 'required|string|max:255',
            'preco' => 'required|numeric|min:0',
            'unidade' => 'required|string|max:20',
            'descricao' => 'nullable|string|max:500',
            'ativo' => 'boolean',
            'tipo' => 'required|in:envelopamento,calculadora',
            'id' => 'nullable|string',
            'deleted' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            \Log::warning('Validação falhou:', $validator->errors()->toArray());
            return $this->validationError($validator->errors());
        }

        try {
            // Verificar se é uma atualização ou criação
            $id = $request->id;
            $servico = null;
            
            if ($id) {
                // Tentar encontrar por ID numérico ou string
                if (is_numeric($id)) {
                    $servico = ServicoAdicional::find($id);
                } else if (strpos($id, 'serv-') === 0) {
                    // Se for um ID temporário do frontend, procurar por nome
                    $servico = ServicoAdicional::where('nome', $request->nome)
                        ->where('user_id', auth()->id())
                        ->first();
                }
            }
            
            // Se solicitou exclusão
            if ($request->deleted === true && $servico) {
                $servico->delete();
                return $this->success(null, 'Serviço adicional excluído com sucesso');
            }
            
            // Dados para criar/atualizar
            $servicoData = [
                'nome' => $request->nome,
                'preco' => $request->preco,
                'unidade' => $request->unidade,
                'descricao' => $request->descricao ?? ('Serviço adicional: ' . $request->nome),
                'ativo' => $request->has('ativo') ? (bool)$request->ativo : true,
                'tipo' => $request->tipo,
                'tenant_id' => auth()->user()->tenant_id,
                'user_id' => auth()->id(),
            ];
            
            // Criar ou atualizar
            if ($servico) {
                $servico->update($servicoData);
                $mensagem = 'Serviço adicional atualizado com sucesso';
            } else {
                $servico = ServicoAdicional::create($servicoData);
                $mensagem = 'Serviço adicional criado com sucesso';
            }

            return $this->success($servico, $mensagem);
        } catch (\Exception $e) {
            \Log::error('Erro ao salvar serviço adicional:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao processar serviço adicional: ' . $e->getMessage());
        }
    }
} 