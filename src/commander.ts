/**
 * @module commander
 * @description Command-line interface for the DAO application
 * 
 * This module provides a command-line interface (CLI) for the DAO application,
 * allowing administrative tasks and maintenance operations to be performed
 * through a command-line interface. It uses nest-commander to create CLI
 * commands based on the NestJS module structure.
 * 
 * The CLI supports several log levels:
 * - verbose: Detailed debugging information
 * - debug: General debugging information
 * - warn: Warning messages
 * - error: Error messages
 * 
 * Available commands:
 * - migration: Run database migrations
 */
import { SmartAppModule } from './smart-app.module';
import { CommandFactory } from 'nest-commander';
import { Module } from '@nestjs/common';

/**
 * @class CliModule
 * @description A wrapper module for CLI operations
 * 
 * This module imports the registered SmartAppModule to ensure all dependencies
 * are properly initialized when running CLI commands.
 */
@Module({
  imports: [SmartAppModule.register()],
})
class CliModule {}

/**
 * @function bootstrap
 * @description Bootstraps the command-line interface
 * 
 * This function initializes the command-line interface using nest-commander's
 * CommandFactory. It uses the CliModule which imports the registered SmartAppModule
 * to ensure proper dependency initialization.
 * 
 * @returns {Promise<void>}
 */
async function bootstrap() {
  try {
    // Run the CLI app with CommandFactory using the wrapper module
    // that properly imports the registered SmartAppModule
    await CommandFactory.run(CliModule, {
      logger: ['verbose', 'debug', 'warn', 'error'],
    });
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// bootstrapping the app...
bootstrap();