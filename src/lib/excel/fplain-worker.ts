import { parseFplainExcel } from './fplain-parser';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  self.postMessage(parseFplainExcel(e.data));
};
