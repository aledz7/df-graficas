/**
 * Script para recuperar a OS 567 que foi perdida
 * Execute no console do navegador (F12) na página do histórico de OS
 */

import { apiDataManager } from '@/lib/apiDataManager';
import { osService } from '@/services/api';

export const recuperarOS567 = async () => {
  console.log('🔍 Buscando OS 567 no localStorage...');
  
  try {
    // Buscar no localStorage
    const ordensServico = await apiDataManager.getDataAsArray('ordens_servico_salvas');
    console.log(`📦 Total de OS no localStorage: ${ordensServico.length}`);
    
    // Buscar por ID 567, numero_os 567, ou id_os contendo 567
    const os567 = ordensServico.find(os => 
      os.id === 567 || 
      os.id_os === '567' || 
      os.id_os === 'OS-567' ||
      os.id_os?.includes('567') ||
      os.numero_os === 567 ||
      os.numero_os === '567'
    );
    
    if (os567) {
      console.log('✅ OS 567 encontrada no localStorage!', os567);
      
      // Verificar se corresponde ao orçamento da imagem
      const correspondeImagem = 
        (os567.valor_total_os >= 118.00 && os567.valor_total_os <= 118.50) &&
        os567.cliente_info?.nome === 'CLIENTE DIVERSOS' &&
        os567.vendedor_nome === 'MATHEUS SOUSA BARROS' &&
        os567.itens?.some(item => 
          item.nome_servico_produto?.includes('ACRILICO') || 
          item.nome_servico_produto?.includes('ACRÍLICO')
        );
      
      if (correspondeImagem) {
        console.log('✅ Esta OS corresponde ao orçamento da imagem!');
        console.log('📋 Dados da OS:', {
          id: os567.id,
          id_os: os567.id_os,
          numero_os: os567.numero_os,
          status: os567.status_os,
          valor: os567.valor_total_os,
          cliente: os567.cliente_info?.nome,
          vendedor: os567.vendedor_nome,
          data_criacao: os567.data_criacao,
          itens: os567.itens
        });
        
        // Tentar salvar no banco se não tiver ID
        if (!os567.id || os567.isLocalOnly) {
          console.log('💾 Tentando salvar OS no banco...');
          try {
            const resultado = await osService.create(os567);
            console.log('✅ OS salva no banco com sucesso!', resultado);
            return resultado;
          } catch (error) {
            console.error('❌ Erro ao salvar OS no banco:', error);
            console.log('📋 Você pode copiar os dados acima e salvar manualmente');
            return os567;
          }
        } else {
          console.log('✅ OS já tem ID no banco:', os567.id);
          return os567;
        }
      } else {
        console.log('⚠️ OS encontrada mas não corresponde exatamente à imagem');
        console.log('📋 Dados encontrados:', os567);
      }
    } else {
      console.log('❌ OS 567 não encontrada no localStorage');
      
      // Buscar todas as OS do dia 17/11/2025
      const os1711 = ordensServico.filter(os => {
        if (os.data_criacao) {
          const data = new Date(os.data_criacao);
          return data.getDate() === 17 && 
                 data.getMonth() === 10 && // Novembro é mês 10 (0-indexed)
                 data.getFullYear() === 2025;
        }
        return false;
      });
      
      if (os1711.length > 0) {
        console.log(`📅 Encontradas ${os1711.length} OS do dia 17/11/2025 no localStorage:`);
        os1711.forEach(os => {
          console.log(`  - OS ID: ${os.id}, ID_OS: ${os.id_os}, Valor: R$ ${os.valor_total_os}, Status: ${os.status_os}`);
        });
        
        // Buscar por valor próximo a 118,32
        const osValorProximo = os1711.filter(os => 
          os.valor_total_os >= 118.00 && os.valor_total_os <= 118.50
        );
        
        if (osValorProximo.length > 0) {
          console.log(`✅ Encontrada(s) ${osValorProximo.length} OS com valor próximo a R$ 118,32:`);
          osValorProximo.forEach(os => {
            console.log('📋 OS encontrada:', os);
          });
          return osValorProximo[0];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar OS 567:', error);
    return null;
  }
};

// Instruções para usar no console:
console.log(`
📋 Para recuperar a OS 567, execute no console do navegador:

import { recuperarOS567 } from '@/utils/recuperarOS567';
recuperarOS567();

Ou copie e cole este código no console:
(async () => {
  const { apiDataManager } = await import('/src/lib/apiDataManager.js');
  const ordensServico = await apiDataManager.getDataAsArray('ordens_servico_salvas');
  const os567 = ordensServico.find(os => 
    os.id === 567 || 
    os.id_os?.includes('567') ||
    (os.valor_total_os >= 118.00 && os.valor_total_os <= 118.50 && 
     os.cliente_info?.nome === 'CLIENTE DIVERSOS' &&
     os.vendedor_nome === 'MATHEUS SOUSA BARROS')
  );
  if (os567) {
    console.log('✅ OS encontrada!', os567);
    // Copie os dados acima e tente salvar manualmente ou me envie para recuperação
  } else {
    console.log('❌ OS não encontrada no localStorage');
  }
})();
`);

