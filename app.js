const RAW_CARDS = window.WC_CARDS || [];
const TOTAL = RAW_CARDS.length;

const STORAGE_KEY = "wcMemeGachaV1";
const LEGACY_KEYS = ["memeKingH5v1", "wc26v5", "wc26v4"];
const DAILY_BASE_TICKETS = 30;
const DAILY_QUIZ_LIMIT = 5;
const SSR_PITY_LIMIT = 30;
const TEAM_WEIGHT = 2;
const OPENING_DURATION = 1180;
const RESULT_REVEAL_STEP = 88;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const TEAMS = [
  { id: "brazil", name: "巴西", flag: "🇧🇷", color: "#168f52", tags: ["巴西", "五星", "桑巴", "贝利", "内马尔"] },
  { id: "france", name: "法国", flag: "🇫🇷", color: "#2351a4", tags: ["法国", "高卢", "姆巴佩", "齐达内"] },
  { id: "argentina", name: "阿根廷", flag: "🇦🇷", color: "#62b6df", tags: ["阿根廷", "梅西", "马拉多纳", "潘帕斯"] },
  { id: "spain", name: "西班牙", flag: "🇪🇸", color: "#c5292a", tags: ["西班牙", "传控", "斗牛士"] },
  { id: "england", name: "英格兰", flag: "🏴", color: "#b81f32", tags: ["英格兰", "三狮", "点球", "回家"] },
  { id: "portugal", name: "葡萄牙", flag: "🇵🇹", color: "#12834c", tags: ["葡萄牙", "C罗", "罗纳尔多"] },
  { id: "germany", name: "德国", flag: "🇩🇪", color: "#242424", tags: ["德国", "西德", "日耳曼", "伯尔尼"] },
  { id: "netherlands", name: "荷兰", flag: "🇳🇱", color: "#e67317", tags: ["荷兰", "橙衣", "全攻全守", "无冕"] },
  { id: "usa", name: "美国", flag: "🇺🇸", color: "#2f6ed3", tags: ["美国", "美利坚", "2026", "主场"] },
  { id: "japan", name: "日本", flag: "🇯🇵", color: "#d23b5c", tags: ["日本", "亚洲", "蓝武士"] },
  { id: "korea", name: "韩国", flag: "🇰🇷", color: "#2658ba", tags: ["韩国", "亚洲", "红魔"] },
  { id: "croatia", name: "克罗地亚", flag: "🇭🇷", color: "#d13b3f", tags: ["克罗地亚", "格子军", "莫德里奇", "加时"] },
];

const RARITY = {
  N: { label: "N", name: "日常梗", rank: 1, color: "#6f7782", ink: "#ffffff" },
  R: { label: "R", name: "高光梗", rank: 2, color: "#2d7bd8", ink: "#ffffff" },
  SR: { label: "SR", name: "名场面", rank: 3, color: "#8b50c9", ink: "#ffffff" },
  SSR: { label: "SSR", name: "神梗", rank: 4, color: "#d89514", ink: "#221704" },
  UR: { label: "UR", name: "传说梗", rank: 5, color: "#d43b3b", ink: "#ffffff" },
};

const RATE_TABLE = [
  { rarity: "UR", weight: 2 },
  { rarity: "SSR", weight: 8 },
  { rarity: "SR", weight: 20 },
  { rarity: "R", weight: 35 },
  { rarity: "N", weight: 35 },
];

const POOLS = [
  {
    id: "all",
    name: "全梗池",
    title: "世界杯全梗包",
    sub: "经典老梗 / 新赛季热梗 / 球迷暗号",
    ribbon: "全梗池",
    match: () => true,
  },
  {
    id: "old",
    name: "老梗池",
    title: "陈年老梗包",
    sub: "世界杯名场面 / 老球迷暗号",
    ribbon: "老梗池",
    match: (card) => card.pool === "old",
  },
  {
    id: "new",
    name: "新梗池",
    title: "新赛季热梗包",
    sub: "2026 序章 / 互联网热梗 / 今日语境",
    ribbon: "新梗池",
    match: (card) => card.pool === "new",
  },
];

