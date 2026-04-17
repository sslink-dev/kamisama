/**
 * ハウスメイト Excel パースを Web Worker 上で実行する。
 */
import { parseHousemateExcel } from './housemate-parser';

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseHousemateExcel(e.data);
  self.postMessage(result);
};
