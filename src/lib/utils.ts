import { packageCwd } from '#lib/constants';
import { fromAsync, isErr } from '@sapphire/result';
import { Awaitable, isFunction, isThenable } from '@sapphire/utilities';
import { cyan, green, red } from 'colorette';
import type { OptionValues } from 'commander';
import { load } from 'js-yaml';
import { execSync } from 'node:child_process';
import type { PathLike } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function usesModernYarn() {
  const packageJsonPath = join(packageCwd, 'package.json');
  const packageJsonContent = await readJson<{ packageManager: string | undefined }>(packageJsonPath);

  if (!packageJsonContent.packageManager) return false;

  return packageJsonContent.packageManager.startsWith('yarn@3');
}

/**
 * Parsed a YAML file into an `Object` of type `T`
 * @param pathLike The {@link PathLike} to read with {@link readFile}
 */
export async function readYaml<T>(pathLike: PathLike): Promise<T> {
  return load(await readFile(pathLike, { encoding: 'utf-8' })) as unknown as T;
}

/**
 * Parses a JSON file into an `Object` of type `T`
 * @param pathLike The {@link PathLike} to read with {@link readFile}
 */
export async function readJson<T>(pathLike: PathLike): Promise<T> {
  return JSON.parse(await readFile(pathLike, { encoding: 'utf-8' })) as T;
}

export function getGitRootDirection() {
  const repositoryRoot = execSync('git rev-parse --show-prefix', { encoding: 'utf-8' });

  return repositoryRoot
    .split('/')
    .map((i) => i.trim())
    .filter(Boolean)
    .map(() => '..')
    .join('/');
}

export function getFullPackageName(options: OptionValues) {
  return options.org ? `@${options.org}/${options.name}` : options.name;
}

export async function doActionAndLog<T>(preActionLog: string, action: Awaitable<T> | (() => Awaitable<T>)): Promise<T> {
  process.stdout.write(cyan(`${preActionLog}... `));

  const result = await fromAsync(async () => {
    const executedFunctionResult = isFunction(action) ? action() : action;
    const returnValue = isThenable(executedFunctionResult) ? ((await executedFunctionResult) as T) : executedFunctionResult;
    console.log(green('✅ Done'));
    return returnValue;
  });

  if (isErr(result)) {
    console.log(red('❌ Error'));
    console.error((result.error as Error).message);
    process.exit(1);
  }

  return result.value;
}
