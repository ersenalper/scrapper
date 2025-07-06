### EA FC 25 Players Data
[![Node.js CI](https://github.com/prashantghimire/sofifa-web-scraper/actions/workflows/node.js.yml/badge.svg)](https://github.com/prashantghimire/sofifa-web-scraper/actions/workflows/node.js.yml)

Collected from [sofifa.com](https://sofifa.com).
#### You can [view demo data](./output/player-data-test.csv) and [download full players data](./output/player-data-full.csv) (Last Scan: 2025-06-13).
Keep in mind that the above full players data won't always be up-to-date.

If you would like to download the latest data, you can do so by cloning the repo and running the script locally. 
Be mindful that the job will take about 2.5 hours. There is a 300ms delay on each request to avoid Cloudfare rate limitting on sofifa.com.

To run the project locally, follow the instructions below.
Node (version `18.12.1`) and npm (version `9.3.1`) were used during development.

```
git clone https://github.com/prashantghimire/sofifa-web-scraper
cd sofifa-web-scraper
npm install

# to download test players (useful for testing setup)
npm run test

# to download all the 18k+ players (takes ~2.5 hours)
npm run download-urls
npm run full
```
Rename or delete the `output/player-data-full.csv`, `output/player-data-test.csv` and `output/checkpoint.txt` if you want to run the full scan again.

### Sample Run
```
prashantghimire@Prashants-MBP sofifa-web-scraper % npm run full

> sofifa-web-scraper@1.0.0 full
> node main.js full

running full scan.
1-https://sofifa.com/player/239085/erling-haaland/240047/
2-https://sofifa.com/player/231747/kylian-mbappe/240047/
3-https://sofifa.com/player/192985/kevin-de-bruyne/240047/
4-https://sofifa.com/player/231866/rodrigo-hernandez-cascante/240047/
5-https://sofifa.com/player/202126/harry-kane/240047/
.
.
.
18722-https://sofifa.com/player/277344/eanna-fitzgerald/240047/
18723-https://sofifa.com/player/272761/jiaqiang-lyu/240047/
18724-https://sofifa.com/player/71064/ishaan-shishodia/240047/
18725-https://sofifa.com/player/269541/yuhang-wu/240047/
18726-https://sofifa.com/player/277493/fredy-chawngthansanga/240047/
scan complete: 2:23:31.926 (h:mm:ss.mmm)
```

#### Players Data

```
import pandas as pd
pd.read_csv('./player-data-full.csv', index_col=['player_id'])
```

<img src="images/player_data.png"  alt="Basic"/>
