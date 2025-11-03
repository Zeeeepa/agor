/**
 * `agor whoami` - Shortcut for `agor auth whoami`
 *
 * Top-level command for better UX
 */

import Whoami from './auth/whoami';

export default class WhoamiShortcut extends Whoami {
  static description = 'Show current authenticated user';
  static examples = ['<%= config.bin %> <%= command.id %>'];
}
