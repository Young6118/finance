# 智能投研辅助交易系统 - 技术实现方案

## 1. 技术架构概述

### 1.1 技术栈选型
- **后端开发**：Node.js + Express.js + Bull Queue
- **前端开发**：Vue3 + TypeScript + ECharts
- **数据存储**：SQLite（开发） / MySQL（生产）
- **缓存**：Redis（可选）
- **部署运维**：Docker + PM2

### 1.2 系统架构图
```
前端层：Vue3 SPA
  ↓
API层：Express.js RESTful API
  ↓
业务层：情绪分析引擎
  ↓
数据层：SQLite + 数据爬虫
```

## 2. 第一阶段MVP实现

### 2.1 数据获取模块（第1周）

```javascript
// 数据源API封装 (使用axios + cheerio爬取)
const axios = require('axios');
const cheerio = require('cheerio');

class MarketDataProvider {
  constructor() {
    this.baseUrls = {
      sina: 'https://hq.sinajs.cn',
      eastmoney: 'https://push2.eastmoney.com',
      tencent: 'https://qt.gtimg.cn'
    };
  }

  // 涨跌家数比（上证A股）
  async getMarketBreadth() {
    const response = await axios.get(`${this.baseUrls.sina}/list=s_sh000001`);
    return this.parseBreadthData(response.data);
  }

  // 成交量比率（与5日均量比较）
  async getVolumeRatio() {
    const response = await axios.get(`${this.baseUrls.eastmoney}/api/qt/slist/get`, {
      params: { 
        spt: 1, fid: 'f3', po: 1, pz: 50, pn: 1, np: 1, 
        ut: 'bd1d9ddb04089700cf9c27f6f7426281', fltt: 2 
      }
    });
    return this.parseVolumeData(response.data);
  }

  // 北上资金流入
  async getForeignInflow() {
    const response = await axios.get(`${this.baseUrls.eastmoney}/api/qt/kamtauction/get`, {
      params: { 
        ut: 'bd1d9ddb04089700cf9c27f6f7426281', 
        dpt: 1, 
        cb: 'C._A_DUCTION_DATA_' + Date.now()
      }
    });
    return this.parseForeignFlow(response.data);
  }

  // 融资融券余额变化  
  async getMarginBalance() {
    const url = 'http://datainterface.eastmoney.com/EM_DataCenter/JS.aspx';
    const params = {
      type: 'FD', sty: 'RZRQSJ', st: 2, sr: -1, p: 1, ps: 50,
      js: 'var data_tab_1={pages:(pc),data:[(x)]}'
    };
    const response = await axios.get(url, { params });
    return this.parseMarginData(response.data);
  }
}
```

### 2.2 情绪分析引擎（第2周）

```javascript
class SentimentEngine {
  constructor() {
    this.weights = {
      vix: 0.3, breadth: 0.25, volume: 0.2, margin: 0.15, foreign: 0.1
    };
    this.dataProvider = new MarketDataProvider();
  }

  async calculateCurrentSentiment() {
    try {
      const [breadth, volume, margin, foreign] = await Promise.all([
        this.dataProvider.getMarketBreadth(),
        this.dataProvider.getVolumeRatio(), 
        this.dataProvider.getMarginBalance(),
        this.dataProvider.getForeignInflow()
      ]);

      const normalizedData = {
        vix: this.normalizeVIX(30), 
        breadth: this.normalizeBreadth(breadth),
        volume: this.normalizeVolume(volume),
        margin: this.normalizeMargin(margin),
        foreign: this.normalizeForeign(foreign)
      };

      const sentimentScore = Object.keys(this.weights).reduce((score, key) => {
        return score + (normalizedData[key] * this.weights[key]);
      }, 0);

      return Math.max(0, Math.min(100, sentimentScore * 100));
    } catch (error) {
      console.error('计算情绪指数失败:', error);
      return null;
    }
  }

  getSentimentStatus(score) {
    if (score >= 75) return { status: '极度贪婪', color: '#ff4444', action: '谨慎' };
    if (score >= 60) return { status: '贪婪', color: '#ff8800', action: '观望' };
    if (score >= 40) return { status: '中性', color: '#00aa00', action: '适度参与' };
    if (score >= 25) return { status: '恐慌', color: '#0088ff', action: '关注机会' };
    return { status: '极度恐慌', color: '#0044ff', action: '逢低布局' };
  }
}
```

### 2.3 Vue3前端仪表板

```vue
<template>
  <div class="sentiment-dashboard">
    <div class="main-indicator">
      <div class="score-circle" :style="{ borderColor: sentimentData.color }">
        <span class="score-number">{{ sentimentData.score }}</span>
      </div>
      <div class="status-info">
        <h2 :style="{ color: sentimentData.color }">{{ sentimentData.status }}</h2>
        <p class="action-advice">建议：{{ sentimentData.action }}</p>
      </div>
    </div>

    <div class="indicators-grid">
      <div v-for="indicator in indicators" :key="indicator.name" class="indicator-card">
        <h3>{{ indicator.name }}</h3>
        <div class="indicator-value">{{ indicator.value }}</div>
      </div>
    </div>

    <div class="history-chart">
      <div ref="historyChart" style="height: 300px;"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import * as echarts from 'echarts'

const sentimentData = reactive({
  score: 0, status: '加载中...', color: '#666', action: '分析中...'
})

const fetchSentimentData = async () => {
  try {
    const response = await fetch('/api/sentiment')
    const data = await response.json()
    Object.assign(sentimentData, data)
  } catch (error) {
    console.error('获取情绪数据失败:', error)
  }
}

onMounted(() => {
  fetchSentimentData()
  setInterval(fetchSentimentData, 5 * 60 * 1000)
})
</script>
```

### 2.4 Express后端API

```javascript
const express = require('express')
const { SentimentEngine } = require('./sentiment-engine')

const app = express()
app.use(express.json())

const sentimentEngine = new SentimentEngine()

app.get('/api/sentiment', async (req, res) => {
  try {
    const score = await sentimentEngine.calculateCurrentSentiment()
    const statusInfo = sentimentEngine.getSentimentStatus(score)
    
    res.json({
      score: Math.round(score),
      status: statusInfo.status,
      color: statusInfo.color,
      action: statusInfo.action
    })
  } catch (error) {
    res.status(500).json({ error: '服务器错误' })
  }
})

app.listen(3000, () => console.log('服务启动: http://localhost:3000'))
```

## 3. 开发配置

### 3.1 项目初始化

```bash
# 创建项目
mkdir sentiment-analysis && cd sentiment-analysis

# 后端依赖
npm install express axios cheerio sqlite3 cors

# 前端依赖  
npm create vue@latest frontend
cd frontend && npm install echarts
```

### 3.2 依赖包配置

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.5.0", 
    "cheerio": "^1.0.0-rc.12",
    "sqlite3": "^5.1.6",
    "cors": "^2.8.5"
  }
}
```

## 4. 实施注意事项

- **反爬虫**: 使用请求间隔和User-Agent轮换
- **错误处理**: 网络请求失败的重试机制  
- **数据验证**: 异常值检测和数据清洗
- **缓存策略**: 避免频繁API调用