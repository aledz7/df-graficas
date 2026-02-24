<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;

// Controllers
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\ProdutoController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ItemVendaController;
use App\Http\Controllers\Api\SubcategoriaController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\OrcamentoController;
use App\Http\Controllers\Api\VendaController;
use App\Http\Controllers\Api\ContaBancariaController;
use App\Http\Controllers\Api\CategoriaCaixaController;
use App\Http\Controllers\Api\LancamentoCaixaController;
use App\Http\Controllers\Api\ConfiguracaoController;
use App\Http\Controllers\Api\CorController;
use App\Http\Controllers\Api\TamanhoController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\DadosUsuarioController;
use App\Http\Controllers\Api\CalculadoraController;
use App\Http\Controllers\Api\ContaReceberController;
use App\Http\Controllers\Api\ContaPagarController;
use App\Http\Controllers\Api\CompromissoController;
use App\Http\Controllers\Api\PDVController;
use App\Http\Controllers\Api\MarketplaceController;
use App\Http\Controllers\Api\OrdemServicoController;
use App\Http\Controllers\Api\NotaFiscalController;
use App\Http\Controllers\Api\ComissaoOSController;
use App\Http\Controllers\Api\UserNotificationPreferencesController;
use App\Http\Controllers\Api\CatalogoParteController;
use App\Http\Controllers\Api\CaixaController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\OpcaoFreteController;
use App\Http\Controllers\Api\EntregadorController;
use App\Http\Controllers\Api\FreteEntregaController;
use App\Http\Controllers\Api\RomaneioController;
use App\Http\Controllers\Api\AparenciaController;
use App\Http\Controllers\Api\LixeiraController;
use App\Http\Controllers\Api\AdminConfiguracaoController;
use App\Http\Controllers\Api\CalculoSavadoController;
use App\Http\Controllers\Api\FuncionarioController;
use App\Http\Controllers\Api\EnvelopamentoController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendaPreVendaController;
use App\Http\Controllers\Api\Public\PublicProdutoController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\HistoricoEntradaEstoqueController;
use App\Http\Controllers\Api\NotificacaoController;
use App\Http\Controllers\Api\ConfiguracaoPontosController;
use App\Http\Controllers\Api\ClientePontosController;
use App\Http\Controllers\Api\AtendimentoController;
use App\Http\Controllers\Api\EnvelopamentoPrecosController;
use App\Http\Controllers\Api\ServicoAdicionalController;
use App\Http\Controllers\Api\Admin\TenantManagerController;
use App\Http\Controllers\Api\PermissionProfileController;
use App\Http\Controllers\Api\FormaPagamentoController;
use App\Http\Controllers\Api\CupomController;
use App\Http\Controllers\Api\MetaVendaController;
use App\Http\Controllers\Api\AlertasController;
use App\Http\Controllers\Api\RankingVendedoresController;
use App\Http\Controllers\Api\GamificacaoController;
use App\Http\Controllers\Api\AproveitamentoFolhaController;
use App\Http\Controllers\Api\TreinamentoController;
use App\Http\Controllers\Api\ClienteTendenciaController;
use App\Http\Controllers\Api\PerfilVendedorController;
use App\Http\Controllers\Api\EventoCalendarioController;
use App\Http\Controllers\Api\TermometroController;
use App\Http\Controllers\Api\PosVendaController;
use App\Http\Controllers\Api\RelatorioProducaoController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\KanbanController;
use App\Http\Controllers\Api\ChatController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/complete-two-factor-login', [AuthController::class, 'completeTwoFactorLogin']);
Route::post('/send-two-factor-code', [AuthController::class, 'sendTwoFactorCode']);
Route::post('/verify-two-factor-code', [AuthController::class, 'verifyTwoFactorCode']);

// Rota nomeada 'login' para redirecionamento de middleware auth
Route::get('/login', function () {
    return response()->json([
        'message' => 'Unauthenticated.',
        'error' => 'Token de autenticação necessário. Faça login para acessar este recurso.'
    ], 401);
})->name('login');

// Rota GET para /register retorna erro apropriado
Route::get('/register', function () {
    return response()->json([
        'success' => false,
        'message' => 'O método GET não é suportado para esta rota. Use POST para registrar um novo usuário.'
    ], 405);
});

// Rota pública para servir imagens do storage
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    
    if (!file_exists($fullPath)) {
        abort(404);
    }
    
    $file = file_get_contents($fullPath);
    $type = mime_content_type($fullPath);
    
    return response($file, 200)
        ->header('Content-Type', $type)
        ->header('Cache-Control', 'public, max-age=31536000');
})->where('path', '.*');

// Rota movida para dentro do middleware de autenticação - ver linha após Route::apiResource('produtos')

// Rotas públicas para catálogo público
Route::prefix('public')->group(function () {
    Route::get('produtos/tenant/{tenantId}', [PublicProdutoController::class, 'getByTenant']);
    Route::get('produtos/{id}', [PublicProdutoController::class, 'getById']);
    Route::get('categorias/tenant/{tenantId}', [CategoriaController::class, 'getByTenant']);
    Route::get('product-categories/tenant/{tenantId}', [ProductCategoryController::class, 'getByTenant']);
    Route::get('configuracoes/empresa/tenant/{tenantId}', [ConfiguracaoController::class, 'getEmpresaByTenant']);
    Route::get('empresa/tenant/{tenantId}', [EmpresaController::class, 'getByTenant']);
    Route::post('vendas-pre-venda/tenant/{tenantId}', [VendaPreVendaController::class, 'createForTenant']);
    Route::get('formas-pagamento/tenant/{tenantId}', [FormaPagamentoController::class, 'getByTenant']);
    Route::post('cupons/validar/{tenantId}', [CupomController::class, 'validarCupom']);
    Route::post('cupons/registrar-uso/{tenantId}', [CupomController::class, 'registrarUso']);
});

