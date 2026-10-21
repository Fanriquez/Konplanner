// Error pensado para mostrarse tal cual al usuario en Discord.
export class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}
