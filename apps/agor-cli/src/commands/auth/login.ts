/**
 * `agor login` - Authenticate with daemon
 *
 * Prompts for email/password and stores JWT token for future CLI commands
 */

import { createClient, isDaemonRunning } from '@agor/core/api';
import { getDaemonUrl } from '@agor/core/config';
import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import * as readline from 'node:readline';
import { saveToken } from '../../lib/auth';

export default class Login extends Command {
  static description = 'Authenticate with Agor daemon';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --email user@example.com',
  ];

  static flags = {
    email: Flags.string({
      char: 'e',
      description: 'Email address',
    }),
    password: Flags.string({
      char: 'p',
      description: 'Password (will prompt if not provided)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Login);

    // Get daemon URL
    const daemonUrl = await getDaemonUrl();

    // Check if daemon is running
    const running = await isDaemonRunning(daemonUrl);
    if (!running) {
      this.error(
        chalk.red('✗ Daemon not running') +
          '\n\n' +
          chalk.bold('To start the daemon:') +
          '\n  ' +
          chalk.cyan('cd apps/agor-daemon && pnpm dev')
      );
    }

    // Get credentials (prompt if not provided)
    const email =
      flags.email ||
      (await this.prompt('Email', {
        type: 'input',
        required: true,
      }));

    const password =
      flags.password ||
      (await this.prompt('Password', {
        type: 'hide',
        required: true,
      }));

    // Create client with REST-only transport (prevents hanging)
    const client = createClient(daemonUrl, true, { verbose: false, restOnly: true });

    try {
      this.log(chalk.dim('Authenticating...'));

      // Authenticate with local strategy
      const authResult = await client.authenticate({
        strategy: 'local',
        email,
        password,
      });

      if (!authResult.accessToken || !authResult.user) {
        this.error('Authentication failed - no token returned');
      }

      // Calculate token expiry (7 days from now, matching daemon config)
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      // Save token to disk
      await saveToken({
        accessToken: authResult.accessToken,
        user: {
          user_id: authResult.user.user_id,
          email: authResult.user.email,
          name: authResult.user.name,
          role: authResult.user.role,
        },
        expiresAt,
      });

      this.log('');
      this.log(chalk.green('✓ Logged in successfully'));
      this.log('');
      this.log(chalk.dim('User:'), chalk.cyan(authResult.user.email));
      if (authResult.user.name) {
        this.log(chalk.dim('Name:'), authResult.user.name);
      }
      this.log(chalk.dim('Role:'), authResult.user.role);
      this.log('');
      this.log(chalk.dim('Token saved to ~/.agor/cli-token'));
      this.log(chalk.dim('Token expires in 7 days'));
      this.log('');

      // Cleanup socket connection
      client.io.io.opts.reconnection = false;
      client.io.removeAllListeners();
      client.io.close();
      process.exit(0);
    } catch (error) {
      // Cleanup socket connection
      client.io.io.opts.reconnection = false;
      client.io.removeAllListeners();
      client.io.close();

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Invalid login') || errorMessage.includes('NotFound')) {
        this.error(chalk.red('✗ Invalid email or password'));
      }

      this.error(chalk.red(`✗ Authentication failed: ${errorMessage}`));
    }
  }

  /**
   * Prompt helper with proper typing
   */
  private async prompt(
    message: string,
    options: { type: 'input' | 'hide'; required: boolean }
  ): Promise<string> {
    return new Promise<string>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const hiddenOutput = options.type === 'hide';
      if (hiddenOutput) {
        // Disable stdin echo for password input
        (process.stdin as any).setRawMode?.(true);
      }

      rl.question(`${message}: `, (answer: string) => {
        if (hiddenOutput) {
          (process.stdin as any).setRawMode?.(false);
          console.log(''); // New line after password input
        }
        rl.close();
        resolve(answer.trim());
      });

      if (hiddenOutput) {
        // Manual password masking
        rl.input.on('keypress', () => {
          const len = (rl as any).line.length;
          readline.moveCursor(process.stdout, -len, 0);
          readline.clearLine(process.stdout, 1);
          process.stdout.write('*'.repeat(len));
        });
      }
    });
  }
}
