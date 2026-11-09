#!/usr/bin/env python3
"""Maple Market Analytics: ingest an AUTHORIZED provider's sale-event JSON.

No scraping. Requires a URL explicitly supplied by the operator/rights holder.
No embedded credentials, no access to any sites by default.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from hashlib import sha256
import json
import os
from pathlib import Path
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "docs" / "data" / "market.json"
CACHE = ROOT / "data_cache" / "events_store.json"
RETENTION = timedelta(days=90)
MAX_EVENTS = 250_000

def stamp(t: str) -> datetime | None:
    try:
        if not t: return None
        d = datetime.fromisoformat(t.replace('Z', '+00:00'))
        if d.tzinfo is None: return None
        return d.astimezone(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return None

def utc(d: datetime) -> str:
    return d.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

def fetch(url: str, token: str = '') -> dict:
    if not url.startswith('https://'):
        raise ValueError('Somente endpoints HTTPS autorizados são aceitos.')
    headers = {'Accept': 'application/json', 'User-Agent': 'MapleMarketAnalytics/0.1 (authorized-feed-consumer)'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = Request(url, headers=headers)
    with urlopen(req, timeout=25) as response:
        raw = response.read(25_000_000 + 1)
    if len(raw)>25_000_000:
        raise ValueError('Feed excede limite de 25 MB')
    doc = json.loads(raw)
    if not isinstance(doc, dict):
        raise ValueError('Feed precisa ser um objeto JSON.')
    return doc

def load_previous(source: str) -> dict:
    try:
        obj = json.loads(CACHE.read_text(encoding='utf8'))
        return obj if obj.get('source') == source else {'source':source,'events':[]}
    except (FileNotFoundError, ValueError):
        return {'source':source,'events':[]}

def ingest(feed: dict, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    source = str(feed.get('source') or 'Feed autorizado').strip()
    source_time = stamp(feed.get('updatedAt') or feed.get('updated_at') or '') or now
    if source_time > now + timedelta(hours=2):
        raise ValueError('Feed com data futura inconsistente.')
    if source_time < now-timedelta(days=3):
        raise ValueError('Feed desatualizado há mais de 3 dias. Cancelando atualização.')
    items = feed.get('items')
    if isinstance(items,list) and any(isinstance(it,dict) and isinstance(it.get('candles'),list) for it in items):
        processed=[]
        for it in items:
            name=str(it.get('name') or it.get('item') or '').strip()
            if not name: continue
            candles=[]
            for b in it.get('candles',[]):
                d=stamp(b.get('time') or b.get('timestamp'))
                if not d or d > now+timedelta(hours=2) or d < now-RETENTION:continue
                try:
                    o,h,l,c=[float(b[k]) for k in ('open','high','low','close')]
                    v=float(b.get('volume') or 0);n=int(b.get('trades') or 0)
                    if min(o,h,l,c)<=0 or h<max(o,c) or l>min(o,c) or v<0 or n<0:continue
                    candles.append({'time':utc(d),'open':o,'high':h,'low':l,'close':c,'volume':v,'trades':n,'turnover':float(b.get('turnover') or c*v)})
                except (KeyError,TypeError,ValueError):continue
            candles.sort(key=lambda x:x['time'])
            ask=positive(it.get('lowestAsk'))
            processed.append({'name':name,'category':str(it.get('category') or 'Outros'),
                              'lowestAsk':ask,'lastSale':candles[-1]['close'] if candles else positive(it.get('lastSale')),
                              'quality':'sales' if candles else 'snapshot','askUpdatedAt':it.get('askUpdatedAt'),'candles':candles})
        return {'schemaVersion':1,'mode':'live-sales','source':source,'updatedAt':utc(source_time),'items':processed}
    if 'sales' not in feed and 'items' not in feed:
        raise ValueError('O feed precisa conter vendas (sales) ou itens/candles (items).')
    previous=load_previous(source)
    known={e['key']:e for e in previous['events'] if stamp(e.get('time')) and stamp(e['time'])>=now-RETENTION}
    for raw in feed.get('sales',[]):
        if not isinstance(raw,dict):continue
        name=str(raw.get('item') or raw.get('name') or '').strip()
        d=stamp(raw.get('timestamp') or raw.get('time') or raw.get('ts'))
        p=positive(raw.get('price'));q=positive(raw.get('quantity',raw.get('qty',1)))
        if not name or not d or not p or not q or d < now-RETENTION or d>now+timedelta(hours=2):continue
        kind=str(raw.get('type') or 'sale').lower()
        if kind not in ('sale','sold','trade','venda'):continue
        ident=str(raw.get('id') or raw.get('sale_id') or '')
        if not ident:
            # Without transaction IDs, identical events may collide. Providers should provide IDs.
            ident=sha256(f'{source}|{name}|{utc(d)}|{p}|{q}'.encode()).hexdigest()
        key=sha256(f'{source}|{ident}'.encode()).hexdigest()
        known[key]={'key':key,'name':name,'category':str(raw.get('category') or 'Outros'),
                    'time':utc(d),'price':p,'quantity':q}
    records=sorted(known.values(),key=lambda e:e['time'])[-MAX_EVENTS:]
    CACHE.parent.mkdir(parents=True,exist_ok=True)
    CACHE.write_text(json.dumps({'source':source,'events':records},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    categories={}
    groups=defaultdict(dict)
    for e in records:
        name=e['name'];categories[name]=e['category'];d=stamp(e['time']);hour=d.replace(minute=0,second=0,microsecond=0)
        t=utc(hour);b=groups[name].get(t);p=e['price']
        if b is None:
            groups[name][t]={'time':t,'open':p,'high':p,'low':p,'close':p,'volume':e['quantity'],'trades':1,'turnover':p*e['quantity']}
        else:
            b['high']=max(b['high'],p);b['low']=min(b['low'],p);b['close']=p;b['volume']+=e['quantity'];b['trades']+=1;b['turnover']+=p*e['quantity']
    asks={}
    ask_times={}
    for raw in feed.get('listings',[]):
        if not isinstance(raw,dict):continue
        name=str(raw.get('item') or raw.get('name') or '').strip()
        p=positive(raw.get('price') or raw.get('lowestAsk'))
        d=stamp(raw.get('timestamp') or raw.get('time') or '')
        if p and name and d and timedelta(0)<=now-d<=timedelta(hours=3):
            if p<asks.get(name,float('inf')):
                asks[name]=p;ask_times[name]=utc(d)
            if name not in categories:categories[name]=str(raw.get('category') or 'Outros')
    # Snapshot-only feeds are allowed for tables, but must NOT manufacture OHLC bars.
    for raw in feed.get('items',[]):
        if not isinstance(raw,dict): continue
        name=str(raw.get('name') or raw.get('item') or '').strip()
        if name:
            categories.setdefault(name,str(raw.get('category') or 'Outros'))
            p=positive(raw.get('lowestAsk'))
            d=stamp(raw.get('askUpdatedAt') or '')
            if p and d and timedelta(0)<=now-d<=timedelta(hours=3) and p<asks.get(name,float('inf')):
                asks[name]=p;ask_times[name]=utc(d)
    result=[]
    for name in sorted(categories):
        bars=[groups[name][t] for t in sorted(groups.get(name,{}))]
        result.append({'name':name,'category':categories[name],
                       'lowestAsk':asks.get(name),'askUpdatedAt':ask_times.get(name),'lastSale':bars[-1]['close'] if bars else None,
                       'quality':'sales' if bars else 'snapshot','candles':bars})
    if not result:
        raise ValueError('O feed não contém observações válidas.')
    return {'schemaVersion':1,'mode':'live-sales','source':source,
            'updatedAt':utc(source_time),'items':result}

def positive(v):
    try:
        n=float(v)
        return n if 0<n<1e16 else None
    except (TypeError,ValueError):return None

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--file',type=Path,help='JSON de feed autorizado local, para testes')
    args=ap.parse_args()
    if args.file:
        feed=json.loads(args.file.read_text(encoding='utf8'))
    else:
        url=os.getenv('MARKET_FEED_URL','').strip()
        if not url:
            print('Feed não configurado: publicação permanece em modo DEMONSTRAÇÃO. Sem scraping.')
            return 0
        feed=fetch(url,os.getenv('MARKET_FEED_TOKEN',''))
    out=ingest(feed)
    PUBLIC.parent.mkdir(parents=True,exist_ok=True)
    PUBLIC.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(f"Atualizado: {len(out['items'])} itens, fonte: {out['source']}, data da fonte: {out['updatedAt']}")
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as ex:
        print(f'Falha na atualização; dados publicados preservados: {ex}',file=sys.stderr)
        sys.exit(1)
