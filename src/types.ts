export type AnyFn = (...args: any[]) => any;
export type AnyAsyncFn = (...args: any[]) => Promise<any>;
export type DefaultExport<E> = { default: E };
export type Flatten<T> = { [K in keyof T]: T[K] };
export type ValueOf<T> = T[keyof T];

/**
 * Used for co-locating a string version of a type, for
 * inlining into system prompts (e.g. to ensure the model
 * provides the expected json response format)
 */
export function inlineInterface(input: string) {
  return input.trim().replaceAll('  ', '').replace(/\n/g, ' ');
}
