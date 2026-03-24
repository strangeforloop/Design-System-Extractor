#!/usr/bin/env node

import boxen from "boxen";
import chalk from "chalk";
import { Command } from "commander";

import { FileScanner } from "../scanner/file-scanner.js";

const program = new Command();

program
  .name("design-system-extractor")
  .description("Extract design tokens from React codebases")
  .version("0.1.0");

program
  .command("analyze")
  .argument("<path>", "Path to project or source directory")
  .option(
    "--output <directory>",
    "Output directory for generated token artifacts",
    "./design-tokens",
  )
  .description("Scan a codebase and list discovered React files")
  .action(async (targetPath: string, options: { output: string }) => {
    const fileScanner = new FileScanner();

    try {
      const files = await fileScanner.findReactFiles(targetPath);

      const header = boxen(
        `${chalk.bold.cyan("Design System Extractor")}\n` +
          `${chalk.gray("Target:")} ${chalk.white(targetPath)}\n` +
          `${chalk.gray("Output:")} ${chalk.white(options.output)}`,
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "cyan",
        },
      );

      console.log(header);

      if (files.length === 0) {
        console.log(chalk.yellow("No React files found (.tsx/.jsx)."));
        return;
      }

      console.log(chalk.green(`Found ${files.length} React file(s):`));
      for (const file of files) {
        console.log(`  ${chalk.gray("-")} ${chalk.white(file)}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const errorBox = boxen(
        `${chalk.bold.red("Analysis Failed")}\n${chalk.red(message)}`,
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "red",
        },
      );

      console.error(errorBox);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Unexpected CLI error: ${message}`));
  process.exit(1);
});