const COLLECTION_FILTERS = [
  ["all", "全部"],
  ["owned", "已得"],
  ["old", "老梗"],
  ["new", "新梗"],
  ["SR", "SR+"],
  ["SSR", "SSR+"],
  ["UR", "UR"],
];

const WRONG_OPTIONS = [
  "这是官方赛程表里的技术说明",
  "这是球衣赞助合同里的固定条款",
  "这是训练器材的使用教程",
  "这是裁判手册里的正式术语",
  "这是球队发布会的标准开场白",
];

const CARDS = RAW_CARDS.map(enrichCard);
const cardById = new Map(CARDS.map((card) => [card.id, card]));

let state = loadState();
let activePool = POOLS.some((pool) => pool.id === state.activePool) ? state.activePool : "all";
let collectionFilter = "all";
let currentCard = null;
let latestResults = [];
let toastTimer = null;
let isDrawing = false;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createFreshState() {
  return {
    date: todayKey(),
    tickets: DAILY_BASE_TICKETS,
    dailyBaseTickets: DAILY_BASE_TICKETS,
    team: null,
    owned: {},
    totalDraws: 0,
    todayDraws: 0,
    ssrPlus: 0,
    pity: 0,
    activePool: "all",
    dailyQuizBonus: 0,
    answered: {},
  };
}

function loadState() {
  const fresh = createFreshState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeState({ ...fresh, ...JSON.parse(saved) });

    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const parsed = JSON.parse(legacy);
      return normalizeState({
        ...fresh,
        owned: parsed.owned || parsed.coll || {},
        totalDraws: parsed.totalDraws || parsed.total || 0,
        ssrPlus: parsed.ssrPlus || parsed.best || 0,
        team: parsed.team || parsed.circle || null,
      });
    }
  } catch (error) {
    console.warn("Failed to load state", error);
  }
  return fresh;
}

function normalizeState(next) {
  next.owned = next.owned || {};
  next.team = TEAMS.some((team) => team.id === next.team) ? next.team : null;
  next.totalDraws = Number(next.totalDraws) || 0;
  next.todayDraws = Number(next.todayDraws) || 0;
  next.ssrPlus = Number(next.ssrPlus) || 0;
  next.pity = Math.min(Number(next.pity) || 0, SSR_PITY_LIMIT);
  next.dailyQuizBonus = Number(next.dailyQuizBonus) || 0;
  next.answered = next.answered || {};
  next.tickets = Number(next.tickets);
  if (!Number.isFinite(next.tickets)) next.tickets = DAILY_BASE_TICKETS;

  if (next.date !== todayKey()) {
    next.date = todayKey();
    next.tickets = DAILY_BASE_TICKETS;
    next.dailyBaseTickets = DAILY_BASE_TICKETS;
    next.todayDraws = 0;
    next.dailyQuizBonus = 0;
    next.answered = {};
  }

  if (next.dailyBaseTickets !== DAILY_BASE_TICKETS) {
    const previousBase = Number(next.dailyBaseTickets) || 10;
    next.tickets += Math.max(0, DAILY_BASE_TICKETS - previousBase);
    next.dailyBaseTickets = DAILY_BASE_TICKETS;
  }
  return next;
}

