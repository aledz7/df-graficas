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
        if (parsedData.length === 0 && defaultValue.length > 0) { 
            data = defaultValue;
        } else if (parsedData.length === 0 && (key === 'produtos' || key === 'clientes' || key !== 'calculos_salvos' || key === 'lancamentosFluxoCaixa' || key === 'categoriasFluxoCaixa' || key === 'historico_caixas' || key === 'envelopamentosOrcamentos' || key === 'descontos_funcionarios' || key === 'registros_auditoria') && defaultValue.length > 0) {
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

export const initializeAppData = async (setters) => {
  const {
    setTheme,
    setLogoUrl,
    setNomeEmpresa,
    setNomeSistema,
    setClientes: setAppClientes,
    setVendedores,
    setVendedorAtual,
    setProdutosComEstoqueBaixo,
    toast
  } = setters;

  const savedTheme = await apiDataManager.getItem('theme') || 'light';
  setTheme(savedTheme);
  document.documentElement.className = savedTheme;
  const savedLogo = await apiDataManager.getItem('logoUrl') || '';
  setLogoUrl(savedLogo);
  
  const defaultEmpresaSettings = {
    nomeFantasia: 'SOLUCOES GRAFICAS LTDA',
    razaoSocial: 'SOLUCOES GRAFICAS LTDA',
    cnpj: '22.273.827/0001-19',
    telefone: '(61) 99999-9999',
    whatsapp: '(61) 99999-9999',
    email: 'alessandro@dfinformatica.com.br',
    enderecoCompleto: 'RUA JOSE MARIA DA SILVA, 123, BAIRRO: CAMPINA, BELEM-PA, CEP: 66023-570',
    instagram: '',
    site: '',
    mensagemPersonalizadaRodape: 'Obrigado pela preferência!',
    nomeSistema: 'Sistema Gráficas',
    supervisorPassword: '', 
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
  
  const defaultCategories = [
    { id: 'cat1', nome: 'Adesivos', subcategories: [{id: 'subcat1-1', nome: 'Vinil Branco'}, {id: 'subcat1-2', nome: 'Vinil Transparente'}] },
    { id: 'cat2', nome: 'Banners', subcategories: [{id: 'subcat2-1', nome: 'Lona Fosca'}, {id: 'subcat2-2', nome: 'Lona Brilho'}] },
    { id: 'cat3', nome: 'Cartões de Visita', subcategories: [] },
    { id: 'cat4', nome: 'Materiais (Envelopamento)', subcategories: [] },
    { id: 'cat5', nome: 'Impressos Diversos', subcategories: [] },
    { id: 'cat6', nome: 'Serviços Gráficos', subcategories: [] },
    { id: 'cat7', nome: 'Serviços Adicionais (Calculadora)', subcategories: [] },
  ];
  loadAndInitialize('productCategories', defaultCategories);
  
  const defaultSingleProduto = { 
    id: '', 
    codigo_produto: '', 
    nome: '', 
    status: true, 
    unidadeMedida: 'unidade', 
    categoria: '', 
    subcategoriaId: '', 
    descricao_curta: '', 
    descricao_longa: '',
    imagem_principal: '', 
    galeria_urls: [], 
    preco_custo: '0', 
    preco_m2: '0', 
    margem_lucro: '0', 
    preco_venda: '0', 
    preco_promocional: '0', 
    promocao_ativa: false, 
    promo_data_inicio: null, 
    promo_data_fim: null, 
    permite_comissao: false, 
    percentual_comissao: '0', 
    estoque: '0', 
    estoque_minimo: '1', 
    localizacao: '', 
    codigo_barras: '', 
    variacoes_ativa: false, 
    variacoes: [], 
    isComposto: false, 
    composicao: [],
  };
  const defaultProdutos = [
    { ...defaultSingleProduto, id: 'prod-env-1', nome: 'Vinil Adesivo Brilhante XYZ', codigo_produto: 'MAT-001', categoria: 'cat4', descricao_curta: 'Vinil brilhante para diversas aplicações.', imagem_principal: 'https://source.unsplash.com/random/150x150/?vinyl&s=1', preco_custo: '18.50', margem_lucro: '40', preco_venda: '25.90', estoque: '150', estoque_minimo: '20', unidadeMedida: 'm2', tipo_produto: 'm2', preco_m2: '25.90' },
    { ...defaultSingleProduto, id: 'prod-env-2', nome: 'Vinil Fosco Premium ABC', codigo_produto: 'MAT-002', categoria: 'cat4', descricao_curta: 'Vinil fosco de alta qualidade.', imagem_principal: 'https://source.unsplash.com/random/150x150/?texture&s=2', preco_custo: '22.00', margem_lucro: '45', preco_venda: '31.90', estoque: '5', estoque_minimo: '10', unidadeMedida: 'm2', tipo_produto: 'm2', preco_m2: '31.90' },
    { ...defaultSingleProduto, id: 'prod-unit-1', nome: 'Caneca Branca para Sublimação', codigo_produto: 'CAN-001', categoria: 'cat5', descricao_curta: 'Caneca de cerâmica para sublimação.', imagem_principal: 'https://source.unsplash.com/random/150x150/?mug&s=1', preco_custo: '8.00', margem_lucro: '100', preco_venda: '16.00', estoque: '200', estoque_minimo: '50', unidadeMedida: 'unidade', tipo_produto: 'unidade' },
  ];
  const produtosData = loadAndInitialize('produtos', defaultProdutos, defaultSingleProduto);
  const countEstoqueBaixo = produtosData.filter(p => p.status === true && parseFloat(p.estoque || 0) <= parseFloat(p.estoque_minimo || 0)).length;
  setProdutosComEstoqueBaixo(countEstoqueBaixo);

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
      chavePix: 'alessandro@dfinformatica.com.br',
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
  
  const defaultCores = [ { id: 'cor1', nome: 'Preto', hex: '#000000'} ];
  loadAndInitialize('productColors', defaultCores);
  
  const defaultTamanhos = [ { id: 'tam1', nome: 'Pequeno (P)'} ];
  loadAndInitialize('productSizes', defaultTamanhos);
  
  const defaultSingleCliente = {id: '', codigo_cliente: '', nome_completo: '', nome: '', apelido_fantasia: '', tipo_pessoa: 'Pessoa Física', cpf_cnpj: '', rg_ie: '', data_nascimento_abertura: '', sexo: 'Prefiro não informar', email: '', telefone_principal: '', whatsapp: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''}, observacoes: '', autorizado_prazo: false, status: true, foto_url: '', historico_compras: [], contas_receber: [], atendimentos: [], pontos: { atuais: 0, utilizados: 0, expirados: 0, historico: [] }, tipo_cadastro_especial: 'Cliente Padrão', funcionario_id_associado: null, classificacao_cliente: 'Padrão', desconto_fixo_os_terceirizado: '0' };
  const defaultClientes = [ { ...defaultSingleCliente, id: 'cli1', codigo_cliente: 'CLI-0001', nome_completo: 'Cliente Padrão', nome: 'Cliente Padrão', apelido_fantasia: 'Consumidor Final', cpf_cnpj: '000.000.000-00', email: 'cliente@padrao.com', telefone_principal: '(00)00000-0000', observacoes: 'Cliente padrão para vendas rápidas.', autorizado_prazo: true, data_nascimento_abertura: '1990-07-15' } ];
  
  const clientesData = loadAndInitialize('clientes', defaultClientes, defaultSingleCliente);
  setAppClientes(clientesData);
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

export const exportAllData = async (toast) => {
  const allData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      allData[key] = JSON.parse(await apiDataManager.getItem(key));
    } catch (e) {
      allData[key] = await apiDataManager.getItem(key); 
    }
  }
  
  const jsonString = JSON.stringify(allData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_solucoesgraficas_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  if (toast) {
    toast({
      title: "Backup Exportado!",
      description: "Todos os dados foram exportados para um arquivo JSON.",
    });
  }
};

export const importAllData = async (file, toast, setters) => {
  if (!file) {
    if (toast) toast({ title: "Nenhum arquivo selecionado", variant: "destructive" });
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      let itemCount = 0;
      for (const key in importedData) {
        if (Object.prototype.hasOwnProperty.call(importedData, key)) {
          apiDataManager.setItem(key, importedData[key]);
          itemCount++;
        }
      }
      
      if (toast) {
        toast({
          title: "Backup Importado!",
          description: `${itemCount} chaves de dados foram importadas com sucesso. A página será recarregada para aplicar as alterações.`,
          duration: 7000,
        });
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 5000);

    } catch (e) {
      console.error("Erro ao importar dados:", e);
      if (toast) {
        toast({
          title: "Erro na Importação",
          description: "O arquivo selecionado não é um backup válido ou está corrompido.",
          variant: "destructive",
        });
      }
    }
  };
  reader.readAsText(file);
};