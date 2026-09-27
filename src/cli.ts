import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { generateCalendar } from './generate.js';

interface CliOptions {
  output: string;
  showsPath?: string;
  jamsPath?: string;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { output: 'public/hideout-comedy.ics' };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value || !flag?.startsWith('--')) {
      throw new Error(`Invalid argument: ${flag ?? ''}`);
    }
    if (flag === '--output') options.output = value;
    else if (flag === '--shows') options.showsPath = value;
    else if (flag === '--jams') options.jamsPath = value;
    else throw new Error(`Unknown option: ${flag}`);
    index += 1;
  }
  if (Boolean(options.showsPath) !== Boolean(options.jamsPath)) {
    throw new Error('--shows and --jams must be supplied together');
  }
  return options;
}

async function atomicWrite(path: string, content: string): Promise<void> {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, content, 'utf8');
    await rename(temporary, absolute);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function runCli(args: string[]): Promise<void> {
  const options = parseArgs(args);
  const fixtureOptions =
    options.showsPath && options.jamsPath
      ? {
          showsHtml: await readFile(options.showsPath, 'utf8'),
          jamsHtml: await readFile(options.jamsPath, 'utf8'),
        }
      : {};
  const generated = await generateCalendar(fixtureOptions);
  await atomicWrite(options.output, generated.ics);
  process.stdout.write(
    `Generated ${generated.events.length} events at ${resolve(options.output)}\n`,
  );
}

void runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Calendar generation failed: ${message}\n`);
  process.exitCode = 1;
});
