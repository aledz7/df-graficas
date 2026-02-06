<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\Holerite;
use App\Models\HistoricoFechamentoMes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class FuncionarioController extends BaseController
{
    protected $model = User::class;
    
    protected $storeRules = [
        'name' => 'required|string|max:255',
        'email' => 'required|email|max:255|unique:users,email',
        'data_nascimento' => 'nullable|date',
        'cpf' => 'nullable|string|max:14',
        'rg' => 'nullable|string|max:20',
        'emissor_rg' => 'nullable|string|max:10',
        'cep' => 'nullable|string|max:10',
        'endereco' => 'nullable|string|max:255',
        'numero' => 'nullable|string|max:20',
        'complemento' => 'nullable|string|max:255',
        'bairro' => 'nullable|string|max:255',
        'cidade' => 'nullable|string|max:255',
        'uf' => 'nullable|string|max:2',
        'cargo' => 'nullable|string|max:255',
        'telefone' => 'nullable|string|max:20',
        'whatsapp' => 'nullable|string|max:20',
        'celular' => 'nullable|string|max:20',
        'comissao_dropshipping' => 'nullable|numeric|min:0|max:100',
        'comissao_servicos' => 'nullable|numeric|min:0|max:100',
        'permite_receber_comissao' => 'boolean',
        'salario_base' => 'nullable|numeric|min:0',
        'vales' => 'nullable|array',
        'faltas' => 'nullable|array',
        'permissions' => 'nullable|array',
        'login' => 'nullable|string|max:255',
        'senha' => 'nullable|string|max:255',
        'status' => 'boolean',
        'foto_url' => 'nullable|string|max:255',
        // Tema visual do usuário (opcional na entrada; default será aplicado no store)
        'theme' => 'nullable|string|max:50',
    ];

    protected $updateRules = [
        'name' => 'sometimes|required|string|max:255',
        'email' => 'sometimes|required|email|max:255',
        'data_nascimento' => 'nullable|date',
        'cpf' => 'nullable|string|max:14',
        'rg' => 'nullable|string|max:20',
        'emissor_rg' => 'nullable|string|max:10',
        'cep' => 'nullable|string|max:10',
        'endereco' => 'nullable|string|max:255',
        'numero' => 'nullable|string|max:20',
        'complemento' => 'nullable|string|max:255',
        'bairro' => 'nullable|string|max:255',
        'cidade' => 'nullable|string|max:255',
        'uf' => 'nullable|string|max:2',
        'cargo' => 'nullable|string|max:255',
        'telefone' => 'nullable|string|max:20',
        'whatsapp' => 'nullable|string|max:20',
        'celular' => 'nullable|string|max:20',
        'comissao_dropshipping' => 'nullable|numeric|min:0|max:100',
        'comissao_servicos' => 'nullable|numeric|min:0|max:100',
        'permite_receber_comissao' => 'boolean',
        'salario_base' => 'nullable|numeric|min:0',
        'vales' => 'nullable|array',
        'faltas' => 'nullable|array',
        'permissions' => 'nullable|array',
        'login' => 'nullable|string|max:255',
        'senha' => 'nullable|string|max:255',
        'status' => 'boolean',
        'foto_url' => 'nullable|string|max:255',
        // Permitir atualização do tema
        'theme' => 'nullable|string|max:50',
    ];

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = User::where('tenant_id', auth()->user()->tenant_id);

            // Filtros
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('cargo', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('cpf', 'like', "%{$search}%");
                });
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('cargo') && $request->cargo) {
                $query->where('cargo', $request->cargo);
            }

            if ($request->has('com_comissao')) {
                $query->where('permite_receber_comissao', $request->com_comissao);
            }

            // Ordenação
            $sortBy = $request->get('sort_by', 'name');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Paginação
            $perPage = $request->get('per_page', 15);
            $funcionarios = $query->paginate($perPage);

            return $this->success($funcionarios);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar funcionários: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            DB::beginTransaction();

            $data = $request->all();

            // Sempre criar no tenant do usuário logado
            $data['tenant_id'] = auth()->user()->tenant_id;
            
            // SEGURANÇA: Funcionários nunca podem ser admin
            // A administração de tenants é feita por um sistema separado
            $data['is_admin'] = false;

            // Normalizar data_nascimento (string vazia -> null para gravar corretamente)
            if (array_key_exists('data_nascimento', $data)) {
                $data['data_nascimento'] = $data['data_nascimento'] === '' || $data['data_nascimento'] === null
                    ? null
                    : $data['data_nascimento'];
            }
            
            // Aplicar tema padrão 'light' caso não informado
            if (!isset($data['theme']) || empty($data['theme'])) {
                $data['theme'] = 'light';
            }
            
            // Processar arrays JSON
            if (isset($data['vales']) && is_array($data['vales'])) {
                $data['vales'] = array_values($data['vales']);
            }
            
            if (isset($data['faltas']) && is_array($data['faltas'])) {
                $data['faltas'] = array_values($data['faltas']);
            }
            
            // Processar permissões - manter como objeto
            if (isset($data['permissions']) && is_array($data['permissions'])) {
                // Filtrar apenas as permissões que são true
                $permissions = array_filter($data['permissions'], function($value) {
                    return $value === true;
                });
                $data['permissions'] = $permissions;
            }

            // Não armazenar senha em texto puro no campo 'senha'
            if (isset($data['senha'])) {
                unset($data['senha']);
            }

            // Definir senha padrão se não fornecida
            if (!isset($data['password']) || empty($data['password'])) {
                $data['password'] = Hash::make('123456');
            } else {
                $data['password'] = Hash::make($data['password']);
            }

            $funcionario = User::create($data);

            DB::commit();

            return $this->success($funcionario, 'Funcionário criado com sucesso');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Erro ao criar funcionário: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            return $this->success($funcionario);
        } catch (\Exception $e) {
            return $this->error('Funcionário não encontrado');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $rules = $this->updateRules;
        $rules['email'] = 'sometimes|required|email|max:255|unique:users,email,' . $id;
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            DB::beginTransaction();

            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $data = $request->all();
            
            // SEGURANÇA: Funcionários nunca podem ser admin
            // A administração de tenants é feita por um sistema separado
            $data['is_admin'] = false;

            // Normalizar data_nascimento (string vazia -> null para gravar corretamente)
            if (array_key_exists('data_nascimento', $data)) {
                $data['data_nascimento'] = $data['data_nascimento'] === '' || $data['data_nascimento'] === null
                    ? null
                    : $data['data_nascimento'];
            }
            
            // Não armazenar senha em texto puro no campo 'senha'
            if (isset($data['senha'])) {
                unset($data['senha']);
            }

            // Processar arrays JSON
            if (isset($data['vales']) && is_array($data['vales'])) {
                $data['vales'] = array_values($data['vales']);
            }
            
            if (isset($data['faltas']) && is_array($data['faltas'])) {
                $data['faltas'] = array_values($data['faltas']);
            }
            
            // Processar permissões - manter como objeto
            if (isset($data['permissions']) && is_array($data['permissions'])) {
                // Filtrar apenas as permissões que são true
                $permissions = array_filter($data['permissions'], function($value) {
                    return $value === true;
                });
                $data['permissions'] = $permissions;
            }

            // Criptografar senha se fornecida
            if (isset($data['password']) && !empty($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }

            // Se o salário foi alterado, registrar histórico automaticamente
            if (array_key_exists('salario_base', $data) && $data['salario_base'] !== null) {
                $novoSalario = (float) $data['salario_base'];
                $salarioAnterior = (float) ($funcionario->salario_base ?? 0);
                if ($novoSalario !== $salarioAnterior) {
                    // Normalizar data
                    $dataAlteracao = isset($data['data_alteracao'])
                        ? Carbon::parse($data['data_alteracao'])->toDateString()
                        : now()->toDateString();
                    DB::table('funcionario_salario_historico')->insert([
                        'funcionario_id' => $funcionario->id,
                        'salario_anterior' => $salarioAnterior,
                        'novo_salario' => $novoSalario,
                        'diferenca' => $novoSalario - $salarioAnterior,
                        'motivo' => $data['motivo_salario'] ?? 'Alteração de salário pelo formulário',
                        'data_alteracao' => $dataAlteracao,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    // Garantir que o novo salário esteja no array $data para ser persistido no update
                    $data['salario_base'] = $novoSalario;
                }
            }

            // Atualizar o funcionário com todos os dados (incluindo salario_base se foi alterado)
            $funcionario->update($data);
            
            // Recarregar o modelo do banco para garantir que temos os dados atualizados
            $funcionario->refresh();

            DB::commit();

            return $this->success($funcionario, 'Funcionário atualizado com sucesso');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Erro ao atualizar funcionário: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $funcionario->delete();

            DB::commit();
            return $this->success(null, 'Funcionário removido com sucesso');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Erro ao remover funcionário: ' . $e->getMessage());
        }
    }

    /**
     * Adicionar vale ao funcionário
     */
    public function addVale(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'data' => 'required|date',
            'valor' => 'required|numeric|min:0',
            'motivo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $funcionario->addVale(
                $request->data,
                $request->valor,
                $request->motivo
            );

            return $this->success($funcionario, 'Vale adicionado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao adicionar vale: ' . $e->getMessage());
        }
    }

    /**
     * Adicionar falta ao funcionário
     */
    public function addFalta(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'data' => 'required|date',
            'valorDesconto' => 'required|numeric|min:0',
            'motivo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $funcionario->addFalta(
                $request->data,
                $request->valorDesconto,
                $request->motivo
            );

            return $this->success($funcionario, 'Falta adicionada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao adicionar falta: ' . $e->getMessage());
        }
    }

    /**
     * Remover vale do funcionário
     */
    public function removeVale(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'vale_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $vales = is_array($funcionario->vales) ? $funcionario->vales : [];
            
            $vales = array_filter($vales, function ($vale) use ($request) {
                return $vale['id'] !== $request->vale_id;
            });
            
            $funcionario->vales = array_values($vales);
            $funcionario->save();

            return $this->success($funcionario, 'Vale removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover vale: ' . $e->getMessage());
        }
    }

    /**
     * Remover falta do funcionário
     */
    public function removeFalta(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'falta_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            $faltas = is_array($funcionario->faltas) ? $funcionario->faltas : [];
            
            $faltas = array_filter($faltas, function ($falta) use ($request) {
                return $falta['id'] !== $request->falta_id;
            });
            
            $funcionario->faltas = array_values($faltas);
            $funcionario->save();

            return $this->success($funcionario, 'Falta removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover falta: ' . $e->getMessage());
        }
    }

    /**
     * Buscar funcionários ativos
     */
    public function ativos()
    {
        try {
            $funcionarios = User::where('tenant_id', auth()->user()->tenant_id)
                ->where('status', true)
                ->orderBy('name')
                ->get();
            return $this->success($funcionarios);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar funcionários ativos: ' . $e->getMessage());
        }
    }

    /**
     * Buscar funcionários por cargo
     */
    public function porCargo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cargo' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $funcionarios = User::where('tenant_id', auth()->user()->tenant_id)
                ->where('cargo', $request->cargo)
                ->where('status', true)
                ->orderBy('name')
                ->get();
            
            return $this->success($funcionarios);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar funcionários por cargo: ' . $e->getMessage());
        }
    }

    /**
     * Buscar funcionários com comissão
     */
    public function comComissao()
    {
        try {
            $funcionarios = User::where('tenant_id', auth()->user()->tenant_id)
                ->where('permite_receber_comissao', true)
                ->where('status', true)
                ->orderBy('name')
                ->get();
            
            return $this->success($funcionarios);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar funcionários com comissão: ' . $e->getMessage());
        }
    }

    /**
     * Obter nome do mês
     */
    private function getMesNome($mes)
    {
        $meses = [
            1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
            5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
            9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
        ];
        return $meses[$mes] ?? '';
    }

    /**
     * Verificar se um mês já foi fechado
     */
    public function verificarMesFechado(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2020|max:2030',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $holeriteExistente = Holerite::where('tenant_id', auth()->user()->tenant_id)
            ->where('mes', $request->mes)
            ->where('ano', $request->ano)
            ->first();

        if ($holeriteExistente) {
            // Se o mês está fechado, a data de abertura é quando foi criado o registro
            // Se está aberto, a data de abertura é quando foi criado (abertura automática)
            $dataAbertura = $holeriteExistente->created_at;
            
            return $this->success([
                'fechado' => $holeriteExistente->fechado,
                'mes_nome' => $holeriteExistente->mes_nome,
                'ano' => $holeriteExistente->ano,
                'data_abertura' => $dataAbertura,
                'data_fechamento' => $holeriteExistente->data_fechamento,
                'usuario_fechamento' => $holeriteExistente->usuarioFechamento ? $holeriteExistente->usuarioFechamento->name : null,
                'mensagem' => $holeriteExistente->fechado 
                    ? 'O mês de ' . $holeriteExistente->mes_nome . ' de ' . $request->ano . ' já foi fechado.'
                    : 'O mês de ' . $holeriteExistente->mes_nome . ' de ' . $request->ano . ' está aberto.'
            ]);
        }

        // Se não existe holerite para este mês, verificar se o mês anterior foi fechado
        // para determinar se este mês deveria estar "aberto"
        if ($request->mes > 1) {
            $mesAnterior = $request->mes - 1;
            $anoAnterior = $request->ano;
        } else {
            $mesAnterior = 12;
            $anoAnterior = $request->ano - 1;
        }

        $mesAnteriorFechado = Holerite::where('tenant_id', auth()->user()->tenant_id)
            ->where('mes', $mesAnterior)
            ->where('ano', $anoAnterior)
            ->where('fechado', true)
            ->first();

        if ($mesAnteriorFechado) {
            // O mês anterior foi fechado, então este mês está "aberto"
            // Período aberto começa no próprio dia do fechamento (ex.: fechou 24/01 → aberto de 24/01 até hoje)
            $mesNome = $this->getMesNome($request->mes);
            
            $dataAbertura = $mesAnteriorFechado->data_fechamento 
                ? Carbon::parse($mesAnteriorFechado->data_fechamento)->startOfDay()->toDateTimeString()
                : null;
            
            return $this->success([
                'fechado' => false,
                'mes_nome' => $mesNome,
                'ano' => $request->ano,
                'data_abertura' => $dataAbertura,
                'data_fechamento' => null,
                'usuario_fechamento' => null,
                'mensagem' => 'O mês de ' . $mesNome . ' de ' . $request->ano . ' está aberto.'
            ]);
        }

        // Se nem existe holerite nem o mês anterior foi fechado, o mês não está disponível
        return $this->success([
            'fechado' => false,
            'mes_nome' => $this->getMesNome($request->mes),
            'ano' => $request->ano,
            'data_abertura' => null,
            'data_fechamento' => null,
            'usuario_fechamento' => null,
            'mensagem' => 'Este mês não está disponível para fechamento. O mês anterior precisa ser fechado primeiro.',
            'nao_disponivel' => true
        ]);
    }

    /**
     * Reabrir mês (desfazer fechamento)
     */
    public function reabrirMes(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2020|max:2030',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            DB::beginTransaction();

            $mes = $request->mes;
            $ano = $request->ano;

            // Verificar se o mês foi fechado
            $holeritesFechados = Holerite::where('tenant_id', auth()->user()->tenant_id)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->where('fechado', true)
                ->get();

            if ($holeritesFechados->isEmpty()) {
                return $this->error('O mês de ' . $this->getMesNome($mes) . ' de ' . $ano . ' não está fechado.');
            }

            // Reabrir todos os holerites do mês
            foreach ($holeritesFechados as $holerite) {
                $holerite->fechado = false;
                $holerite->data_fechamento = null; // Agora pode ser null
                $holerite->usuario_fechamento_id = null;
                $holerite->save();
            }

            // Verificar se existe próximo mês que foi aberto automaticamente
            $proximoMes = $mes + 1;
            $proximoAno = $ano;
            
            if ($proximoMes > 12) {
                $proximoMes = 1;
                $proximoAno = $ano + 1;
            }

            // Excluir holerites do próximo mês que foram criados automaticamente
            $holeritesProximoMes = Holerite::where('tenant_id', auth()->user()->tenant_id)
                ->where('mes', $proximoMes)
                ->where('ano', $proximoAno)
                ->where('fechado', false)
                ->where('total_vales', 0)
                ->where('total_faltas', 0)
                ->whereNull('data_fechamento')
                ->get();

            $holeritesRemovidos = 0;
            foreach ($holeritesProximoMes as $holerite) {
                $holerite->delete();
                $holeritesRemovidos++;
            }

            // Obter nomes dos meses antes de registrar no histórico
            $mesNome = $this->getMesNome($mes);
            $proximoMesNome = $this->getMesNome($proximoMes);

            // Registrar reabertura no histórico
            HistoricoFechamentoMes::registrarReabertura(
                $mes,
                $ano,
                $holeritesFechados->count(),
                "Mês reaberto manualmente. Próximo mês ($proximoMesNome/$proximoAno) foi removido automaticamente."
            );

            DB::commit();
            
            return $this->success([
                'mes' => $mes,
                'ano' => $ano,
                'mes_nome' => $mesNome,
                'holerites_reabertos' => $holeritesFechados->count(),
                'proximo_mes_removido' => $proximoMesNome . '/' . $proximoAno,
                'holerites_removidos' => $holeritesRemovidos
            ], "Mês reaberto com sucesso! {$holeritesFechados->count()} holerites reabertos. Próximo mês ($proximoMesNome/$proximoAno) foi removido automaticamente.");

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Erro ao reabrir mês: ' . $e->getMessage());
        }
    }

    /**
     * Fechar mês e gerar holerites para todos os funcionários
     */
    public function fecharMes(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dia' => 'nullable|integer|min:1|max:31',
            'mes' => 'required|integer|min:1|max:12',
            'ano' => 'required|integer|min:2020|max:2030',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            DB::beginTransaction();

            $dia = $request->dia ?? now()->day; // Se não informado, usa o dia atual
            $mes = $request->mes;
            $ano = $request->ano;
            $observacoes = $request->observacoes;
            
            // Construir a data de fechamento: às 23:59:59 do dia selecionado
            $dataFechamento = Carbon::create($ano, $mes, $dia)->endOfDay();

            // Verificar se o mês já foi fechado
            $holeriteFechado = Holerite::where('tenant_id', auth()->user()->tenant_id)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->where('fechado', true)
                ->first();

            if ($holeriteFechado) {
                return $this->error('O mês de ' . $holeriteFechado->mes_nome . ' de ' . $ano . ' já foi fechado.');
            }

            // Verificar se o mês anterior foi fechado (se não for Janeiro)
            if ($mes > 1) {
                $mesAnterior = $mes - 1;
                $anoAnterior = $ano;
            } else {
                $mesAnterior = 12;
                $anoAnterior = $ano - 1;
            }

            $mesAnteriorFechado = Holerite::where('tenant_id', auth()->user()->tenant_id)
                ->where('mes', $mesAnterior)
                ->where('ano', $anoAnterior)
                ->first();

            if (!$mesAnteriorFechado) {
                $mesAnteriorNome = $this->getMesNome($mesAnterior);
                return $this->error("O mês anterior ($mesAnteriorNome/$anoAnterior) precisa ser fechado primeiro antes de fechar este mês.");
            }

            // Buscar todos os funcionários ativos
            $funcionarios = User::where('status', true)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->get();

            $holeritesGerados = [];

            foreach ($funcionarios as $funcionario) {
                // Buscar o funcionário na tabela funcionarios pelo user_id
                $funcionarioModel = \App\Models\Funcionario::where('user_id', $funcionario->id)
                    ->where('tenant_id', auth()->user()->tenant_id)
                    ->first();
                
                // Se não encontrar funcionário, pular este usuário
                if (!$funcionarioModel) {
                    continue;
                }
                
                $funcionarioId = $funcionarioModel->id; // ID da tabela funcionarios
                
                // Filtrar vales e faltas apenas do mês/ano que está sendo fechado
                $valesTodos = is_array($funcionario->vales) ? $funcionario->vales : [];
                $faltasTodas = is_array($funcionario->faltas) ? $funcionario->faltas : [];
                
                $vales = [];
                $faltas = [];
                
                foreach ($valesTodos as $vale) {
                    if (isset($vale['data'])) {
                        $dataVale = Carbon::parse($vale['data']);
                        if ($dataVale->year == $ano && $dataVale->month == $mes) {
                            $vales[] = $vale;
                        }
                    }
                }
                
                foreach ($faltasTodas as $falta) {
                    if (isset($falta['data'])) {
                        $dataFalta = Carbon::parse($falta['data']);
                        if ($dataFalta->year == $ano && $dataFalta->month == $mes) {
                            $faltas[] = $falta;
                        }
                    }
                }

                $totalVales = 0;
                foreach ($vales as $vale) {
                    if (isset($vale['valor']) && is_numeric($vale['valor'])) {
                        $totalVales += floatval($vale['valor']);
                    }
                }

                // Buscar salário base do mês ANTES de calcular descontos (importante para usar o salário correto da época)
                $salarioBaseMes = $this->getSalarioBasePorMes($funcionario->id, $mes, $ano);
                \Log::info("💰 Salário base para {$mes}/{$ano}: {$salarioBaseMes} (salário atual do funcionário: {$funcionario->salario_base})");
                
                $totalFaltas = count($faltas);
                $descontoFaltas = 0;
                foreach ($faltas as $falta) {
                    if (isset($falta['valorDesconto']) && is_numeric($falta['valorDesconto'])) {
                        $descontoFaltas += floatval($falta['valorDesconto']);
                    } else {
                        // Fallback: calcular desconto por dia usando o salário base do mês específico
                        $descontoFaltas += ($salarioBaseMes / 30);
                    }
                }

                // Calcular comissões (se aplicável)
                $comissaoDropshipping = 0;
                $comissaoServicos = 0;
                $totalComissoes = 0;

                if ($funcionario->permite_receber_comissao) {
                    // Aqui você pode implementar a lógica de cálculo de comissões
                    // baseada nas vendas do mês, por exemplo
                    $comissaoDropshipping = 0; // Implementar cálculo
                    $comissaoServicos = 0; // Implementar cálculo
                    $totalComissoes = $comissaoDropshipping + $comissaoServicos;
                }

                // Calcular Consumo Interno - Vendas/OS/Envelopamentos pagos por Crediário
                // IMPORTANTE: Buscar apenas onde o funcionário é o CLIENTE, não o VENDEDOR
                $totalConsumoInterno = 0;
                $consumoInternoItens = []; // Array para armazenar os detalhes de cada item
                
                \Log::info("🔍 Calculando consumo interno para funcionário {$funcionarioId} (user_id: {$funcionario->id}) - Mês: {$mes}/{$ano}");
                
                // Verificar data de abertura do mês (para filtrar do dia de abertura até hoje)
                $dataAberturaMes = null;
                $dataFechamentoMes = null;
                
                $holeriteMesAtual = DB::table('holerites')
                    ->where('funcionario_id', $funcionario->id)
                    ->where('mes', $mes)
                    ->where('ano', $ano)
                    ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                    ->first();
                
                if ($holeriteMesAtual) {
                    $dataFechamentoMes = $holeriteMesAtual->data_fechamento ? Carbon::parse($holeriteMesAtual->data_fechamento)->format('Y-m-d') : null;
                    $dataAberturaMes = $holeriteMesAtual->created_at ? Carbon::parse($holeriteMesAtual->created_at)->format('Y-m-d') : null;
                } else {
                    // Se não existe holerite para este mês, verificar se o mês anterior foi fechado
                    $mesAnterior = $mes == 1 ? 12 : $mes - 1;
                    $anoAnterior = $mes == 1 ? $ano - 1 : $ano;
                    
                    $mesAnteriorFechado = DB::table('holerites')
                        ->where('funcionario_id', $funcionario->id)
                        ->where('mes', $mesAnterior)
                        ->where('ano', $anoAnterior)
                        ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                        ->where('fechado', true)
                        ->first();
                    
                    if ($mesAnteriorFechado) {
                        // Período aberto começa no próprio dia do fechamento (ex.: fechou 24/01 → aberto de 24/01 até hoje)
                        $dataAberturaMes = $mesAnteriorFechado->data_fechamento ? Carbon::parse($mesAnteriorFechado->data_fechamento)->format('Y-m-d') : null;
                    }
                }
                
                // Buscar vendas onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
                // IMPORTANTE: funcionario_id = cliente (ID da tabela funcionarios), vendedor_id = vendedor (ID da tabela users)
                // Precisamos buscar apenas onde funcionario_id corresponde ao funcionário
                // E garantir que vendedor_id NÃO corresponde (para não pegar vendas onde ele é vendedor)
                $userFuncionarioId = $funcionario->id; // ID do user (para comparar com vendedor_id)
                
                // Debug: verificar todas as vendas do funcionário no mês (sem filtro de vendedor)
                $todasVendasFuncionarioMes = DB::table('vendas')
                    ->where('funcionario_id', $funcionarioId)
                    ->where(function($query) use ($ano, $mes) {
                        $query->where(function($q) use ($ano, $mes) {
                            $q->whereNotNull('data_finalizacao')
                              ->whereYear('data_finalizacao', $ano)
                              ->whereMonth('data_finalizacao', $mes);
                        })->orWhere(function($q) use ($ano, $mes) {
                            $q->whereNull('data_finalizacao')
                              ->whereYear('data_emissao', $ano)
                              ->whereMonth('data_emissao', $mes);
                        });
                    })
                    ->get();
                
                \Log::info("📊 Total de vendas encontradas onde funcionário é CLIENTE (funcionario_id={$funcionarioId}): " . $todasVendasFuncionarioMes->count());
                foreach ($todasVendasFuncionarioMes as $v) {
                    \Log::info("📊 Venda ID: {$v->id}, Status: {$v->status}, Vendedor ID: {$v->vendedor_id}, Funcionário ID: {$v->funcionario_id}, Valor Total: {$v->valor_total}");
                }
                
                $vendasConsumoInterno = DB::table('vendas')
                    ->where('funcionario_id', $funcionarioId) // Funcionário como CLIENTE (funcionario_id da tabela funcionarios)
                    ->where(function($q) use ($userFuncionarioId) {
                        // Excluir vendas onde o funcionário é o VENDEDOR
                        // vendedor_id referencia users.id, então comparamos com user_id do funcionário
                        $q->whereNull('vendedor_id')
                          ->orWhere('vendedor_id', '!=', $userFuncionarioId);
                    })
                    ->whereIn('status', ['finalizada', 'concluida'])
                    ->where(function($query) use ($ano, $mes, $dataAberturaMes, $dataFechamentoMes) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até hoje
                        if ($dataAberturaMes) {
                            $dataFim = $dataFechamentoMes ?: now();
                            $query->where(function($q) use ($dataAberturaMes, $dataFim) {
                                // Usar data_finalizacao se existir, senão usar data_emissao
                                $q->where(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNotNull('data_finalizacao')
                                         ->where('data_finalizacao', '>=', $dataAberturaMes)
                                         ->where('data_finalizacao', '<=', $dataFim);
                                })->orWhere(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNull('data_finalizacao')
                                         ->where('data_emissao', '>=', $dataAberturaMes)
                                         ->where('data_emissao', '<=', $dataFim);
                                });
                            });
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->where(function($q) use ($ano, $mes) {
                                $q->whereNotNull('data_finalizacao')
                                  ->whereYear('data_finalizacao', $ano)
                                  ->whereMonth('data_finalizacao', $mes);
                            })->orWhere(function($q) use ($ano, $mes) {
                                $q->whereNull('data_finalizacao')
                                  ->whereYear('data_emissao', $ano)
                                  ->whereMonth('data_emissao', $mes);
                            });
                        }
                    })
                    ->get();
                
                \Log::info("✅ Vendas após filtrar vendedor (vendedor_id != {$userFuncionarioId}): " . $vendasConsumoInterno->count());
                
                foreach ($vendasConsumoInterno as $venda) {
                    \Log::info("🔍 Processando venda {$venda->id} para consumo interno", [
                        'venda_id' => $venda->id,
                        'status' => $venda->status,
                        'tem_dados_pagamento' => !empty($venda->dados_pagamento),
                        'dados_pagamento' => $venda->dados_pagamento
                    ]);
                    
                    if ($venda->dados_pagamento) {
                        $pagamentos = json_decode($venda->dados_pagamento, true);
                        \Log::info("🔍 Pagamentos decodificados da venda {$venda->id}: " . json_encode($pagamentos));
                        
                        if (is_array($pagamentos)) {
                            $valorCrediarioVenda = 0; // Somar todos os pagamentos em Crediário desta venda
                            foreach ($pagamentos as $index => $pagamento) {
                                \Log::info("🔍 Pagamento {$index} da venda {$venda->id}: " . json_encode($pagamento));
                                
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    // Usar apenas o valor do pagamento em Crediário, não o valor total
                                    $valorCrediario = 0;
                                    if (isset($pagamento['valorFinal'])) {
                                        $valorCrediario = floatval($pagamento['valorFinal']);
                                    } elseif (isset($pagamento['valor_final'])) {
                                        $valorCrediario = floatval($pagamento['valor_final']);
                                    } elseif (isset($pagamento['valor'])) {
                                        $valorCrediario = floatval($pagamento['valor']);
                                    }
                                    
                                    \Log::info("💰 Pagamento Crediário encontrado na venda {$venda->id}: Valor = {$valorCrediario}");
                                    
                                    // Validar que o valor não seja absurdo (maior que o valor total da venda)
                                    $valorTotalVenda = floatval($venda->valor_total ?? 0);
                                    if ($valorCrediario > 0 && $valorCrediario <= ($valorTotalVenda * 1.1)) { // Permitir até 10% de diferença para taxas
                                        $valorCrediarioVenda += $valorCrediario;
                                        \Log::info("✅ Valor Crediário válido adicionado: {$valorCrediario}");
                                    } else {
                                        \Log::warning("⚠️ Valor Crediário rejeitado por ser absurdo: {$valorCrediario} (Valor Total Venda: {$valorTotalVenda})");
                                    }
                                } else {
                                    \Log::info("ℹ️ Pagamento {$index} não é Crediário: " . ($pagamento['metodo'] ?? 'sem método'));
                                }
                            }
                            // Adicionar apenas uma vez por venda, com o total de todos os pagamentos em Crediário
                            if ($valorCrediarioVenda > 0) {
                                \Log::info("💰 Venda {$venda->id}: Valor Crediário Total = {$valorCrediarioVenda}, Valor Total Venda = " . ($venda->valor_total ?? 0));
                                $totalConsumoInterno += $valorCrediarioVenda;
                                $dataVenda = $venda->data_finalizacao ?: $venda->data_emissao;
                                $consumoInternoItens[] = [
                                    'id' => 'venda-' . $venda->id,
                                    'tipo' => 'PDV',
                                    'valor' => $valorCrediarioVenda,
                                    'descricao' => 'Consumo Interno - Venda ' . $venda->id,
                                    'data' => $dataVenda
                                ];
                            } else {
                                \Log::info("ℹ️ Venda {$venda->id} não tem pagamento em Crediário ou valor é zero");
                            }
                        } else {
                            \Log::warning("⚠️ Venda {$venda->id}: dados_pagamento não é um array válido");
                        }
                    } else {
                        \Log::info("ℹ️ Venda {$venda->id} não tem dados_pagamento");
                    }
                }
                
                // Buscar OS onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
                // IMPORTANTE: 
                // - Quando cliente_id é NULL, o funcionário é o cliente e funcionario_id está no JSON cliente_info
                // - Quando cliente_id não é NULL, funcionario_id na tabela pode ser o vendedor/criador OU o cliente
                // - cliente_info JSON contém informações do cliente (que pode ser funcionário)
                // - Precisamos buscar por cliente_info->funcionario_id quando cliente_id é NULL
                // - OU buscar por funcionario_id na tabela quando cliente_id não é NULL (mas excluindo vendedor)
                $osConsumoInterno = DB::table('ordens_servico')
                    ->where(function($query) use ($funcionarioId, $userFuncionarioId) {
                        // Opção 1: cliente_id é NULL e funcionario_id está no JSON cliente_info (funcionário como cliente)
                        $query->where(function($q) use ($funcionarioId, $userFuncionarioId) {
                            $q->whereNull('cliente_id')
                              ->whereNotNull('cliente_info')
                              ->where(function($subQ) use ($funcionarioId) {
                                  // Tentar diferentes formas de extrair o funcionario_id do JSON
                                  $subQ->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                                       ->orWhereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = CAST(? AS CHAR)", [$funcionarioId])
                                       ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                              })
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($userFuncionarioId) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $userFuncionarioId);
                              });
                        })
                        // Opção 2: cliente_id não é NULL e funcionario_id na tabela corresponde ao funcionário como cliente
                        ->orWhere(function($q) use ($funcionarioId, $userFuncionarioId) {
                            $q->whereNotNull('cliente_id')
                              ->where('funcionario_id', $funcionarioId)
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($userFuncionarioId) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $userFuncionarioId);
                              });
                        })
                        // Opção 3: cliente_id não é NULL mas funcionario_id está no JSON cliente_info
                        ->orWhere(function($q) use ($funcionarioId, $userFuncionarioId) {
                            $q->whereNotNull('cliente_id')
                              ->whereNotNull('cliente_info')
                              ->where(function($subQ) use ($funcionarioId) {
                                  // Tentar diferentes formas de extrair o funcionario_id do JSON
                                  $subQ->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                                       ->orWhereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = CAST(? AS CHAR)", [$funcionarioId])
                                       ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                              })
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($userFuncionarioId) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $userFuncionarioId);
                              });
                        });
                    })
                    ->where(function($query) use ($ano, $mes, $dataAberturaMes, $dataFechamentoMes) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até hoje
                        if ($dataAberturaMes) {
                            $dataFim = $dataFechamentoMes ?: now();
                            $query->where(function($q) use ($dataAberturaMes, $dataFim) {
                                // Usar data_finalizacao_os se existir, senão usar data_criacao
                                $q->where(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNotNull('data_finalizacao_os')
                                         ->where('data_finalizacao_os', '>=', $dataAberturaMes)
                                         ->where('data_finalizacao_os', '<=', $dataFim);
                                })->orWhere(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNull('data_finalizacao_os')
                                         ->where('data_criacao', '>=', $dataAberturaMes)
                                         ->where('data_criacao', '<=', $dataFim);
                                });
                            });
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->where(function($q) use ($ano, $mes) {
                                $q->whereIn('status_os', ['Finalizada', 'Entregue'])
                                  ->whereYear('data_finalizacao_os', $ano)
                                  ->whereMonth('data_finalizacao_os', $mes);
                            })->orWhere(function($q) use ($ano, $mes) {
                                $q->whereYear('data_criacao', $ano)
                                  ->whereMonth('data_criacao', $mes);
                            });
                        }
                    })
                    ->get();
                
                \Log::info("🔍 OS encontradas onde funcionário é CLIENTE: " . $osConsumoInterno->count());
                foreach ($osConsumoInterno as $os) {
                    $clienteInfoDecoded = $os->cliente_info ? json_decode($os->cliente_info, true) : null;
                    $funcionarioIdNoJson = $clienteInfoDecoded['funcionario_id'] ?? null;
                    \Log::info("📊 OS ID: {$os->id}, Cliente ID: " . ($os->cliente_id ?? 'NULL') . ", Funcionario ID (tabela): {$os->funcionario_id}, Funcionario ID (JSON): {$funcionarioIdNoJson}, Vendedor ID: {$os->vendedor_id}, Status: {$os->status_os}");
                }
                
                foreach ($osConsumoInterno as $os) {
                    if ($os->pagamentos) {
                        $pagamentos = json_decode($os->pagamentos, true);
                        if (is_array($pagamentos)) {
                            $valorCrediarioOS = 0; // Somar todos os pagamentos em Crediário desta OS
                            foreach ($pagamentos as $pagamento) {
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    // Usar apenas o valor do pagamento em Crediário, não o valor total
                                    $valorCrediario = 0;
                                    if (isset($pagamento['valorFinal'])) {
                                        $valorCrediario = floatval($pagamento['valorFinal']);
                                    } elseif (isset($pagamento['valor_final'])) {
                                        $valorCrediario = floatval($pagamento['valor_final']);
                                    } elseif (isset($pagamento['valor'])) {
                                        $valorCrediario = floatval($pagamento['valor']);
                                    }
                                    // Validar que o valor não seja absurdo (maior que o valor total da OS)
                                    $valorTotalOS = floatval($os->valor_total_os ?? 0);
                                    if ($valorCrediario > 0 && $valorCrediario <= ($valorTotalOS * 1.1)) { // Permitir até 10% de diferença para taxas
                                        $valorCrediarioOS += $valorCrediario;
                                    }
                                }
                            }
                            // Adicionar apenas uma vez por OS, com o total de todos os pagamentos em Crediário
                            if ($valorCrediarioOS > 0) {
                                $totalConsumoInterno += $valorCrediarioOS;
                                $dataOS = $os->data_finalizacao_os ?: $os->data_criacao;
                                $consumoInternoItens[] = [
                                    'id' => 'os-' . $os->id,
                                    'tipo' => 'OS',
                                    'valor' => $valorCrediarioOS,
                                    'descricao' => 'Consumo Interno - OS ' . $os->id,
                                    'data' => $dataOS
                                ];
                            }
                        }
                    }
                }
                
                // Buscar envelopamentos onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
                // IMPORTANTE: funcionario_id no envelopamento guarda o users.id, não funcionarios.id
                // Então precisamos usar $funcionario->id (users.id) para a busca
                $envConsumoInterno = DB::table('envelopamentos')
                    ->where('funcionario_id', $funcionario->id) // users.id - Funcionário como CLIENTE
                    ->where(function($q) use ($userFuncionarioId) {
                        // Excluir envelopamentos onde o funcionário é o VENDEDOR
                        $q->whereNull('vendedor_id')
                          ->orWhere('vendedor_id', '!=', $userFuncionarioId);
                    })
                    ->whereIn('status', ['finalizado', 'Finalizado'])
                    ->where(function($query) use ($ano, $mes, $dataAberturaMes, $dataFechamentoMes) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até fim do dia atual
                        if ($dataAberturaMes) {
                            // Usar fim do dia atual para evitar problemas de timezone
                            $dataFim = $dataFechamentoMes ?: Carbon::now()->endOfDay();
                            // Envelopamentos não têm data_finalizacao, apenas data_criacao
                            // Quando o status é "Finalizado", a data_criacao é atualizada
                            $query->where('data_criacao', '>=', $dataAberturaMes)
                                  ->where('data_criacao', '<=', $dataFim);
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->where(function($q) use ($ano, $mes) {
                                // Se tem data_finalizacao, usar ela
                                $q->whereNotNull('data_finalizacao')
                                  ->whereYear('data_finalizacao', $ano)
                                  ->whereMonth('data_finalizacao', $mes);
                            })->orWhere(function($q) use ($ano, $mes) {
                                // Se não tem data_finalizacao, usar data_criacao
                                $q->whereNull('data_finalizacao')
                                  ->whereYear('data_criacao', $ano)
                                  ->whereMonth('data_criacao', $mes);
                            });
                        }
                    })
                    ->get();
                
                foreach ($envConsumoInterno as $env) {
                    if ($env->pagamentos) {
                        $pagamentos = json_decode($env->pagamentos, true);
                        if (is_array($pagamentos)) {
                            $valorCrediarioEnv = 0; // Somar todos os pagamentos em Crediário deste envelopamento
                            foreach ($pagamentos as $pagamento) {
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    // Usar apenas o valor do pagamento em Crediário, não o valor total
                                    $valorCrediario = 0;
                                    if (isset($pagamento['valorFinal'])) {
                                        $valorCrediario = floatval($pagamento['valorFinal']);
                                    } elseif (isset($pagamento['valor_final'])) {
                                        $valorCrediario = floatval($pagamento['valor_final']);
                                    } elseif (isset($pagamento['valor'])) {
                                        $valorCrediario = floatval($pagamento['valor']);
                                    }
                                    // Validar que o valor não seja absurdo (maior que o valor total do envelopamento)
                                    $valorTotalEnv = floatval($env->orcamento_total ?? 0);
                                    if ($valorCrediario > 0 && $valorCrediario <= ($valorTotalEnv * 1.1)) { // Permitir até 10% de diferença para taxas
                                        $valorCrediarioEnv += $valorCrediario;
                                    }
                                }
                            }
                            // Adicionar apenas uma vez por envelopamento, com o total de todos os pagamentos em Crediário
                            if ($valorCrediarioEnv > 0) {
                                $totalConsumoInterno += $valorCrediarioEnv;
                                $dataEnv = isset($env->data_finalizacao) ? $env->data_finalizacao : $env->data_criacao;
                                $consumoInternoItens[] = [
                                    'id' => 'env-' . $env->id,
                                    'tipo' => 'Envelopamento',
                                    'valor' => $valorCrediarioEnv,
                                    'descricao' => 'Consumo Interno - Envelopamento ' . ($env->codigo_orcamento ?? $env->id),
                                    'data' => $dataEnv
                                ];
                            }
                        }
                    }
                }

                \Log::info("📊 Resumo consumo interno funcionário {$funcionarioId}: Total = {$totalConsumoInterno}, Itens = " . count($consumoInternoItens));
                
                // Calcular salários usando o salário base do mês específico (já calculado anteriormente)
                $salarioBruto = $salarioBaseMes + $totalComissoes;
                $totalDescontos = $totalVales + $descontoFaltas + $totalConsumoInterno;
                $salarioLiquido = $salarioBruto - $totalDescontos;

                // Verificar se holerite já existe para este funcionário/mês/ano
                $holeriteExistente = Holerite::where('tenant_id', auth()->user()->tenant_id)
                    ->where('funcionario_id', $funcionario->id)
                    ->where('mes', $mes)
                    ->where('ano', $ano)
                    ->first();

                try {
                    if ($holeriteExistente) {
                        // Atualizar holerite existente
                        $holeriteExistente->update([
                            'salario_base' => $salarioBaseMes,
                            'vales' => $vales,
                            'faltas' => $faltas,
                            'total_vales' => $totalVales,
                            'total_faltas' => $totalFaltas,
                            'desconto_faltas' => $descontoFaltas,
                            'salario_bruto' => $salarioBruto,
                            'total_descontos' => $totalDescontos,
                            'salario_liquido' => $salarioLiquido,
                            'comissao_dropshipping' => $comissaoDropshipping,
                            'comissao_servicos' => $comissaoServicos,
                            'total_comissoes' => $totalComissoes,
                            'total_consumo_interno' => $totalConsumoInterno,
                            'consumo_interno_itens' => $consumoInternoItens,
                            'fechado' => true,
                            'data_fechamento' => $dataFechamento, // Fecha às 23:59:59 do dia selecionado
                            'usuario_fechamento_id' => auth()->id(),
                            'observacoes' => $observacoes,
                        ]);
                        $holerite = $holeriteExistente;
                    } else {
                        // Criar novo holerite
                        $holerite = Holerite::create([
                            'tenant_id' => auth()->user()->tenant_id,
                            'funcionario_id' => $funcionario->id,
                            'mes' => $mes,
                            'ano' => $ano,
                            'salario_base' => $salarioBaseMes,
                            'vales' => $vales,
                            'faltas' => $faltas,
                            'total_vales' => $totalVales,
                            'total_faltas' => $totalFaltas,
                            'desconto_faltas' => $descontoFaltas,
                            'salario_bruto' => $salarioBruto,
                            'total_descontos' => $totalDescontos,
                            'salario_liquido' => $salarioLiquido,
                            'comissao_dropshipping' => $comissaoDropshipping,
                            'comissao_servicos' => $comissaoServicos,
                            'total_comissoes' => $totalComissoes,
                            'total_consumo_interno' => $totalConsumoInterno,
                            'consumo_interno_itens' => $consumoInternoItens,
                            'fechado' => true,
                            'data_fechamento' => $dataFechamento, // Fecha às 23:59:59 do dia selecionado
                            'usuario_fechamento_id' => auth()->id(),
                            'observacoes' => $observacoes,
                        ]);
                    }
                } catch (\Exception $eHolerite) {
                    \Log::error("❌ Erro ao salvar holerite para funcionário {$funcionario->id}", [
                        'funcionario_id' => $funcionario->id,
                        'mes' => $mes,
                        'ano' => $ano,
                        'erro' => $eHolerite->getMessage(),
                        'trace' => $eHolerite->getTraceAsString(),
                        'consumo_interno_itens' => $consumoInternoItens
                    ]);
                    throw $eHolerite;
                }

                // Remover apenas os vales e faltas do mês fechado, mantendo os de outros meses
                $valesRestantes = [];
                $faltasRestantes = [];
                
                foreach ($valesTodos as $vale) {
                    if (isset($vale['data'])) {
                        $dataVale = Carbon::parse($vale['data']);
                        // Manter apenas vales que NÃO são do mês fechado
                        if (!($dataVale->year == $ano && $dataVale->month == $mes)) {
                            $valesRestantes[] = $vale;
                        }
                    } else {
                        // Se não tem data, manter (caso de dados inconsistentes)
                        $valesRestantes[] = $vale;
                    }
                }
                
                foreach ($faltasTodas as $falta) {
                    if (isset($falta['data'])) {
                        $dataFalta = Carbon::parse($falta['data']);
                        // Manter apenas faltas que NÃO são do mês fechado
                        if (!($dataFalta->year == $ano && $dataFalta->month == $mes)) {
                            $faltasRestantes[] = $falta;
                        }
                    } else {
                        // Se não tem data, manter (caso de dados inconsistentes)
                        $faltasRestantes[] = $falta;
                    }
                }
                
                $funcionario->vales = array_values($valesRestantes);
                $funcionario->faltas = array_values($faltasRestantes);
                $funcionario->save();

                $holeritesGerados[] = $holerite;
            }

            // Abrir automaticamente o próximo mês
            $proximoMes = $mes + 1;
            $proximoAno = $ano;
            
            if ($proximoMes > 12) {
                $proximoMes = 1;
                $proximoAno = $ano + 1;
            }

            // Criar registro de abertura do próximo mês para cada funcionário
            $proximoMesAberto = [];
            foreach ($funcionarios as $funcionario) {
                // Verificar se o próximo mês já não foi aberto
                $proximoMesExistente = Holerite::where('tenant_id', auth()->user()->tenant_id)
                    ->where('funcionario_id', $funcionario->id)
                    ->where('mes', $proximoMes)
                    ->where('ano', $proximoAno)
                    ->first();

                if (!$proximoMesExistente) {
                    // Buscar salário base do próximo mês usando histórico
                    $salarioBaseProximoMes = $this->getSalarioBasePorMes($funcionario->id, $proximoMes, $proximoAno);
                    
                    $holeriteProximoMes = Holerite::create([
                        'tenant_id' => auth()->user()->tenant_id,
                        'funcionario_id' => $funcionario->id,
                        'mes' => $proximoMes,
                        'ano' => $proximoAno,
                        'salario_base' => $salarioBaseProximoMes,
                        'vales' => [],
                        'faltas' => [],
                        'total_vales' => 0,
                        'total_faltas' => 0,
                        'desconto_faltas' => 0,
                        'salario_bruto' => $salarioBaseProximoMes,
                        'total_descontos' => 0,
                        'salario_liquido' => $salarioBaseProximoMes,
                        'comissao_dropshipping' => 0,
                        'comissao_servicos' => 0,
                        'total_comissoes' => 0,
                        'total_consumo_interno' => 0,
                        'consumo_interno_itens' => [],
                        'fechado' => false, // Próximo mês fica aberto
                        'data_fechamento' => null,
                        'usuario_fechamento_id' => null,
                        'observacoes' => null,
                    ]);

                    $proximoMesAberto[] = $holeriteProximoMes;
                }
            }

            // Registrar fechamento no histórico
            HistoricoFechamentoMes::registrarFechamento(
                $mes,
                $ano,
                count($holeritesGerados),
                $observacoes,
                false // manual
            );

            // Registrar abertura automática do próximo mês no histórico
            if (count($proximoMesAberto) > 0) {
                HistoricoFechamentoMes::registrarAbertura(
                    $proximoMes,
                    $proximoAno,
                    count($proximoMesAberto),
                    'Abertura automática após fechamento do mês anterior',
                    true // automático
                );
            }

            DB::commit();

            $proximoMesNome = $this->getMesNome($proximoMes);
            return $this->success([
                'holerites_gerados' => count($holeritesGerados),
                'mes' => $mes,
                'ano' => $ano,
                'periodo' => $holeritesGerados[0]->periodo ?? null,
                'proximo_mes_aberto' => [
                    'mes' => $proximoMes,
                    'ano' => $proximoAno,
                    'mes_nome' => $proximoMesNome,
                    'holerites_abertos' => count($proximoMesAberto)
                ]
            ], "Mês fechado com sucesso! " . count($holeritesGerados) . " holerites gerados. Próximo mês ($proximoMesNome/$proximoAno) foi aberto automaticamente.");

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('❌ Erro ao fechar mês', [
                'mes' => $mes ?? null,
                'ano' => $ano ?? null,
                'erro' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'arquivo' => $e->getFile(),
                'linha' => $e->getLine()
            ]);
            return $this->error('Erro ao fechar mês: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Buscar holerites de um funcionário
     */
    public function holerites(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'mes' => 'nullable|integer|min:1|max:12',
            'ano' => 'nullable|integer|min:2020|max:2030',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $query = Holerite::where('funcionario_id', $id)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('ano', 'desc')
                ->orderBy('mes', 'desc');

            if ($request->has('mes') && $request->mes) {
                $query->where('mes', $request->mes);
            }

            if ($request->has('ano') && $request->ano) {
                $query->where('ano', $request->ano);
            }

            $holerites = $query->get();

            return $this->success($holerites);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar holerites: ' . $e->getMessage());
        }
    }

    /**
     * Buscar holerite específico
     */
    public function holerite($id, $holeriteId)
    {
        try {
            $holerite = Holerite::where('id', $holeriteId)
                ->where('funcionario_id', $funcionarioId)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->with('funcionario')
                ->first();

            if (!$holerite) {
                return $this->error('Holerite não encontrado');
            }

            return $this->success($holerite);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar holerite: ' . $e->getMessage());
        }
    }

    /**
     * Verificar se funcionário tem credenciais de acesso
     */
    public function hasCredentials($id)
    {
        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            
            return $this->success([
                'has_credentials' => true, // Agora sempre tem credenciais
                'user_id' => $funcionario->id,
                'email' => $funcionario->email,
                'login' => $funcionario->login,
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao verificar credenciais: ' . $e->getMessage());
        }
    }

    /**
     * Resetar senha do funcionário
     */
    public function resetPassword($id)
    {
        try {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            
            // Gerar nova senha aleatória
            $newPassword = Str::random(8);
            
            // Atualizar senha do usuário
            $funcionario->update(['password' => Hash::make($newPassword)]);
            
            return $this->success([
                'new_password' => $newPassword,
                'message' => 'Senha resetada com sucesso'
            ], 'Senha resetada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao resetar senha: ' . $e->getMessage());
        }
    }

    /**
     * Adicionar registro no histórico de salários
     */
    public function addSalarioHistorico(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'salario_anterior' => 'required|numeric|min:0',
                'novo_salario' => 'required|numeric|min:0',
                'diferenca' => 'required|numeric',
                'motivo' => 'nullable|string|max:500',
                'data_alteracao' => 'required'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
            
            // Normalizar data em formato YYYY-MM-DD
            try {
                $dataAlteracao = Carbon::parse($request->data_alteracao)->toDateString();
            } catch (\Exception $e) {
                $dataAlteracao = now()->toDateString();
            }

            // Salvar no histórico
            $historico = DB::table('funcionario_salario_historico')->insert([
                'funcionario_id' => $id,
                'salario_anterior' => $request->salario_anterior,
                'novo_salario' => $request->novo_salario,
                'diferenca' => $request->diferenca,
                'motivo' => $request->motivo,
                'data_alteracao' => $dataAlteracao,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Histórico de salário registrado com sucesso',
                'data' => $historico
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao registrar histórico: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar histórico de salários do funcionário
     */
    public function getSalarioHistorico($id)
    {
        try {
            $historico = DB::table('funcionario_salario_historico')
                ->where('funcionario_id', $id)
                ->orderBy('data_alteracao', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $historico
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar histórico: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar salário por mês específico
     */
    public function getSalarioPorMes(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'mes' => 'required|integer|between:1,12',
                'ano' => 'required|integer|min:2000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mês e ano são obrigatórios',
                    'errors' => $validator->errors()
                ], 422);
            }

            $mes = $request->mes;
            $ano = $request->ano;

            // Buscar o salário vigente no mês/ano especificado
            $salario = DB::table('funcionario_salario_historico')
                ->where('funcionario_id', $id)
                ->where('data_alteracao', '<=', Carbon::createFromDate($ano, $mes, 1)->endOfMonth()->toDateString())
                ->orderBy('data_alteracao', 'desc')
                ->first();

            // Se não encontrou no histórico, buscar o salário atual
            if (!$salario) {
                $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);
                $salario = (object) [
                    'novo_salario' => $funcionario->salario_base ?? 0
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $salario
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar salário: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar relatório mensal
     */
    public function gerarRelatorioMensal(Request $request, $funcionario)
    {
        try {
            // Log para debug
            \Log::info("📋 gerarRelatorioMensal chamado", [
                'funcionario_id' => $funcionario,
                'request_all' => $request->all(),
                'mes' => $request->mes,
                'ano' => $request->ano,
                'query_params' => $request->query()
            ]);
            
            $validator = Validator::make($request->all(), [
                'mes' => 'required|integer|between:1,12',
                'ano' => 'required|integer|min:2000'
            ]);

            if ($validator->fails()) {
                \Log::error("❌ Validação falhou", ['errors' => $validator->errors()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Mês e ano são obrigatórios',
                    'errors' => $validator->errors()
                ], 422);
            }

            $mes = $request->input('mes') ?? $request->mes;
            $ano = $request->input('ano') ?? $request->ano;
            $funcionarioUser = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($funcionario);
            
            // Buscar o funcionário na tabela funcionarios pelo user_id
            $funcionarioModel = \App\Models\Funcionario::where('user_id', $funcionario)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();
            
            // Se não encontrar na tabela funcionarios, usar o user_id diretamente
            // Isso pode acontecer se o funcionário não foi criado na tabela funcionarios
            $funcionarioId = $funcionarioModel ? $funcionarioModel->id : $funcionario;

            // Buscar salário base do mês
            $salarioBase = $this->getSalarioBasePorMes($funcionario, $mes, $ano);

            // Carregar todos os vales/faltas; o filtro por período (abaixo) define o que entra no relatório
            // Assim o período aberto (ex.: Fevereiro = 24/01 até hoje) inclui vales de 30/01
            $valesCollection = collect(is_array($funcionarioUser->vales) ? $funcionarioUser->vales : []);
            $faltasCollection = collect(is_array($funcionarioUser->faltas) ? $funcionarioUser->faltas : []);

            // Verificar se o mês está aberto e obter data de abertura
            $mesAberto = true;
            $dataAberturaMes = null;
            $dataFechamentoMes = null;
            
            $holeriteMesAtual = DB::table('holerites')
                ->where('funcionario_id', $funcionario)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                ->first();
            
            $mesAnterior = $mes == 1 ? 12 : $mes - 1;
            $anoAnterior = $mes == 1 ? $ano - 1 : $ano;
            
            if ($holeriteMesAtual) {
                $mesAberto = !$holeriteMesAtual->fechado;
                $dataFechamentoMes = $holeriteMesAtual->data_fechamento ? Carbon::parse($holeriteMesAtual->data_fechamento)->format('Y-m-d') : null;
                // Mês fechado: período é do dia seguinte ao fechamento do mês anterior até o dia do fechamento (ex.: 25/12 a 24/01)
                $holeriteMesAnterior = DB::table('holerites')
                    ->where('funcionario_id', $funcionario)
                    ->where('mes', $mesAnterior)
                    ->where('ano', $anoAnterior)
                    ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                    ->where('fechado', true)
                    ->first();
                $dataAberturaMes = $holeriteMesAnterior && $holeriteMesAnterior->data_fechamento
                    ? Carbon::parse($holeriteMesAnterior->data_fechamento)->addDay()->format('Y-m-d')
                    : ($holeriteMesAtual->created_at ? Carbon::parse($holeriteMesAtual->created_at)->format('Y-m-d') : null);
            } else {
                $mesAnteriorFechado = DB::table('holerites')
                    ->where('funcionario_id', $funcionario)
                    ->where('mes', $mesAnterior)
                    ->where('ano', $anoAnterior)
                    ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                    ->where('fechado', true)
                    ->first();
                
                if ($mesAnteriorFechado) {
                    $mesAberto = true;
                    // Período aberto começa no próprio dia do fechamento (ex.: fechou 24/01 → aberto de 24/01 até hoje)
                    $dataAberturaMes = $mesAnteriorFechado->data_fechamento ? Carbon::parse($mesAnteriorFechado->data_fechamento)->format('Y-m-d') : null;
                } else {
                    $mesAberto = false;
                }
            }

            // Filtrar vales e faltas pelo período (dia abertura até fechamento ou hoje), não pelo mês inteiro
            // Usar comparação por data (Y-m-d) para evitar efeito de fuso
            if ($dataAberturaMes || $dataFechamentoMes) {
                $dataInicioYmd = $dataAberturaMes ?: Carbon::create($ano, $mes, 1)->format('Y-m-d');
                $dataFimYmd = $dataFechamentoMes ?: Carbon::now()->format('Y-m-d');
                $valesCollection = $valesCollection->filter(function ($vale) use ($dataInicioYmd, $dataFimYmd) {
                    if (!isset($vale['data'])) {
                        return false;
                    }
                    $valeYmd = Carbon::parse($vale['data'])->format('Y-m-d');
                    return $valeYmd >= $dataInicioYmd && $valeYmd <= $dataFimYmd;
                })->values();
                $faltasCollection = $faltasCollection->filter(function ($falta) use ($dataInicioYmd, $dataFimYmd) {
                    if (!isset($falta['data'])) {
                        return false;
                    }
                    $faltaYmd = Carbon::parse($falta['data'])->format('Y-m-d');
                    return $faltaYmd >= $dataInicioYmd && $faltaYmd <= $dataFimYmd;
                })->values();
            }
            
            // Buscar consumo interno: vendas/OS/envelopamentos com pagamento em Crediário
            $consumoInternoCollection = collect([]);
            
            \Log::info("🔍 Buscando consumo interno para funcionário {$funcionarioId} (user_id: {$funcionario}) - Mês: {$mes}/{$ano}");
            if ($dataAberturaMes) {
                \Log::info("📅 Data de abertura do mês: {$dataAberturaMes}");
            }
            \Log::info("🔍 Dados da requisição:", [
                'funcionario_id' => $funcionarioId,
                'user_id' => $funcionario,
                'mes' => $mes,
                'ano' => $ano,
                'tenant_id' => auth()->user() ? auth()->user()->tenant_id : null
            ]);
            
            // Debug: buscar todas as OSs onde funcionario_id está no JSON cliente_info
            $osComFuncionarioNoJson = DB::table('ordens_servico')
                ->whereNotNull('cliente_info')
                ->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') IS NOT NULL")
                ->where(function($q) use ($funcionarioId) {
                    $q->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                      ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                })
                ->whereYear('data_criacao', $ano)
                ->whereMonth('data_criacao', $mes)
                ->get();
            
            \Log::info("🔍 OSs com funcionario_id no JSON cliente_info para funcionário {$funcionarioId} em {$mes}/{$ano}: " . $osComFuncionarioNoJson->count());
            foreach ($osComFuncionarioNoJson as $os) {
                $clienteInfoDecoded = json_decode($os->cliente_info, true);
                $funcionarioIdNoJson = $clienteInfoDecoded['funcionario_id'] ?? null;
                \Log::info("🔍 OS encontrada no JSON - ID: {$os->id}, Cliente ID: " . ($os->cliente_id ?? 'NULL') . ", Funcionário ID (JSON): {$funcionarioIdNoJson}, Status: {$os->status_os}, Data: {$os->data_criacao}, Pagamentos: " . ($os->pagamentos ? 'SIM' : 'NÃO'));
            }
            
            // Debug: buscar todas as OSs do funcionário hoje (onde ele é o CLIENTE)
            $osHoje = DB::table('ordens_servico')
                ->where('funcionario_id', $funcionarioId)
                ->whereDate('data_criacao', now()->toDateString())
                ->get();
            
            \Log::info("🔍 OSs do funcionário {$funcionarioId} criadas hoje: " . $osHoje->count());
            foreach ($osHoje as $os) {
                \Log::info("🔍 OS de hoje - ID: {$os->id}, Status: {$os->status_os}, Data: {$os->data_criacao}, Pagamentos: {$os->pagamentos}");
            }
            
            // Debug: buscar todas as OSs do funcionário nos últimos 7 dias (onde ele é o CLIENTE)
            $osUltimosDias = DB::table('ordens_servico')
                ->where('funcionario_id', $funcionarioId)
                ->where('data_criacao', '>=', now()->subDays(7))
                ->get();
            
            \Log::info("🔍 OSs do funcionário {$funcionarioId} nos últimos 7 dias: " . $osUltimosDias->count());
            foreach ($osUltimosDias as $os) {
                \Log::info("🔍 OS últimos dias - ID: {$os->id}, Status: {$os->status_os}, Data: {$os->data_criacao}, Funcionário: {$os->funcionario_id}, Pagamentos: {$os->pagamentos}");
            }
            
            // Debug: verificar se há vendas onde o funcionário é o CLIENTE
            $vendasOutubro = DB::table('vendas')
                ->where('funcionario_id', $funcionarioId)
                ->where(function($query) use ($ano, $mes) {
                    $query->where(function($q) use ($ano, $mes) {
                        $q->whereNotNull('data_finalizacao')
                          ->whereYear('data_finalizacao', $ano)
                          ->whereMonth('data_finalizacao', $mes);
                    })->orWhere(function($q) use ($ano, $mes) {
                        $q->whereNull('data_finalizacao')
                          ->whereYear('data_emissao', $ano)
                          ->whereMonth('data_emissao', $mes);
                    });
                })
                ->get();
            
            \Log::info("🔍 Vendas onde funcionário é CLIENTE (funcionario_id {$funcionarioId}) em {$mes}/{$ano}: " . $vendasOutubro->count());
            
            // Debug: verificar todas as vendas de outubro 2025 (independente do funcionario_id)
            $todasVendasOutubro = DB::table('vendas')
                ->where(function($query) use ($ano, $mes) {
                    $query->where(function($q) use ($ano, $mes) {
                        $q->whereNotNull('data_finalizacao')
                          ->whereYear('data_finalizacao', $ano)
                          ->whereMonth('data_finalizacao', $mes);
                    })->orWhere(function($q) use ($ano, $mes) {
                        $q->whereNull('data_finalizacao')
                          ->whereYear('data_emissao', $ano)
                          ->whereMonth('data_emissao', $mes);
                    });
                })
                ->get();
            
            \Log::info("🔍 Todas as vendas em {$mes}/{$ano}: " . $todasVendasOutubro->count());
            foreach ($todasVendasOutubro as $venda) {
                \Log::info("Venda ID: {$venda->id}, Funcionario ID: {$venda->funcionario_id}, Status: {$venda->status}, Data Emissão: {$venda->data_emissao}, Data Finalização: {$venda->data_finalizacao}, Valor: {$venda->valor_total}");
            }
            
            // Verificar se o mês está aberto para este funcionário
            $mesAberto = true;
            $dataAberturaMes = null;
            $dataFechamentoMes = null;
            
            $holeriteMesAtual = DB::table('holerites')
                ->where('funcionario_id', $funcionario)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                ->first();
            
            if ($holeriteMesAtual) {
                $mesAberto = !$holeriteMesAtual->fechado;
                $dataFechamentoMes = $holeriteMesAtual->data_fechamento ? Carbon::parse($holeriteMesAtual->data_fechamento)->format('Y-m-d') : null;
                $dataAberturaMes = $holeriteMesAtual->created_at ? Carbon::parse($holeriteMesAtual->created_at)->format('Y-m-d') : null;
            } else {
                // Se não existe holerite para este mês, verificar se o mês anterior foi fechado
                $mesAnterior = $mes == 1 ? 12 : $mes - 1;
                $anoAnterior = $mes == 1 ? $ano - 1 : $ano;
                
                $mesAnteriorFechado = DB::table('holerites')
                    ->where('funcionario_id', $funcionario)
                    ->where('mes', $mesAnterior)
                    ->where('ano', $anoAnterior)
                    ->where('tenant_id', auth()->user() ? auth()->user()->tenant_id : null)
                    ->where('fechado', true)
                    ->first();
                
                if ($mesAnteriorFechado) {
                    $mesAberto = true;
                    // Período aberto começa no próprio dia do fechamento (ex.: fechou 24/01 → aberto de 24/01 até hoje)
                    $dataAberturaMes = $mesAnteriorFechado->data_fechamento ? Carbon::parse($mesAnteriorFechado->data_fechamento)->format('Y-m-d') : null;
                } else {
                    $mesAberto = false;
                }
            }
            
            // Se o mês está fechado, não retornar consumos
            if (!$mesAberto) {
                \Log::info("🔒 Mês {$mes}/{$ano} está fechado - não retornando consumos");
            } else {
                \Log::info("✅ Mês {$mes}/{$ano} está aberto - retornando consumos");
                if ($dataAberturaMes) {
                    \Log::info("📅 Data de abertura do mês: {$dataAberturaMes}");
                }
            }
            
            // Buscar vendas onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
            // IMPORTANTE: funcionario_id = cliente (ID da tabela funcionarios), vendedor_id = vendedor (ID da tabela users)
            // Precisamos buscar apenas onde funcionario_id corresponde ao funcionário
            // E garantir que vendedor_id NÃO corresponde (para não pegar vendas onde ele é vendedor)
            $vendasConsumoInterno = DB::table('vendas')
                ->where('funcionario_id', $funcionarioId) // Funcionário como CLIENTE (funcionario_id da tabela funcionarios)
                ->where(function($q) use ($funcionario) {
                    // Excluir vendas onde o funcionário é o VENDEDOR
                    // vendedor_id referencia users.id, então comparamos com user_id do funcionário ($funcionario)
                    $q->whereNull('vendedor_id')
                      ->orWhere('vendedor_id', '!=', $funcionario);
                })
                ->whereIn('status', ['finalizada', 'concluida'])
                ->where(function($query) use ($ano, $mes, $mesAberto, $dataAberturaMes, $dataFechamentoMes) {
                    if ($mesAberto) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até hoje
                        if ($dataAberturaMes) {
                            $dataFim = $dataFechamentoMes ?: now();
                            $query->where(function($q) use ($dataAberturaMes, $dataFim) {
                                // Usar data_finalizacao se existir, senão usar data_emissao
                                $q->where(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNotNull('data_finalizacao')
                                         ->where('data_finalizacao', '>=', $dataAberturaMes)
                                         ->where('data_finalizacao', '<=', $dataFim);
                                })->orWhere(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNull('data_finalizacao')
                                         ->where('data_emissao', '>=', $dataAberturaMes)
                                         ->where('data_emissao', '<=', $dataFim);
                                });
                            });
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->where(function($q) use ($ano, $mes) {
                                // Se tem data_finalizacao, usar ela
                                $q->whereNotNull('data_finalizacao')
                                  ->whereYear('data_finalizacao', $ano)
                                  ->whereMonth('data_finalizacao', $mes);
                            })->orWhere(function($q) use ($ano, $mes) {
                                // Se não tem data_finalizacao, usar data_emissao
                                $q->whereNull('data_finalizacao')
                                  ->whereYear('data_emissao', $ano)
                                  ->whereMonth('data_emissao', $mes);
                            });
                        }
                    } else {
                        // Se o mês está fechado, não retornar nenhuma venda
                        $query->whereRaw('1 = 0');
                    }
                })
                ->get();
            
            // Debug: verificar todas as vendas do funcionário no mês (independente do status)
            $todasVendasFuncionario = DB::table('vendas')
                ->where('funcionario_id', $funcionarioId)
                ->where(function($query) use ($ano, $mes) {
                    $query->where(function($q) use ($ano, $mes) {
                        $q->whereNotNull('data_finalizacao')
                          ->whereYear('data_finalizacao', $ano)
                          ->whereMonth('data_finalizacao', $mes);
                    })->orWhere(function($q) use ($ano, $mes) {
                        $q->whereNull('data_finalizacao')
                          ->whereYear('data_emissao', $ano)
                          ->whereMonth('data_emissao', $mes);
                    });
                })
                ->get();
            
            \Log::info("🔍 Todas as vendas do funcionário {$funcionarioId} em {$mes}/{$ano}: " . $todasVendasFuncionario->count());
            foreach ($todasVendasFuncionario as $venda) {
                \Log::info("Venda ID: {$venda->id}, Status: {$venda->status}, Data: {$venda->data_finalizacao}, Valor: {$venda->valor_total}");
            }
            
            \Log::info("📊 Vendas encontradas para funcionário {$funcionarioId}: " . $vendasConsumoInterno->count());
            
            // Filtrar apenas as que têm pagamento em Crediário
            $vendasConsumoInterno = $vendasConsumoInterno->filter(function($venda) {
                if (!$venda->dados_pagamento) return false;
                $pagamentos = json_decode($venda->dados_pagamento, true);
                if (!is_array($pagamentos)) return false;
                return collect($pagamentos)->contains('metodo', 'Crediário');
            });
            
            \Log::info("💳 Vendas com Crediário: " . $vendasConsumoInterno->count());
            
            foreach ($vendasConsumoInterno as $venda) {
                // Usar data de finalização se existir, senão usar data de emissão
                $dataVenda = $venda->data_finalizacao ?: $venda->data_emissao;
                
                // Calcular apenas o valor do pagamento em Crediário
                $valorCrediario = 0;
                if ($venda->dados_pagamento) {
                    $pagamentosDecoded = json_decode($venda->dados_pagamento, true);
                    if (is_array($pagamentosDecoded)) {
                        $valorCrediario = collect($pagamentosDecoded)
                            ->filter(function ($pagamento) {
                                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
                            })
                            ->sum(function ($pagamento) {
                                if (isset($pagamento['valorFinal'])) {
                                    return floatval($pagamento['valorFinal']);
                                }
                                if (isset($pagamento['valor_final'])) {
                                    return floatval($pagamento['valor_final']);
                                }
                                if (isset($pagamento['valor'])) {
                                    return floatval($pagamento['valor']);
                                }
                                return 0;
                            });
                    }
                }
                
                // Só adicionar se houver valor de Crediário
                if ($valorCrediario > 0) {
                    $consumoInternoCollection->push([
                        'id' => 'venda-' . $venda->id,
                        'tipo' => 'PDV',
                        'valor' => $valorCrediario,
                        'descricao' => 'Consumo Interno - Venda ' . $venda->id,
                        'data' => $dataVenda
                    ]);
                }
            }
            
            // Buscar OS onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
            \Log::info("🔍 Buscando OS onde funcionário é CLIENTE (funcionario_id {$funcionarioId}, user_id {$funcionario}) em {$mes}/{$ano}");
            
            // Debug: buscar OSs com cliente_id NULL e funcionario_id no JSON
            $osComClienteNull = DB::table('ordens_servico')
                ->whereNull('cliente_id')
                ->whereNotNull('cliente_info')
                ->where(function($q) use ($funcionarioId) {
                    $q->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                      ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                })
                ->whereYear('data_criacao', $ano)
                ->whereMonth('data_criacao', $mes)
                ->get();
            
            \Log::info("🔍 OSs com cliente_id NULL e funcionario_id no JSON: " . $osComClienteNull->count());
            foreach ($osComClienteNull as $os) {
                $clienteInfoDecoded = json_decode($os->cliente_info, true);
                $funcionarioIdNoJson = $clienteInfoDecoded['funcionario_id'] ?? null;
                \Log::info("🔍 OS cliente_id NULL - ID: {$os->id}, Funcionário ID (tabela): {$os->funcionario_id}, Funcionário ID (JSON): {$funcionarioIdNoJson}, Status: {$os->status_os}, Vendedor: {$os->vendedor_id}");
            }
            
            $osConsumoInterno = collect([]);
            
            // Só buscar OSs se o mês estiver aberto
            if ($mesAberto) {
                // Buscar OSs para consumo interno (onde funcionário é o CLIENTE):
                // 1. OSs criadas no mês/ano atual
                // 2. OSs finalizadas no mês/ano atual  
                // 3. OSs criadas após a abertura do mês (se houver data de abertura)
                
                // IMPORTANTE: 
                // - Quando cliente_id é NULL, o funcionário é o cliente e funcionario_id está no JSON cliente_info
                // - Quando cliente_id não é NULL, funcionario_id na tabela pode ser o vendedor/criador OU o cliente
                // - cliente_info JSON contém informações do cliente (que pode ser funcionário)
                // - Precisamos buscar por cliente_info->funcionario_id quando cliente_id é NULL
                // - OU buscar por funcionario_id na tabela quando cliente_id não é NULL (mas excluindo vendedor)
                $osConsumoInterno = DB::table('ordens_servico')
                    ->where(function($query) use ($funcionarioId, $funcionario) {
                        // Opção 1: cliente_id é NULL e funcionario_id está no JSON cliente_info (funcionário como cliente)
                        $query->where(function($q) use ($funcionarioId, $funcionario) {
                            $q->whereNull('cliente_id')
                              ->whereNotNull('cliente_info')
                              ->where(function($subQ) use ($funcionarioId) {
                                  // Tentar diferentes formas de extrair o funcionario_id do JSON
                                  $subQ->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                                       ->orWhereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = CAST(? AS CHAR)", [$funcionarioId])
                                       ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                              })
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($funcionario) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $funcionario);
                              });
                        })
                        // Opção 2: cliente_id não é NULL e funcionario_id na tabela corresponde ao funcionário como cliente
                        ->orWhere(function($q) use ($funcionarioId, $funcionario) {
                            $q->whereNotNull('cliente_id')
                              ->where('funcionario_id', $funcionarioId)
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($funcionario) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $funcionario);
                              });
                        })
                        // Opção 3: cliente_id não é NULL mas funcionario_id está no JSON cliente_info
                        ->orWhere(function($q) use ($funcionarioId, $funcionario) {
                            $q->whereNotNull('cliente_id')
                              ->whereNotNull('cliente_info')
                              ->where(function($subQ) use ($funcionarioId) {
                                  // Tentar diferentes formas de extrair o funcionario_id do JSON
                                  $subQ->whereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = ?", [$funcionarioId])
                                       ->orWhereRaw("JSON_EXTRACT(cliente_info, '$.funcionario_id') = CAST(? AS CHAR)", [$funcionarioId])
                                       ->orWhereRaw("CAST(JSON_EXTRACT(cliente_info, '$.funcionario_id') AS UNSIGNED) = ?", [$funcionarioId]);
                              })
                              // Excluir OS onde o funcionário é o VENDEDOR
                              ->where(function($vendedorQ) use ($funcionario) {
                                  $vendedorQ->whereNull('vendedor_id')
                                            ->orWhere('vendedor_id', '!=', $funcionario);
                              });
                        });
                    })
                    ->where(function($query) use ($ano, $mes, $dataAberturaMes, $dataFechamentoMes) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até hoje
                        if ($dataAberturaMes) {
                            $dataFim = $dataFechamentoMes ?: now();
                            $query->where(function($q) use ($dataAberturaMes, $dataFim) {
                                // Usar data_finalizacao_os se existir, senão usar data_criacao
                                $q->where(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNotNull('data_finalizacao_os')
                                         ->where('data_finalizacao_os', '>=', $dataAberturaMes)
                                         ->where('data_finalizacao_os', '<=', $dataFim);
                                })->orWhere(function($subQ) use ($dataAberturaMes, $dataFim) {
                                    $subQ->whereNull('data_finalizacao_os')
                                         ->where('data_criacao', '>=', $dataAberturaMes)
                                         ->where('data_criacao', '<=', $dataFim);
                                });
                            });
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->where(function($q) use ($ano, $mes) {
                                // OSs finalizadas no mês/ano atual
                                $q->whereIn('status_os', ['Finalizada', 'Entregue'])
                                  ->whereYear('data_finalizacao_os', $ano)
                                  ->whereMonth('data_finalizacao_os', $mes);
                            })->orWhere(function($q) use ($ano, $mes) {
                                // OSs criadas no mês/ano atual (sem status específico ou com status diferente)
                                $q->whereYear('data_criacao', $ano)
                                  ->whereMonth('data_criacao', $mes);
                            });
                        }
                    })
                    ->get();
            }
            
            \Log::info("🔍 OS encontradas onde funcionário é CLIENTE (funcionario_id {$funcionarioId}, user_id {$funcionario}) em {$mes}/{$ano}: " . $osConsumoInterno->count());
            
            // Debug: listar todas as OSs encontradas
            foreach ($osConsumoInterno as $os) {
                $clienteInfoDecoded = $os->cliente_info ? json_decode($os->cliente_info, true) : null;
                $funcionarioIdNoJson = $clienteInfoDecoded['funcionario_id'] ?? null;
                \Log::info("📊 OS encontrada - ID: {$os->id}, Cliente ID: " . ($os->cliente_id ?? 'NULL') . ", Funcionário ID (tabela): {$os->funcionario_id}, Funcionário ID (JSON): {$funcionarioIdNoJson}, Vendedor ID: {$os->vendedor_id}, Status: {$os->status_os}, Pagamentos: {$os->pagamentos}");
            }
            
            // Filtrar apenas as que têm pagamento em Crediário
            $osConsumoInterno = $osConsumoInterno->filter(function($os) {
                if (!$os->pagamentos) {
                    \Log::info("🔍 OS {$os->id} não tem pagamentos");
                    return false;
                }
                $pagamentos = json_decode($os->pagamentos, true);
                if (!is_array($pagamentos)) {
                    \Log::info("🔍 OS {$os->id} pagamentos não é array: " . $os->pagamentos);
                    return false;
                }
                $temCrediario = collect($pagamentos)->contains('metodo', 'Crediário');
                \Log::info("🔍 OS {$os->id} tem Crediário: " . ($temCrediario ? 'SIM' : 'NÃO') . " - Pagamentos: " . json_encode($pagamentos));
                return $temCrediario;
            });
            
            foreach ($osConsumoInterno as $os) {
                // Usar data de finalização se existir, senão usar data de criação
                $dataOS = $os->data_finalizacao_os ?: $os->data_criacao;
    
                $valorCrediario = 0;
                if ($os->pagamentos) {
                    $pagamentosDecoded = json_decode($os->pagamentos, true);
                    if (is_array($pagamentosDecoded)) {
                        $valorCrediario = collect($pagamentosDecoded)
                            ->filter(function ($pagamento) {
                                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
                            })
                            ->sum(function ($pagamento) {
                                if (isset($pagamento['valorFinal'])) {
                                    return floatval($pagamento['valorFinal']);
                                }
                                if (isset($pagamento['valor_final'])) {
                                    return floatval($pagamento['valor_final']);
                                }
                                if (isset($pagamento['valor'])) {
                                    return floatval($pagamento['valor']);
                                }
                                return 0;
                            });
                    }
                }
    
                // Só adicionar se houver valor de Crediário (não usar fallback do valor total)
                if ($valorCrediario > 0) {
                    $consumoInternoCollection->push([
                        'id' => 'os-' . $os->id,
                        'tipo' => 'OS',
                        'valor' => $valorCrediario,
                        'descricao' => 'Consumo Interno - OS ' . $os->id,
                        'data' => $dataOS
                    ]);
                }
            }
            
            // Buscar envelopamentos onde o funcionário é o CLIENTE (não o vendedor) com pagamento em Crediário
            // IMPORTANTE: funcionario_id no envelopamento guarda o users.id, não funcionarios.id
            $envConsumoInterno = collect([]);
            
            // Só buscar envelopamentos se o mês estiver aberto
            if ($mesAberto) {
                $envConsumoInterno = DB::table('envelopamentos')
                    ->where('funcionario_id', $funcionario) // users.id - Funcionário como CLIENTE
                    ->where(function($q) use ($funcionario) {
                        // Excluir envelopamentos onde o funcionário é o VENDEDOR
                        $q->whereNull('vendedor_id')
                          ->orWhere('vendedor_id', '!=', $funcionario);
                    })
                    ->whereIn('status', ['finalizado', 'Finalizado'])
                    ->where(function($query) use ($ano, $mes, $dataAberturaMes, $dataFechamentoMes) {
                        // Se há data de abertura do mês, filtrar do dia de abertura até o fim do dia atual
                        if ($dataAberturaMes) {
                            // Usar fim do dia atual para evitar problemas de timezone
                            $dataFim = $dataFechamentoMes ?: Carbon::now()->endOfDay();
                            // Envelopamentos não têm data_finalizacao, apenas data_criacao
                            // Quando o status é "Finalizado", a data_criacao é atualizada
                            $query->where('data_criacao', '>=', $dataAberturaMes)
                                  ->where('data_criacao', '<=', $dataFim);
                        } else {
                            // Se não há data de abertura, usar mês/ano completo como fallback
                            $query->whereYear('data_criacao', $ano)
                                  ->whereMonth('data_criacao', $mes);
                        }
                    })
                    ->get();
            }
            
            // Filtrar apenas os que têm pagamento em Crediário
            $envConsumoInterno = $envConsumoInterno->filter(function($env) {
                if (!$env->pagamentos) return false;
                $pagamentos = json_decode($env->pagamentos, true);
                if (!is_array($pagamentos)) return false;
                return collect($pagamentos)->contains('metodo', 'Crediário');
            });
            
            foreach ($envConsumoInterno as $env) {
                // Envelopamentos não têm data_finalizacao, apenas data_criacao
                $dataEnv = $env->data_criacao;
                
                // Calcular apenas o valor do pagamento em Crediário
                $valorCrediario = 0;
                if ($env->pagamentos) {
                    $pagamentosDecoded = json_decode($env->pagamentos, true);
                    if (is_array($pagamentosDecoded)) {
                        $valorCrediario = collect($pagamentosDecoded)
                            ->filter(function ($pagamento) {
                                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
                            })
                            ->sum(function ($pagamento) {
                                if (isset($pagamento['valorFinal'])) {
                                    return floatval($pagamento['valorFinal']);
                                }
                                if (isset($pagamento['valor_final'])) {
                                    return floatval($pagamento['valor_final']);
                                }
                                if (isset($pagamento['valor'])) {
                                    return floatval($pagamento['valor']);
                                }
                                return 0;
                            });
                    }
                }
                
                // Só adicionar se houver valor de Crediário
                if ($valorCrediario > 0) {
                    $consumoInternoCollection->push([
                        'id' => 'env-' . $env->id,
                        'tipo' => 'Envelopamento',
                        'valor' => $valorCrediario,
                        'descricao' => 'Consumo Interno - Envelopamento ' . $env->codigo_orcamento,
                        'data' => $dataEnv
                    ]);
                }
            }

            // Calcular totais
            $totalVales = $valesCollection->sum('valor');
            $totalFaltas = $faltasCollection->sum('valorDesconto');
            $totalConsumoInterno = $consumoInternoCollection->sum('valor');
            $salarioLiquido = $salarioBase - $totalVales - $totalFaltas - $totalConsumoInterno;

            // Salvar/atualizar relatório evitando duplicidade (chave única funcionario_id/mes/ano)
            $existing = DB::table('funcionario_relatorios_mensais')
                ->where('funcionario_id', $funcionarioId)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->first();

            if ($existing) {
                DB::table('funcionario_relatorios_mensais')
                    ->where('id', $existing->id)
                    ->update([
                        'salario_base' => $salarioBase,
                        'total_vales' => $totalVales,
                        'total_faltas' => $totalFaltas,
                        'total_consumo_interno' => $totalConsumoInterno,
                        'salario_liquido' => $salarioLiquido,
                        'updated_at' => now(),
                    ]);
                $relatorioId = $existing->id;
            } else {
                $relatorioId = DB::table('funcionario_relatorios_mensais')->insertGetId([
                    'funcionario_id' => $funcionario,
                    'mes' => $mes,
                    'ano' => $ano,
                    'salario_base' => $salarioBase,
                    'total_vales' => $totalVales,
                    'total_faltas' => $totalFaltas,
                    'total_consumo_interno' => $totalConsumoInterno,
                    'salario_liquido' => $salarioLiquido,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            $relatorio = [
                'id' => $relatorioId,
                'mes' => $mes,
                'ano' => $ano,
                'salario_base' => $salarioBase,
                'total_vales' => $totalVales,
                'total_faltas' => $totalFaltas,
                'total_consumo_interno' => $totalConsumoInterno,
                'salario_liquido' => $salarioLiquido,
                'vales' => $valesCollection,
                'faltas' => $faltasCollection,
                'consumo_interno' => $consumoInternoCollection,
                'data_abertura_mes' => $dataAberturaMes,
                'data_fechamento_mes' => $dataFechamentoMes
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório gerado com sucesso',
                'data' => $relatorio
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar relatórios mensais do funcionário
     */
    public function getRelatoriosMensais($id)
    {
        try {
            $relatorios = DB::table('funcionario_relatorios_mensais')
                ->where('funcionario_id', $id)
                ->orderBy('ano', 'desc')
                ->orderBy('mes', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $relatorios
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar relatórios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Executar fechamento automático manualmente via API/Webhook
     * Aceita parâmetros opcionais: forcar (boolean) e ignorar_mes_anterior (boolean)
     */
    public function executarFechamentoAutomatico(Request $request)
    {
        try {
            // Permitir parâmetros via GET (query) ou POST (body)
            $forcar = $request->input('forcar', false);
            $ignorarMesAnterior = $request->input('ignorar_mes_anterior', false);
            
            // Aceitar também 'true' como string
            $forcar = filter_var($forcar, FILTER_VALIDATE_BOOLEAN);
            $ignorarMesAnterior = filter_var($ignorarMesAnterior, FILTER_VALIDATE_BOOLEAN);
            
            $usuarioId = auth()->check() ? auth()->id() : null;
            $tenantId = auth()->check() ? auth()->user()->tenant_id : null;
            
            \Log::info('🔄 Executando fechamento automático de mês via API/Webhook', [
                'usuario_id' => $usuarioId,
                'tenant_id' => $tenantId,
                'forcar' => $forcar,
                'ignorar_mes_anterior' => $ignorarMesAnterior,
                'ip' => $request->ip(),
                'data_execucao' => now()->format('d/m/Y H:i:s'),
                'metodo' => $request->method()
            ]);
            
            // Preparar opções do comando
            $opcoes = [];
            if ($forcar) {
                $opcoes['--forcar'] = true;
            }
            if ($ignorarMesAnterior) {
                $opcoes['--ignorar-mes-anterior'] = true;
            }
            
            $inicioExecucao = microtime(true);
            Artisan::call('funcionarios:fechar-mes-automatico', $opcoes);
            $saida = Artisan::output();
            $tempoExecucao = round((microtime(true) - $inicioExecucao) * 1000, 2); // em milissegundos

            // Extrair informações da saída
            $linhas = explode("\n", $saida);
            $fechamentosRealizados = 0;
            $errosEncontrados = 0;
            $ignorados = 0;
            $mesFechado = null;
            $anoFechado = null;
            
            foreach ($linhas as $linha) {
                if (preg_match('/Fechamentos realizados:\s*(\d+)/', $linha, $matches)) {
                    $fechamentosRealizados = (int)$matches[1];
                }
                if (preg_match('/Erros encontrados:\s*(\d+)/', $linha, $matches)) {
                    $errosEncontrados = (int)$matches[1];
                }
                if (preg_match('/Ignorados.*:\s*(\d+)/', $linha, $matches)) {
                    $ignorados = (int)$matches[1];
                }
                if (preg_match('/Mês fechado com sucesso.*?(\d+)\/(\d+)/', $linha, $matches)) {
                    $mesFechado = (int)$matches[1];
                    $anoFechado = (int)$matches[2];
                }
            }

            \Log::info('✅ Fechamento automático executado via API', [
                'usuario_id' => $usuarioId,
                'tenant_id' => $tenantId,
                'output' => $saida,
                'opcoes_usadas' => $opcoes,
                'tempo_execucao_ms' => $tempoExecucao,
                'fechamentos_realizados' => $fechamentosRealizados,
                'erros_encontrados' => $errosEncontrados,
                'ignorados' => $ignorados,
                'mes_fechado' => $mesFechado,
                'ano_fechado' => $anoFechado,
                'data_execucao' => now()->format('d/m/Y H:i:s')
            ]);

            return $this->success([
                'output' => $saida,
                'executado_em' => now()->toDateTimeString(),
                'opcoes_utilizadas' => [
                    'forcar' => $forcar,
                    'ignorar_mes_anterior' => $ignorarMesAnterior
                ],
                'resumo' => [
                    'fechamentos_realizados' => $fechamentosRealizados,
                    'erros_encontrados' => $errosEncontrados,
                    'ignorados' => $ignorados,
                    'mes_fechado' => $mesFechado,
                    'ano_fechado' => $anoFechado,
                    'tempo_execucao_ms' => $tempoExecucao
                ]
            ], 'Fechamento automático executado com sucesso. Verifique o histórico para mais detalhes.');
        } catch (\Exception $e) {
            \Log::error('❌ Erro ao executar fechamento automático via API', [
                'usuario_id' => auth()->check() ? auth()->id() : null,
                'tenant_id' => auth()->check() ? auth()->user()->tenant_id : null,
                'erro' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'arquivo' => $e->getFile(),
                'linha' => $e->getLine(),
                'ip' => $request->ip(),
                'data_erro' => now()->format('d/m/Y H:i:s')
            ]);
            return $this->error('Erro ao executar fechamento automático: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Método auxiliar para buscar salário base por mês
     */
    private function getSalarioBasePorMes($funcionarioId, $mes, $ano)
    {
        // Buscar o salário vigente até o fim do mês/ano especificado
        $salario = DB::table('funcionario_salario_historico')
            ->where('funcionario_id', $funcionarioId)
            ->where('data_alteracao', '<=', Carbon::createFromDate($ano, $mes, 1)->endOfMonth()->toDateString())
            ->orderBy('data_alteracao', 'desc')
            ->first();

        // Se não encontrou no histórico, buscar o salário atual
        if (!$salario) {
            $funcionario = User::where('tenant_id', auth()->user()->tenant_id)->findOrFail($funcionarioId);
            return $funcionario->salario_base ?? 0;
        }

        return $salario->novo_salario;
    }
} 