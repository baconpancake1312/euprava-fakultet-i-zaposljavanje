/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */

export interface ApiError {
  message: string
  status?: number
  statusText?: string
  data?: any
}

export class ApiErrorHandler {
  /**
   * Extracts error message from API response
   */
  static async extractError(response: Response): Promise<string> {
    try {
      const errorData = await response.json()
      // Handle different error response formats
      if (errorData.error) {
        return errorData.error
      }
      if (errorData.message) {
        return errorData.message
      }
      if (typeof errorData === "string") {
        return errorData
      }
    } catch {
      // If JSON parsing fails, use status text
    }

    // Fallback to status-specific messages
    return this.getStatusMessage(response.status)
  }

  /**
   * Gets user-friendly error message based on HTTP status code
   */
  static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return "Invalid request. Please check your input and try again."
      case 401:
        return "Authentication required. Please log in again."
      case 403:
        return "You don't have permission to perform this action."
      case 404:
        return "The requested resource was not found."
      case 409:
        return "A conflict occurred. This resource may already exist."
      case 422:
        return "Validation failed. Please check your input."
      case 500:
        return "Server error. Please try again later."
      case 502:
        return "Service temporarily unavailable. Please try again later."
      case 503:
        return "Service unavailable. Please try again later."
      default:
        return `Request failed with status ${status}. Please try again.`
    }
  }

  /**
   * Creates a standardized error object
   */
  static createError(
    message: string,
    status?: number,
    statusText?: string,
    data?: any
  ): ApiError {
    return {
      message,
      status,
      statusText,
      data,
    }
  }

  /**
   * Handles API errors and returns a standardized error
   */
  static async handleResponse(response: Response): Promise<never> {
    const message = await this.extractError(response)
    const error = this.createError(
      message,
      response.status,
      response.statusText
    )
    throw error
  }

  /**
   * Checks if error is an authentication error (401 or 403)
   */
  static isAuthError(error: any): boolean {
    return error?.status === 401 || error?.status === 403
  }

  /**
   * Checks if error is a not found error (404)
   */
  static isNotFoundError(error: any): boolean {
    return error?.status === 404
  }

  /**
   * Checks if error is a client error (4xx)
   */
  static isClientError(error: any): boolean {
    const status = error?.status
    return status >= 400 && status < 500
  }

  /**
   * Checks if error is a server error (5xx)
   */
  static isServerError(error: any): boolean {
    const status = error?.status
    return status >= 500 && status < 600
  }
}
