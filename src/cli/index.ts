#!/usr/bin/env node

import path from "node:path";

import boxen from "boxen";
import chalk from "chalk";
import { Command } from "commander";
import Table from "cli-table3";
import ora from "ora";

import { ASTParser } from "../parser/ast-parser.js";
import type { DesignValue } from "../parser/types.js";
import { FileScanner } from "../scanner/file-scanner.js";

function partitionByType(values: DesignValue[]) {
  return {
    colors: values.filter((v) => v.type === "color"),
    spacing: values.filter((v) => v.type === "spacing"),
    typography: values.filter((v) => v.type === "typography"),
  };
}

function distinctFileCount(items: DesignValue[]): number {
  return new Set(items.map((i) => i.file)).size;
}

function printPreview(
  label: string,
  items: DesignValue[],
  root: string,
  valueChalk: (s: string) => string,
): void {
  if (items.length === 0) return;
  console.log(chalk.gray(`${label} (first 5):`));
  for (const v of items.slice(0, 5)) {
    const rel = path.relative(root, v.file) || v.file;
    console.log(
      `  ${valueChalk(v.value)} ${chalk.gray("·")} ${chalk.white(v.context)} ${chalk.gray(`(${rel}:${v.line})`)}`,
    );
  }
  console.log();
}

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
  .description("Scan a codebase and extract design values (colors, spacing, typography)")
  .action(async (targetPath: string, options: { output: string }) => {
    const fileScanner = new FileScanner();
    const root = path.resolve(targetPath);

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

    const spinner = ora("Finding React files…").start();

    try {
      const files = await fileScanner.findReactFiles(root);

      if (files.length === 0) {
        spinner.warn("No React files found (.tsx / .jsx).");
        return;
      }

      spinner.text = `Parsing ${files.length} file(s) and extracting design values…`;
      const astParser = new ASTParser();
      const allValues = await astParser.extractValues(files);
      const fileErrors = astParser.getExtractionErrors();

      spinner.succeed(
        chalk.green(`Scanned ${files.length} React file(s).`),
      );

      console.log();
      const { colors, spacing, typography } = partitionByType(allValues);
      const filesColors = distinctFileCount(colors);
      const filesSpacing = distinctFileCount(spacing);
      const filesTypography = distinctFileCount(typography);

      if (fileErrors.length > 0) {
        console.log(
          chalk.yellow(
            `\n${fileErrors.length} file(s) had read/parse/extract issues (details on stderr).`,
          ),
        );
        console.log();
      }

      const summary = new Table({
        head: [
          chalk.bold("Category"),
          chalk.bold("Values found"),
          chalk.bold("Files"),
        ],
      });
      summary.push(
        ["Colors", String(colors.length), String(filesColors)],
        ["Spacing", String(spacing.length), String(filesSpacing)],
        ["Typography", String(typography.length), String(filesTypography)],
      );
      console.log(chalk.bold("Discoveries"));
      console.log(summary.toString());
      console.log();
      console.log(chalk.gray(`Scanned ${files.length} React file(s).`));
      console.log();

      const totalFound = colors.length + spacing.length + typography.length;
      if (totalFound === 0) {
        return;
      }

      console.log(chalk.bold("Previews"));
      printPreview("Colors", colors, root, chalk.cyan);
      printPreview("Spacing", spacing, root, chalk.green);
      printPreview("Typography", typography, root, chalk.magenta);
    } catch (error: unknown) {
      spinner.fail("Analysis failed");
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
