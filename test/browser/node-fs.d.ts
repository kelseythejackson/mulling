// The one Node API the browser specs use. Declared here instead of adding @types/node, which would
// change timer types across src/ (setTimeout returning NodeJS.Timeout instead of number).
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
