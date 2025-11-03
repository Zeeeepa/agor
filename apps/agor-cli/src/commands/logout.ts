/**
 * `agor logout` - Shortcut for `agor auth logout`
 *
 * Top-level command for better UX
 */

import Logout from './auth/logout';

export default class LogoutShortcut extends Logout {
  static description = 'Logout and clear stored authentication token';
  static examples = ['<%= config.bin %> <%= command.id %>'];
}
