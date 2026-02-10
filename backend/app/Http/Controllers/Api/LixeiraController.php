<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class LixeiraController extends BaseController
{
    /**
     * Obtém todos os registros excluídos (soft deleted)
     */
    public function index(Request $request)
    {
        try {
            $registrosExcluidos = [];
            $tenantId = auth()->user()->tenant_id ?? null;
            $search = $request->input('search');
            $tipoFiltro = $request->input('tipo');
            $perPage = min($request->input('per_page', 20), 200);
            $page = max($request->input('page', 1), 1);
            
            // Buscar produtos excluídos
            $produtosExcluidos = DB::table('produtos')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome',
                    'codigo_produto',
                    'preco_venda',
                    'deleted_at',
                    DB::raw("'Produto' as tipo"),
                    DB::raw("'produtos' as tabela")
                ])
                ->get();
            
            foreach ($produtosExcluidos as $produto) {
                $registrosExcluidos[] = [
                    'id' => $produto->id,
                    'tipo' => $produto->tipo,
                    'tabela' => $produto->tabela,
                    'nome' => $produto->nome,
                    'codigo' => $produto->codigo_produto,
                    'preco' => $produto->preco_venda,
                    'data_exclusao' => $produto->deleted_at,
                    'dados_completos' => $produto
                ];
            }
            
            // Buscar clientes excluídos
            $clientesExcluidos = DB::table('clientes')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome_completo as nome',
                    'email',
                    'telefone_principal',
                    'deleted_at',
                    DB::raw("'Cliente' as tipo"),
                    DB::raw("'clientes' as tabela")
                ])
                ->get();
            
            foreach ($clientesExcluidos as $cliente) {
                $registrosExcluidos[] = [
                    'id' => $cliente->id,
                    'tipo' => $cliente->tipo,
                    'tabela' => $cliente->tabela,
                    'nome' => $cliente->nome,
                    'email' => $cliente->email,
                    'telefone' => $cliente->telefone_principal,
                    'data_exclusao' => $cliente->deleted_at,
                    'dados_completos' => $cliente
                ];
            }
            
            // Buscar vendas excluídas
            $vendasExcluidas = DB::table('vendas')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'cliente_nome as nome',
                    'valor_total',
                    'deleted_at',
                    DB::raw("'Venda' as tipo"),
                    DB::raw("'vendas' as tabela")
                ])
                ->get();
            
            foreach ($vendasExcluidas as $venda) {
                $registrosExcluidos[] = [
                    'id' => $venda->id,
                    'tipo' => $venda->tipo,
                    'tabela' => $venda->tabela,
                    'nome' => $venda->nome,
                    'valor' => $venda->valor_total,
                    'data_exclusao' => $venda->deleted_at,
                    'dados_completos' => $venda
                ];
            }
            
            // Buscar orçamentos excluídos
            $orcamentosExcluidos = DB::table('orcamentos')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome_orcamento as nome',
                    'valor_total',
                    'deleted_at',
                    DB::raw("'Orçamento' as tipo"),
                    DB::raw("'orcamentos' as tabela")
                ])
                ->get();
            
            foreach ($orcamentosExcluidos as $orcamento) {
                $registrosExcluidos[] = [
                    'id' => $orcamento->id,
                    'tipo' => $orcamento->tipo,
                    'tabela' => $orcamento->tabela,
                    'nome' => $orcamento->nome,
                    'valor' => $orcamento->valor_total,
                    'data_exclusao' => $orcamento->deleted_at,
                    'dados_completos' => $orcamento
                ];
            }
            
            // Buscar ordens de serviço excluídas
            $ordensExcluidas = DB::table('ordens_servico')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'id_os',
                    'valor_total_os as valor_total',
                    'deleted_at',
                    DB::raw("'Ordem de Serviço' as tipo"),
                    DB::raw("'ordens_servico' as tabela")
                ])
                ->get();
            
            foreach ($ordensExcluidas as $ordem) {
                $registrosExcluidos[] = [
                    'id' => $ordem->id,
                    'tipo' => $ordem->tipo,
                    'tabela' => $ordem->tabela,
                    'nome' => $ordem->id_os,
                    'valor' => $ordem->valor_total,
                    'data_exclusao' => $ordem->deleted_at,
                    'dados_completos' => $ordem
                ];
            }
            
            // Buscar envelopamentos excluídos
            $envelopamentosExcluidos = DB::table('envelopamentos')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'codigo_orcamento as nome',
                    'orcamento_total as valor_total',
                    'deleted_at',
                    DB::raw("'Envelopamento' as tipo"),
                    DB::raw("'envelopamentos' as tabela")
                ])
                ->get();
            
            foreach ($envelopamentosExcluidos as $envelopamento) {
                $registrosExcluidos[] = [
                    'id' => $envelopamento->id,
                    'tipo' => $envelopamento->tipo,
                    'tabela' => $envelopamento->tabela,
                    'nome' => $envelopamento->nome,
                    'valor' => $envelopamento->valor_total,
                    'data_exclusao' => $envelopamento->deleted_at,
                    'dados_completos' => $envelopamento
                ];
            }
            
            // Buscar máquinas excluídas
            $maquinasExcluidas = DB::table('maquinas')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome',
                    'funcao',
                    'deleted_at',
                    DB::raw("'Máquina' as tipo"),
                    DB::raw("'maquinas' as tabela")
                ])
                ->get();
            
            foreach ($maquinasExcluidas as $maquina) {
                $registrosExcluidos[] = [
                    'id' => $maquina->id,
                    'tipo' => $maquina->tipo,
                    'tabela' => $maquina->tabela,
                    'nome' => $maquina->nome,
                    'codigo' => $maquina->funcao,
                    'data_exclusao' => $maquina->deleted_at,
                    'dados_completos' => $maquina
                ];
            }
            
            // Buscar funcionários excluídos
            $usuariosExcluidos = DB::table('users')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'name as nome',
                    'email',
                    'telefone',
                    'deleted_at',
                    DB::raw("'Funcionário' as tipo"),
                    DB::raw("'users' as tabela")
                ])
                ->get();
            
            foreach ($usuariosExcluidos as $usuario) {
                $registrosExcluidos[] = [
                    'id' => $usuario->id,
                    'tipo' => $usuario->tipo,
                    'tabela' => $usuario->tabela,
                    'nome' => $usuario->nome,
                    'email' => $usuario->email,
                    'telefone' => $usuario->telefone,
                    'data_exclusao' => $usuario->deleted_at,
                    'dados_completos' => $usuario
                ];
            }
            
            // Buscar categorias excluídas
            $categoriasExcluidas = DB::table('categorias')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome',
                    'deleted_at',
                    DB::raw("'Categoria' as tipo"),
                    DB::raw("'categorias' as tabela")
                ])
                ->get();
            
            foreach ($categoriasExcluidas as $categoria) {
                $registrosExcluidos[] = [
                    'id' => $categoria->id,
                    'tipo' => $categoria->tipo,
                    'tabela' => $categoria->tabela,
                    'nome' => $categoria->nome,
                    'data_exclusao' => $categoria->deleted_at,
                    'dados_completos' => $categoria
                ];
            }
            
            // Buscar subcategorias excluídas
            $subcategoriasExcluidas = DB::table('subcategorias')
                ->whereNotNull('deleted_at')
                ->when($tenantId, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->select([
                    'id',
                    'nome',
                    'deleted_at',
                    DB::raw("'Subcategoria' as tipo"),
                    DB::raw("'subcategorias' as tabela")
                ])
                ->get();
            
            foreach ($subcategoriasExcluidas as $subcategoria) {
                $registrosExcluidos[] = [
                    'id' => $subcategoria->id,
                    'tipo' => $subcategoria->tipo,
                    'tabela' => $subcategoria->tabela,
                    'nome' => $subcategoria->nome,
                    'data_exclusao' => $subcategoria->deleted_at,
                    'dados_completos' => $subcategoria
                ];
            }
            
            // Filtrar por tipo se solicitado
            if ($tipoFiltro) {
                $registrosExcluidos = array_filter($registrosExcluidos, function($item) use ($tipoFiltro) {
                    return $item['tipo'] === $tipoFiltro;
                });
            }

            // Filtrar por busca se solicitado
            if ($search) {
                $searchLower = mb_strtolower($search);
                $registrosExcluidos = array_filter($registrosExcluidos, function($item) use ($searchLower) {
                    return str_contains(mb_strtolower($item['nome'] ?? ''), $searchLower) ||
                           str_contains(mb_strtolower($item['tipo'] ?? ''), $searchLower) ||
                           str_contains(mb_strtolower($item['codigo'] ?? ''), $searchLower) ||
                           str_contains(mb_strtolower($item['email'] ?? ''), $searchLower) ||
                           str_contains(mb_strtolower($item['telefone'] ?? ''), $searchLower);
                });
            }

            // Ordenar por data de exclusão (mais recente primeiro)
            usort($registrosExcluidos, function($a, $b) {
                return strtotime($b['data_exclusao']) - strtotime($a['data_exclusao']);
            });
            
            // Paginação manual
            $total = count($registrosExcluidos);
            $lastPage = max(ceil($total / $perPage), 1);
            $offset = ($page - 1) * $perPage;
            $items = array_slice($registrosExcluidos, $offset, $perPage);

            return $this->success([
                'data' => array_values($items),
                'current_page' => (int) $page,
                'last_page' => (int) $lastPage,
                'per_page' => (int) $perPage,
                'total' => $total,
                'from' => $total > 0 ? $offset + 1 : 0,
                'to' => min($offset + $perPage, $total),
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar registros excluídos: ' . $e->getMessage());
        }
    }
    
    /**
     * Restaura um registro excluído
     */
    public function restore(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'id' => 'required|integer',
            'tabela' => 'required|string'
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        try {
            $id = $request->id;
            $tabela = $request->tabela;
            
            // Verificar se a tabela existe
            if (!Schema::hasTable($tabela)) {
                return $this->error('Tabela não encontrada');
            }
            
            // Restaurar o registro
            $restaurado = DB::table($tabela)
                ->where('id', $id)
                ->whereNotNull('deleted_at')
                ->update(['deleted_at' => null]);
            
            if ($restaurado) {
                return $this->success(null, 'Registro restaurado com sucesso');
            } else {
                return $this->error('Registro não encontrado ou já restaurado');
            }
        } catch (\Exception $e) {
            return $this->error('Erro ao restaurar registro: ' . $e->getMessage());
        }
    }
    
    /**
     * Exclui permanentemente um registro
     */
    public function destroy(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'id' => 'required|integer',
            'tabela' => 'required|string'
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        try {
            $id = $request->id;
            $tabela = $request->tabela;
            
            // Verificar se a tabela existe
            if (!Schema::hasTable($tabela)) {
                return $this->error('Tabela não encontrada');
            }
            
            // Excluir permanentemente o registro
            $excluido = DB::table($tabela)
                ->where('id', $id)
                ->whereNotNull('deleted_at')
                ->delete();
            
            if ($excluido) {
                return $this->success(null, 'Registro excluído permanentemente');
            } else {
                return $this->error('Registro não encontrado');
            }
        } catch (\Exception $e) {
            return $this->error('Erro ao excluir registro: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtém detalhes de um registro específico
     */
    public function show($id, $tabela)
    {
        try {
            // Verificar se a tabela existe
            if (!Schema::hasTable($tabela)) {
                return $this->error('Tabela não encontrada');
            }
            
            // Buscar o registro excluído
            $registro = DB::table($tabela)
                ->where('id', $id)
                ->whereNotNull('deleted_at')
                ->first();
            
            if (!$registro) {
                return $this->error('Registro não encontrado');
            }
            
            return $this->success($registro);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar detalhes do registro: ' . $e->getMessage());
        }
    }
}
