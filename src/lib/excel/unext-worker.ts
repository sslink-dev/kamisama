/**
 * U-NEXT Excel パースを Web Worker 上で実行する。
 * メインスレッドをブロックしないため「応答なし」ダイアログを防げる。
 */
import { parseUnextExcel } from './unext-parser';

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const result = parseUnextExcel(e.data);
  self.postMessage(result);
};
