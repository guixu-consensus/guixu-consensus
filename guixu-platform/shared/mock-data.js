/* ============================================================
   Guixu Consensus Platform :: mock dataset
   ------------------------------------------------------------
   【重要】当前为框架阶段的模拟数据源。
   后续接入真实后端时：保持 window.GX_DATA 的结构不变，
   仅需把本文件替换为 "从 /api/snapshot 拉取后赋值" 的适配层，
   所有页面无需改动。详见 shared/guixu-core.js 的 GX.api 说明。

   【多语言约定】
   本文件中所有面向用户的文本一律以 *Key 形式存放（值为 shared/i18n/
   <lang>.js 中的词条 key），页面渲染时通过 GX.t(key) 取当前语言文案。
   因此后续新增语言只需新增一个语言包文件，本数据层与页面均无需改动；
   若后端返回枚举值，直接返回同名字符串 key 即可。
   ============================================================ */

window.GX_DATA = {

  /* ---------- 全局网络快照 ---------- */
  global: {
    onlineNodes: 12846,
    totalNodes: 15302,
    storageTB: 384200,      // 全网存储贡献 (TB)
    bandwidthGbps: 2140,    // 全网带宽贡献 (Gbps)
    computeTflops: 1860,    // 全网算力贡献 (TFLOPS)
    countries: 73,
    cities: 412,
    uptimePct: 99.2,
    dailyReward: 1_284_500, // 日发放 x 代币
    opsFund: 8_642_300      // 运维基金余额 (x)
  },

  /* ---------- 终端类型分布 ---------- */
  nodeTypes: [
    { key: 'pc',     labelKey: 'd.nodetype.pc',     count: 5908, color: '#a3bffa',
      provideKeys: ['d.res.storage', 'd.res.bandwidth', 'd.res.compute'] },
    { key: 'mobile', labelKey: 'd.nodetype.mobile', count: 5341, color: '#7ee0c8',
      provideKeys: ['d.res.bandwidth', 'd.res.storageLight'] },
    { key: 'nas',    labelKey: 'd.nodetype.nas',    count: 1187, color: '#ffb86b',
      provideKeys: ['d.res.storage', 'd.res.bandwidth'] },
    { key: 'server', labelKey: 'd.nodetype.server', count: 410,  color: '#c9a7ff',
      provideKeys: ['d.res.storage', 'd.res.bandwidth', 'd.res.compute'] }
  ],

  /* ---------- 区域分布 ---------- */
  regions: [
    { code: 'CN',  nameKey: 'd.region.CN',  nodes: 3120, storageTB: 98200, bandwidthGbps: 520, computeTflops: 430 },
    { code: 'NA',  nameKey: 'd.region.NA',  nodes: 2410, storageTB: 86300, bandwidthGbps: 468, computeTflops: 512 },
    { code: 'EU',  nameKey: 'd.region.EU',  nodes: 2180, storageTB: 71500, bandwidthGbps: 392, computeTflops: 361 },
    { code: 'SEA', nameKey: 'd.region.SEA', nodes: 1655, storageTB: 41200, bandwidthGbps: 254, computeTflops: 158 },
    { code: 'EA',  nameKey: 'd.region.EA',  nodes: 1032, storageTB: 30100, bandwidthGbps: 186, computeTflops: 122 },
    { code: 'SA',  nameKey: 'd.region.SA',  nodes: 862,  storageTB: 21800, bandwidthGbps: 118, computeTflops: 74 },
    { code: 'ME',  nameKey: 'd.region.ME',  nodes: 741,  storageTB: 15600, bandwidthGbps: 96,  computeTflops: 88 },
    { code: 'AF',  nameKey: 'd.region.AF',  nodes: 496,  storageTB: 12400, bandwidthGbps: 62,  computeTflops: 41 },
    { code: 'OC',  nameKey: 'd.region.OC',  nodes: 350,  storageTB: 6900,  bandwidthGbps: 44,  computeTflops: 74 }
  ],

  /* ---------- 终端节点明细 ---------- */
  nodes: [
    { id: 'GX-CN-SZ-0417', cityKey: 'd.city.shenzhen',     countryKey: 'd.country.cn', lng: 114.06, lat: 22.54,  type: 'pc',     status: 'online',  storageGB: 8192,  bwMbps: 480,  tflops: 12.4, uptime: 99.8, score: 986 },
    { id: 'GX-CN-BJ-0128', cityKey: 'd.city.beijing',      countryKey: 'd.country.cn', lng: 116.41, lat: 39.90,  type: 'server', status: 'online',  storageGB: 32768, bwMbps: 940,  tflops: 48.2, uptime: 99.9, score: 998 },
    { id: 'GX-CN-SH-0233', cityKey: 'd.city.shanghai',     countryKey: 'd.country.cn', lng: 121.47, lat: 31.23,  type: 'pc',     status: 'online',  storageGB: 4096,  bwMbps: 320,  tflops: 8.6,  uptime: 99.5, score: 972 },
    { id: 'GX-CN-GZ-0351', cityKey: 'd.city.guangzhou',    countryKey: 'd.country.cn', lng: 113.26, lat: 23.13,  type: 'nas',    status: 'online',  storageGB: 20480, bwMbps: 260,  tflops: 0,    uptime: 99.6, score: 964 },
    { id: 'GX-CN-CD-0462', cityKey: 'd.city.chengdu',      countryKey: 'd.country.cn', lng: 104.07, lat: 30.67,  type: 'pc',     status: 'online',  storageGB: 6144,  bwMbps: 300,  tflops: 10.2, uptime: 98.9, score: 941 },
    { id: 'GX-CN-HZ-0518', cityKey: 'd.city.hangzhou',     countryKey: 'd.country.cn', lng: 120.15, lat: 30.28,  type: 'mobile', status: 'online',  storageGB: 128,   bwMbps: 180,  tflops: 0,    uptime: 97.4, score: 912 },
    { id: 'GX-HK-HK-0602', cityKey: 'd.city.hongkong',     countryKey: 'd.country.hk', lng: 114.17, lat: 22.32,  type: 'server', status: 'online',  storageGB: 40960, bwMbps: 1200, tflops: 62.8, uptime: 99.9, score: 995 },
    { id: 'GX-TW-TP-0631', cityKey: 'd.city.taipei',       countryKey: 'd.country.tw', lng: 121.56, lat: 25.03,  type: 'pc',     status: 'online',  storageGB: 3072,  bwMbps: 240,  tflops: 6.4,  uptime: 99.1, score: 950 },
    { id: 'GX-JP-TK-0705', cityKey: 'd.city.tokyo',        countryKey: 'd.country.jp', lng: 139.69, lat: 35.69,  type: 'pc',     status: 'online',  storageGB: 5120,  bwMbps: 420,  tflops: 11.8, uptime: 99.4, score: 968 },
    { id: 'GX-KR-SL-0742', cityKey: 'd.city.seoul',        countryKey: 'd.country.kr', lng: 126.98, lat: 37.57,  type: 'pc',     status: 'online',  storageGB: 4096,  bwMbps: 380,  tflops: 9.2,  uptime: 99.2, score: 957 },
    { id: 'GX-SG-SG-0801', cityKey: 'd.city.singapore',    countryKey: 'd.country.sg', lng: 103.82, lat: 1.35,   type: 'server', status: 'online',  storageGB: 28672, bwMbps: 1080, tflops: 55.4, uptime: 99.9, score: 993 },
    { id: 'GX-TH-BK-0844', cityKey: 'd.city.bangkok',      countryKey: 'd.country.th', lng: 100.50, lat: 13.75,  type: 'mobile', status: 'online',  storageGB: 96,    bwMbps: 120,  tflops: 0,    uptime: 95.2, score: 872 },
    { id: 'GX-IN-MB-0902', cityKey: 'd.city.mumbai',       countryKey: 'd.country.in', lng: 72.88,  lat: 19.08,  type: 'pc',     status: 'online',  storageGB: 2560,  bwMbps: 210,  tflops: 5.1,  uptime: 96.8, score: 903 },
    { id: 'GX-AE-DB-0948', cityKey: 'd.city.dubai',        countryKey: 'd.country.ae', lng: 55.27,  lat: 25.20,  type: 'nas',    status: 'online',  storageGB: 16384, bwMbps: 340,  tflops: 0,    uptime: 98.7, score: 936 },
    { id: 'GX-TR-IS-1003', cityKey: 'd.city.istanbul',     countryKey: 'd.country.tr', lng: 28.98,  lat: 41.01,  type: 'pc',     status: 'online',  storageGB: 3072,  bwMbps: 190,  tflops: 4.8,  uptime: 96.1, score: 894 },
    { id: 'GX-RU-MS-1051', cityKey: 'd.city.moscow',       countryKey: 'd.country.ru', lng: 37.62,  lat: 55.75,  type: 'pc',     status: 'online',  storageGB: 6144,  bwMbps: 280,  tflops: 9.6,  uptime: 98.3, score: 928 },
    { id: 'GX-DE-FR-1102', cityKey: 'd.city.frankfurt',    countryKey: 'd.country.de', lng: 8.68,   lat: 50.11,  type: 'server', status: 'online',  storageGB: 24576, bwMbps: 860,  tflops: 44.6, uptime: 99.8, score: 991 },
    { id: 'GX-UK-LN-1155', cityKey: 'd.city.london',       countryKey: 'd.country.uk', lng: -0.13,  lat: 51.51,  type: 'pc',     status: 'online',  storageGB: 4096,  bwMbps: 360,  tflops: 8.4,  uptime: 99.3, score: 962 },
    { id: 'GX-FR-PR-1204', cityKey: 'd.city.paris',        countryKey: 'd.country.fr', lng: 2.35,   lat: 48.86,  type: 'pc',     status: 'online',  storageGB: 3072,  bwMbps: 300,  tflops: 6.8,  uptime: 98.8, score: 944 },
    { id: 'GX-NL-AM-1251', cityKey: 'd.city.amsterdam',    countryKey: 'd.country.nl', lng: 4.90,   lat: 52.37,  type: 'nas',    status: 'online',  storageGB: 12288, bwMbps: 460,  tflops: 0,    uptime: 99.5, score: 971 },
    { id: 'GX-SE-ST-1303', cityKey: 'd.city.stockholm',    countryKey: 'd.country.se', lng: 18.07,  lat: 59.33,  type: 'pc',     status: 'online',  storageGB: 2048,  bwMbps: 240,  tflops: 5.6,  uptime: 98.9, score: 947 },
    { id: 'GX-ES-MD-1352', cityKey: 'd.city.madrid',       countryKey: 'd.country.es', lng: -3.70,  lat: 40.42,  type: 'mobile', status: 'online',  storageGB: 64,    bwMbps: 96,   tflops: 0,    uptime: 94.6, score: 861 },
    { id: 'GX-IT-RM-1401', cityKey: 'd.city.rome',         countryKey: 'd.country.it', lng: 12.50,  lat: 41.90,  type: 'pc',     status: 'online',  storageGB: 2560,  bwMbps: 180,  tflops: 4.2,  uptime: 97.2, score: 912 },
    { id: 'GX-EG-CR-1450', cityKey: 'd.city.cairo',        countryKey: 'd.country.eg', lng: 31.24,  lat: 30.04,  type: 'mobile', status: 'online',  storageGB: 48,    bwMbps: 64,   tflops: 0,    uptime: 92.8, score: 834 },
    { id: 'GX-NG-LG-1502', cityKey: 'd.city.lagos',        countryKey: 'd.country.ng', lng: 3.38,   lat: 6.52,   type: 'mobile', status: 'online',  storageGB: 32,    bwMbps: 48,   tflops: 0,    uptime: 90.4, score: 812 },
    { id: 'GX-ZA-JB-1551', cityKey: 'd.city.johannesburg', countryKey: 'd.country.za', lng: 28.05,  lat: -26.20, type: 'pc',     status: 'online',  storageGB: 2048,  bwMbps: 140,  tflops: 3.4,  uptime: 95.7, score: 886 },
    { id: 'GX-KE-NB-1603', cityKey: 'd.city.nairobi',      countryKey: 'd.country.ke', lng: 36.82,  lat: -1.29,  type: 'mobile', status: 'offline', storageGB: 24,    bwMbps: 36,   tflops: 0,    uptime: 88.2, score: 795 },
    { id: 'GX-US-NY-1701', cityKey: 'd.city.newyork',      countryKey: 'd.country.us', lng: -74.01, lat: 40.71,  type: 'server', status: 'online',  storageGB: 36864, bwMbps: 1200, tflops: 58.2, uptime: 99.9, score: 997 },
    { id: 'GX-US-LA-1755', cityKey: 'd.city.losangeles',   countryKey: 'd.country.us', lng: -118.24, lat: 34.05, type: 'pc',     status: 'online',  storageGB: 8192,  bwMbps: 480,  tflops: 14.6, uptime: 99.4, score: 974 },
    { id: 'GX-US-CH-1802', cityKey: 'd.city.chicago',      countryKey: 'd.country.us', lng: -87.63, lat: 41.88,  type: 'pc',     status: 'online',  storageGB: 6144,  bwMbps: 420,  tflops: 11.2, uptime: 99.1, score: 963 },
    { id: 'GX-US-DA-1851', cityKey: 'd.city.dallas',       countryKey: 'd.country.us', lng: -96.80, lat: 32.78,  type: 'nas',    status: 'online',  storageGB: 20480, bwMbps: 380,  tflops: 0,    uptime: 99.3, score: 968 },
    { id: 'GX-US-SE-1903', cityKey: 'd.city.seattle',      countryKey: 'd.country.us', lng: -122.33, lat: 47.61, type: 'pc',     status: 'online',  storageGB: 4096,  bwMbps: 400,  tflops: 9.8,  uptime: 99.0, score: 955 },
    { id: 'GX-CA-TR-1952', cityKey: 'd.city.toronto',      countryKey: 'd.country.ca', lng: -79.38, lat: 43.65,  type: 'pc',     status: 'online',  storageGB: 3072,  bwMbps: 320,  tflops: 7.2,  uptime: 98.7, score: 942 },
    { id: 'GX-MX-MC-2004', cityKey: 'd.city.mexicocity',   countryKey: 'd.country.mx', lng: -99.13, lat: 19.43,  type: 'mobile', status: 'online',  storageGB: 80,    bwMbps: 72,   tflops: 0,    uptime: 93.4, score: 848 },
    { id: 'GX-BR-SP-2051', cityKey: 'd.city.saopaulo',     countryKey: 'd.country.br', lng: -46.63, lat: -23.55, type: 'pc',     status: 'online',  storageGB: 4608,  bwMbps: 260,  tflops: 8.8,  uptime: 97.6, score: 921 },
    { id: 'GX-AR-BA-2103', cityKey: 'd.city.buenosaires',  countryKey: 'd.country.ar', lng: -58.38, lat: -34.60, type: 'pc',     status: 'online',  storageGB: 2048,  bwMbps: 160,  tflops: 4.4,  uptime: 96.3, score: 897 },
    { id: 'GX-CL-ST-2152', cityKey: 'd.city.santiago',     countryKey: 'd.country.cl', lng: -70.65, lat: -33.45, type: 'mobile', status: 'online',  storageGB: 56,    bwMbps: 88,   tflops: 0,    uptime: 94.1, score: 856 },
    { id: 'GX-PE-LM-2201', cityKey: 'd.city.lima',         countryKey: 'd.country.pe', lng: -77.04, lat: -12.05, type: 'mobile', status: 'offline', storageGB: 40,    bwMbps: 56,   tflops: 0,    uptime: 89.6, score: 803 },
    { id: 'GX-AU-SY-2250', cityKey: 'd.city.sydney',       countryKey: 'd.country.au', lng: 151.21, lat: -33.87, type: 'pc',     status: 'online',  storageGB: 6144,  bwMbps: 460,  tflops: 12.2, uptime: 99.2, score: 966 },
    { id: 'GX-AU-MB-2302', cityKey: 'd.city.melbourne',    countryKey: 'd.country.au', lng: 144.96, lat: -37.81, type: 'nas',    status: 'online',  storageGB: 16384, bwMbps: 340,  tflops: 0,    uptime: 99.0, score: 959 },
    { id: 'GX-NZ-AK-2351', cityKey: 'd.city.auckland',     countryKey: 'd.country.nz', lng: 174.76, lat: -36.85, type: 'pc',     status: 'online',  storageGB: 3072,  bwMbps: 280,  tflops: 6.6,  uptime: 98.5, score: 938 },
    { id: 'GX-ID-JK-2403', cityKey: 'd.city.jakarta',      countryKey: 'd.country.id', lng: 106.85, lat: -6.21,  type: 'mobile', status: 'online',  storageGB: 112,   bwMbps: 144,  tflops: 0,    uptime: 95.8, score: 878 },
    { id: 'GX-MY-KL-2452', cityKey: 'd.city.kualalumpur',  countryKey: 'd.country.my', lng: 101.69, lat: 3.14,   type: 'pc',     status: 'online',  storageGB: 4096,  bwMbps: 240,  tflops: 7.4,  uptime: 97.9, score: 926 },
    { id: 'GX-VN-HC-2501', cityKey: 'd.city.hochiminh',    countryKey: 'd.country.vn', lng: 106.63, lat: 10.82,  type: 'mobile', status: 'online',  storageGB: 88,    bwMbps: 128,  tflops: 0,    uptime: 96.2, score: 883 }
  ],

  /* ---------- 24h 网络负载曲线（0-23 时）---------- */
  load24h: {
    bandwidth: [38, 35, 33, 32, 34, 41, 52, 63, 74, 81, 86, 89, 91, 90, 88, 86, 84, 82, 79, 74, 66, 57, 48, 42],
    storage:   [52, 52, 51, 51, 52, 54, 58, 63, 68, 72, 75, 77, 78, 78, 77, 76, 75, 74, 72, 68, 63, 58, 55, 53],
    compute:   [22, 20, 19, 19, 21, 27, 38, 52, 66, 76, 84, 88, 90, 89, 86, 83, 80, 76, 70, 61, 49, 38, 29, 24]
  },

  /* ---------- 用户端：本机节点信息 ---------- */
  me: {
    nodeId: 'GX-CN-SZ-0F3A',
    owner: '闵宇清',
    ownerEn: 'Min Yuqing',
    devicePC:     { name: 'DESKTOP-GX01',  os: 'Windows 11', cpu: 'i7-12700K', gpu: 'RTX 4070', mem: '32GB', disk: '2TB NVMe' },
    deviceMobile: { name: 'HUAWEI Mate 60', os: 'HarmonyOS 4.2', cpu: 'Kirin 9000s', mem: '12GB', disk: '512GB' },
    wallet: { balance: 12864.42, todayEarn: 86.35, pending: 12.80, taxPaid: 214.60 },
    rank: { levelKey: 'd.rank.v3', score: 986, percentile: 2.1 },
    uptimeDays: 128
  },

  /* ---------- 用户端：资源共享配置 ----------
     说明：不同终端可共享的资源能力不同，这是本平台的核心差异化点。
  */
  shareProfile: {
    pc: {
      titleKey: 'd.nodetype.pc',
      subtitleKey: 'd.share.pc.subtitle',
      items: [
        { key: 'storage', labelKey: 'd.share.pc.storage.label', descKey: 'd.share.pc.storage.desc',
          hintKey: 'd.share.pc.storage.hint',
          unit: 'GB', limit: 500, max: 2000, step: 50, enabled: true,  weightKey: 'd.weight.high' },
        { key: 'bandwidth', labelKey: 'd.share.pc.bandwidth.label', descKey: 'd.share.pc.bandwidth.desc',
          hintKey: 'd.share.pc.bandwidth.hint',
          unit: 'Mbps', limit: 100, max: 480, step: 10, enabled: true, weightKey: 'd.weight.high' },
        { key: 'compute', labelKey: 'd.share.pc.compute.label', descKey: 'd.share.pc.compute.desc',
          hintKey: 'd.share.pc.compute.hint',
          unit: 'TFLOPS', limit: 8, max: 14, step: 0.5, enabled: true, weightKey: 'd.weight.mid' }
      ],
      policies: [
        { key: 'idleOnly',    labelKey: 'd.share.pc.idleOnly.label',    descKey: 'd.share.pc.idleOnly.desc',    on: true },
        { key: 'nightWindow', labelKey: 'd.share.pc.nightWindow.label', descKey: 'd.share.pc.nightWindow.desc', on: true },
        { key: 'autoPause',   labelKey: 'd.share.pc.autoPause.label',   descKey: 'd.share.pc.autoPause.desc',   on: true }
      ]
    },
    mobile: {
      titleKey: 'd.nodetype.mobile',
      subtitleKey: 'd.share.mobile.subtitle',
      items: [
        { key: 'bandwidth', labelKey: 'd.share.mobile.bandwidth.label', descKey: 'd.share.mobile.bandwidth.desc',
          hintKey: 'd.share.mobile.bandwidth.hint',
          unit: 'Mbps', limit: 40, max: 120, step: 5, enabled: true, weightKey: 'd.weight.high' },
        { key: 'storage', labelKey: 'd.share.mobile.storage.label', descKey: 'd.share.mobile.storage.desc',
          hintKey: 'd.share.mobile.storage.hint',
          unit: 'GB', limit: 16, max: 64, step: 4, enabled: true, weightKey: 'd.weight.mid' },
        { key: 'compute', labelKey: 'd.share.mobile.compute.label', descKey: 'd.share.mobile.compute.desc',
          hintKey: 'd.share.mobile.compute.hint',
          unit: 'TFLOPS', limit: 0, max: 0, step: 0, enabled: false, weightKey: 'd.weight.na' }
      ],
      policies: [
        { key: 'wifiOnly',     labelKey: 'd.share.mobile.wifiOnly.label',     descKey: 'd.share.mobile.wifiOnly.desc',     on: true },
        { key: 'chargingOnly', labelKey: 'd.share.mobile.chargingOnly.label', descKey: 'd.share.mobile.chargingOnly.desc', on: true },
        { key: 'lowBattery',   labelKey: 'd.share.mobile.lowBattery.label',   descKey: 'd.share.mobile.lowBattery.desc',   on: true }
      ]
    }
  },

  /* ---------- 用户端：收益与任务 ---------- */
  earnings: {
    series: [62, 68, 71, 66, 74, 80, 77, 83, 79, 86, 88, 84, 86, 90, 87],
    breakdown: [
      { key: 'storage',   labelKey: 'd.earn.bd.storage',   today: 32.40, month: 892.10,  color: '#a3bffa' },
      { key: 'bandwidth', labelKey: 'd.earn.bd.bandwidth', today: 38.20, month: 1046.60, color: '#7ee0c8' },
      { key: 'compute',   labelKey: 'd.earn.bd.compute',   today: 15.75, month: 431.30,  color: '#ffb86b' }
    ],
    history: [
      { time: '09-23 14:20', typeKey: 'd.earn.type.compute',   labelKey: 'd.earn.h1.label', amount: 2.15 },
      { time: '09-23 13:05', typeKey: 'd.earn.type.bandwidth', labelKey: 'd.earn.h2.label', amount: 0.86 },
      { time: '09-23 11:48', typeKey: 'd.earn.type.storage',   labelKey: 'd.earn.h3.label', amount: 1.20 },
      { time: '09-23 10:12', typeKey: 'd.earn.type.bandwidth', labelKey: 'd.earn.h4.label', amount: 0.64 },
      { time: '09-23 08:30', typeKey: 'd.earn.type.compute',   labelKey: 'd.earn.h5.label', amount: 3.42 },
      { time: '09-22 23:41', typeKey: 'd.earn.type.storage',   labelKey: 'd.earn.h6.label', amount: 1.18 }
    ]
  },

  /* ---------- 后台：商业对接待审 ---------- */
  merchants: [
    { id: 'M-2041', nameKey: 'd.merchant.M2041.name', typeKey: 'd.merchant.M2041.type', demandKey: 'd.merchant.M2041.demand',
      regionKey: 'd.merchant.region.east',   quoteKey: 'd.merchant.M2041.quote', status: 'pending', score: 92 },
    { id: 'M-2038', nameKey: 'd.merchant.M2038.name', typeKey: 'd.merchant.M2038.type', demandKey: 'd.merchant.M2038.demand',
      regionKey: 'd.merchant.region.south',  quoteKey: 'd.merchant.M2038.quote', status: 'pending', score: 88 },
    { id: 'M-2036', nameKey: 'd.merchant.M2036.name', typeKey: 'd.merchant.M2036.type', demandKey: 'd.merchant.M2036.demand',
      regionKey: 'd.merchant.region.north',  quoteKey: 'd.merchant.M2036.quote', status: 'active',  score: 95 },
    { id: 'M-2033', nameKey: 'd.merchant.M2033.name', typeKey: 'd.merchant.M2033.type', demandKey: 'd.merchant.M2033.demand',
      regionKey: 'd.merchant.region.southwest', quoteKey: 'd.merchant.M2033.quote', status: 'active', score: 84 },
    { id: 'M-2029', nameKey: 'd.merchant.M2029.name', typeKey: 'd.merchant.M2029.type', demandKey: 'd.merchant.M2029.demand',
      regionKey: 'd.merchant.region.overseas',  quoteKey: 'd.merchant.M2029.quote', status: 'review',  score: 79 }
  ],

  /* ---------- 后台：运维基金流水 ---------- */
  fundFlow: {
    income: [
      { labelKey: 'd.fund.income.1', value: 628400 },
      { labelKey: 'd.fund.income.2', value: 214100 },
      { labelKey: 'd.fund.income.3', value: 96300 }
    ],
    cost: [
      { labelKey: 'd.fund.cost.1', value: 386200 },
      { labelKey: 'd.fund.cost.2', value: 142800 },
      { labelKey: 'd.fund.cost.3', value: 231500 },
      { labelKey: 'd.fund.cost.4', value: 168400 }
    ]
  },

  /* ---------- 后台：告警 ---------- */
  alerts: [
    { level: 'warn', time: '14:22', textKey: 'd.alert.1' },
    { level: 'info', time: '13:47', textKey: 'd.alert.2' },
    { level: 'warn', time: '12:15', textKey: 'd.alert.3' },
    { level: 'info', time: '11:02', textKey: 'd.alert.4' },
    { level: 'bad',  time: '09:38', textKey: 'd.alert.5' }
  ],

  /* ---------- 路线图（供门户页展示）---------- */
  roadmap: [
    { phase: 'P1', date: '2026 Q4', titleKey: 'd.roadmap.P1.title',
      itemKeys: ['d.roadmap.P1.i1', 'd.roadmap.P1.i2', 'd.roadmap.P1.i3', 'd.roadmap.P1.i4'] },
    { phase: 'P2', date: '2027 Q1', titleKey: 'd.roadmap.P2.title',
      itemKeys: ['d.roadmap.P2.i1', 'd.roadmap.P2.i2', 'd.roadmap.P2.i3'] },
    { phase: 'P3', date: '2027 Q2', titleKey: 'd.roadmap.P3.title',
      itemKeys: ['d.roadmap.P3.i1', 'd.roadmap.P3.i2', 'd.roadmap.P3.i3'] },
    { phase: 'P4', date: '2027 Q3', titleKey: 'd.roadmap.P4.title',
      itemKeys: ['d.roadmap.P4.i1', 'd.roadmap.P4.i2', 'd.roadmap.P4.i3'] }
  ]
};
