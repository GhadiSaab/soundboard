/**
 * API Client for Sound Board
 */
const API = {
  baseURL: '/api',

  /**
   * Generic fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  /**
   * Get all sounds
   */
  async getSounds() {
    return this.request('/sounds');
  },

  /**
   * Get a single sound by ID
   */
  async getSound(id) {
    return this.request(`/sounds/${id}`);
  },

  /**
   * Upload a sound file
   */
  async uploadSound(file, name) {
    const formData = new FormData();
    formData.append('sound', file);
    if (name) {
      formData.append('name', name);
    }

    const url = `${this.baseURL}/sounds/upload`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },

  /**
   * Play a sound
   */
  async playSound(id) {
    return this.request(`/sounds/${id}/play`, {
      method: 'POST',
    });
  },

  /**
   * Update a sound name
   */
  async updateSound(id, name) {
    return this.request(`/sounds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  /**
   * Delete a sound
   */
  async deleteSound(id) {
    return this.request(`/sounds/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Stop all playback
   */
  async stopPlayback() {
    return this.request('/sounds/stop', {
      method: 'POST',
    });
  },

  /**
   * Get playback status
   */
  async getStatus() {
    return this.request('/sounds/status/current');
  },

  /**
   * Get all settings
   */
  async getSettings() {
    return this.request('/settings');
  },

  /**
   * Get a specific setting
   */
  async getSetting(key) {
    return this.request(`/settings/${key}`);
  },

  /**
   * Update a setting
   */
  async updateSetting(key, value) {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  /**
   * Check if PIN protection is enabled
   */
  async checkPinEnabled() {
    return this.request('/pin/enabled');
  },

  /**
   * Verify PIN
   */
  async verifyPin(pin) {
    return this.request('/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  /**
   * Change PIN
   */
  async changePin(currentPin, newPin) {
    return this.request('/pin/change', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    });
  },
};
