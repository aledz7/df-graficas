import { v4 as uuidv4 } from 'uuid';

export const loadAndInitialize = async (key, defaultValue, itemDefaultValue = null) => {
  let data = defaultValue;
  try {
    const storedStr = await apiDataManager.getItem(key);
    
    if (storedStr && storedStr !== "undefined" && storedStr !== "null") {
      const parsedData = JSON.parse(storedStr); 

      if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue) &&
          typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
        data = { ...defaultValue, ...parsedData };
      } else if (Array.isArray(defaultValue) && Array.isArray(parsedData)) {
        if (itemDefaultValue && typeof itemDefaultValue === 'object' && itemDefaultValue !== null) {
           data = parsedData.map(item => 
            typeof item === 'object' && item !== null 
            ? { ...itemDefaultValue, ...item } 
            : item
          );
        } else {
          data = parsedData;
        }
        if (parsedData.length === 0 && defaultValue.length > 0 && key !== 'produtos' && key !== 'clientes' && key !== 'lancamentosFluxoCaixa' && key !== 'categoriasFluxoCaixa' && key !== 'historico_caixas' && key !== 'envelopamentosOrcamentos' && key !== 'descontos_funcionarios' && key !== 'registros_auditoria' && key !== 'calculos_salvos') { 
            data = defaultValue;
        } else if (parsedData.length === 0 && (key === 'produtos' || key === 'clientes' || key === 'calculos_salvos' || key === 'lancamentosFluxoCaixa' || key === 'categoriasFluxoCaixa' || key === 'historico_caixas' || key === 'envelopamentosOrcamentos' || key === 'descontos_funcionarios' || key === 'registros_auditoria') && defaultValue.length > 0) {
            data = defaultValue;
        }
      } else {
        data = parsedData; 
      }
    } else if (storedStr === "undefined" || storedStr === "null") {
      console.warn(`LocalStorage item ${key} was the string "${storedStr}". Using and saving default value.`);
      data = defaultValue; 
    }
    
    await apiDataManager.setItem(key, data); 
  } catch (e) {
    console.error(`Erro ao carregar/parsear ${key} (valor: "${await apiDataManager.getItem(key)}") do localStorage. Usando e salvando valor padrão. Erro:`, e);
    await apiDataManager.setItem(key, defaultValue); 
    data = defaultValue; 
  }
  return data;
};

