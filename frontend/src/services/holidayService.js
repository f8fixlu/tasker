import api from './api';

export const holidayService = {
  async getPhilippineHolidays(year) {
    try {
      const data = await api.get('/holidays/philippines', { year });
      return data.holidays || [];
    } catch (error) {
      console.error('Error fetching Philippine holidays:', error);
      return [];
    }
  }
};
