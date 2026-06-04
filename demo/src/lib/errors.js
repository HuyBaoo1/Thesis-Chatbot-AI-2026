export class AppError extends Error {
  constructor(message, code, statusCode = 500, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network error occurred', originalError = null) {
    super(message, 'NETWORK_ERROR', 0, originalError);
    this.name = 'NetworkError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', originalError = null) {
    super(message, 'UNAUTHORIZED', 401, originalError);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', originalError = null) {
    super(message, 'NOT_FOUND', 404, originalError);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = [], originalError = null) {
    super(message, 'VALIDATION_ERROR', 400, originalError);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class ServerError extends AppError {
  constructor(message = 'Server error', statusCode = 500, originalError = null) {
    super(message, 'SERVER_ERROR', statusCode, originalError);
    this.name = 'ServerError';
  }
}

export function parseApiError(error) {
  if (error.response?.data?.detail) {
    return new AppError(
      error.response.data.detail,
      'API_ERROR',
      error.response.status,
      error
    );
  }
  if (error.response?.status === 401) {
    return new UnauthorizedError('Please log in again', error);
  }
  if (error.response?.status === 404) {
    return new NotFoundError('Resource not found', error);
  }
  if (error.response?.status === 422) {
    return new ValidationError(
      'Validation failed',
      error.response.data?.errors || [],
      error
    );
  }
  if (error.response?.status >= 500) {
    return new ServerError('Server error, please try again later', error.response.status, error);
  }
  if (!error.response && error.request) {
    return new NetworkError('Network error - please check your connection', error);
  }
  return new AppError(error.message || 'An unexpected error occurred', 'UNKNOWN', 0, error);
}