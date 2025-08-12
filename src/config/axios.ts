import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { config } from './index';
import { logger } from '../utils/logger';

// Create axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
  timeout: config.httpClient.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
axiosInstance.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    logger.info('HTTP Request', {
      method: requestConfig.method?.toUpperCase(),
      url: requestConfig.url,
      baseURL: requestConfig.baseURL,
      timeout: requestConfig.timeout,
    });
    return requestConfig;
  },
  (error: AxiosError) => {
    logger.error('HTTP Request Error', {
      message: error.message,
      config: error.config,
    });
    return Promise.reject(error);
  }
);

// Response interceptor for logging
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.info('HTTP Response', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      responseTime: response.headers['x-response-time'],
    });
    return response;
  },
  (error: AxiosError) => {
    logger.error('HTTP Response Error', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
      responseData: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// Retry function with exponential backoff
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = config.httpClient.retryAttempts,
  baseDelay: number = config.httpClient.retryDelay
): Promise<T> => {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      attempt++;
      
      if (attempt > maxRetries) {
        logger.error('Max retry attempts exceeded', {
          attempts: attempt - 1,
          maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
      
      // Only retry on specific error conditions
      if (axios.isAxiosError(error)) {
        const shouldRetry = 
          !error.response || // Network error
          error.response.status >= 500 || // Server error
          error.response.status === 408 || // Request timeout
          error.response.status === 429; // Too many requests
        
        if (!shouldRetry) {
          logger.warn('Request failed with non-retryable error', {
            status: error.response?.status,
            message: error.message,
          });
          throw error;
        }
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      
      logger.warn('Request failed, retrying...', {
        attempt,
        maxRetries,
        delay,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unexpected error in retry logic');
};

export default axiosInstance;