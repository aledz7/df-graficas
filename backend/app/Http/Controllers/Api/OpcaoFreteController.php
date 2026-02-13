<?php

namespace App\Http\Controllers\Api;

use App\Models\OpcaoFrete;
use App\Models\FreteLocalidade;
use App\Models\FreteFaixaCep;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpcaoFreteController extends ResourceController
{
    protected $model = OpcaoFrete::class;
    
    protected $storeRules = [
        'titulo' => 'required|string|max:255',
        'descricao' => 'nullable|string',
        'prazo_entrega' => 'required|integer|min:1',
        'taxa_entrega' => 'required|numeric|min:0',
        'pedido_minimo' => 'nullable|numeric|min:0',
        'peso_minimo' => 'nullable|numeric|min:0',
        'peso_maximo' => 'nullable|numeric|min:0',
        'tamanho_minimo' => 'nullable|numeric|min:0',
        'tamanho_maximo' => 'nullable|numeric|min:0',
        'tipo_limite_geografico' => 'required|in:localidade,cep,distancia',
        'produtos_limitados' => 'nullable|array',
        'produtos_limitados.*' => 'exists:produtos,id',
        'ativo' => 'boolean',
        'ordem' => 'nullable|integer',
        'localidades' => 'nullable|array',
        'localidades.*.estado' => 'nullable|string|max:2',
        'localidades.*.cidade' => 'nullable|string|max:255',
        'localidades.*.bairro' => 'nullable|string|max:255',
        'faixas_cep' => 'nullable|array',
        'faixas_cep.*.cep_inicio' => 'required|string|max:10',
        'faixas_cep.*.cep_fim' => 'required|string|max:10',
    ];

    protected $updateRules = [
        'titulo' => 'sometimes|string|max:255',
        'descricao' => 'nullable|string',
        'prazo_entrega' => 'sometimes|integer|min:1',
        'taxa_entrega' => 'sometimes|numeric|min:0',
        'pedido_minimo' => 'nullable|numeric|min:0',
        'peso_minimo' => 'nullable|numeric|min:0',
        'peso_maximo' => 'nullable|numeric|min:0',
        'tamanho_minimo' => 'nullable|numeric|min:0',
        'tamanho_maximo' => 'nullable|numeric|min:0',
        'tipo_limite_geografico' => 'sometimes|in:localidade,cep,distancia',
        'produtos_limitados' => 'nullable|array',
        'produtos_limitados.*' => 'exists:produtos,id',
        'ativo' => 'boolean',
        'ordem' => 'nullable|integer',
        'localidades' => 'nullable|array',
        'localidades.*.estado' => 'nullable|string|max:2',
        'localidades.*.cidade' => 'nullable|string|max:255',
        'localidades.*.bairro' => 'nullable|string|max:255',
        'faixas_cep' => 'nullable|array',
        'faixas_cep.*.cep_inicio' => 'required|string|max:10',
        'faixas_cep.*.cep_fim' => 'required|string|max:10',
    ];

    protected $with = ['localidades', 'faixasCep'];

    /**
     * Sobrescreve store para salvar localidades e faixas de CEP
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $validator = \Validator::make($request->all(), $this->storeRules);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $data = $request->except(['localidades', 'faixas_cep']);
            $data['tenant_id'] = auth()->user()->tenant_id;

            $opcaoFrete = OpcaoFrete::create($data);

            // Salvar localidades
            if ($request->has('localidades')) {
                foreach ($request->localidades as $localidade) {
                    FreteLocalidade::create([
                        'opcao_frete_id' => $opcaoFrete->id,
                        'estado' => $localidade['estado'] ?? null,
                        'cidade' => $localidade['cidade'] ?? null,
                        'bairro' => $localidade['bairro'] ?? null,
                    ]);
                }
            }

            // Salvar faixas de CEP
            if ($request->has('faixas_cep')) {
                foreach ($request->faixas_cep as $faixa) {
                    FreteFaixaCep::create([
                        'opcao_frete_id' => $opcaoFrete->id,
                        'cep_inicio' => $faixa['cep_inicio'],
                        'cep_fim' => $faixa['cep_fim'],
                    ]);
                }
            }

            $opcaoFrete->load($this->with);

            return $this->success($opcaoFrete, 'Opção de frete criada com sucesso', 201);
        });
    }

    /**
     * Sobrescreve update para atualizar localidades e faixas de CEP
     */
    public function update(Request $request, $id): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $validator = \Validator::make($request->all(), $this->updateRules);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $opcaoFrete = OpcaoFrete::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);

            $data = $request->except(['localidades', 'faixas_cep']);
            $opcaoFrete->update($data);

            // Atualizar localidades (remover antigas e criar novas)
            if ($request->has('localidades')) {
                FreteLocalidade::where('opcao_frete_id', $opcaoFrete->id)->delete();
                foreach ($request->localidades as $localidade) {
                    FreteLocalidade::create([
                        'opcao_frete_id' => $opcaoFrete->id,
                        'estado' => $localidade['estado'] ?? null,
                        'cidade' => $localidade['cidade'] ?? null,
                        'bairro' => $localidade['bairro'] ?? null,
                    ]);
                }
            }

            // Atualizar faixas de CEP (remover antigas e criar novas)
            if ($request->has('faixas_cep')) {
                FreteFaixaCep::where('opcao_frete_id', $opcaoFrete->id)->delete();
                foreach ($request->faixas_cep as $faixa) {
                    FreteFaixaCep::create([
                        'opcao_frete_id' => $opcaoFrete->id,
                        'cep_inicio' => $faixa['cep_inicio'],
                        'cep_fim' => $faixa['cep_fim'],
                    ]);
                }
            }

            $opcaoFrete->load($this->with);

            return $this->success($opcaoFrete, 'Opção de frete atualizada com sucesso');
        });
    }

    /**
     * Listar opções de frete ativas
     */
    public function ativas(Request $request)
    {
        $opcoes = OpcaoFrete::where('tenant_id', auth()->user()->tenant_id)
            ->where('ativo', true)
            ->ordenadas()
            ->with($this->with)
            ->get();

        return $this->success($opcoes);
    }
}
