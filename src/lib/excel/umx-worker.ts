import { parseUmxExcel } from './umx-parser';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseUmxExcel(e.data);
  self.postMessage(result);
};
