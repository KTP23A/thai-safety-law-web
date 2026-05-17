#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const kumuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'kumu-data.json'), 'utf8'));

const laws = kumuData.elements.filter(e => e.type !== 'กระทรวง');
const connections = kumuData.connections.filter(c => !c.from.startsWith('hub-') && !c.to.startsWith('hub-'));

// Ministry color map (strip emoji for key lookup)
const COLORS = {
  "กระทรวงแรงงาน": "#1565C0",
  "กระทรวงอุตสาหกรรม": "#E65100",
  "กระทรวงมหาดไทย": "#2E7D32",
  "กระทรวงพลังงาน": "#F9A825",
  "กระทรวงสาธารณสุข": "#C62828",
  "กระทรวงคมนาคม": "#795548",
  "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม": "#6A1B9A",
  "กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม": "#00695C",
};

function getColor(ministryWithEmoji) {
  const key = Object.keys(COLORS).find(k => ministryWithEmoji.includes(k));
  return key ? COLORS[key] : "#888";
}

function getMinistryShort(full) {
  const map = {
    "กระทรวงแรงงาน": "แรงงาน",
    "กระทรวงอุตสาหกรรม": "อุตสาหกรรม",
    "กระทรวงมหาดไทย": "มหาดไทย",
    "กระทรวงพลังงาน": "พลังงาน",
    "กระทรวงสาธารณสุข": "สาธารณสุข",
    "กระทรวงคมนาคม": "คมนาคม",
    "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม": "อว.",
    "กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม": "ทส.",
  };
  const key = Object.keys(map).find(k => full.includes(k));
  return key ? map[key] : full;
}

// ─── TREEMAP DATA ─────────────────────────────────────────────
const ministryMap = {};
laws.forEach(law => {
  const min = law.attributes.ministry;
  const type = law.attributes.law_type || 'อื่นๆ';
  if (!ministryMap[min]) ministryMap[min] = {};
  if (!ministryMap[min][type]) ministryMap[min][type] = [];
  ministryMap[min][type].push(law);
});

const treemapData = {
  name: 'กฎหมายทั้งหมด',
  children: Object.entries(ministryMap).map(([min, types]) => ({
    name: min,
    itemStyle: { color: getColor(min) },
    children: Object.entries(types).map(([type, items]) => ({
      name: type,
      itemStyle: { color: getColor(min) + 'cc' },
      children: items.map(law => ({
        name: law.label.length > 40 ? law.label.substring(0, 38) + '…' : law.label,
        fullName: law.label,
        value: 1,
        ministry: min,
        year: law.attributes.year,
        status: law.attributes.status,
        itemStyle: { color: getColor(min) + '99' }
      }))
    }))
  }))
};

// ─── SUNBURST DATA ─────────────────────────────────────────────
const sunburstData = {
  name: 'กฎหมาย\nความปลอดภัย',
  children: Object.entries(ministryMap).map(([min, types]) => ({
    name: getMinistryShort(min),
    fullName: min,
    itemStyle: { color: getColor(min) },
    children: Object.entries(types).map(([type, items]) => ({
      name: type.replace('กระทรวง','กระทรวง\n').replace('พระราชบัญญัติ','พ.ร.บ.').replace('กฎกระทรวง','กฎกระ\nทรวง').replace('ประกาศกระทรวง','ประกาศ\nกระทรวง').replace('ประกาศกรม','ประกาศ\nกรม'),
      itemStyle: { color: getColor(min) + 'cc' },
      children: items.map(law => ({
        name: '',
        fullName: law.label,
        value: 1,
        itemStyle: { color: getColor(min) + '88' }
      }))
    }))
  }))
};

// ─── NETWORK DATA ─────────────────────────────────────────────
const networkNodes = laws.map(law => ({
  id: law.id,
  name: law.label.length > 30 ? law.label.substring(0, 28) + '…' : law.label,
  fullName: law.label,
  ministry: law.attributes.ministry,
  year: law.attributes.year,
  type: law.attributes.law_type,
  symbolSize: law.attributes.law_type === 'พระราชบัญญัติ' ? 18 : 10,
  itemStyle: { color: getColor(law.attributes.ministry) },
  category: Object.keys(ministryMap).indexOf(law.attributes.ministry)
}));

const networkEdges = connections.map(c => ({
  source: c.from,
  target: c.to,
  lineStyle: { opacity: 0.3 }
}));

const networkCategories = Object.keys(ministryMap).map(min => ({
  name: getMinistryShort(min),
  itemStyle: { color: getColor(min) }
}));

// ─── HTML ─────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>แผนที่กฎหมายความปลอดภัย 🇹🇭</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Sarabun', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

