export class GlobalError extends Error {
  operational: boolean;
  statusCode: number;
  constructor(message: string, statusCode: number, operational: boolean) {
    super(message);
    this.name = new.target.name; // Ensures correct class name in case of inheritance
    // Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.operational = operational;
    Error.captureStackTrace?.(this, this.constructor); // Improves stack trace readability
  }
}
