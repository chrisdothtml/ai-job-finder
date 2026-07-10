// `@opendocsg/pdf2md`'s bundled types import from `pdfjs-dist`, which is no
// longer one of its dependencies (it uses `unpdf` internally now); stub the
// few types it references
declare module 'pdfjs-dist/types/display/api' {
  export type PDFDocumentProxy = unknown;
  export type DocumentInitParameters = Record<string, unknown>;
  export type TypedArray = ArrayBufferView;
  export type TextItem = unknown;
}