function save() {
  state.activePool = activePool;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function stripQuote(text) {
  return String(text || "").replace(/^["“]+|["”]+$/g, "").trim();
}

function firstSentence(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "这张卡记录了一个被球迷反复复读的足球瞬间。";
  const match = clean.match(/^(.{1,92}?[。！？.!?])/);
  return match ? match[1] : `${clean.slice(0, 92)}${clean.length > 92 ? "..." : ""}`;
}

function detectPool(card, themes) {
  const text = `${card.n} ${card.tag} ${card.ctx} ${card.cup} ${card.era} ${themes.join(" ")}`;
  if (String(text).includes("2026") || (card.year && card.year >= 2018)) return "new";
  if (card.pack === "history" || (card.year && card.year <= 2014) || themes.includes("经典")) return "old";
  if (["VAR", "社交", "表情包", "互联网", "新梗", "今日", "球迷梗"].some((tag) => text.includes(tag))) return "new";
  return "old";
}

function buildCasualExplain(card, themes) {
  const text = `${card.n} ${card.tag} ${themes.join(" ")}`;
  if (text.includes("点球")) return "可以把它理解成：全场铺垫到最后一脚，大家都屏住呼吸，然后命运开始整活。";
  if (text.includes("VAR") || text.includes("争议")) return "可以把它理解成：大家都以为剧情结束了，结果裁判和回放又开了一集番外。";
  if (text.includes("巴西") || text.includes("德国") || text.includes("惨案")) return "可以把它理解成：豪门也会翻车，而且翻车现场会被球迷记很多年。";
  if (text.includes("梅西") || text.includes("C罗")) return "可以把它理解成：巨星故事太长，赢了是史诗，输了也会变成段子。";
  if (text.includes("黑马") || text.includes("童话")) return "可以把它理解成：小队突然打穿剧本，大家一边震惊一边开始站队。";
  return "可以把它理解成：球迷把一次比赛情绪压缩成一句暗号，懂的人看到就会会心一笑。";
}

function buildQuiz(card) {
  const correct = card.year
    ? `它在说一个被反复记住的 ${card.year} 前后足球名场面`
    : "它在说球迷把比赛情绪玩成共同暗号";
  const wrong = WRONG_OPTIONS[card.id % WRONG_OPTIONS.length];
  const flip = card.id % 2 === 0;
  return {
    question: "这张梗卡主要在调侃什么？",
    options: flip ? [wrong, correct] : [correct, wrong],
    correct: flip ? 1 : 0,
    explain: `答对重点：${card.n} 不是硬背知识点，而是球迷用来复读名场面的暗号。`,
  };
}

function enrichCard(card) {
  const themes = Array.isArray(card.themes) ? card.themes : [];
  const plain = stripQuote(card.plain || card.tag || `${card.n}来了`);
  const pool = card.pool || detectPool(card, themes);
  const background = firstSentence(card.ctx);
  return {
    ...card,
    themes,
    plain,
    background,
    whyFunny: card.whyFunny || `好笑在于它从比赛事实变成了球迷黑话：不用长篇复盘，只要提到「${card.n}」，大家就知道是哪种剧情。`,
    casual: card.casual || buildCasualExplain(card, themes),
    quiz: card.quiz || buildQuiz(card),
    teamTags: card.teamTags || themes,
    pool,
    searchText: `${card.n} ${card.tag} ${card.ctx} ${card.year || ""} ${card.cup || ""} ${card.era || ""} ${themes.join(" ")}`,
  };
}

function getTeam(id = state.team) {
  return TEAMS.find((team) => team.id === id) || null;
}

function activePoolConfig() {
  return POOLS.find((pool) => pool.id === activePool) || POOLS[0];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rarityClass(card) {
  return `rarity-${card.r}`;
}

function rarityAtLeast(card, rarity) {
  return RARITY[card.r].rank >= RARITY[rarity].rank;
}

function isSsrPlus(cardOrRarity) {
  const rarity = typeof cardOrRarity === "string" ? cardOrRarity : cardOrRarity.r;
  return RARITY[rarity].rank >= RARITY.SSR.rank;
}

function matchesTeam(card, team = getTeam()) {
  if (!team) return false;
  return team.tags.some((tag) => card.searchText.includes(tag));
}

function setScreen(name) {
  $$(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  if (name === "home") renderHome();
  if (name === "collection") renderCollection();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function getPoolCards() {
  const pool = activePoolConfig();
  const cards = CARDS.filter(pool.match);
  return cards.length ? cards : CARDS;
}

function pickRarity() {
  if (state.pity >= SSR_PITY_LIMIT) return Math.random() < 0.2 ? "UR" : "SSR";
  const totalWeight = RATE_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of RATE_TABLE) {
    roll -= item.weight;
    if (roll <= 0) return item.rarity;
  }
  return "N";
}

function pickWeightedCard(poolCards, rarity) {
  let candidates = poolCards.filter((card) => card.r === rarity);
  if (!candidates.length) candidates = poolCards.filter((card) => RARITY[card.r].rank <= RARITY[rarity].rank);
  if (!candidates.length) candidates = poolCards;

  const weighted = candidates.map((card) => ({
    card,
    weight: matchesTeam(card) ? TEAM_WEIGHT : 1,
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.card;
  }
  return weighted[weighted.length - 1].card;
}

function buildDrawRarities(count) {
  const rarities = Array.from({ length: count }, () => pickRarity());
  if (count === 10 && !rarities.some((rarity) => RARITY[rarity].rank >= RARITY.SR.rank)) {
    rarities[rarities.length - 1] = "SR";
  }
  return rarities;
}

async function drawCards(count) {
  if (isDrawing) return;

  if (state.tickets < count) {
    showToast(count === 10 ? "球票不够十连，先答题拿票或明天再来" : "今天球票用完了，答题还能拿票");
    return;
  }

  isDrawing = true;
  renderDrawButtons();
  await playOpeningAnimation(count);

  const poolCards = getPoolCards();
  const rarities = buildDrawRarities(count);
  const results = rarities.map((rarity) => pickWeightedCard(poolCards, rarity));

  state.tickets -= count;
  state.totalDraws += count;
  state.todayDraws += count;
  for (const card of results) {
    state.owned[card.id] = true;
    if (isSsrPlus(card)) {
      state.ssrPlus += 1;
      state.pity = 0;
    } else {
      state.pity = Math.min(state.pity + 1, SSR_PITY_LIMIT);
    }
  }

  latestResults = results;
  currentCard = getBestCard(results);
  save();
  renderResult();
  setScreen("result");
  scheduleRevealDone(count);
}

function getBestCard(cards) {
  return [...cards].sort((a, b) => RARITY[b.r].rank - RARITY[a.r].rank || b.id - a.id)[0] || null;
}

function renderHome() {
  const pool = activePoolConfig();
  const team = getTeam();
  $("#ticket-count").textContent = state.tickets;
  $("#owned-count").textContent = `${Object.keys(state.owned).length}/${TOTAL}`;
  $("#pity-count").textContent = `${state.pity}/${SSR_PITY_LIMIT}`;
  $("#pack-ribbon").textContent = pool.ribbon;
  $("#pack-title").textContent = pool.title;
  $("#pack-sub").textContent = pool.sub;
  $("#ticket-hint").textContent = buildTicketHint();
  $("#team-open").textContent = team ? `${team.flag} 主队加成：${team.name} x2` : "主队加成：未选择";

  renderPoolTabs();
  renderDrawButtons();
}

function buildTicketHint() {
  if (state.tickets >= 10) {
    const tenPulls = Math.floor(state.tickets / 10);
    return `今天还能十连 ${tenPulls} 次。十连至少 SR，30 抽未出 SSR+ 会触发保底。`;
  }
  if (state.tickets > 0) return `还剩 ${state.tickets} 张球票，可以单抽。答对梗题每天最多额外拿 ${DAILY_QUIZ_LIMIT} 票。`;
  if (state.dailyQuizBonus < DAILY_QUIZ_LIMIT) return "球票用完了。打开已抽到的卡，看懂梗并答题可以继续拿票。";
  return "今天的额外球票也拿完了，明天再来拆新包。";
}

function renderPoolTabs() {
  $("#pool-tabs").innerHTML = POOLS.map((pool) => {
    const count = CARDS.filter(pool.match).length;
    return `
      <button class="pool-tab${activePool === pool.id ? " active" : ""}" type="button" data-pool="${pool.id}">
        <span>${pool.name}</span>
        <b>${count}</b>
      </button>
    `;
  }).join("");
}

function renderDrawButtons() {
  $$("[data-pull]").forEach((button) => {
    const count = Number(button.dataset.pull);
    button.disabled = isDrawing || state.tickets < count;
  });
  $("#pack-button").disabled = isDrawing || state.tickets < 1;
}

function renderResult() {
  const pool = activePoolConfig();
  $("#result-pool").textContent = pool.name;
  $("#result-ticket-count").textContent = state.tickets;
  const grid = $("#result-grid");
  grid.classList.toggle("single", latestResults.length === 1);
  grid.innerHTML = latestResults.map((card, index) => renderMemeCard(card, { result: true, revealIndex: index })).join("");

  const best = currentCard;
  $("#result-note").textContent = best
    ? `本包最佳：${best.r}「${best.n}」。点卡片可以看懂这个梗。`
    : "这包没有结果，回首页重新开包。";
  renderDrawButtons();
}

function renderMemeCard(card, options = {}) {
  const rarity = RARITY[card.r];
  const teamBoost = matchesTeam(card);
  const premium = isSsrPlus(card);
  const classes = [
    "meme-card",
    rarityClass(card),
    options.result ? "result-card" : "",
    options.result ? "reveal-card" : "",
    premium && !options.locked ? "premium-card" : "",
    options.big ? "big" : "",
    options.locked ? "locked" : "",
  ].filter(Boolean).join(" ");
  const title = options.locked ? "未解锁梗卡" : card.n;
  const plain = options.locked ? "抽到后解锁卡面" : card.plain;
  const meta = options.locked ? `ID ${String(card.id).padStart(3, "0")}` : `${card.year || "经典"} · ${card.pool === "old" ? "老梗" : "新梗"}`;
  const icon = options.locked ? "?" : card.e || "⚽";
  const corner = options.locked ? "LOCK" : `#${String(card.id).padStart(3, "0")}`;

  return `
    <button class="${classes}" type="button" data-card-id="${card.id}" style="--reveal-index:${Number(options.revealIndex) || 0}" ${options.locked ? "aria-label=\"未解锁梗卡\"" : ""}>
      <span class="card-rarity">${rarity.label}</span>
      <span class="card-corner">${escapeHtml(corner)}</span>
      <span class="card-ball" aria-hidden="true"></span>
      <span class="card-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <strong>${escapeHtml(title)}</strong>
      <em>${escapeHtml(plain)}</em>
      <small>${escapeHtml(meta)}</small>
      ${teamBoost && !options.locked ? "<i>主队加成</i>" : ""}
    </button>
  `;
}

function playOpeningAnimation(count) {
  const overlay = $("#opening-overlay");
  const caption = $("#opening-caption");
  const pack = $("#pack-button");
  $("#opening-pool").textContent = activePoolConfig().name;
  caption.textContent = count === 10 ? "十连拆包中，梗力正在上升..." : "正在撕开梗包...";
  overlay.classList.toggle("ten", count === 10);
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  pack.classList.add("opening");
  return new Promise((resolve) => {
    window.setTimeout(() => {
      overlay.classList.remove("show", "ten");
      overlay.setAttribute("aria-hidden", "true");
      pack.classList.remove("opening");
      resolve();
    }, OPENING_DURATION);
  });
}

function scheduleRevealDone(count) {
  const delay = 520 + Math.max(0, count - 1) * RESULT_REVEAL_STEP;
  window.setTimeout(() => {
    isDrawing = false;
    renderDrawButtons();
  }, delay);
}

function openDetail(cardId) {
  const card = cardById.get(Number(cardId));
  if (!card) return;
  currentCard = card;
  renderDetail(card);
  setScreen("detail");
}

function renderDetail(card) {
  const team = getTeam();
  $("#detail-card").innerHTML = `
    <div class="detail-card-main">
      ${renderMemeCard(card, { big: true })}
    </div>
    <div class="detail-copy">
      <span class="detail-meta">${card.r} · ${RARITY[card.r].name} · ${card.year || "经典梗库"}</span>
      <h3>${escapeHtml(card.n)}</h3>
      <section>
        <b>一句梗</b>
        <p>${escapeHtml(card.plain)}</p>
      </section>
      <section>
        <b>背景发生了什么</b>
        <p>${escapeHtml(card.background)}</p>
      </section>
      <section>
        <b>不懂球也能懂</b>
        <p>${escapeHtml(card.casual)}</p>
      </section>
      ${team && matchesTeam(card, team) ? `<p class="boost-note">${team.flag} 这张吃到了 ${team.name} 主队加成。</p>` : ""}
    </div>
  `;

  renderQuiz(card);
  $("#share-preview").classList.remove("show");
  $("#share-preview").removeAttribute("src");
}

function renderQuiz(card) {
  const answered = state.answered[card.id];
  const quiz = card.quiz;
  const limitReached = state.dailyQuizBonus >= DAILY_QUIZ_LIMIT;
  $("#quiz-box").innerHTML = `
    <div class="quiz-head">
      <span>答题拿票</span>
      <strong>${state.dailyQuizBonus}/${DAILY_QUIZ_LIMIT}</strong>
    </div>
    <h3>${escapeHtml(quiz.question)}</h3>
    <div class="quiz-options">
      ${quiz.options.map((option, index) => `
        <button class="quiz-option${answered && index === quiz.correct ? " correct" : ""}${answered && answered.choice === index && !answered.correct ? " wrong" : ""}" type="button" data-answer="${index}" ${answered || limitReached ? "disabled" : ""}>
          ${escapeHtml(option)}
        </button>
      `).join("")}
    </div>
    <p class="quiz-feedback">${quizFeedback(card, answered, limitReached)}</p>
  `;
}

function quizFeedback(card, answered, limitReached) {
  if (answered?.correct) return `答对了，+1 球票。${card.quiz.explain}`;
  if (answered && !answered.correct) return `差一点。${card.quiz.explain}`;
  if (limitReached) return "今天答题加票已达上限，仍然可以继续看梗。";
  return "看懂这张梗后选一个答案，答对可得 1 张球票。";
}

function answerQuiz(choice) {
  if (!currentCard || state.answered[currentCard.id] || state.dailyQuizBonus >= DAILY_QUIZ_LIMIT) return;
  const correct = Number(choice) === currentCard.quiz.correct;
  state.answered[currentCard.id] = { choice: Number(choice), correct };
  if (correct) {
    state.tickets += 1;
    state.dailyQuizBonus += 1;
    showToast("答对了，+1 张球票");
  } else {
    showToast("这题没拿票，但解释已经给你了");
  }
  save();
  renderDetail(currentCard);
  renderDrawButtons();
}

function renderCollection() {
  const ownedCount = Object.keys(state.owned).length;
  $("#album-count").textContent = `${ownedCount}/${TOTAL}`;
  $("#collection-tabs").innerHTML = COLLECTION_FILTERS.map(([id, label]) => `
    <button class="album-tab${collectionFilter === id ? " active" : ""}" type="button" data-collection-filter="${id}">
      ${label}
    </button>
  `).join("");

  const query = ($("#card-search").value || "").trim().toLowerCase();
  let cards = CARDS;
  if (collectionFilter === "owned") cards = cards.filter((card) => state.owned[card.id]);
  else if (collectionFilter === "old" || collectionFilter === "new") cards = cards.filter((card) => card.pool === collectionFilter);
  else if (collectionFilter === "SR") cards = cards.filter((card) => rarityAtLeast(card, "SR"));
  else if (collectionFilter === "SSR") cards = cards.filter((card) => rarityAtLeast(card, "SSR"));
  else if (collectionFilter === "UR") cards = cards.filter((card) => card.r === "UR");

  if (query) {
    cards = cards.filter((card) => card.searchText.toLowerCase().includes(query));
  }

  cards = [...cards].sort((a, b) => {
    const ownedDelta = Number(Boolean(state.owned[b.id])) - Number(Boolean(state.owned[a.id]));
    return ownedDelta || RARITY[b.r].rank - RARITY[a.r].rank || a.id - b.id;
  });

  $("#collection-grid").innerHTML = cards.slice(0, 180).map((card) => {
    const owned = Boolean(state.owned[card.id]);
    return renderMemeCard(card, { locked: !owned });
  }).join("");
}

function renderTeamGrid() {
  $("#team-grid").innerHTML = [
    `<button class="team-card${!state.team ? " active" : ""}" type="button" data-team="">
      <span>×1</span><strong>不选择</strong><em>保持全卡池原始概率</em>
    </button>`,
    ...TEAMS.map((team) => `
      <button class="team-card${state.team === team.id ? " active" : ""}" type="button" data-team="${team.id}" style="--team-color:${team.color}">
        <span>${team.flag}</span><strong>${team.name}</strong><em>相关梗卡权重 x2</em>
      </button>
    `),
  ].join("");
}

function openTeamSheet() {
  renderTeamGrid();
  $("#team-sheet").classList.add("show");
  $("#team-sheet").setAttribute("aria-hidden", "false");
}

function closeTeamSheet() {
  $("#team-sheet").classList.remove("show");
  $("#team-sheet").setAttribute("aria-hidden", "true");
}

function chooseTeam(teamId) {
  state.team = teamId || null;
  save();
  closeTeamSheet();
  renderHome();
  showToast(state.team ? `已开启 ${getTeam().name} 主队加成` : "已关闭主队加成");
}

function generateShareImage(card) {
  const canvas = $("#share-canvas");
  const ctx = canvas.getContext("2d");
  const rarity = RARITY[card.r];
  const team = getTeam();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7ecd4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPosterPattern(ctx);

  ctx.fillStyle = "#163b2b";
  roundRect(ctx, 60, 58, 780, 1084, 28);
  ctx.fill();

  ctx.fillStyle = "#fff8e8";
  roundRect(ctx, 86, 88, 728, 1030, 22);
  ctx.fill();

  ctx.fillStyle = rarity.color;
  roundRect(ctx, 120, 124, 660, 82, 14);
  ctx.fill();
  ctx.fillStyle = rarity.ink;
  ctx.font = "800 34px system-ui, sans-serif";
  ctx.fillText(`${card.r} · ${rarity.name}`, 150, 177);

  ctx.fillStyle = "#fffdf7";
  roundRect(ctx, 120, 242, 156, 156, 24);
  ctx.fill();
  ctx.strokeStyle = "#162036";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.font = "92px Apple Color Emoji, Segoe UI Emoji, system-ui, sans-serif";
  ctx.fillText(card.e || "⚽", 152, 348);

  ctx.fillStyle = "#162036";
  ctx.font = "900 62px system-ui, sans-serif";
  wrapText(ctx, card.n, 310, 304, 470, 72, "#162036");

  ctx.fillStyle = "#d94135";
  ctx.font = "800 34px system-ui, sans-serif";
  wrapText(ctx, card.plain, 120, 538, 660, 44, "#d94135");

  ctx.strokeStyle = "#162036";
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 10]);
  ctx.beginPath();
  ctx.moveTo(120, 666);
  ctx.lineTo(780, 666);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillStyle = "#162036";
  ctx.fillText("不懂球也能懂", 120, 734);
  ctx.font = "500 32px system-ui, sans-serif";
  wrapText(ctx, card.casual, 120, 790, 660, 44, "#3e4b5f");

  ctx.fillStyle = "#f1d05a";
  roundRect(ctx, 120, 946, 660, 82, 16);
  ctx.fill();
  ctx.fillStyle = "#182032";
  ctx.font = "800 29px system-ui, sans-serif";
  const teamText = team ? `${team.flag} ${team.name}主队加成` : "世界杯梗卡抽卡机";
  ctx.fillText(teamText, 150, 997);

  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillStyle = "#5f6875";
  ctx.fillText("球还没进，梗先出了！", 120, 1082);

  const url = canvas.toDataURL("image/png");
  $("#share-preview").src = url;
  $("#share-preview").classList.add("show");
  return url;
}

function drawPosterPattern(ctx) {
  ctx.fillStyle = "rgba(22, 59, 43, .08)";
  for (let y = 0; y < 1200; y += 48) {
    for (let x = (y / 48) % 2 ? 20 : 0; x < 900; x += 48) {
      ctx.fillRect(x, y, 18, 18);
    }
  }
  ctx.fillStyle = "#d94135";
  ctx.fillRect(0, 0, 900, 22);
  ctx.fillStyle = "#2d7bd8";
  ctx.fillRect(0, 1178, 900, 22);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color;
  const chars = String(text || "").split("");
  let line = "";
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function downloadCurrentCard() {
  if (!currentCard) return;
  const url = generateShareImage(currentCard);
  const link = document.createElement("a");
  link.href = url;
  link.download = `worldcup-meme-card-${currentCard.id}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("卡图已生成，可以发给球友了");
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const screenTarget = event.target.closest("[data-screen-target]");
    if (screenTarget) {
      setScreen(screenTarget.dataset.screenTarget);
      return;
    }

    const pullButton = event.target.closest("[data-pull]");
    if (pullButton) {
      drawCards(Number(pullButton.dataset.pull));
      return;
    }

    const poolButton = event.target.closest("[data-pool]");
    if (poolButton) {
      activePool = poolButton.dataset.pool;
      save();
      renderHome();
      return;
    }

    const resultCard = event.target.closest(".result-card[data-card-id]");
    if (resultCard) {
      openDetail(resultCard.dataset.cardId);
      return;
    }

    const collectionCard = event.target.closest("#collection-grid .meme-card[data-card-id]");
    if (collectionCard) {
      const cardId = collectionCard.dataset.cardId;
      if (state.owned[cardId]) openDetail(cardId);
      else showToast("这张还没抽到，先去拆包吧");
      return;
    }

    const answerButton = event.target.closest("[data-answer]");
    if (answerButton) {
      answerQuiz(answerButton.dataset.answer);
      return;
    }

    const filterButton = event.target.closest("[data-collection-filter]");
    if (filterButton) {
      collectionFilter = filterButton.dataset.collectionFilter;
      renderCollection();
      return;
    }

    const teamButton = event.target.closest("[data-team]");
    if (teamButton) {
      chooseTeam(teamButton.dataset.team);
    }
  });

  $("#pack-button").addEventListener("click", () => drawCards(1));
  $("#best-card-detail").addEventListener("click", () => {
    if (currentCard) openDetail(currentCard.id);
  });
  $("#download-card").addEventListener("click", downloadCurrentCard);
  $("#card-search").addEventListener("input", renderCollection);
  $("#team-open").addEventListener("click", openTeamSheet);
  $("#team-close").addEventListener("click", closeTeamSheet);
  $("#team-sheet").addEventListener("click", (event) => {
    if (event.target.id === "team-sheet") closeTeamSheet();
  });
}

function init() {
  save();
  bindEvents();
  renderHome();
}

init();
