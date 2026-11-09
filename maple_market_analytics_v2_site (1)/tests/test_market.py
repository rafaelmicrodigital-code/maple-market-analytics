import importlib.util
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("market_script", ROOT/'scripts'/'update_market.py')
market=importlib.util.module_from_spec(spec)
spec.loader.exec_module(market)
NOW=datetime(2026,11,9,16,0,tzinfo=timezone.utc)

class MarketFeedTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.cache=patch.object(market,'CACHE',Path(self.tmp.name)/'cache.json')
        self.cache.start()
    def tearDown(self):
        self.cache.stop()
        self.tmp.cleanup()
    def valid_feed(self):
        return {
          'source':'Feed de teste autorizado',
          'updatedAt':'2026-11-09T15:45:00Z',
          'sales':[
            {'id':'a','item':'Kumbi','timestamp':'2026-11-09T15:12:00Z','price':400000,'quantity':3,'type':'sale'},
            {'id':'b','item':'Kumbi','timestamp':'2026-11-09T15:22:00Z','price':500000,'quantity':2,'type':'sale'},
            {'id':'a','item':'Kumbi','timestamp':'2026-11-09T15:12:00Z','price':400000,'quantity':3,'type':'sale'},
            {'id':'z','item':'Kumbi','timestamp':'2026-11-09T15:28:00Z','price':200,'quantity':9,'type':'listing'}
          ],
          'listings':[{'item':'Kumbi','timestamp':'2026-11-09T15:31:00Z','price':340000}]
        }
    def test_sales_not_listings_are_candles(self):
        out=market.ingest(self.valid_feed(),NOW)
        it=out['items'][0]
        bar=it['candles'][0]
        self.assertEqual(it['quality'],'sales')
        self.assertEqual((bar['open'],bar['high'],bar['low'],bar['close']),(400000,500000,400000,500000))
        self.assertEqual(bar['volume'],5)
        self.assertEqual(bar['trades'],2)
        self.assertEqual(bar['turnover'],3*400000+2*500000)
        self.assertEqual(it['lowestAsk'],340000)
        self.assertEqual(it['askUpdatedAt'],'2026-11-09T15:31:00Z')
    def test_no_duplicate_sales_when_incremental(self):
        x=self.valid_feed()
        market.ingest(x,NOW)
        out=market.ingest(x,NOW)
        self.assertEqual(out['items'][0]['candles'][0]['trades'],2)
    def test_stale_ask_not_used(self):
        x=self.valid_feed()
        x['listings'][0]['timestamp']='2026-11-09T11:31:00Z'
        out=market.ingest(x,NOW)
        self.assertIsNone(out['items'][0]['lowestAsk'])
    def test_old_feed_rejected(self):
        x=self.valid_feed()
        x['updatedAt']='2026-10-10T01:00:00Z'
        with self.assertRaises(ValueError):market.ingest(x,NOW)
    def test_only_price_snapshot_makes_no_candles(self):
        x={'source':'Teste','updatedAt':'2026-11-09T15:40:00Z',
          'items':[{'name':'Tobi','lowestAsk':2000000,'askUpdatedAt':'2026-11-09T15:30:00Z'}]}
        out=market.ingest(x,NOW)
        self.assertEqual(out['items'][0]['quality'],'snapshot')
        self.assertEqual(out['items'][0]['candles'],[])
        self.assertEqual(out['items'][0]['lowestAsk'],2000000)

if __name__=='__main__':unittest.main()
