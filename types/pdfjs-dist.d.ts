declare module "pdfjs-dist/build/pdf.mjs" {
  import * as pdfjsLib from "pdfjs-dist";
  export = pdfjsLib;
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
