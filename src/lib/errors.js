export class AppError extends Error {
  constructor(message = 'An error occurred', status = 400, errors = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message = 'Bad Request', errors = undefined) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

export default AppError;
