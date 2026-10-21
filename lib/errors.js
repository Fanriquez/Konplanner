// Error pensado para mostrarse al usuario en Discord: lleva la clave del texto (lib/i18n.js)
// y se traduce al idioma de quien usó el comando.
export class UserError extends Error {
  constructor(key, vars = {}) {
    super(key);
    this.name = 'UserError';
    this.key = key;
    this.vars = vars;
  }
}
