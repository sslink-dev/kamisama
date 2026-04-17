import { parseShelterExcel } from './shelter-parser';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseShelterExcel(e.data);
  self.postMessage(result);
};
