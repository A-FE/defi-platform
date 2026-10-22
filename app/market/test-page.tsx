'use client';

import { MARKET_SYMBOLS, KLINE_INTERVALS } from '@/constants/api';

export default function TestPage() {
  console.info('MARKET_SYMBOLS:', MARKET_SYMBOLS);
  console.info('KLINE_INTERVALS:', KLINE_INTERVALS);

  return (
    <div className="p-8 text-white">
      <h1>Test Constants</h1>
      <pre>{JSON.stringify({ MARKET_SYMBOLS, KLINE_INTERVALS }, null, 2)}</pre>
    </div>
  );
}
