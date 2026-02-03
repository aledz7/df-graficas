import api from './api';

class UserNotificationPreferencesService {
  /**
   * Obter as preferências de notificação do usuário
   */
  async getPreferences() {
    try {
      const response = await api.get('/api/user-notification-preferences');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter preferências de notificação:', error);
      throw error;
    }
  }

  /**
   * Atualizar as preferências de notificação do usuário
   */
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/api/user-notification-preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar preferências de notificação:', error);
      throw error;
    }
  }

  /**
   * Atualizar uma preferência específica
   */
  async updatePreference(key, value) {
    try {
      const currentPreferences = await this.getPreferences();
      const updatedPreferences = {
        ...currentPreferences.data,
        [key]: value
      };
      
      return await this.updatePreferences(updatedPreferences);
    } catch (error) {
      console.error(`Erro ao atualizar preferência ${key}:`, error);
      throw error;
    }
  }
}

export default new UserNotificationPreferencesService();
