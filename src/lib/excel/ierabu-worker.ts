import { parseIerabuExcel } from './ierabu-parser';

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseIerabuExcel(e.data);
  self.postMessage(result);
};
