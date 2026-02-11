import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RedirectToFirstAllowedRoute } from '@/components/RedirectToFirstAllowedRoute';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProdutosPage = lazy(() => import('@/pages/ProdutosPage'));
const ClientesPage = lazy(() => import('@/pages/ClientesPage'));
const OrdensServicoPage = lazy(() => import('@/pages/OrdensServicoPage'));
const PDVPage = lazy(() => import('@/pages/PDVPage'));
const FluxoCaixaPage = lazy(() => import('@/pages/FluxoCaixaPage'));
const ContasReceberPage = lazy(() => import('@/pages/ContasReceberPage'));
const ContasPagarPage = lazy(() => import('@/pages/ContasPagarPage'));
const RelatoriosPage = lazy(() => import('@/pages/RelatoriosPage'));
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage'));
const EmpresaSettingsPage = lazy(() => import('@/pages/EmpresaSettingsPage'));
const AdminSettingsPage = lazy(() => import('@/pages/AdminSettingsPage'));
const AdminTenantsPage = lazy(() => import('@/pages/AdminTenantsPage'));
const CategoriasPage = lazy(() => import('@/pages/CategoriasPage'));
const CoresPage = lazy(() => import('@/pages/CoresPage'));
const TamanhosPage = lazy(() => import('@/pages/TamanhosPage'));
const FornecedoresPage = lazy(() => import('@/pages/FornecedoresPage'));
const FuncionariosPage = lazy(() => import('@/pages/FuncionariosPage'));
const MaquinasPage = lazy(() => import('@/pages/MaquinasPage'));
const EntradaEstoquePage = lazy(() => import('@/pages/EntradaEstoquePage'));
const OSHistoricoPage = lazy(() => import('@/pages/OSHistoricoPage'));
const OSEmProducaoPage = lazy(() => import('@/pages/OSEmProducaoPage'));
const OSAseremEntreguesPage = lazy(() => import('@/pages/OSAseremEntreguesPage'));
const OSPedidosEntreguesPage = lazy(() => import('@/pages/OSPedidosEntreguesPage'));
const EnvelopamentoPage = lazy(() => import('@/pages/EnvelopamentoPage'));
const OrcamentosEnvelopamentoPage = lazy(() => import('@/pages/OrcamentosEnvelopamentoPage'));
const ConfiguracaoAcabamentosPage = lazy(() => import('@/pages/ConfiguracaoAcabamentosPage'));
const BarcodeGeneratorPage = lazy(() => import('@/pages/BarcodeGeneratorPage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const AgendaPage = lazy(() => import('@/pages/AgendaPage'));
const LixeiraPage = lazy(() => import('@/pages/LixeiraPage'));
const AuditoriaPage = lazy(() => import('@/pages/AuditoriaPage'));
const ContasBancariasPage = lazy(() => import('@/pages/ContasBancariasPage'));
const MaquinasCartaoPage = lazy(() => import('@/pages/MaquinasCartaoPage'));
const FormasPagamentoPage = lazy(() => import('@/pages/FormasPagamentoPage'));
const CuponsPage = lazy(() => import('@/pages/CuponsPage'));
const PDVHistoricoPage = lazy(() => import('@/pages/PDVHistoricoPage'));
const PDVReciboPage = lazy(() => import('@/pages/PDVReciboPage'));
const OSReciboPage = lazy(() => import('@/pages/OSReciboPage'));
const MarketplacePage = lazy(() => import('@/pages/MarketplacePage'));
const MarketplaceHistoricoPage = lazy(() => import('@/pages/MarketplaceHistoricoPage'));
const MarketplaceNotaEmbalagem = lazy(() => import('@/pages/MarketplaceNotaEmbalagem'));
const SangriaSuprimentoPage = lazy(() => import('@/pages/SangriaSuprimentoPage'));
const RecebimentoGeralPage = lazy(() => import('@/pages/RecebimentoGeralPage'));
const AberturaCaixaPage = lazy(() => import('@/pages/AberturaCaixaPage'));
const FechamentoCaixaPage = lazy(() => import('@/pages/FechamentoCaixaPage'));
const HistoricoCaixaPage = lazy(() => import('@/pages/HistoricoCaixaPage'));
const CalculadoraPage = lazy(() => import('@/pages/CalculadoraPage'));
const CalculadoraServicosPage = lazy(() => import('@/pages/CalculadoraServicosPage'));
const CalculadoraHistoricoPage = lazy(() => import('@/pages/CalculadoraHistoricoPage'));
const RelatorioComissoesPage = lazy(() => import('@/pages/RelatorioComissoesPage'));
const RelatorioLucratividadeProdutosPage = lazy(() => import('@/pages/RelatorioLucratividadeProdutosPage'));
const RelatorioSimplificadoPage = lazy(() => import('@/pages/RelatorioSimplificadoPage'));
const DescontosFuncionariosPage = lazy(() => import('@/pages/DescontosFuncionariosPage'));
const ConfiguracaoPrecosEnvelopamentoPage = lazy(() => import('@/pages/ConfiguracaoPrecosEnvelopamentoPage'));
const CorrigirOS758Page = lazy(() => import('@/pages/CorrigirOS758Page'));
const AparenciaSettingsPage = lazy(() => import('@/pages/AparenciaSettingsPage'));
const ProdutoConfigPage = lazy(() => import('@/pages/ProdutoConfigPage'));
const ConfiguracaoPontosPage = lazy(() => import('@/pages/ConfiguracaoPontosPage'));
const NfeSettingsPage = lazy(() => import('@/pages/NfeSettingsPage'));
const NovoProdutoPage = lazy(() => import('@/pages/NovoProdutoPage'));

// Relatórios Financeiros
const FaturamentoDetalhadoPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioFaturamento'));
const RelatorioFluxoCaixaPage = lazy(() => import('@/components/fluxo-caixa/RelatorioFluxoCaixa')); // Usando o componente existente para a página
const ContasReceberRelatorioPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioContasReceber'));
const ContasPagarRelatorioPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioContasPagar'));
const RelatorioMovimentacoesBancariasPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioMovimentacoesBancarias'));
const RelatorioPagamentosPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioPagamentos'));
const RelatorioSangriasSuprimentosPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioSangriasSuprimentos'));
const RelatorioGeralRecebimentosPage = lazy(() => import('@/components/relatorios/financeiros/RelatorioRecebimentos'));

// Relatórios Operacionais
const VendasGeraisRelatorioPage = lazy(() => import('@/components/relatorios/operacionais/RelatorioVendas'));
const OrdensServicoRelatorioPage = lazy(() => import('@/components/relatorios/operacionais/RelatorioOS'));
const EnvelopamentosRelatorioPage = lazy(() => import('@/components/relatorios/operacionais/RelatorioEnvelopamento'));
const EstoqueRelatorioPage = lazy(() => import('@/components/relatorios/operacionais/RelatorioProdutos')); // Reutilizando para estoque

// Relatórios Gerenciais (Alguns já existem, outros serão criados se necessário)
// RelatorioComissoesPage já importado
const DesempenhoVendedorPage = lazy(() => import('@/components/relatorios/gerenciais/RelatorioVendasVendedor')); // Reutilizando
const DividasClientesPage = lazy(() => import('@/components/relatorios/gerenciais/RelatorioDividasClientes'));
const RelatorioRecebimentosClientesPage = lazy(() => import('@/components/relatorios/gerenciais/RelatorioRecebimentosClientes'));
const RelatorioAnaliticoPage = lazy(() => import('@/pages/RelatorioAnaliticoPage'));
const RelatorioVendasComMetasPage = lazy(() => import('@/pages/RelatorioVendasComMetasPage'));
const RelatorioAniversariantesPage = lazy(() => import('@/pages/RelatorioAniversariantesPage'));
const RelatorioClientesQueMaisCompraramPage = lazy(() => import('@/pages/RelatorioClientesQueMaisCompraramPage'));


const AppRoutes = ({ logoUrl, nomeEmpresa, vendedorAtual, theme, setTheme, setAppLogoUrl, setAppNomeEmpresa, setAppNomeSistema }) => {
  return (
    <Routes>
      <Route path="/" element={<RedirectToFirstAllowedRoute />} />
      <Route path="/dashboard" element={<DashboardPage vendedorAtual={vendedorAtual} />} />
      
      {/* Cadastros */}
      <Route path="/cadastros/produtos" element={<ProdutosPage />} />
      <Route path="/cadastros/novo-produto" element={<NovoProdutoPage vendedorAtual={vendedorAtual} />} />
      <Route path="/cadastros/clientes" element={<ClientesPage />} />
      <Route path="/cadastros/categorias" element={<CategoriasPage />} />
      <Route path="/cadastros/cores" element={<CoresPage />} />
      <Route path="/cadastros/tamanhos" element={<TamanhosPage />} />
      <Route path="/cadastros/fornecedores" element={<FornecedoresPage />} />
      <Route path="/cadastros/funcionarios" element={<FuncionariosPage />} />
      <Route path="/cadastros/maquinas-equipamentos" element={<MaquinasPage />} />
      <Route path="/cadastros/acabamentos-servicos" element={<ConfiguracaoAcabamentosPage />} />
      <Route path="/cadastros/contas-bancarias" element={<ContasBancariasPage />} />
      <Route path="/cadastros/maquinas-cartao" element={<MaquinasCartaoPage />} />
      <Route path="/cadastros/formas-pagamento" element={<FormasPagamentoPage />} />
      <Route path="/cadastros/cupons" element={<CuponsPage />} />

      {/* Operacional */}
      <Route path="/operacional/ordens-servico" element={<OrdensServicoPage logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} vendedorAtual={vendedorAtual} />} />
      <Route path="/operacional/ordens-servico/:id" element={<OrdensServicoPage logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} vendedorAtual={vendedorAtual} />} />
      <Route path="/operacional/os-historico" element={<OSHistoricoPage vendedorAtual={vendedorAtual} />} />
      <Route path="/operacional/os-em-producao" element={<OSEmProducaoPage />} />
      <Route path="/operacional/os-entregar" element={<OSAseremEntreguesPage />} />
      <Route path="/operacional/os-entregues" element={<OSPedidosEntreguesPage />} />
      <Route path="/operacional/pdv" element={<PDVPage vendedorAtual={vendedorAtual} />} />
      <Route path="/operacional/pdv-historico" element={<PDVHistoricoPage />} />
      <Route path="/pdv/recibo/:id" element={<PDVReciboPage logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} />} />
      <Route path="/os/recibo/:id" element={<OSReciboPage logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} />} />
      <Route path="/operacional/entrada-estoque" element={<EntradaEstoquePage />} />
      <Route path="/operacional/gerador-etiquetas" element={<BarcodeGeneratorPage />} />

      {/* Envelopamento */}
      <Route path="/operacional/envelopamento" element={<EnvelopamentoPage vendedorAtual={vendedorAtual} />} />
      <Route path="/operacional/orcamentos-envelopamento" element={<OrcamentosEnvelopamentoPage />} />
      <Route path="/operacional/envelopamento/configuracao-precos" element={<ConfiguracaoPrecosEnvelopamentoPage />} />


      {/* Financeiro */}
      <Route path="/financeiro/contas-receber" element={<ContasReceberPage />} />
      <Route path="/financeiro/contas-pagar" element={<ContasPagarPage />} />
      <Route path="/financeiro/recebimento" element={<RecebimentoGeralPage />} />
      <Route path="/financeiro/sangria-suprimento" element={<SangriaSuprimentoPage vendedorAtual={vendedorAtual} />} />
      <Route path="/financeiro/descontos-funcionarios" element={<DescontosFuncionariosPage />} />
      <Route path="/financeiro/corrigir-os-758" element={<CorrigirOS758Page />} />

      {/* Caixa */}
      <Route path="/caixa/fluxo-caixa" element={<FluxoCaixaPage />} />
      <Route path="/caixa/abertura-caixa" element={<AberturaCaixaPage vendedorAtual={vendedorAtual}/>} />
      <Route path="/caixa/fechamento-caixa" element={<FechamentoCaixaPage vendedorAtual={vendedorAtual} />} />
      <Route path="/caixa/historico-caixa" element={<HistoricoCaixaPage />} />


      {/* Relatórios */}
      <Route path="/relatorios" element={<RelatoriosPage />} />
      <Route path="/relatorios/simplificado" element={<RelatorioSimplificadoPage />} />
      
      {/* Novas Rotas de Relatórios */}
      <Route path="/relatorios/financeiro/faturamento-detalhado" element={<FaturamentoDetalhadoPage />} />
      <Route path="/relatorios/financeiro/fluxo-caixa" element={<FluxoCaixaPage />} /> {/* Reutilizando a página existente */}
      <Route path="/relatorios/financeiro/contas-a-receber" element={<ContasReceberRelatorioPage />} />
      <Route path="/relatorios/financeiro/contas-a-pagar" element={<ContasPagarRelatorioPage />} />
      <Route path="/relatorios/financeiro/movimentacoes-bancarias" element={<RelatorioMovimentacoesBancariasPage />} />
      <Route path="/relatorios/financeiro/pagamentos-recebidos" element={<RelatorioPagamentosPage />} />
      <Route path="/relatorios/financeiro/sangrias-suprimentos" element={<RelatorioSangriasSuprimentosPage />} />
      <Route path="/relatorios/financeiro/geral-recebimentos" element={<RelatorioGeralRecebimentosPage />} />

      <Route path="/relatorios/operacional/vendas-gerais" element={<VendasGeraisRelatorioPage vendedorAtual={vendedorAtual} />} />
      <Route path="/relatorios/operacional/ordens-de-servico" element={<OrdensServicoRelatorioPage />} />
      <Route path="/relatorios/operacional/envelopamentos" element={<EnvelopamentosRelatorioPage />} />
      <Route path="/relatorios/operacional/produtos-e-estoque" element={<EstoqueRelatorioPage />} />
      <Route path="/relatorios/operacional/lucratividade-por-produto" element={<RelatorioLucratividadeProdutosPage />} />
      <Route path="/relatorios/operacional/analitico" element={<RelatorioAnaliticoPage />} />
      <Route path="/relatorios/operacional/vendas-com-metas" element={<RelatorioVendasComMetasPage />} />
      
      <Route path="/relatorios/gerencial/comissoes" element={<RelatorioComissoesPage />} />
      <Route path="/relatorios/gerencial/desempenho-por-vendedor" element={<DesempenhoVendedorPage />} />
      <Route path="/relatorios/gerencial/dividas-de-clientes" element={<DividasClientesPage />} />
      <Route path="/relatorios/gerencial/recebimentos-por-cliente" element={<RelatorioRecebimentosClientesPage />} />
      <Route path="/relatorios/gerencial/aniversariantes-mes" element={<RelatorioAniversariantesPage />} />
      <Route path="/relatorios/gerencial/clientes-que-mais-compraram" element={<RelatorioClientesQueMaisCompraramPage />} />


      {/* Ferramentas */}
      <Route path="/ferramentas/feed-atividades" element={<FeedPage />} />
      <Route path="/ferramentas/agenda" element={<AgendaPage />} />
      <Route path="/ferramentas/lixeira" element={<LixeiraPage vendedorAtual={vendedorAtual}/>} />
      <Route path="/ferramentas/auditoria" element={<AuditoriaPage />} />
      <Route path="/ferramentas/calculadora-metricas" element={<CalculadoraPage />} />
      <Route path="/ferramentas/calculadora-servicos" element={<CalculadoraServicosPage />} />
      <Route path="/ferramentas/calculadora-historico" element={<CalculadoraHistoricoPage />} />
      
      {/* Marketplace */}
      <Route path="/marketplace/vendas" element={<MarketplacePage vendedorAtual={vendedorAtual} />} />
      <Route path="/marketplace/historico" element={<MarketplaceHistoricoPage logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} />} />
      <Route path="/marketplace/nota-embalagem/:id" element={<MarketplaceNotaEmbalagem logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} />} />
      
      {/* Configurações */}
      <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      <Route path="/configuracoes/empresa" element={<EmpresaSettingsPage logoUrl={logoUrl} setAppLogoUrl={setAppLogoUrl} setAppNomeEmpresa={setAppNomeEmpresa} setAppNomeSistema={setAppNomeSistema} />} />
      <Route path="/configuracoes/admin" element={<AdminSettingsPage setAppNomeSistema={setAppNomeSistema} />} />
      <Route path="/configuracoes/tenants" element={<AdminTenantsPage />} />
      <Route path="/configuracoes/aparencia" element={<AparenciaSettingsPage theme={theme} setTheme={setTheme} />} />
      <Route path="/configuracoes/produtos-estoque" element={<ProdutoConfigPage />} />
      <Route path="/configuracoes/pontos" element={<ConfiguracaoPontosPage />} />
      <Route path="/configuracoes/nota-fiscal" element={<NfeSettingsPage />} />
      <Route path="/configuracoes/modelos" element={<AdminSettingsPage section="modelos" />} />
      <Route path="/configuracoes/taxas" element={<AdminSettingsPage section="taxas" />} />
      <Route path="/configuracoes/impressao" element={<AdminSettingsPage section="impressao" />} />
      <Route path="/configuracoes/seguranca" element={<AdminSettingsPage section="seguranca" />} />
      <Route path="/configuracoes/financeiro" element={<AdminSettingsPage section="financeiro" />} />
      <Route path="/configuracoes/marketplace" element={<AdminSettingsPage section="marketplace" />} />
      <Route path="/configuracoes/pdv" element={<AdminSettingsPage section="pdv" />} />


      <Route path="*" element={<div className="flex flex-1 justify-center items-center h-full text-xl font-semibold">Página não encontrada</div>} />
    </Routes>
  );
};

export default AppRoutes;