// Webhook público para disparar fechamento automático de funcionários (aceita GET e POST)
Route::match(['get', 'post'], 'funcionarios/fechamento-automatico/webhook', [FuncionarioController::class, 'executarFechamentoAutomatico']);

// Protected routes
Route::middleware(['api.auth'])->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/toggle-two-factor', [AuthController::class, 'toggleTwoFactor']);
    Route::get('/two-factor-status', [AuthController::class, 'getTwoFactorStatus']);
    
    // Produtos - Rotas específicas devem vir ANTES do apiResource
    Route::get('produtos/estoque-baixo', [ProdutoController::class, 'estoqueBaixo'])->name('api.produtos.estoque-baixo');
    Route::post('produtos/bulk-update-prices', [ProdutoController::class, 'bulkUpdatePrices']);
    Route::apiResource('produtos', ProdutoController::class);
    Route::post('produtos/{id}/atualizar-estoque-variacao', [ProdutoController::class, 'atualizarEstoqueVariacao']);
    
    // Upload de imagens
    Route::post('upload/imagem', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadImagem']);
    Route::post('upload/galeria', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadGaleria']);
    Route::post('upload/anexo-producao', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadAnexoProducao']);
    Route::post('upload/anexo-entrega', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadAnexoEntrega']);
    Route::post('upload/anexo-movimentacao', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadAnexoMovimentacao']);
    Route::post('upload/foto-cliente', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadFotoCliente']);
    Route::post('upload/foto-funcionario', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadFotoFuncionario']);
    Route::post('upload/qr-code', [\App\Http\Controllers\Api\ImageUploadController::class, 'uploadQrCode']);
    
    // Cores
    Route::apiResource('cores', CorController::class);
    
    // Tamanhos
    Route::apiResource('tamanhos', TamanhoController::class);
    
    // Categorias de Produto
    Route::apiResource('product-categories', ProductCategoryController::class);
    
    // Categorias
    Route::apiResource('categorias', CategoriaController::class);
    
    // Subcategorias
    Route::apiResource('subcategorias', SubcategoriaController::class);
    Route::get('subcategorias/por-categoria/{categoria_id}', [SubcategoriaController::class, 'porCategoria']);
    
    // Clientes
    Route::apiResource('clientes', ClienteController::class);
    Route::post('clientes/importar', [ClienteController::class, 'importar']);
    Route::get('clientes/relatorio/aniversariantes-mes', [ClienteController::class, 'aniversariantesDoMes']);
    Route::get('clientes/relatorio/que-mais-compraram', [ClienteController::class, 'clientesQueMaisCompraram']);
    
    // Atendimentos
    Route::apiResource('atendimentos', AtendimentoController::class);
    Route::get('clientes/{clienteId}/atendimentos', [AtendimentoController::class, 'porCliente']);
    
    // Orçamentos - Rotas específicas devem vir ANTES do apiResource
    Route::prefix('orcamentos')->group(function () {
        Route::post('rascunho', [OrcamentoController::class, 'saveRascunho']);
        Route::get('rascunho', [OrcamentoController::class, 'getRascunho']);
        Route::get('envelopamentos', [OrcamentoController::class, 'getEnvelopamentos']);
    });
    Route::apiResource('orcamentos', OrcamentoController::class);
    
    // Vendas - Rotas específicas devem vir ANTES do apiResource
    Route::prefix('vendas')->group(function () {
        Route::get('estatisticas', [VendaController::class, 'estatisticas']);
        Route::get('relatorio-faturamento', [VendaController::class, 'relatorioFaturamento']);
        Route::get('relatorio-geral-recebimentos', [VendaController::class, 'relatorioGeralRecebimentos']);
        Route::get('relatorio-analitico', [VendaController::class, 'relatorioAnalitico']);
        Route::get('relatorio-com-metas', [VendaController::class, 'relatorioComMetas']);
        Route::post('{id}/cancelar', [VendaController::class, 'cancelar']);
        Route::post('{id}/estornar', [VendaController::class, 'estornar']);
    });
    
    // Metas de Vendas
    Route::apiResource('metas-vendas', MetaVendaController::class);
    Route::get('metas-vendas/periodo/meta', [MetaVendaController::class, 'getMetaPeriodo']);
    Route::get('metas-vendas/{id}/progresso', [MetaVendaController::class, 'getProgresso']);
    
    // Alertas e Notificações
    Route::prefix('alertas')->group(function () {
        Route::post('executar-verificacoes', [AlertasController::class, 'executarVerificacoes']);
        Route::get('contar-nao-lidas', [AlertasController::class, 'contarNaoLidas']);
        Route::post('marcar-todas-lidas', [AlertasController::class, 'marcarTodasComoLidas']);
    });
    Route::apiResource('alertas', AlertasController::class)->only(['index']);
    Route::post('alertas/{id}/marcar-lida', [AlertasController::class, 'marcarComoLida']);
    
    // Ranking de Vendedores
    Route::prefix('ranking-vendedores')->group(function () {
        Route::get('/', [RankingVendedoresController::class, 'index']);
        Route::get('por-quantidade', [RankingVendedoresController::class, 'porQuantidade']);
    });
    
    // Gamificação
    Route::prefix('gamificacao')->group(function () {
        Route::get('ranking', [GamificacaoController::class, 'ranking']);
        Route::get('meus-pontos', [GamificacaoController::class, 'meusPontos']);
        Route::get('historico', [GamificacaoController::class, 'historico']);
        Route::get('premiacoes', [GamificacaoController::class, 'premiacoes']);
        Route::post('premiacoes/{id}/entregar', [GamificacaoController::class, 'entregarPremiacao']);
    });
    Route::apiResource('vendas', VendaController::class);
    
    // Rotas de Fretes (rotas específicas ANTES do apiResource)
    Route::get('opcoes-frete/ativas/listar', [OpcaoFreteController::class, 'ativas'])->name('api.opcoes-frete.ativas');
    Route::apiResource('opcoes-frete', OpcaoFreteController::class);
    
    // Rotas de Entregadores (rotas específicas ANTES do apiResource)
    Route::get('entregadores/ativos/listar', [EntregadorController::class, 'ativos'])->name('api.entregadores.ativos');
    Route::get('entregadores/tipo/{tipo}', [EntregadorController::class, 'porTipo'])->name('api.entregadores.por-tipo');
    Route::apiResource('entregadores', EntregadorController::class);
    
    // Rotas de Entregas de Frete
    Route::get('fretes-entregas/relatorio', [FreteEntregaController::class, 'relatorio'])->name('api.fretes-entregas.relatorio');
    Route::post('vendas/{vendaId}/criar-entrega', [FreteEntregaController::class, 'criarEntrega'])->name('api.fretes-entregas.criar');
    Route::post('fretes-entregas/{id}/marcar-pago', [FreteEntregaController::class, 'marcarComoPago'])->name('api.fretes-entregas.marcar-pago');
    Route::post('fretes-entregas/{id}/integrar-holerite', [FreteEntregaController::class, 'integrarHolerite'])->name('api.fretes-entregas.integrar-holerite');
    Route::delete('vendas/codigo/{codigo}', [VendaController::class, 'destroyByCodigo']);
    
    // Rotas de Romaneios
    Route::get('romaneios/pedidos-disponiveis', [RomaneioController::class, 'pedidosDisponiveis'])->name('api.romaneios.pedidos-disponiveis');
    Route::post('romaneios/calcular-rota', [RomaneioController::class, 'calcularRota'])->name('api.romaneios.calcular-rota');
    Route::post('romaneios/{id}/atualizar-status', [RomaneioController::class, 'updateStatus'])->name('api.romaneios.atualizar-status');
    Route::post('romaneios/{id}/confirmar-entrega', [RomaneioController::class, 'confirmarEntrega'])->name('api.romaneios.confirmar-entrega');
    Route::apiResource('romaneios', RomaneioController::class);
    
    // Itens Venda
    Route::get('itens-venda', [ItemVendaController::class, 'index']);
    
    // Contas Bancárias
    Route::apiResource('contas-bancarias', ContaBancariaController::class);
    Route::prefix('contas-bancarias/{conta}')->group(function () {
        Route::get('saldo', [ContaBancariaController::class, 'saldo']);
        Route::get('extrato', [ContaBancariaController::class, 'extrato']);
        Route::get('saldo-consolidado', [ContaBancariaController::class, 'saldoConsolidado']);
    });
    
    // Categorias de Caixa
    Route::apiResource('categorias-caixa', CategoriaCaixaController::class);
    Route::prefix('categorias-caixa/{categoria}')->group(function () {
        Route::get('arvore', [CategoriaCaixaController::class, 'arvore']);
        Route::get('estatisticas', [CategoriaCaixaController::class, 'estatisticas']);
        Route::get('mais-utilizadas', [CategoriaCaixaController::class, 'maisUtilizadas']);
    });
    
    // Lançamentos de Caixa
    Route::prefix('lancamentos-caixa')->group(function () {
        Route::get('por-data', [LancamentoCaixaController::class, 'getByDate']);
        Route::get('resumo', [LancamentoCaixaController::class, 'resumo']);
        Route::get('estatisticas', [LancamentoCaixaController::class, 'estatisticas']);
    });
    Route::apiResource('lancamentos-caixa', LancamentoCaixaController::class);
    Route::prefix('lancamentos-caixa')->group(function () {
        Route::post('{lancamento}/conciliar', [LancamentoCaixaController::class, 'conciliar']);
        Route::post('{lancamento}/desconciliar', [LancamentoCaixaController::class, 'desconciliar']);
        Route::post('{lancamento}/duplicar', [LancamentoCaixaController::class, 'duplicar']);
    });
    
    // Configurações
    Route::prefix('configuracoes')->group(function () {
        Route::get('/', [ConfiguracaoController::class, 'index']);
        Route::get('{chave}', [ConfiguracaoController::class, 'show']);
        Route::put('{chave}', [ConfiguracaoController::class, 'update']);
        Route::delete('{chave}', [ConfiguracaoController::class, 'destroy']);
        Route::post('bulk-update', [ConfiguracaoController::class, 'bulkUpdate']);
        Route::get('grupo/{grupo}', [ConfiguracaoController::class, 'grupo']);
        Route::post('grupo/{grupo}/upsert', [ConfiguracaoController::class, 'upsertGrupo']);
        Route::post('logo', [ConfiguracaoController::class, 'uploadLogo']);
    });

    // Configurações de Pontos
    Route::prefix('configuracoes-pontos')->group(function () {
        Route::get('/', [ConfiguracaoPontosController::class, 'show']);
        Route::post('/', [ConfiguracaoPontosController::class, 'store']);
        Route::post('toggle-status', [ConfiguracaoPontosController::class, 'toggleStatus']);
        Route::post('reset', [ConfiguracaoPontosController::class, 'reset']);
    });

    // Pontos dos Clientes
    Route::prefix('clientes/{clienteId}/pontos')->group(function () {
        Route::get('/', [ClientePontosController::class, 'getPontos']);
        Route::post('/', [ClientePontosController::class, 'atualizarPontos']);
        Route::post('resgatar', [ClientePontosController::class, 'resgatarPontos']);
    });
    
    // Configurações Administrativas
    Route::prefix('admin-configuracoes')->group(function () {
        Route::get('/', [AdminConfiguracaoController::class, 'index']);
        Route::put('/', [AdminConfiguracaoController::class, 'update']);
        Route::get('{chave}', [AdminConfiguracaoController::class, 'show']);
        Route::put('{chave}', [AdminConfiguracaoController::class, 'updateChave']);
        Route::post('validar-senha-master', [AdminConfiguracaoController::class, 'validarSenhaMaster']);
        Route::delete('senha-master', [AdminConfiguracaoController::class, 'removerSenhaMaster']);
        
        // Rotas que requerem senha master
        Route::middleware(['verificar.senha.master'])->group(function () {
            Route::post('reset-sistema', [AdminConfiguracaoController::class, 'resetSistema']);
            Route::post('backup-completo', [AdminConfiguracaoController::class, 'backupCompleto']);
        });
    });
    
    // Dados do usuário (substitui localStorage)
    Route::prefix('dados-usuario')->group(function () {
        Route::get('/', [DadosUsuarioController::class, 'index']);
        Route::post('/', [DadosUsuarioController::class, 'store']);
        Route::put('{chave}', [DadosUsuarioController::class, 'update']);
        Route::delete('{chave}', [DadosUsuarioController::class, 'destroy']);
        Route::get('{chave}', [DadosUsuarioController::class, 'show']);
        Route::post('bulk-update', [DadosUsuarioController::class, 'bulkUpdate']);
        Route::get('fornecedores', [DadosUsuarioController::class, 'fornecedores']);
        // Endpoint de teste temporário para debug
        Route::post('test-validation', function(Request $request) {
            \Log::info('=== TESTE DE VALIDAÇÃO ===', [
                'request_all' => $request->all(),
                'has_valor' => $request->has('valor'),
                'valor_type' => $request->has('valor') ? gettype($request->valor) : 'null',
                'user_id' => auth()->id()
            ]);
            
            $validator = Validator::make($request->all(), [
                'valor' => 'required',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors(),
                    'debug_info' => [
                        'request_keys' => array_keys($request->all()),
                        'has_valor' => $request->has('valor'),
                        'valor_content' => $request->valor ?? 'não definido'
                    ]
                ], 422);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Validação passou',
                'data' => [
                    'valor_received' => $request->valor,
                    'valor_type' => gettype($request->valor)
                ]
            ]);
        });
    });

    // Preços de Envelopamento (configurações globais da empresa)
    Route::prefix('envelopamento-precos')->group(function () {
        Route::get('/', [EnvelopamentoPrecosController::class, 'index']);
        Route::put('/', [EnvelopamentoPrecosController::class, 'update']);
        Route::get('compatibilidade', [EnvelopamentoPrecosController::class, 'getPrecosCompatibilidade']);
    });
    
    // Rotas para fechamento de mês e holerites
    Route::prefix('funcionarios')->group(function () {
        Route::post('verificar-mes-fechado', [FuncionarioController::class, 'verificarMesFechado']);
        Route::post('fechar-mes', [FuncionarioController::class, 'fecharMes']);
        Route::post('reabrir-mes', [FuncionarioController::class, 'reabrirMes']);
    });
    
    // Rotas específicas para vales e faltas de funcionários (DEVEM VIR ANTES DO apiResource)
    // Usar rotas explícitas em vez de prefix para garantir que sejam registradas primeiro
    Route::post('funcionarios/{funcionario}/vales', [FuncionarioController::class, 'addVale']);
    Route::delete('funcionarios/{funcionario}/vales', [FuncionarioController::class, 'removeVale']);
    Route::post('funcionarios/{funcionario}/faltas', [FuncionarioController::class, 'addFalta']);
    Route::delete('funcionarios/{funcionario}/faltas', [FuncionarioController::class, 'removeFalta']);
    Route::get('funcionarios/{funcionario}/credenciais', [FuncionarioController::class, 'hasCredentials']);
    Route::post('funcionarios/{funcionario}/reset-senha', [FuncionarioController::class, 'resetPassword']);
    
    // Rotas para holerites
    Route::get('funcionarios/{funcionario}/holerites', [FuncionarioController::class, 'holerites']);
    Route::get('funcionarios/{funcionario}/holerites/{holerite}', [FuncionarioController::class, 'holerite']);
    
    // Rotas para histórico de salários e relatórios
    Route::post('funcionarios/{funcionario}/salario-historico', [FuncionarioController::class, 'addSalarioHistorico']);
    Route::get('funcionarios/{funcionario}/salario-historico', [FuncionarioController::class, 'getSalarioHistorico']);
    Route::get('funcionarios/{funcionario}/salario-por-mes', [FuncionarioController::class, 'getSalarioPorMes']);
    Route::get('funcionarios/{funcionario}/relatorio-mensal', [FuncionarioController::class, 'gerarRelatorioMensal']);
    Route::get('funcionarios/{funcionario}/relatorios-mensais', [FuncionarioController::class, 'getRelatoriosMensais']);
    
    // Funcionários (apiResource deve vir DEPOIS das rotas específicas)
    Route::apiResource('funcionarios', FuncionarioController::class);
    
    // Perfis de Permissões (templates de permissões para funcionários)
    Route::apiResource('permission-profiles', PermissionProfileController::class);
    
    // Formas de Pagamento
    Route::apiResource('formas-pagamento', FormaPagamentoController::class);
    
    // Cupons de Desconto
    Route::get('cupons/gerar-codigo', [CupomController::class, 'gerarCodigo']);
    Route::apiResource('cupons', CupomController::class);
    
    // Configuração de fechamento automático de mês
    Route::prefix('configuracao-fechamento-mes')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\ConfiguracaoFechamentoMesController::class, 'index']);
        Route::put('/', [App\Http\Controllers\Api\ConfiguracaoFechamentoMesController::class, 'update']);
        Route::get('/historico', [App\Http\Controllers\Api\ConfiguracaoFechamentoMesController::class, 'historico']);
        Route::get('/historico-resumido', [App\Http\Controllers\Api\ConfiguracaoFechamentoMesController::class, 'historicoResumido']);
        Route::post('/executar-fechamento', [App\Http\Controllers\Api\FuncionarioController::class, 'executarFechamentoAutomatico']);
    });

    // Comissões de OS
    Route::prefix('comissoes-os')->group(function () {
        Route::get('/', [ComissaoOSController::class, 'index']);
        Route::get('estatisticas', [ComissaoOSController::class, 'estatisticas']);
        Route::get('relatorio', [ComissaoOSController::class, 'relatorio']);
        Route::post('processar-pendentes', [ComissaoOSController::class, 'processarComissoesPendentes']);
        Route::get('funcionario/{userId}', [ComissaoOSController::class, 'getComissoesFuncionario']);
        Route::put('{comissaoId}/marcar-paga', [ComissaoOSController::class, 'marcarComoPaga']);
        Route::put('funcionario/{userId}/marcar-todas-pagas', [ComissaoOSController::class, 'marcarTodasComoPagas']);
    });
    
    // Users (para seleção de funcionários)
    Route::get('users', [UserController::class, 'index']);
    
    // Envelopamentos
    Route::apiResource('envelopamentos', EnvelopamentoController::class);
    Route::get('envelopamentos/buscar/codigo', [EnvelopamentoController::class, 'buscarPorCodigo']);
    Route::get('envelopamentos/estatisticas', [EnvelopamentoController::class, 'estatisticas']);
    Route::get('envelopamentos/next-codigo', [EnvelopamentoController::class, 'getNextCodigo']);
    Route::post('envelopamentos/{id}/finalizar', [EnvelopamentoController::class, 'finalizar']);
    Route::post('envelopamentos/{id}/recriar-conta-receber', [EnvelopamentoController::class, 'recriarContaReceber']);
    Route::post('envelopamentos/{id}/lixeira', [EnvelopamentoController::class, 'moverParaLixeira']);
    
    // Histórico de Entradas de Estoque
    Route::apiResource('historico-entrada-estoque', HistoricoEntradaEstoqueController::class);
    Route::get('historico-entrada-estoque/estatisticas', [HistoricoEntradaEstoqueController::class, 'estatisticas']);
    
    // Envelopamento (controller não existe, comentado)
    // Route::prefix('envelopamento')->group(function () {
    //     Route::get('orcamentos', [EnvelopamentoController::class, 'getOrcamentos']);
    //     Route::post('orcamentos', [EnvelopamentoController::class, 'storeOrcamento']);
    //     Route::put('orcamentos/{id}', [EnvelopamentoController::class, 'updateOrcamento']);
    //     Route::delete('orcamentos/{id}', [EnvelopamentoController::class, 'deleteOrcamento']);
    // });
    
    // Calculadora
    Route::prefix('calculadora')->group(function () {
        Route::get('calculos-salvos', [CalculadoraController::class, 'getCalculosSalvos']);
        Route::post('calculos-salvos', [CalculadoraController::class, 'storeCalculoSalvo']);
        Route::delete('calculos-salvos/{id}', [CalculadoraController::class, 'deleteCalculoSalvo']);
        Route::get('servicos-adicionais', [CalculadoraController::class, 'getServicosAdicionais']);
        Route::post('servicos-adicionais', [CalculadoraController::class, 'storeServicoAdicional']);
    });
    
    // Aproveitamento de Folha
    Route::prefix('aproveitamento-folha')->group(function () {
        Route::post('calcular', [AproveitamentoFolhaController::class, 'calcular']);
        Route::get('impressoras', [AproveitamentoFolhaController::class, 'listarImpressoras']);
        Route::post('impressoras', [AproveitamentoFolhaController::class, 'salvarImpressora']);
        Route::delete('impressoras/{id}', [AproveitamentoFolhaController::class, 'excluirImpressora']);
    });
    
    // Clientes Diminuindo Compras
    Route::prefix('clientes-tendencia')->group(function () {
        Route::get('/', [ClienteTendenciaController::class, 'index']);
        Route::post('gerar-alertas', [ClienteTendenciaController::class, 'gerarAlertas']);
    });

    // Perfil do Vendedor
    Route::prefix('perfil-vendedor')->group(function () {
        Route::get('/', [PerfilVendedorController::class, 'index']);
        Route::get('{vendedorId}', [PerfilVendedorController::class, 'show']);
    });

    // Calendário Inteligente
    Route::prefix('eventos-calendario')->group(function () {
        Route::get('proximos', [EventoCalendarioController::class, 'proximos']);
    });
    Route::apiResource('eventos-calendario', EventoCalendarioController::class);

    // Termômetro da Empresa
    Route::prefix('termometro')->group(function () {
        Route::get('status', [TermometroController::class, 'status']);
        Route::get('config', [TermometroController::class, 'config']);
        Route::put('config', [TermometroController::class, 'atualizarConfig']);
    });

    // Pós-Venda
    Route::prefix('pos-venda')->group(function () {
        Route::get('historico-cliente/{clienteId}', [PosVendaController::class, 'historicoCliente']);
        Route::post('executar-verificacoes', [PosVendaController::class, 'executarVerificacoes']);
        Route::post('{id}/atualizar-status', [PosVendaController::class, 'atualizarStatus']);
        Route::post('{id}/transferir', [PosVendaController::class, 'transferir']);
        Route::post('{id}/adicionar-observacao', [PosVendaController::class, 'adicionarObservacao']);
        Route::post('{id}/criar-agendamento', [PosVendaController::class, 'criarAgendamento']);
        Route::post('agendamento/{agendamentoId}/concluir', [PosVendaController::class, 'concluirAgendamento']);
    });
    Route::apiResource('pos-venda', PosVendaController::class);
    
    // Treinamento Interno
    Route::prefix('treinamento')->group(function () {
        Route::get('estatisticas', [TreinamentoController::class, 'estatisticas']);
        Route::get('meu-progresso', [\App\Http\Controllers\Api\TreinamentoProgressoController::class, 'meuProgresso']);
        Route::post('marcar-concluido/{treinamentoId}', [\App\Http\Controllers\Api\TreinamentoProgressoController::class, 'marcarComoConcluido']);
        Route::get('progresso-colaborador/{usuarioId}', [\App\Http\Controllers\Api\TreinamentoProgressoController::class, 'progressoColaborador']);
        Route::put('atualizar-colaborador/{usuarioId}', [\App\Http\Controllers\Api\TreinamentoProgressoController::class, 'atualizarColaborador']);
        Route::get('relatorio-por-setor', [\App\Http\Controllers\Api\TreinamentoRelatorioController::class, 'porSetor']);
        Route::get('avisos', [\App\Http\Controllers\Api\TreinamentoAvisoController::class, 'index']);
        Route::post('avisos/{id}/marcar-resolvido', [\App\Http\Controllers\Api\TreinamentoAvisoController::class, 'marcarComoResolvido']);
        Route::post('avisos/executar-verificacoes', [\App\Http\Controllers\Api\TreinamentoAvisoController::class, 'executarVerificacoes']);
        Route::get('avisos/regras', [\App\Http\Controllers\Api\TreinamentoAvisoController::class, 'listarRegras']);
        Route::post('avisos/regras', [\App\Http\Controllers\Api\TreinamentoAvisoController::class, 'salvarRegra']);
    });
    Route::apiResource('treinamento', TreinamentoController::class);
    
    // Cursos/Treinamentos Completos
    Route::prefix('cursos')->group(function () {
        Route::post('upload-capa', [\App\Http\Controllers\Api\CursoController::class, 'uploadCapa']);
        Route::post('upload-arquivo', [\App\Http\Controllers\Api\CursoController::class, 'uploadArquivo']);
        Route::post('upload-video', [\App\Http\Controllers\Api\CursoController::class, 'uploadVideo']);
        Route::get('para-continuacao', [\App\Http\Controllers\Api\CursoController::class, 'listarParaContinuacao']);
        Route::get('meus-treinamentos', [\App\Http\Controllers\Api\CursoController::class, 'meusTreinamentos']);
        Route::post('{id}/iniciar', [\App\Http\Controllers\Api\CursoController::class, 'iniciarTreinamento']);
        Route::put('{id}/progresso', [\App\Http\Controllers\Api\CursoController::class, 'atualizarProgresso']);
        Route::post('{id}/concluir', [\App\Http\Controllers\Api\CursoController::class, 'concluirTreinamento']);
    });
    Route::apiResource('cursos', \App\Http\Controllers\Api\CursoController::class);
    
    // Cálculos Salvos (nova tabela específica)
    Route::apiResource('calculos-salvos', CalculoSavadoController::class);
    Route::prefix('calculos-salvos')->group(function () {
        Route::get('por-cliente', [CalculoSavadoController::class, 'buscarPorCliente']);
    });
    
    // Contas a Receber
    Route::prefix('contas-receber')->group(function () {
        Route::get('recebimentos-clientes', [ContaReceberController::class, 'recebimentosClientes']);
        Route::get('contas-para-aplicar-juros', [ContaReceberController::class, 'contasParaAplicarJuros']);
        Route::post('aplicar-juros-em-lote', [ContaReceberController::class, 'aplicarJurosEmLote']);
        Route::get('contas-com-juros-configurados', [ContaReceberController::class, 'contasComJurosConfigurados']);
        Route::get('contas-parceladas', [ContaReceberController::class, 'contasParceladas']);
    });
    Route::apiResource('contas-receber', ContaReceberController::class);
    Route::prefix('contas-receber/{conta}')->group(function () {
        Route::post('receber', [ContaReceberController::class, 'receber']);
        Route::post('aplicar-juros', [ContaReceberController::class, 'aplicarJuros']);
        Route::post('configurar-juros', [ContaReceberController::class, 'configurarJuros']);
        Route::post('aplicar-juros-programados', [ContaReceberController::class, 'aplicarJurosProgramados']);
        Route::post('registrar-pagamento-parcelamento', [ContaReceberController::class, 'registrarPagamentoComParcelamento']);
        Route::get('parcelas', [ContaReceberController::class, 'listarParcelas']);
    });
    
    // Contas a Pagar
    Route::prefix('contas-pagar')->group(function () {
        Route::get('categorias', [ContaPagarController::class, 'categorias']);
        Route::get('estatisticas', [ContaPagarController::class, 'estatisticas']);
    });
    Route::apiResource('contas-pagar', ContaPagarController::class);
    Route::prefix('contas-pagar/{conta}')->group(function () {
        Route::post('pagar', [ContaPagarController::class, 'pagar']);
        Route::post('marcar-como-paga', [ContaPagarController::class, 'marcarComoPaga']);
    });
    
    // Compromissos
    Route::apiResource('compromissos', CompromissoController::class);
    Route::prefix('compromissos/{compromisso}')->group(function () {
        Route::post('confirmar', [CompromissoController::class, 'confirmar']);
        Route::post('cancelar', [CompromissoController::class, 'cancelar']);
        Route::post('realizar', [CompromissoController::class, 'realizar']);
    });
    Route::get('compromissos/estatisticas', [CompromissoController::class, 'estatisticas']);
    
    // PDV
    Route::prefix('pdv')->group(function () {
        Route::get('historico-vendas', [PDVController::class, 'obterHistoricoVendas']);
        Route::post('historico-vendas', [PDVController::class, 'salvarHistoricoVendas']);
        Route::get('historico-orcamentos', [PDVController::class, 'obterHistoricoOrcamentos']);
        Route::post('historico-orcamentos', [PDVController::class, 'salvarHistoricoOrcamentos']);
    });
    
    // Marketplace routes
    Route::prefix('marketplace')->group(function () {
        Route::get('vendas', [MarketplaceController::class, 'obterVendas']);
        Route::post('vendas', [MarketplaceController::class, 'salvarVendas']);
        Route::post('venda', [MarketplaceController::class, 'salvarVenda']);
        Route::delete('venda/{id}', [MarketplaceController::class, 'excluirVenda']);
        Route::get('debug', [MarketplaceController::class, 'testeDebug']);
    });
    
    // Acabamentos
    Route::apiResource('acabamentos', \App\Http\Controllers\Api\AcabamentoController::class);
    
    // Máquinas
    Route::apiResource('maquinas', \App\Http\Controllers\Api\MaquinaController::class);
    
    // Ordens de Serviço - Rotas literais ANTES do apiResource para não serem capturadas por {id}
    Route::get('ordens-servico/proximo-numero', [OrdemServicoController::class, 'getProximoNumero']);
    Route::get('ordens-servico/em-producao', [OrdemServicoController::class, 'emProducao']);
    Route::get('ordens-servico/a-serem-entregues', [OrdemServicoController::class, 'aSeremEntregues']);
    Route::get('ordens-servico/configuracao-numeracao', [OrdemServicoController::class, 'getConfiguracaoNumeracao']);
    Route::post('ordens-servico/configuracao-numeracao', [OrdemServicoController::class, 'setConfiguracaoNumeracao']);

    Route::prefix('ordens-servico')->group(function () {
        Route::get('entregues', [OrdemServicoController::class, 'entregues']);
        Route::put('{id}/status-producao', [OrdemServicoController::class, 'updateStatusProducao']);
        Route::post('{id}/anexos', [OrdemServicoController::class, 'uploadAnexos']);
        Route::get('{id}/anexos', [OrdemServicoController::class, 'getAnexos']);
        Route::get('verificar-758', [OrdemServicoController::class, 'verificarOS758']);
        Route::post('corrigir-758', [OrdemServicoController::class, 'corrigirOS758']);
    });
    Route::apiResource('ordens-servico', OrdemServicoController::class);

    // Relatório de Produção
    Route::get('relatorio-producao', [RelatorioProducaoController::class, 'index']);

    // Dashboard Configurável
    Route::prefix('dashboard')->group(function () {
        Route::get('widgets-disponiveis', [DashboardController::class, 'getWidgetsDisponiveis']);
        Route::get('configuracao', [DashboardController::class, 'getConfiguracao']);
        Route::post('configuracao', [DashboardController::class, 'salvarConfiguracao']);
        Route::get('widget/{widgetCodigo}', [DashboardController::class, 'getDadosWidget']);
        Route::post('widgets', [DashboardController::class, 'getDadosWidgets']);
    });

    // Kanban
    Route::prefix('kanban')->group(function () {
        Route::get('columns', [KanbanController::class, 'getColumns']);
        Route::post('columns', [KanbanController::class, 'createColumn']);
        Route::put('columns/{id}', [KanbanController::class, 'updateColumn']);
        Route::delete('columns/{id}', [KanbanController::class, 'deleteColumn']);
        Route::post('columns/reorder', [KanbanController::class, 'reorderColumns']);
        Route::get('os', [KanbanController::class, 'getOS']);
        Route::post('os/move', [KanbanController::class, 'moveOS']);
        Route::get('os/{id}', [KanbanController::class, 'getOSDetails']);
        Route::post('os/item-progress', [KanbanController::class, 'updateItemProgress']);
    });

    // Chat Interno
    Route::prefix('chat')->group(function () {
        Route::get('threads', [ChatController::class, 'getThreads']);
        Route::post('threads/direct', [ChatController::class, 'getOrCreateDirectThread']);
        Route::post('threads/group', [ChatController::class, 'createGroup']);
        Route::get('threads/{id}/messages', [ChatController::class, 'getMessages']);
        Route::post('messages', [ChatController::class, 'sendMessage']);
        Route::post('messages/upload', [ChatController::class, 'uploadAttachment']);
        Route::get('unread-count', [ChatController::class, 'getUnreadCount']);
        Route::get('recent-unread', [ChatController::class, 'getRecentUnreadMessages']);
        Route::get('search', [ChatController::class, 'search']);
        Route::post('typing', [ChatController::class, 'updateTypingStatus']);
        Route::get('threads/{id}/typing', [ChatController::class, 'getTypingUsers']);
    });

    // Notas Fiscais (NFe / NFSe)
    Route::prefix('notas-fiscais')->group(function () {
        Route::get('/', [NotaFiscalController::class, 'index']);
        Route::post('emitir', [NotaFiscalController::class, 'emitir']);
        Route::get('por-os/{ordemServicoId}', [NotaFiscalController::class, 'porOrdemServico']);
        Route::get('{id}/consultar', [NotaFiscalController::class, 'consultar']);
        Route::delete('{id}/cancelar', [NotaFiscalController::class, 'cancelar']);
        Route::post('testar-conexao', [NotaFiscalController::class, 'testarConexao']);
        Route::get('configuracoes', [NotaFiscalController::class, 'carregarConfiguracoes']);
        Route::post('configuracoes', [NotaFiscalController::class, 'salvarConfiguracoes']);
    });

    // Catálogo de Partes
    Route::apiResource('catalogo-partes', CatalogoParteController::class);
    Route::post('/catalogo-partes/upload', [CatalogoParteController::class, 'uploadImagem']);

    // Caixa - Abertura e Fechamento
    Route::prefix('caixa')->group(function () {
        Route::get('atual', [CaixaController::class, 'getCaixaAtual']);
        Route::post('abrir', [CaixaController::class, 'abrirCaixa']);
        Route::post('fechar', [CaixaController::class, 'fecharCaixa']);
        Route::get('historico', [CaixaController::class, 'getHistoricoCaixas']);
        Route::get('sessao/{sessaoId}', [CaixaController::class, 'getSessaoCaixa']);
    });

    // Empresa
Route::prefix('empresa')->group(function () {
    Route::get('/', [EmpresaController::class, 'show']);
    Route::get('/test', [EmpresaController::class, 'test']);
    Route::put('/', [EmpresaController::class, 'update']);
    Route::post('logo', [EmpresaController::class, 'uploadLogo']);
});

    // Aparência e Tema
    Route::prefix('aparencia')->group(function () {
        Route::get('theme', [AparenciaController::class, 'getTheme']);
        Route::put('theme', [AparenciaController::class, 'updateTheme']);
        Route::get('themes', [AparenciaController::class, 'getAvailableThemes']);
        // Cores do Dashboard
        Route::get('dashboard-colors', [AparenciaController::class, 'getDashboardColors']);
        Route::put('dashboard-colors', [AparenciaController::class, 'updateDashboardColors']);
        Route::post('dashboard-colors/reset', [AparenciaController::class, 'resetDashboardColors']);
        Route::get('available-colors', [AparenciaController::class, 'getAvailableDashboardColors']);
        // Cores das Ações Rápidas
        Route::get('quick-actions-colors', [AparenciaController::class, 'getQuickActionsColors']);
        Route::put('quick-actions-colors', [AparenciaController::class, 'updateQuickActionsColors']);
        Route::post('quick-actions-colors/reset', [AparenciaController::class, 'resetQuickActionsColors']);
    });

    // Lixeira - Registros Excluídos
    Route::prefix('lixeira')->group(function () {
        Route::get('/', [LixeiraController::class, 'index']);
        Route::post('restore', [LixeiraController::class, 'restore']);
        Route::delete('destroy', [LixeiraController::class, 'destroy']);
        Route::get('{id}/{tabela}', [LixeiraController::class, 'show']);
    });

    // Vendas de Pré-venda (salvas na tabela vendas)
    Route::apiResource('vendas-pre-venda', VendaPreVendaController::class);
    Route::post('vendas-pre-venda/{id}/approve', [VendaPreVendaController::class, 'approve']);
    Route::post('vendas-pre-venda/{id}/reject', [VendaPreVendaController::class, 'reject']);
    Route::post('vendas-pre-venda/{id}/cancel', [VendaPreVendaController::class, 'cancel']);
    Route::post('vendas-pre-venda/{id}/enviar', [VendaPreVendaController::class, 'enviar']);
    
    // Notificações
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
        Route::post('mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('clear-all', [NotificationController::class, 'clearAll']);
        Route::delete('{id}', [NotificationController::class, 'destroy']);
    });
    Route::apiResource('notifications', NotificationController::class)->except(['index', 'destroy']);

    // Notificações do Sistema
    Route::prefix('notificacoes')->group(function () {
        Route::get('/', [NotificacaoController::class, 'index']);
        Route::get('nao-lidas', [NotificacaoController::class, 'naoLidas']);
        Route::post('{id}/marcar-como-lida', [NotificacaoController::class, 'marcarComoLida']);
        Route::post('marcar-todas-como-lidas', [NotificacaoController::class, 'marcarTodasComoLidas']);
        Route::get('estatisticas', [NotificacaoController::class, 'estatisticas']);
    });
    Route::apiResource('notificacoes', NotificacaoController::class)->except(['index']);

    // Preferências de Notificação do Usuário
    Route::prefix('user-notification-preferences')->group(function () {
        Route::get('/', [UserNotificationPreferencesController::class, 'index']);
        Route::put('/', [UserNotificationPreferencesController::class, 'update']);
    });

    // Serviços Adicionais
    Route::apiResource('servicos-adicionais', \App\Http\Controllers\Api\ServicoAdicionalController::class, [
        'parameters' => ['servicos-adicionais' => 'servicoAdicional']
    ]);
    Route::patch('servicos-adicionais/{servicoAdicional}/toggle-status', [\App\Http\Controllers\Api\ServicoAdicionalController::class, 'toggleStatus']);
    Route::get('servicos-adicionais/categoria/{categoria}', [\App\Http\Controllers\Api\ServicoAdicionalController::class, 'getByCategory']);
    Route::get('servicos-adicionais/tipo/{tipo}', [\App\Http\Controllers\Api\ServicoAdicionalController::class, 'getByType']);

    // Gerenciador de Tenants (apenas administradores)
    Route::middleware(['ensure.admin'])->prefix('admin')->group(function () {
        Route::get('tenants', [TenantManagerController::class, 'index']);
        Route::get('tenants/{id}', [TenantManagerController::class, 'show']);
        Route::put('tenants/{id}', [TenantManagerController::class, 'update']);
        Route::post('tenants/{id}/toggle-ativo', [TenantManagerController::class, 'toggleAtivo']);
    });
});
