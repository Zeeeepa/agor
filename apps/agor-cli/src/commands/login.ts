/**
 * `agor login` - Shortcut for `agor auth login`
 *
 * Top-level command for better UX
 */

import Login from './auth/login';

export default class LoginShortcut extends Login {
  static description = 'Authenticate with Agor daemon';
  static examples = ['<%= config.bin %> <%= command.id %>'];
}