export const initializeAppData = async ({
  setTheme,
  setLogoUrl,
  setNomeEmpresa,
  setNomeSistema,
  setClientes,
  setVendedores,
  setVendedorAtual,
  setProdutosComEstoqueBaixo,
  toast 
}) => {
  const savedTheme = await apiDataManager.getItem('theme') || 'light';
  setTheme(savedTheme);
  document.documentElement.className = savedTheme;
  const savedLogo = await apiDataManager.getItem('logoUrl') || '';
  setLogoUrl(savedLogo);
  
  const defaultEmpresaSettings = {
    nomeFantasia: 'JET-IMPRE SOLUCOES GRAFICAS LTDA',
    razaoSocial: 'JET-IMPRE SOLUCOES GRAFICAS LTDA',
    cnpj: '22.273.827/0001-19',
    telefone: '(91) 3226-6102',
    whatsapp: '(91) 98333-3853',
    email: 'JETIMPREBELEM@GMAIL.COM',
    enderecoCompleto: 'TRAVESSA SAO PEDRO 566, BAIRRO: CAMPINA, BELEM-PA, CEP: 66023-570',
    instagram: '',
    site: '',
    mensagemPersonalizadaRodape: 'Obrigado pela preferência!',
    nomeSistema: 'Sistema Gráficas',
  };
  const empresaSettingsData = loadAndInitialize('empresaSettings', defaultEmpresaSettings);
  setNomeEmpresa(empresaSettingsData.nomeFantasia);
  setNomeSistema(empresaSettingsData.nomeSistema);

  const defaultAdminSettings = {
    preco_aplicacao_envelopamento: '0', 
    preco_remocao_envelopamento: '0',   
    preco_lixamento_envelopamento: '0', 
    preco_pelicula_envelopamento: '0',
  };
  loadAndInitialize('envelopamentoPrecos', defaultAdminSettings);
  
  // Removida a inicialização de categorias de produtos do localStorage
  // As categorias de produtos agora são gerenciadas exclusivamente pela API
  
  // Removida a inicialização de produtos do localStorage
  // Os produtos agora são gerenciados exclusivamente pela API
  // A contagem de produtos com estoque baixo é obtida diretamente da API em App.jsx

  const defaultMaquinas = [ { id: 'maq1', nome: 'Impressora Solvent HD-1600', funcao: 'Impressão de Banners e Adesivos', largura: '160 cm' } ];
  loadAndInitialize('maquinas', defaultMaquinas);
  
  const defaultMaquinasCartao = [
    { id: 'mc1', nome: 'Tom T3', taxas: [
      { id: 't1', parcelas: 1, tipo: 'Débito', valor: 1.39 },
      { id: 't2', parcelas: 1, tipo: 'Crédito à Vista', valor: 3.15 },
      { id: 't3', parcelas: 2, tipo: 'Crédito Parcelado', valor: 5.40 },
      { id: 't4', parcelas: 3, tipo: 'Crédito Parcelado', valor: 6.50 },
      { id: 't5', parcelas: 4, tipo: 'Crédito Parcelado', valor: 7.60 },
      { id: 't6', parcelas: 5, tipo: 'Crédito Parcelado', valor: 8.70 },
      { id: 't7', parcelas: 6, tipo: 'Crédito Parcelado', valor: 9.80 },
      { id: 't8', parcelas: 12, tipo: 'Crédito Parcelado', valor: 15.97 },
    ]}
  ];
  loadAndInitialize('maquinasCartao', defaultMaquinasCartao);

  const defaultFuncionarios = [
      { id: 'func1', nome: 'MASTER', cargo: 'Gerente', comissao: 5, login: 'MASTER', senha: '5CAS', permite_receber_comissao: true, salarioBase: '3000.00', vales: [], faltas: [], permite_desconto_consumo_interno: true, status: 'Ativo' },
  ];
  const storedVendedores = loadAndInitialize('funcionarios', defaultFuncionarios, { permite_receber_comissao: false, senha: '', salarioBase: '0.00', vales: [], faltas: [], permite_desconto_consumo_interno: false, status: 'Ativo' });
  setVendedores(storedVendedores);

  const lastSelectedVendedorId = await apiDataManager.getItem('vendedorAtualId');
  let initialVendedor = null;
  if (lastSelectedVendedorId) {
    initialVendedor = storedVendedores.find(v => v.id === lastSelectedVendedorId);
  }
  if (!initialVendedor && storedVendedores.length > 0) {
    initialVendedor = storedVendedores[0];
  }
  setVendedorAtual(initialVendedor);
  
  const defaultContasBancarias = [
    { 
      id: 'cb1', 
      nomeBanco: 'Banco do Brasil', 
      agencia: '1234-5', 
      conta: '12345-6', 
      chavePix: 'jetimprebelem@gmail.com',
      qrCodeUrl: ''
    },
    { 
      id: 'cb2', 
      nomeBanco: 'Caixa Econômica', 
      agencia: '0987-6', 
      conta: '54321-0', 
      chavePix: '(91) 98333-3853',
      qrCodeUrl: ''
    }
  ];
  loadAndInitialize('contasBancarias', defaultContasBancarias);
  
  // Removida a inicialização de cores e tamanhos do localStorage
  // Cores e tamanhos agora são gerenciados exclusivamente pela API
  
  const defaultSingleCliente = {id: '', codigo_cliente: '', nome_completo: '', nome: '', apelido_fantasia: '', tipo_pessoa: 'Pessoa Física', cpf_cnpj: '', rg_ie: '', data_nascimento_abertura: '', sexo: 'Prefiro não informar', email: '', telefone_principal: '', whatsapp: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''}, observacoes: '', autorizado_prazo: false, status: true, foto_url: '', historico_compras: [], contas_receber: [], atendimentos: [], pontos: { atuais: 0, utilizados: 0, expirados: 0, historico: [] }, tipo_cadastro_especial: 'Cliente Padrão', funcionario_id_associado: null, classificacao_cliente: 'Padrão', desconto_fixo_os_terceirizado: '0' };
  const defaultClientes = [ { ...defaultSingleCliente, id: 'cli1', codigo_cliente: 'CLI-0001', nome_completo: 'Cliente Padrão', nome: 'Cliente Padrão', apelido_fantasia: 'Consumidor Final', cpf_cnpj: '000.000.000-00', email: 'cliente@padrao.com', telefone_principal: '(00)00000-0000', observacoes: 'Cliente padrão para vendas rápidas.', autorizado_prazo: true, data_nascimento_abertura: '1990-07-15' } ];
  
  const clientesData = loadAndInitialize('clientes', defaultClientes, defaultSingleCliente);
  setClientes(clientesData);
  if(Array.isArray(clientesData)) { 
      const clientesAtualizados = clientesData.map(c => ({
        ...c, 
        autorizado_prazo: typeof c.autorizado_prazo === 'boolean' ? c.autorizado_prazo : false, 
        status: typeof c.status === 'boolean' ? c.status : true, 
        tipo_cadastro_especial: c.tipo_cadastro_especial || 'Cliente Padrão',
        funcionario_id_associado: c.funcionario_id_associado || null,
        classificacao_cliente: c.classificacao_cliente || 'Padrão',
        desconto_fixo_os_terceirizado: c.desconto_fixo_os_terceirizado || '0',
      }));
      await apiDataManager.setItem('clientes', clientesAtualizados);
  }

  const defaultCategoriasFluxoCaixa = [
      { id: 'catfc1', nome: 'Venda de Produtos', tipo: 'entrada' },
      { id: 'catfc2', nome: 'Venda de Serviços', tipo: 'entrada' },
      { id: 'catfc3', nome: 'Outras Receitas', tipo: 'entrada' },
      { id: 'catfc4', nome: 'Pagamento de Fornecedores', tipo: 'saida' },
      { id: 'catfc5', nome: 'Salários', tipo: 'saida' },
      { id: 'catfc6', nome: 'Aluguel', tipo: 'saida' },
      { id: 'catfc7', nome: 'Contas (Água, Luz, Internet)', tipo: 'saida' },
      { id: 'catfc8', nome: 'Marketing', tipo: 'saida' },
      { id: 'catfc9', nome: 'Impostos', tipo: 'saida' },
      { id: 'catfc10', nome: 'Outras Despesas', tipo: 'saida' },
      { id: 'catfc11', nome: 'Sangria de Caixa', tipo: 'saida' },
      { id: 'catfc12', nome: 'Suprimento de Caixa', tipo: 'entrada' },
      { id: 'catfc13', nome: 'Desconto Salarial (Consumo Interno)', tipo: 'entrada', sistema: true },
  ];
  loadAndInitialize('categoriasFluxoCaixa', defaultCategoriasFluxoCaixa);
  loadAndInitialize('lancamentosFluxoCaixa', []);
  
  const defaultDescontosFuncionarios = [
    {
      id: uuidv4(),
      funcionarioId: 'func1', 
      funcionarioNome: 'MASTER',
      data: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), 
      valor: 75.50,
      descricao: 'Compra de material de escritório (Exemplo)',
      tipo: 'PDV',
      referenciaId: 'VENDA-EXEMPLO-1',
      pagoFolha: false,
      dataPagamentoFolha: null,
      observacao: 'Compra realizada no PDV para uso interno.',
    },
    {
      id: uuidv4(),
      funcionarioId: 'func1',
      funcionarioNome: 'MASTER',
      data: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
      valor: 120.00,
      descricao: 'Serviço de impressão particular (Exemplo)',
      tipo: 'OS',
      referenciaId: 'OS-EXEMPLO-1',
      pagoFolha: false,
      dataPagamentoFolha: null,
      observacao: 'Serviço de OS para uso pessoal.',
    }
  ];
  loadAndInitialize('descontos_funcionarios', defaultDescontosFuncionarios);

  const defaultFornecedores = [
      { id: 'forn1', nome: 'Fornecedor de Papel S.A.' },
      { id: 'forn2', nome: 'Tintas & Cia' },
      { id: 'forn3', nome: 'Distribuidora de Lonas' },
  ];
  loadAndInitialize('fornecedores', defaultFornecedores);
  loadAndInitialize('contasPagar', []);
  loadAndInitialize('contasReceber', []);
  loadAndInitialize('movimentacoes_caixa', []);
  loadAndInitialize('calculos_salvos', []);
  loadAndInitialize('historico_entrada_estoque', []);
  loadAndInitialize('calculadora_servicos_adicionais', []);
  loadAndInitialize('lixeira', []);
  loadAndInitialize('orcamentosPDV', []);
  loadAndInitialize('historico_vendas_pdv', []);
  loadAndInitialize('vendas_marketplace', []);
  loadAndInitialize('envelopamentosOrcamentos', []);
  loadAndInitialize('envelopamentoPartesCatalogo', []);
  loadAndInitialize('historico_caixas', []);
  loadAndInitialize('registros_auditoria', []);

  loadAndInitialize('contador_os', 0);
  loadAndInitialize('contador_venda_pdv', 0);
  loadAndInitialize('contador_orcamento_pdv', 0);
  loadAndInitialize('contador_envelopamento', 0);
};