header {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  padding: 20px 32px;
  border-bottom: 1px solid #1e40af44;
  display: flex; align-items: center; justify-content: space-between;
}
header h1 { font-size: 1.4rem; font-weight: 700; color: #93c5fd; }
header p { font-size: 0.85rem; color: #64748b; margin-top: 2px; }
.badge { background: #1e40af; color: #bfdbfe; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }

.tabs {
  display: flex; gap: 0; background: #1e293b;
  border-bottom: 1px solid #334155; padding: 0 24px;
}
.tab {
  padding: 14px 24px; cursor: pointer; font-size: 0.95rem; font-weight: 600;
  color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px;
}
.tab:hover { color: #93c5fd; background: #1e3a5f22; }
.tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: #1e3a5f22; }

.info-bar {
  display: flex; gap: 16px; padding: 12px 24px; background: #1e293b88;
  border-bottom: 1px solid #1e293b; font-size: 0.82rem; color: #94a3b8;
  flex-wrap: wrap;
}
.info-bar span { display: flex; align-items: center; gap: 6px; }
.info-bar strong { color: #cbd5e1; }

#chart { width: 100%; height: calc(100vh - 160px); }

.tooltip-box {
  background: #1e293b; border: 1px solid #334155; border-radius: 10px;
  padding: 14px 18px; font-family: 'Sarabun', sans-serif; font-size: 0.9rem;
  max-width: 320px; line-height: 1.7; box-shadow: 0 8px 32px #00000066;
}
.tooltip-box .title { font-weight: 700; color: #93c5fd; margin-bottom: 8px; font-size: 1rem; }
.tooltip-box .meta { color: #94a3b8; font-size: 0.83rem; }
.tooltip-box .tag { display: inline-block; background: #1e40af33; color: #93c5fd; 
  border-radius: 4px; padding: 1px 7px; margin: 1px; font-size: 0.78rem; }

.legend {
  position: absolute; bottom: 20px; left: 20px;
  background: #1e293bcc; border: 1px solid #334155; border-radius: 8px;
  padding: 12px 16px; font-size: 0.8rem; backdrop-filter: blur(8px);
}
.legend-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; color: #cbd5e1; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

.chart-wrap { position: relative; }
</style>
</head>
<body>

<header>
  <div>
    <h1>🇹🇭 แผนที่กฎหมายความปลอดภัยและอาชีวอนามัย</h1>
    <p>Thai Occupational Safety & Environmental Law Database</p>
  </div>
  <span class="badge">85 ฉบับ • 8 กระทรวง</span>
</header>

<div class="tabs">
  <div class="tab active" onclick="showChart('treemap')">📊 Treemap <small style="font-weight:400;font-size:0.78rem">(จัดกลุ่ม)</small></div>
  <div class="tab" onclick="showChart('sunburst')">☀️ Sunburst <small style="font-weight:400;font-size:0.78rem">(ลำดับชั้น)</small></div>
  <div class="tab" onclick="showChart('network')">🕸️ Network <small style="font-weight:400;font-size:0.78rem">(ความสัมพันธ์)</small></div>
</div>

<div class="info-bar" id="infoBar">
  <span>📊 <strong>Treemap</strong> — ขนาดแทนจำนวนกฎหมาย / สีแทนกระทรวง / คลิกเพื่อ drill-down</span>
</div>

<div class="chart-wrap">
  <div id="chart"></div>
  <div class="legend" id="legend">
    <div style="font-weight:700;color:#93c5fd;margin-bottom:8px;font-size:0.85rem">กระทรวง</div>
    ${Object.entries(COLORS).map(([min, color]) => {
      const short = {
        "กระทรวงแรงงาน": "👷 แรงงาน",
        "กระทรวงอุตสาหกรรม": "🏭 อุตสาหกรรม",
        "กระทรวงมหาดไทย": "🏛 มหาดไทย",
        "กระทรวงพลังงาน": "⚡ พลังงาน",
        "กระทรวงสาธารณสุข": "🏥 สาธารณสุข",
        "กระทรวงคมนาคม": "🚛 คมนาคม",
        "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม": "☢️ อว.",
        "กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม": "🌿 ทส.",
      }[min] || min;
      return `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div>${short}</div>`;
    }).join('')}
  </div>
</div>

<script>
const chart = echarts.init(document.getElementById('chart'), null, { renderer: 'canvas' });
const treemapData = ${JSON.stringify(treemapData)};
const sunburstData = ${JSON.stringify(sunburstData)};
const networkNodes = ${JSON.stringify(networkNodes)};
const networkEdges = ${JSON.stringify(networkEdges)};
const networkCategories = ${JSON.stringify(networkCategories)};

let currentMode = 'treemap';

const INFO = {
  treemap: '📊 <strong>Treemap</strong> — ขนาดแทนจำนวนกฎหมาย / สีแทนกระทรวง / คลิกเพื่อ drill-down ดูรายละเอียด',
  sunburst: '☀️ <strong>Sunburst</strong> — วงในสุด = กระทรวง / วงกลาง = ประเภทกฎหมาย / วงนอก = แต่ละฉบับ / คลิกเพื่อ zoom',
  network: '🕸️ <strong>Network</strong> — โหนดใหญ่ = พ.ร.บ. (กฎหมายแม่) / โหนดเล็ก = กฎลูก / เส้น = อ้างอิงถึงกัน / ลาก+ซูมได้'
};

function treemapOpt() {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: p => {
        if (!p.data.fullName) return '';
        return \`<div class="tooltip-box">
          <div class="title">\${p.data.fullName}</div>
          <div class="meta">
            \${p.data.ministry ? '🏛 ' + p.data.ministry + '<br>' : ''}
            \${p.data.year ? '📅 พ.ศ. ' + p.data.year + '<br>' : ''}
            \${p.data.status ? '✅ ' + p.data.status : ''}
          </div>
        </div>\`;
      }
    },
    series: [{
      type: 'treemap',
      data: treemapData.children,
      roam: false,
      nodeClick: 'zoomToNode',
      drillDownIcon: '▶',
      leafDepth: 2,
      breadcrumb: {
        show: true,
        bottom: 10,
        itemStyle: { color: '#1e293b', borderColor: '#334155', textStyle: { color: '#93c5fd' } }
      },
      label: {
        show: true,
        formatter: p => p.data.fullName || p.name,
        fontSize: 11,
        fontFamily: 'Sarabun',
        color: '#fff',
        overflow: 'break',
      },
      upperLabel: {
        show: true,
        height: 28,
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'Sarabun',
        color: '#fff',
        backgroundColor: 'inherit',
        padding: [4,8]
      },
      itemStyle: { borderColor: '#0f172a', borderWidth: 2, gapWidth: 2 },
      levels: [
        { itemStyle: { borderColor: '#0f172a', borderWidth: 3, gapWidth: 3 }, upperLabel: { show: false } },
        { itemStyle: { borderColor: '#1e293b', borderWidth: 2, gapWidth: 2 }, colorSaturation: [0.7, 0.9] },
        { colorSaturation: [0.5, 0.7], itemStyle: { borderColor: '#1e293b', borderWidth: 1, gapWidth: 1 } }
      ]
    }]
  };
}

function sunburstOpt() {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: p => {
        if (!p.data.fullName) return '';
        return \`<div class="tooltip-box"><div class="title">\${p.data.fullName}</div></div>\`;
      }
    },
    series: [{
      type: 'sunburst',
      data: sunburstData.children,
      radius: ['8%', '92%'],
      center: ['50%', '50%'],
      sort: null,
      emphasis: { focus: 'ancestor' },
      levels: [
        {},
        { r0: '8%', r: '28%', itemStyle: { borderWidth: 2, borderColor: '#0f172a' },
          label: { fontSize: 13, fontFamily: 'Sarabun', fontWeight: 'bold', color: '#fff', rotate: 'tangential' } },
        { r0: '28%', r: '58%', itemStyle: { borderWidth: 1, borderColor: '#0f172a22' },
          label: { fontSize: 10, fontFamily: 'Sarabun', color: '#fff', rotate: 'tangential', overflow: 'truncate', width: 80 } },
        { r0: '58%', r: '92%', itemStyle: { borderWidth: 1, borderColor: '#0f172a11' },
          label: { show: false } }
      ]
    }]
  };
}

function networkOpt() {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: p => {
        if (p.dataType !== 'node') return '';
        return \`<div class="tooltip-box">
          <div class="title">\${p.data.fullName}</div>
          <div class="meta">
            🏛 \${p.data.ministry || ''}<br>
            📋 \${p.data.type || ''} \${p.data.year ? '· พ.ศ.' + p.data.year : ''}
          </div>
        </div>\`;
      }
    },
    legend: {
      show: false
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: networkNodes,
      links: networkEdges,
      categories: networkCategories,
      roam: true,
      zoom: 1.2,
      draggable: true,
      force: {
        repulsion: 180,
        gravity: 0.15,
        edgeLength: [60, 160],
        layoutAnimation: true,
        friction: 0.6
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 9,
        fontFamily: 'Sarabun',
        color: '#94a3b8',
        formatter: p => p.data.type === 'พระราชบัญญัติ' ? p.name : ''
      },
      emphasis: {
        label: { show: true, fontSize: 11, fontWeight: 'bold', color: '#e2e8f0' },
        lineStyle: { width: 2, opacity: 0.8 }
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 4,
      lineStyle: { color: '#334155', width: 1, opacity: 0.4, curveness: 0.1 },
      itemStyle: { borderColor: '#0f172a', borderWidth: 1.5 }
    }]
  };
}

function showChart(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', ['treemap','sunburst','network'][i] === mode);
  });
  document.getElementById('infoBar').innerHTML = '<span>' + INFO[mode] + '</span>';
  
  chart.showLoading({ text: 'กำลังโหลด...', color: '#3b82f6', textColor: '#93c5fd', maskColor: '#0f172a99' });
  setTimeout(() => {
    chart.hideLoading();
    if (mode === 'treemap') chart.setOption(treemapOpt(), true);
    else if (mode === 'sunburst') chart.setOption(sunburstOpt(), true);
    else chart.setOption(networkOpt(), true);
  }, 100);
}

window.addEventListener('resize', () => chart.resize());
showChart('treemap');
<\/script>
</body>
</html>`;

// Save to static folder
const staticDir = path.join(__dirname, 'quartz', 'static');
if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
fs.writeFileSync(path.join(staticDir, 'law-map.html'), html, 'utf8');
console.log('✅ Generated quartz/static/law-map.html');
