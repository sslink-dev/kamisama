import { parseDualExcel } from './dual-parser';
self.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  const result = parseDualExcel(e.data.buffer, e.data.fileName);
  self.postMessage(result);
};
