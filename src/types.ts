export type AnyFn = (...args: any[]) => any;
export type AnyAsyncFn = (...args: any[]) => Promise<any>;
export type DefaultExport<E> = { default: E };
export type Flatten<T> = { [K in keyof T]: T[K] };
export type ValueOf<T> = T[keyof T];
