import { parseVendorExcel } from './vendor-parser';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  self.postMessage(parseVendorExcel(e.data));
};
