# Maple Market Analytics 🍁

Dashboard funcional de análise técnica para o Free Market de **MapleStory Classic World**.

## O que já funciona

- Candlesticks 1h / 4h / 1d + barras de volume, crosshair e leitura OHLC no cursor.
- Médias móveis simples MM7, MM21 e MM50 selecionáveis, RSI 14 e bandas de Bollinger 20.
- Scanner de tendências MM7/MM21, variações 24h/7d, volumes por mesos e números de vendas.
- Filtros por categoria, busca, tabela classificável, watchlist e exportação CSV.
- Cálculo exploratório de desconto entre menor anúncio e mediana dos preços de venda observados.
- Importação manual de CSV e JSON de negócios reais ou candles; o processamento manual ocorre no navegador.
- Infraestrutura de coleta autorizada e publicação automática a cada hora no GitHub Pages.
- Dados de demonstração sempre identificados como **SIMULADOS**. Nenhuma cotação fictícia é apresentada como real.

## Como abrir agora

1. Extraia o ZIP e abra `docs/index.html` no navegador (Edge ou Chrome). A versão demonstrativa abre sem servidor e sem conexão.
2. Clique em **Importar arquivo** para carregar histórico legítimo. Aceita:
   - CSV de vendas: `timestamp,item,price,quantity,type,category` (`type=sale`).
   - CSV OHLCV: `timestamp,item,open,high,low,close,volume,trades,category`.
   - JSON de feed no schema abaixo.
3. Exemplo mínimo em `docs/exemplo_importacao.csv`.

## Publicar como site e atualizar a cada hora

1. Crie um repositório no GitHub e faça upload **de todo o conteúdo desta pasta** (inclusive `.github/`).
2. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
3. Em **Settings → Secrets and variables → Actions**, adicione:
   - `MARKET_FEED_URL`: endereço **HTTPS de um feed cujo proprietário autorize integração automática**, fornecendo JSON no formato abaixo.
   - `MARKET_FEED_TOKEN` (opcional): token de autenticação via cabeçalho `Authorization: Bearer TOKEN`.
4. Vá a **Actions → Atualizar preços do Maple → Run workflow** para testar uma execução.
5. O arquivo `docs/data/market.json` será atualizado pela rotina e publicado no GitHub Pages; o navegador também tenta verificar esse arquivo de hora em hora enquanto estiver aberto.

O agendamento é `17 * * * *` (uma execução por hora). **O GitHub Actions pode atrasar execuções** e não garante pontualidade exata. Sem um feed configurado, o site segue em demonstração e não inventa preços.

### Formato do feed (preferencial: vendas individuais)

```json
{
  "source": "Nome da fonte licenciada ou autorizada",
  "updatedAt": "2026-11-09T16:00:00Z",
  "sales": [
    {"id": "tx-0001", "timestamp": "2026-11-09T15:10:00Z", "item": "Kumbi Throwing Stars", "category": "Estrelas", "price": 480000, "quantity": 1, "type": "sale"}
  ],
  "listings": [
    {"timestamp": "2026-11-09T15:40:00Z", "item": "Kumbi Throwing Stars", "category": "Estrelas", "price": 445000}
  ]
}
```

O script elimina IDs de transação repetidos e mantém até 90 dias de vendas. Cada candle inclui `turnover` (mesos negociados) calculado pela soma exata de preço × quantidade; e `lowestAsk` só é publicado se o anúncio tiver timestamp recente. O scanner só aceita ofertas marcadas há menos de 3 horas. Se não houver um ID único, usa uma chave derivada; vendas absolutamente idênticas no mesmo segundo podem ser mescladas, portanto prefira fontes com IDs de transações.

### Alternativa: candles OHLCV prontos

```json
{
  "mode":"live-sales",
  "source":"Feed com candles de vendas autorizados",
  "updatedAt":"2026-11-09T16:00:00Z",
  "items":[{
    "name":"Kumbi Throwing Stars",
    "category":"Estrelas",
    "lowestAsk":445000,
    "candles":[{"time":"2026-11-09T15:00:00Z","open":470000,"high":485000,"low":465000,"close":480000,"volume":6,"trades":4}]
  }]
}
```

