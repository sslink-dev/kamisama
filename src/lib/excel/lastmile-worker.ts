import { parseLastmileExcel } from './lastmile-parser';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  self.postMessage(parseLastmileExcel(e.data));
};
