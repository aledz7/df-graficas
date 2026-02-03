import { apiDataManager } from '@/lib/apiDataManager';
import { initialOrdemServicoStateSync } from './osConstants';
import { osService } from '@/services/api';

let ultimaVerificacaoBanco = 0;
let maiorNumeroCache = null;

const MIN_INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000; // 5 minutos

const extrairNumeroOS = (os) => {
  if (!os || typeof os !== 'object') {
    return null;
  }

  if (os.numero_os !== undefined && os.numero_os !== null) {
    const numero = parseInt(os.numero_os, 10);
    if (!isNaN(numero)) {
      return numero;
    }
  }

  if (os.id_os && typeof os.id_os === 'string' && os.id_os.startsWith('OS-')) {
    const numero = parseInt(os.id_os.replace('OS-', ''), 10);
    if (!isNaN(numero)) {
      return numero;
    }
  }

  if (os.id !== undefined && os.id !== null) {
    const numero = parseInt(os.id, 10);
    if (!isNaN(numero)) {
      return numero;
    }
  }

  return null;
};

const buscarMaiorNumeroNoBanco = async () => {
  const agora = Date.now();

  if (maiorNumeroCache !== null && agora - ultimaVerificacaoBanco < MIN_INTERVALO_VERIFICACAO_MS) {
    return maiorNumeroCache;
  }

  try {
    const response = await osService.getAll({
      per_page: 1,
      page: 1,
      orderBy: 'data_criacao',
      orderDirection: 'desc'
    });

    const lista = Array.isArray(response?.data) ? response.data : [];
    const maiorEncontrado = extrairNumeroOS(lista[0]);

    if (maiorEncontrado !== null) {
      maiorNumeroCache = maiorEncontrado;
      ultimaVerificacaoBanco = agora;
      return maiorEncontrado;
    }
  } catch (error) {
    console.warn('⚠️ [buscarMaiorNumeroNoBanco] Erro ao consultar API:', error);
  }

  return null;
};

// Função para obter o próximo ID sequencial da OS
export const getNextOSId = async () => {
  try {
    // Tentar obter diretamente do backend para evitar conflitos entre usuários
    try {
      const respostaServidor = await osService.getProximoNumero();
      const numeroServidor = respostaServidor?.numero_os ?? respostaServidor?.data?.numero_os;

      if (numeroServidor !== undefined && numeroServidor !== null) {
        const numeroConvertido = parseInt(numeroServidor, 10);
        if (!isNaN(numeroConvertido)) {
          await apiDataManager.setItem('ultimo_id_os', numeroConvertido.toString());
          return numeroConvertido;
        }
      }
    } catch (erroNumeroServidor) {
      console.warn('⚠️ [getNextOSId] Falha ao consultar próximo número no servidor. Aplicando fallback local.', erroNumeroServidor);
    }

    // Inicializar contador se necessário
    await initializeOSIdCounter();
    
    // Buscar o último ID usado
    const ultimoIdRaw = await apiDataManager.getItem('ultimo_id_os') || '0';
    
    // Tratar caso onde o valor pode ser um JSON
    let ultimoId = ultimoIdRaw;
    if (typeof ultimoIdRaw === 'string' && ultimoIdRaw.includes('{')) {
      try {
        const parsed = JSON.parse(ultimoIdRaw);
        ultimoId = parsed.data || '0';
      } catch (e) {
        console.warn('⚠️ [getNextOSId] Erro ao parsear JSON, usando 0:', ultimoIdRaw);
        ultimoId = '0';
      }
    }
    
    const proximoId = parseInt(ultimoId, 10) + 1;
    
    // Verificar se o resultado é válido
    if (isNaN(proximoId)) {
      console.warn('⚠️ [getNextOSId] proximoId é NaN, limpando contador corrompido');
      await clearCorruptedCounter();
      return 1;
    }
    
    // Verificar se o contador está muito baixo em relação ao banco
    // Se o próximo ID for menor que 100, pode estar desatualizado
    if (proximoId < 100) {
      console.log('🔍 [getNextOSId] Contador pode estar desatualizado, verificando banco...');
      try {
        const response = await osService.getAll({ limit: 1, orderBy: 'data_criacao', orderDirection: 'desc' });
        if (response && response.data && response.data.length > 0) {
          const ultimaOS = response.data[0];
          // Extrair numero_os em vez de usar id (que pode não ser sequencial)
          const ultimoIdBanco = extrairNumeroOS(ultimaOS) || ultimaOS.id;
          if (ultimoIdBanco > proximoId) {
            console.log('🔄 [getNextOSId] Banco tem ID maior, reinicializando contador...', { contador: proximoId, banco: ultimoIdBanco });
            await forceReinitializeFromDatabase();
            return ultimoIdBanco + 1;
          }
        }
      } catch (error) {
        console.warn('⚠️ [getNextOSId] Erro ao verificar banco:', error);
      }
    }
    
    try {
      const maiorIdBanco = await buscarMaiorNumeroNoBanco();

      if (maiorIdBanco !== null && proximoId <= maiorIdBanco) {
        console.log('🔄 [getNextOSId] Ajustando contador local com base no banco de dados...', {
          proximoId,
          maiorIdBanco
        });
        const novoProximoId = maiorIdBanco + 1;
        await apiDataManager.setItem('ultimo_id_os', novoProximoId.toString());
        return novoProximoId;
      }
    } catch (error) {
      console.warn('⚠️ [getNextOSId] Erro ao sincronizar contador com banco:', error);
    }
    
    console.log('🔢 [getNextOSId] Gerando próximo ID:', { ultimoId, proximoId });
    
    // Salvar o próximo ID para uso futuro
    await apiDataManager.setItem('ultimo_id_os', proximoId.toString());
    
    return proximoId;
  } catch (error) {
    console.error('Erro ao gerar próximo ID da OS:', error);
    // Fallback: usar timestamp se houver erro
    return Date.now();
  }
};