**Importante:** uma simples observação do preço anunciado não deve ser tratada como candle de transações. Um feed que forneça apenas preços de referência gera linhas na tabela, mas **não** cria candles.

## Permissões e honestidade dos dados

- **Meso.watch** (`beta.meso.watch/terms`): regras consultadas em 09/11/2026 proíbem coleta por scripts, bots e sistemas de IA sem autorização escrita.
- **NiaDB / MeowDB** (`meowdb.com/reuse`): pede autorização antes de crawl, uso automatizado de sua API ou reprodução de base.
- **mesos.watch** (`mesos.watch/terms`): é um serviço distinto; informa API para assinantes Merchant, com token e limites, e restringe scraping em massa sem autorização.
- Sem acesso expressamente autorizado por uma fonte ou dados fornecidos por você, esta versão não tem conexão automática real com o FM. O script **não implementa scraping** de nenhum desses sites.

Os números simulados são apenas uma demonstração visual do funcionamento dos indicadores.

## Como interpretar indicadores

- MM7, MM21, MM50: **médias móveis simples por quantidade de candles**. No gráfico 1H, MM7=7 horas; no 1D, MM7=7 dias.
- Volumes: quantidade informada pelo feed de **vendas**, multiplicada pelo preço para volume em mesos.
- 24H e 7D: mudanças entre o candle mais recente e o último candle disponível antes de cada janela. Necessitam histórico relevante.
- O scanner marca uma possível oportunidade se o menor anúncio for pelo menos **11% abaixo** da mediana das vendas observadas (cenário de 3% de custo + 8% de folga) e houver pelo menos 5 vendas nas últimas 24h. O cálculo só é habilitado se o anúncio possuir data recente (até 3 horas). Esses percentuais são **hipóteses de análise**, não uma afirmação sobre taxas reais do jogo.
- Itens únicos/scrollados devem ser agrupados por atributos; agregação de um mesmo nome sem separar stats pode distorcer o preço.
- Um campo "menor pedido" não implica disponibilidade atual ou execução garantida. Confirme no Free Market.

## Próximas evoluções

Conector autorizado da fonte escolhida, alertas configuráveis, filtro de volume na confirmação de cruzamentos com confirmação de volume, avaliação de margem líquida real e separação de equipamentos por atributos.

Independente e não afiliado à Nexon. MapleStory e seus ativos pertencem aos seus titulares.

## Integração: opções concretas (verificadas em 09/11/2026)

**Prioridade 1: obter autorização de NiaDB ou Meso.watch.** As duas fontes exigem permissão antes de coletar automaticamente. Para NiaDB envie o texto abaixo a `contact@meowdb.com` com o assunto `Permission request: Maple Market Analytics`:

    Project name: Maple Market Analytics
    URL (if any): Not published yet (planned GitHub Pages)
    What it does: Hourly charts, SMA/RSI/Bollinger, liquidity filters and price anomaly alerts for MapleStory Classic World, with source credit. Seeking permission for a documented API or export.
    Live yet (yes or no): No

Contate também `contact@meso.watch` para consultar licenciamento de preço histórico e uso de API. Não rode robôs antes de receber a autorização.

**Alternativa distinta:** `mesos.watch` (com **s** extra) anuncia API com tokens para contas Merchant; validar cobertura, contrato e limites antes de conectar. Não confundir com `meso.watch`.

O projeto aceita um feed JSON normalizado. Depois de obter o endpoint autorizado, adicione `MARKET_FEED_URL` e, se exigido, `MARKET_FEED_TOKEN` aos secrets GitHub Actions. Nunca publique o token no repositório ou HTML.

### Testes locais

    python -m unittest discover -s tests -v
    python scripts/update_market.py --file tests/fixtures/sales.json

O segundo comando utiliza uma fixture de testes, não dados reais.
