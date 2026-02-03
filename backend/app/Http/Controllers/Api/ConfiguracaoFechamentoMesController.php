<?php

namespace App\Http\Controllers\Api;

use App\Models\ConfiguracaoFechamentoMes;
use App\Models\HistoricoFechamentoMes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConfiguracaoFechamentoMesController extends BaseController
{
    /**
     * Obter configuração de fechamento de mês
     */
    public function index()
    {
        try {
            $configuracao = ConfiguracaoFechamentoMes::obterOuCriar(auth()->user()->tenant_id);
            return $this->success($configuracao);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar configuração: ' . $e->getMessage());
        }
    }

    /**
     * Atualizar configuração de fechamento de mês
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dia_fechamento' => 'required|integer|min:1|max:31',
            'ativo' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $configuracao = ConfiguracaoFechamentoMes::obterOuCriar(auth()->user()->tenant_id);
            
            $configuracao->update([
                'dia_fechamento' => $request->dia_fechamento,
                'ativo' => $request->ativo,
                'usuario_configuracao_id' => auth()->id(),
            ]);

            return $this->success($configuracao, 'Configuração atualizada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar configuração: ' . $e->getMessage());
        }
    }

    /**
     * Obter histórico de fechamentos
     */
    public function historico(Request $request)
    {
        try {
            $query = HistoricoFechamentoMes::where('tenant_id', auth()->user()->tenant_id)
                ->with('usuario')
                ->orderBy('data_acao', 'desc');

            // Filtros opcionais
            if ($request->has('mes') && $request->mes) {
                $query->where('mes', $request->mes);
            }

            if ($request->has('ano') && $request->ano) {
                $query->where('ano', $request->ano);
            }

            if ($request->has('tipo') && $request->tipo) {
                $query->where('tipo', $request->tipo);
            }

            $perPage = $request->get('per_page', 50);
            $historico = $query->paginate($perPage);

            return $this->success($historico);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar histórico: ' . $e->getMessage());
        }
    }

    /**
     * Obter histórico resumido dos últimos fechamentos
     */
    public function historicoResumido()
    {
        try {
            $historico = HistoricoFechamentoMes::where('tenant_id', auth()->user()->tenant_id)
                ->with('usuario')
                ->orderBy('data_acao', 'desc')
                ->limit(20)
                ->get();

            return $this->success($historico);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar histórico: ' . $e->getMessage());
        }
    }
}