// Função para inicializar o contador de IDs se necessário
export const initializeOSIdCounter = async () => {
  try {
    const ultimoIdRaw = await apiDataManager.getItem('ultimo_id_os');
    
    // Verificar se o valor é válido (não é JSON nem NaN)
    let ultimoIdValido = false;
    let ultimoId = ultimoIdRaw;
    
    if (ultimoIdRaw) {
      if (typeof ultimoIdRaw === 'string' && ultimoIdRaw.includes('{')) {
        // É um JSON, tentar extrair o valor
        try {
          const parsed = JSON.parse(ultimoIdRaw);
          ultimoId = parsed.data || '0';
        } catch (e) {
          console.warn('⚠️ [initializeOSIdCounter] Erro ao parsear JSON:', ultimoIdRaw);
          ultimoId = '0';
        }
      }
      
      // Verificar se é um número válido
      const numeroId = parseInt(ultimoId, 10);
      ultimoIdValido = !isNaN(numeroId) && numeroId >= 0;
    }
    
    if (!ultimoIdValido) {
      console.log('🔧 [initializeOSIdCounter] Inicializando contador...');
      
      const maiorNumeroBanco = await buscarMaiorNumeroNoBanco();

      if (maiorNumeroBanco !== null) {
        console.log('📊 [initializeOSIdCounter] Sincronizando contador com número do banco:', maiorNumeroBanco);
        await apiDataManager.setItem('ultimo_id_os', maiorNumeroBanco.toString());
      } else {
        console.log('📝 [initializeOSIdCounter] Nenhuma OS encontrada ou falha na sincronização. Iniciando do 0');
        await apiDataManager.setItem('ultimo_id_os', '0');
      }
    } else {
      console.log('✅ [initializeOSIdCounter] Contador já existe:', ultimoId);
    }
  } catch (error) {
    console.error('❌ [initializeOSIdCounter] Erro ao inicializar contador:', error);
    // Fallback: definir como 0
    try {
      await apiDataManager.setItem('ultimo_id_os', '0');
    } catch (fallbackError) {
      console.error('❌ [initializeOSIdCounter] Erro no fallback:', fallbackError);
    }
  }
};

// Função para criar uma nova OS com ID sequencial
export const createNewOSWithSequentialId = async (vendedorAtual = null) => {
  console.log('🏗️ [createNewOSWithSequentialId] Criando nova OS...');
  
  const proximoId = await getNextOSId();
  const osBase = initialOrdemServicoStateSync();
  
  const novaOS = {
    ...osBase,
    id_os: `OS-${proximoId}`,
    numero_os: proximoId,
  };
  
  if (vendedorAtual) {
    novaOS.vendedor_id = vendedorAtual.id;
    novaOS.vendedor_nome = vendedorAtual.nome;
  }
  
  console.log('✅ [createNewOSWithSequentialId] Nova OS criada:', { id_os: novaOS.id_os, numero_os: novaOS.numero_os });
  
  return novaOS;
};

// Função para limpar contador corrompido
export const clearCorruptedCounter = async () => {
  try {
    console.log('🧹 [clearCorruptedCounter] Limpando contador corrompido...');
    await apiDataManager.setItem('ultimo_id_os', '0');
    console.log('✅ [clearCorruptedCounter] Contador limpo e resetado para 0');
  } catch (error) {
    console.error('❌ [clearCorruptedCounter] Erro ao limpar contador:', error);
  }
};

// Função para forçar reinicialização baseada no banco
export const forceReinitializeFromDatabase = async () => {
  try {
    console.log('🔄 [forceReinitializeFromDatabase] Forçando reinicialização do contador...');
    
    // Limpar contador atual
    await apiDataManager.removeItem('ultimo_id_os');
    
    // Buscar último ID do banco (ordenando por data_criacao para garantir o mais recente)
    const response = await osService.getAll({ limit: 1, orderBy: 'data_criacao', orderDirection: 'desc' });
    if (response && response.data && response.data.length > 0) {
      const ultimaOS = response.data[0];
      // Extrair numero_os em vez de usar id (que pode não ser sequencial)
      const ultimoIdNumerico = extrairNumeroOS(ultimaOS) || ultimaOS.id;
      console.log('📊 [forceReinitializeFromDatabase] Último ID do banco:', ultimoIdNumerico);
      await apiDataManager.setItem('ultimo_id_os', ultimoIdNumerico.toString());
      console.log('✅ [forceReinitializeFromDatabase] Contador reinicializado com ID:', ultimoIdNumerico);
      return ultimoIdNumerico;
    }
    
    console.log('⚠️ [forceReinitializeFromDatabase] Nenhuma OS encontrada, iniciando do 0');
    await apiDataManager.setItem('ultimo_id_os', '0');
    return 0;
  } catch (error) {
    console.error('❌ [forceReinitializeFromDatabase] Erro ao reinicializar:', error);
    await apiDataManager.setItem('ultimo_id_os', '0');
    return 0;
  }
};
