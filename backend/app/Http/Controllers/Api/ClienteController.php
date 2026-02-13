<?php

namespace App\Http\Controllers\Api;

use App\Models\Cliente;
use App\Models\Venda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ClienteController extends ResourceController
{
    protected $model = Cliente::class;
    
    protected $storeRules = [
        'nome_completo' => 'nullable|string|max:255',
        'tipo_pessoa' => 'nullable|in:Pessoa Física,Pessoa Jurídica',
        'cpf_cnpj' => 'nullable|string|max:20',
        'rg_ie' => 'nullable|string|max:20',
        'email' => 'nullable|email|max:255',
        'telefone_principal' => 'nullable|string|max:20',
        'whatsapp' => 'nullable|string|max:20',
        'cep' => 'nullable|string|max:10',
        'logradouro' => 'nullable|string|max:255',
        'numero' => 'nullable|string|max:20',
        'complemento' => 'nullable|string|max:100',
        'bairro' => 'nullable|string|max:100',
        'cidade' => 'nullable|string|max:100',
        'estado' => 'nullable|string|max:2',
        'codigo_municipio_ibge' => 'nullable|string|max:10',
        'observacoes' => 'nullable|string',
        'status' => 'boolean',
        'foto_url' => 'nullable|string',
        'apelido_fantasia' => 'nullable|string|max:255',
        'data_nascimento_abertura' => 'nullable|date',
        'sexo' => 'nullable|in:Masculino,Feminino,Outro,Prefiro não informar',
        'autorizado_prazo' => 'boolean',
        'classificacao_cliente' => 'nullable|string|max:50',
        'desconto_fixo_os_terceirizado' => 'nullable|numeric|min:0',
        'is_terceirizado' => 'boolean',
    ];

    protected $updateRules = [
        'nome_completo' => 'nullable|string|max:255',
        'tipo_pessoa' => 'nullable|in:Pessoa Física,Pessoa Jurídica',
        'cpf_cnpj' => 'nullable|string|max:20',
        'rg_ie' => 'nullable|string|max:20',
        'email' => 'nullable|email|max:255',
        'telefone_principal' => 'nullable|string|max:20',
        'whatsapp' => 'nullable|string|max:20',
        'cep' => 'nullable|string|max:10',
        'logradouro' => 'nullable|string|max:255',
        'numero' => 'nullable|string|max:20',
        'complemento' => 'nullable|string|max:100',
        'bairro' => 'nullable|string|max:100',
        'cidade' => 'nullable|string|max:100',
        'estado' => 'nullable|string|max:2',
        'codigo_municipio_ibge' => 'nullable|string|max:10',
        'observacoes' => 'nullable|string',
        'status' => 'boolean',
        'foto_url' => 'nullable|string',
        'apelido_fantasia' => 'nullable|string|max:255',
        'data_nascimento_abertura' => 'nullable|date',
        'sexo' => 'nullable|in:Masculino,Feminino,Outro,Prefiro não informar',
        'autorizado_prazo' => 'boolean',
        'classificacao_cliente' => 'nullable|string|max:50',
        'desconto_fixo_os_terceirizado' => 'nullable|numeric|min:0',
        'is_terceirizado' => 'boolean',
    ];

    /**
     * Armazenar um cliente recém-criado
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Validação customizada para CPF/CNPJ único por tenant
        $rules = $this->storeRules;
        $rules['cpf_cnpj'] = [
            'nullable',
            'string',
            'max:20',
            Rule::unique('clientes')->where(function ($query) {
                return $query->where('tenant_id', auth()->user()->tenant_id);
            }),
            function ($attribute, $value, $fail) {
                // Só validar se o valor não for vazio e não for apenas espaços
                if (empty(trim($value)) || $value === null) {
                    return;
                }
                
                $tipo = request()->input('tipo_pessoa');
                if ($tipo === 'Pessoa Física' && !$this->validarCPF($value)) {
                    $fail('CPF inválido.');
                } elseif ($tipo === 'Pessoa Jurídica' && !$this->validarCNPJ($value)) {
                    $fail('CNPJ inválido.');
                }
            },
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $data = $request->all();
        
        // Garantir que o tenant_id seja definido
        $data['tenant_id'] = auth()->user()->tenant_id;

        // Manter coluna nome em sincronia com nome_completo
        if (array_key_exists('nome_completo', $data)) {
            $data['nome'] = $data['nome_completo'];
        }

        // Limpar CPF/CNPJ (remover caracteres especiais) apenas se existir e não for vazio
        $cpfCnpj = $request->input('cpf_cnpj');
        if ($cpfCnpj !== null && trim($cpfCnpj) !== '') {
            $data['cpf_cnpj'] = preg_replace('/[^0-9]/', '', $cpfCnpj);
        } else {
            // Garantir que a chave exista e seja null quando não enviada
            $data['cpf_cnpj'] = null;
        }

        $cliente = Cliente::create($data);

        return $this->success($cliente, 'Cliente criado com sucesso', 201);
    }

    /**
     * Atualizar um cliente específico
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $cliente = Cliente::find($id);

        if (!$cliente) {
            return $this->notFound('Cliente não encontrado');
        }

        // Validação customizada para CPF/CNPJ único por tenant
        $rules = $this->updateRules;
        if ($request->has('cpf_cnpj')) {
            $rules['cpf_cnpj'] = [
                'sometimes',
                'string',
                'max:20',
                Rule::unique('clientes')->where(function ($query) {
                    return $query->where('tenant_id', auth()->user()->tenant_id);
                })->ignore($id),
                function ($attribute, $value, $fail) use ($request, $cliente) {
                    // Só validar se o valor não for vazio e não for apenas espaços
                    if (empty(trim($value)) || $value === null) {
                        return;
                    }
                    
                    $tipo = $request->has('tipo_pessoa') ? $request->input('tipo_pessoa') : $cliente->tipo_pessoa;
                    if ($tipo === 'Pessoa Física' && !$this->validarCPF($value)) {
                        $fail('CPF inválido.');
                    } elseif ($tipo === 'Pessoa Jurídica' && !$this->validarCNPJ($value)) {
                        $fail('CNPJ inválido.');
                    }
                },
            ];
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $data = $request->all();

        // Manter coluna nome em sincronia com nome_completo (o front envia apenas nome_completo)
        if (array_key_exists('nome_completo', $data)) {
            $data['nome'] = $data['nome_completo'];
        }

        // Limpar CPF/CNPJ se fornecido e não vazio
        if (isset($data['cpf_cnpj']) && !empty(trim($data['cpf_cnpj']))) {
            $data['cpf_cnpj'] = preg_replace('/[^0-9]/', '', $data['cpf_cnpj']);
        } else {
            $data['cpf_cnpj'] = null; // Definir como null se estiver vazio
        }

        $cliente->update($data);

        return $this->success($cliente, 'Cliente atualizado com sucesso');
    }

    /**
     * Remover um cliente específico
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        $cliente = Cliente::withCount(['vendas', 'orcamentos'])->find($id);

        if (!$cliente) {
            return $this->notFound('Cliente não encontrado');
        }

        // Verificar se o cliente tem vendas ou orçamentos associados
        if ($cliente->vendas_count > 0) {
            return $this->error('Não é possível excluir o cliente pois ele possui vendas associadas', 422);
        }

        if ($cliente->orcamentos_count > 0) {
            return $this->error('Não é possível excluir o cliente pois ele possui orçamentos associados', 422);
        }

        try {
            $cliente->delete();
            return $this->success(null, 'Cliente removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover o cliente: ' . $e->getMessage());
        }
    }

    /**
     * Aplica filtros à consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por termo de busca
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('cpf_cnpj', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('nome_fantasia', 'like', "%{$search}%");
            });
        }

        // Filtrar por tipo (física/jurídica)
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Filtrar por cidade
        if ($request->has('cidade')) {
            $query->where('cidade', 'like', "%{$request->input('cidade')}%");
        }

        // Filtrar por estado
        if ($request->has('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        // Filtrar por status (ativo/inativo)
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query;
    }

    /**
     * Retorna as estatísticas do cliente
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function estatisticas($id): JsonResponse
    {
        $cliente = Cliente::withCount(['vendas', 'orcamentos'])->find($id);

        if (!$cliente) {
            return $this->notFound('Cliente não encontrado');
        }

        // Calcular estatísticas detalhadas
        $valorTotalVendas = $cliente->vendas()->sum('valor_total') ?? 0;
        $valorTotalOrcamentos = $cliente->orcamentos()->sum('valor_total') ?? 0;
        $ultimaVenda = $cliente->vendas()->latest()->first();
        $ultimoOrcamento = $cliente->orcamentos()->latest()->first();

        $estatisticas = [
            'total_vendas' => $cliente->vendas_count,
            'total_orcamentos' => $cliente->orcamentos_count,
            'valor_total_vendas' => round($valorTotalVendas, 2),
            'valor_total_orcamentos' => round($valorTotalOrcamentos, 2),
            'valor_medio_compra' => $cliente->vendas_count > 0 
                ? round($valorTotalVendas / $cliente->vendas_count, 2)
                : 0,
            'ultima_venda' => $ultimaVenda ? $ultimaVenda->created_at->format('d/m/Y') : null,
            'ultimo_orcamento' => $ultimoOrcamento ? $ultimoOrcamento->created_at->format('d/m/Y') : null,
        ];

        return $this->success($estatisticas, 'Estatísticas do cliente recuperadas com sucesso');
    }

    /**
     * Buscar clientes por CPF/CNPJ
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function buscarPorCpfCnpj(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cpf_cnpj' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $cpfCnpj = $request->input('cpf_cnpj');
        
        // Só processar se o CPF/CNPJ não for vazio
        if (!empty(trim($cpfCnpj))) {
            $cpfCnpj = preg_replace('/[^0-9]/', '', $cpfCnpj);
            
            $cliente = Cliente::where('cpf_cnpj', $cpfCnpj)->first();

            if (!$cliente) {
                return $this->notFound('Cliente não encontrado');
            }

            return $this->success($cliente, 'Cliente encontrado');
        } else {
            return $this->success(null, 'Nenhum CPF/CNPJ fornecido para busca');
        }
    }

    /**
     * Obter clientes ativos
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function ativos(Request $request): JsonResponse
    {
        $query = Cliente::where('ativo', true)->orderBy('nome');

        $clientes = $query->get();

        return $this->success($clientes, 'Clientes ativos recuperados com sucesso');
    }

    /**
     * Valida CPF
     */
    private function validarCPF($cpf)
    {
        $cpf = preg_replace('/[^0-9]/', '', $cpf);
        
        if (strlen($cpf) != 11 || preg_match('/(\d)\1{10}/', $cpf)) {
            return false;
        }
        
        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) {
                return false;
            }
        }
        return true;
    }

    /**
     * Valida CNPJ
     */
    private function validarCNPJ($cnpj)
    {
        $cnpj = preg_replace('/[^0-9]/', '', $cnpj);
        
        if (strlen($cnpj) != 14) {
            return false;
        }
        
        // Valida primeiro dígito verificador
        for ($i = 0, $j = 5, $soma = 0; $i < 12; $i++) {
            $soma += $cnpj[$i] * $j;
            $j = ($j == 2) ? 9 : $j - 1;
        }
        $resto = $soma % 11;
        $digito1 = $resto < 2 ? 0 : 11 - $resto;
        
        if ($cnpj[12] != $digito1) {
            return false;
        }
        
        // Valida segundo dígito verificador
        for ($i = 0, $j = 6, $soma = 0; $i < 13; $i++) {
            $soma += $cnpj[$i] * $j;
            $j = ($j == 2) ? 9 : $j - 1;
        }
        $resto = $soma % 11;
        $digito2 = $resto < 2 ? 0 : 11 - $resto;
        
        return $cnpj[13] == $digito2;
    }

    /**
     * Relatório de aniversariantes do mês
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function aniversariantesDoMes(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $mes = $request->input('mes', Carbon::now()->month);
            $ano = $request->input('ano', Carbon::now()->year);

            // Buscar clientes que fazem aniversário no mês selecionado
            $clientes = Cliente::where('tenant_id', $tenantId)
                ->where('status', true)
                ->whereNotNull('data_nascimento_abertura')
                ->whereMonth('data_nascimento_abertura', $mes)
                ->orderByRaw('DAY(data_nascimento_abertura)')
                ->get()
                ->map(function($cliente) use ($ano) {
                    $dataNascimento = Carbon::parse($cliente->data_nascimento_abertura);
                    $dataAniversario = Carbon::create($ano, $dataNascimento->month, $dataNascimento->day);
                    
                    // Calcular idade ou anos de empresa
                    $idadeOuAnos = null;
                    if ($cliente->tipo_pessoa === 'Pessoa Física') {
                        $idadeOuAnos = $dataNascimento->diffInYears(Carbon::now());
                    } else {
                        // Para empresas, calcular anos desde a fundação
                        $idadeOuAnos = $dataNascimento->diffInYears(Carbon::now());
                    }
                    
                    return [
                        'id' => $cliente->id,
                        'nome' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? $cliente->nome ?? 'Cliente não identificado',
                        'tipo_pessoa' => $cliente->tipo_pessoa ?? 'Pessoa Física',
                        'data_nascimento_abertura' => $cliente->data_nascimento_abertura->format('Y-m-d'),
                        'data_aniversario' => $dataAniversario->format('Y-m-d'),
                        'dia_aniversario' => $dataNascimento->day,
                        'idade' => $cliente->tipo_pessoa === 'Pessoa Física' ? $idadeOuAnos : null,
                        'anos_empresa' => $cliente->tipo_pessoa === 'Pessoa Jurídica' ? $idadeOuAnos : null,
                        'email' => $cliente->email,
                        'telefone' => $cliente->telefone_principal,
                        'whatsapp' => $cliente->whatsapp,
                        'cidade' => $cliente->cidade,
                        'estado' => $cliente->estado,
                    ];
                });

            return $this->success([
                'clientes' => $clientes,
                'mes' => $mes,
                'ano' => $ano,
                'total' => $clientes->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar aniversariantes do mês', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao buscar aniversariantes: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Relatório de clientes que mais compraram no ano (por valor)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function clientesQueMaisCompraram(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $ano = $request->input('ano', Carbon::now()->year);

            // Buscar todas as vendas do ano
            $vendas = Venda::where('tenant_id', $tenantId)
                ->where('status', 'concluida')
                ->whereYear('data_emissao', $ano)
                ->whereNotNull('cliente_id')
                ->with('cliente:id,nome_completo,apelido_fantasia,nome,tipo_pessoa,email,telefone_principal')
                ->get();

            // Agrupar por cliente e calcular totais
            $clientesCompras = $vendas->groupBy('cliente_id')
                ->map(function($grupoVendas, $clienteId) {
                    $cliente = $grupoVendas->first()->cliente;
                    $totalCompras = $grupoVendas->sum('valor_total');
                    $quantidadeCompras = $grupoVendas->count();
                    $ticketMedio = $quantidadeCompras > 0 ? $totalCompras / $quantidadeCompras : 0;

                    return [
                        'cliente_id' => $clienteId,
                        'cliente_nome' => $cliente ? ($cliente->nome_completo ?? $cliente->apelido_fantasia ?? $cliente->nome ?? 'Cliente não identificado') : 'Cliente não identificado',
                        'tipo_pessoa' => $cliente ? ($cliente->tipo_pessoa ?? 'Pessoa Física') : 'Pessoa Física',
                        'email' => $cliente ? $cliente->email : null,
                        'telefone' => $cliente ? $cliente->telefone_principal : null,
                        'total_compras' => $totalCompras,
                        'quantidade_compras' => $quantidadeCompras,
                        'ticket_medio' => $ticketMedio,
                    ];
                })
                ->sortByDesc('total_compras')
                ->values();

            // Calcular total geral
            $totalGeral = $clientesCompras->sum('total_compras');

            // Adicionar percentual de participação
            $clientesCompras = $clientesCompras->map(function($cliente) use ($totalGeral) {
                $percentual = $totalGeral > 0 ? ($cliente['total_compras'] / $totalGeral) * 100 : 0;
                $cliente['percentual_participacao'] = round($percentual, 2);
                return $cliente;
            });

            return $this->success([
                'clientes' => $clientesCompras,
                'ano' => $ano,
                'total_geral' => $totalGeral,
                'total_clientes' => $clientesCompras->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar clientes que mais compraram', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao buscar clientes que mais compraram: ' . $e->getMessage(), 500);
        }
    }
}
