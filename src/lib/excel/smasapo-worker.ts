import { parseSmasapoExcel } from './smasapo-parser';
self.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  const result = parseSmasapoExcel(e.data.buffer, e.data.fileName);
  self.postMessage(result);
};
