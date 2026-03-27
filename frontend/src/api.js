/**
 * API Configuration and Utilities
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Fetch with timeout
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 180000 = 3 minutes)
 * @returns {Promise} - The response
 */
export async function fetchWithTimeout(url, options = {}, timeout = 180000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - the model is taking longer than expected. Please try a simpler recipe or wait a moment.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make API call with error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise} - The JSON response
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  try {
    const response = await fetchWithTimeout(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || 
        `Server error: ${response.status} ${response.statusText}`
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid response from server');
    }
    throw error;
  }
}

export { API_URL };
