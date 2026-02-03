<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\AdminConfiguracao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EnvelopamentoPrecosController extends BaseController
{
    /**
     * Busca os preços de envelopamento da empresa atual
     */
    public function index()
    {
        try {
            $config = AdminConfiguracao::getConfiguracaoAtual();
            
            if (!$config) {
                return $this->error('Configuração da empresa não encontrada', 404);
            }

            $precos = [
                'preco_aplicacao' => $config->preco_aplicacao_envelopamento,
                'preco_remocao' => $config->preco_remocao_envelopamento,
                'preco_lixamento' => $config->preco_lixamento_envelopamento,
                'preco_pelicula' => $config->preco_pelicula_envelopamento,
            ];

            return $this->success($precos, 'Preços de envelopamento carregados com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar preços de envelopamento: ' . $e->getMessage());
            return $this->error('Erro ao carregar preços de envelopamento: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza os preços de envelopamento da empresa atual
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'preco_aplicacao' => 'required|numeric|min:0',
            'preco_remocao' => 'required|numeric|min:0',
            'preco_lixamento' => 'required|numeric|min:0',
            'preco_pelicula' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $config = AdminConfiguracao::getOuCriarConfiguracao();
            
            $config->update([
                'preco_aplicacao_envelopamento' => $request->preco_aplicacao,
                'preco_remocao_envelopamento' => $request->preco_remocao,
                'preco_lixamento_envelopamento' => $request->preco_lixamento,
                'preco_pelicula_envelopamento' => $request->preco_pelicula,
            ]);

            $precos = [
                'preco_aplicacao' => $config->preco_aplicacao_envelopamento,
                'preco_remocao' => $config->preco_remocao_envelopamento,
                'preco_lixamento' => $config->preco_lixamento_envelopamento,
                'preco_pelicula' => $config->preco_pelicula_envelopamento,
            ];

            return $this->success($precos, 'Preços de envelopamento atualizados com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao atualizar preços de envelopamento: ' . $e->getMessage());
            return $this->error('Erro ao atualizar preços de envelopamento: ' . $e->getMessage());
        }
    }

    /**
     * Retorna os preços de envelopamento em formato compatível com o frontend
     */
    public function getPrecosCompatibilidade()
    {
        try {
            $config = AdminConfiguracao::getConfiguracaoAtual();
            
            if (!$config) {
                // Retorna valores padrão se não houver configuração
                return $this->success([
                    'preco_aplicacao' => '10.00',
                    'preco_remocao' => '5.00',
                    'preco_lixamento' => '8.00',
                    'preco_pelicula' => '40.00',
                ]);
            }

            $precos = [
                'preco_aplicacao' => number_format($config->preco_aplicacao_envelopamento, 2, '.', ''),
                'preco_remocao' => number_format($config->preco_remocao_envelopamento, 2, '.', ''),
                'preco_lixamento' => number_format($config->preco_lixamento_envelopamento, 2, '.', ''),
                'preco_pelicula' => number_format($config->preco_pelicula_envelopamento, 2, '.', ''),
            ];

            return $this->success($precos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar preços de compatibilidade: ' . $e->getMessage());
            return $this->error('Erro ao carregar preços: ' . $e->getMessage());
        }
    }
}
