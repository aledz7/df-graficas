import api from './api';

class IndicacaoService {
  async enviarIndicacao(payload) {
    const response = await api.post('/api/indicacoes', payload);
    return response.data;
  }
}

export const indicacaoService = new IndicacaoService();
