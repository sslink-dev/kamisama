import { parseRensaExcel } from './rensa-parser';

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseRensaExcel(e.data);
  self.postMessage(result);
};
