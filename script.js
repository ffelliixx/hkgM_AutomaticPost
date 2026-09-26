const CANVAS_W = 1080;
const CANVAS_H = 1350;
const BAND_TOP = 25;
const BAND_BOTTOM = 20;
const BOX_WIDTH = 1000;
const BLOCK_GAP = 18;
const FONT_STACK = '"SourceHanSansHC", "Microsoft JhengHei", "PingFang TC", sans-serif';

const subtitleStyle = { fontSize: 36, lineHeight: 720, shadow: false, color: "#000000" };
const titleStyle = { fontSize: 140, lineHeight: 130, shadow: true, color: "#ffff00" };
const message1Style = { fontSize: 100, lineHeight: 100, shadow: true, color: "#ffffff" };
const message2Style = { fontSize: 100, lineHeight: 100, shadow: true, color: "#ffffff" };

const state = {
  bgImg: null,
  customImg: null,
  showText: false,
  ready: false,
};

let sketchApi = null;

const form = document.getElementById("poster-form");
const generateButton = document.getElementById("generate");
const downloadButton = document.getElementById("download");
const resetButton = document.getElementById("reset-poster");
const backgroundInput = document.getElementById("background");
const fileHint = document.getElementById("file-hint");
const errorEl = document.getElementById("form-error");
const statusEl = document.getElementById("status");
const offsetYInput = document.getElementById("offset-y");

const sketch = (p) => {
  p.setup = () => {
    p.pixelDensity(1);
    const canvas = p.createCanvas(CANVAS_W, CANVAS_H);
    canvas.parent("canvas-host");
    p.noLoop();
    canvas.elt.removeAttribute("style");
    sketchApi = p;
    p.redraw();
  };

  p.draw = () => {
    paint(p);
  };
};

function paint(p) {
  const ctx = p.drawingContext;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  p.clear();

  const image = state.customImg || state.bgImg;
  if (image) {
    drawCover(ctx, image);
  }
  if (state.showText) {
    drawPosterText(ctx, readFields());
  }
}

function drawCover(ctx, image) {
  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  const scale = Math.max(CANVAS_W / sourceW, CANVAS_H / sourceH);
  const cropW = CANVAS_W / scale;
  const cropH = CANVAS_H / scale;
  const cropX = (sourceW - cropW) / 2;
  const cropY = (sourceH - cropH) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, CANVAS_W, CANVAS_H);
}

function drawPosterText(ctx, fields) {
  const blocks = [
    { text: fields.subtitle, style: subtitleStyle },
    { text: fields.title, style: titleStyle },
    { text: fields.message1, style: message1Style },
    { text: fields.message2, style: message2Style },
  ]
    .filter((item) => item.text)
    .map(({ text, style }) => {
      return {
        ...style,
        lines: wrapText(ctx, text, style.fontSize, BOX_WIDTH),
      };
    });

  if (!blocks.length) {
    return;
  }

  const contentHeight = blocks.reduce((sum, block, index) => {
    return sum + block.lines.length * block.lineHeight + (index > 0 ? BLOCK_GAP : 0);
  }, 0);
  const bandHeight = BAND_BOTTOM - BAND_TOP;
  const centeredOffset = contentHeight < bandHeight ? (bandHeight - contentHeight) / 2 : 0;
  let y = BAND_TOP + centeredOffset + fields.offsetY;
  const centerX = CANVAS_W / 2;

  blocks.forEach((block, index) => {
    if (index > 0) {
      y += BLOCK_GAP;
    }
    drawLines(ctx, block, centerX, y, block.color);
    y += block.lines.length * block.lineHeight;
  });
}

function drawLines(ctx, block, centerX, y, color) {
  ctx.font = `900 ${block.fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = block.shadow ? "rgba(0, 0, 0, 1)" : "transparent";
  ctx.shadowBlur = block.shadow ? 5 : 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = block.shadow ? 3 : 0;

  block.lines.forEach((line, index) => {
    ctx.fillText(line, centerX, y + index * block.lineHeight);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function wrapText(ctx, text, size, maxWidth) {
  ctx.font = `900 ${size}px ${FONT_STACK}`;
  const lines = [];
  text.split(/\r?\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let current = "";
    for (const char of paragraph) {
      const next = current + char;
      if (current && ctx.measureText(next).width > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    lines.push(current);
  });
  return lines;
}

function readFields() {
  return {
    subtitle: document.getElementById("subtitle").value.trim(),
    title: document.getElementById("title").value.trim(),
    message1: document.getElementById("message1").value.trim(),
    message2: document.getElementById("message2").value.trim(),
    offsetY: Number(offsetYInput.value) || 0,
  };
}

function hasAnyText(fields) {
  return Boolean(fields.subtitle || fields.title || fields.message1 || fields.message2);
}

function redraw() {
  if (sketchApi) {
    sketchApi.redraw();
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setError(message) {
  errorEl.textContent = message;
}

function setFileHint(message) {
  fileHint.textContent = message;
}

function updateSliderLabels() {
  document.getElementById("offset-y-value").textContent = offsetYInput.value;
}

function showDownload() {
  downloadButton.hidden = false;
}

function hideDownload() {
  downloadButton.hidden = true;
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(image);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error("圖片載入失敗"));
    };
    image.onload = finish;
    image.onerror = fail;
    image.src = src;
    if (image.complete) {
      if (image.naturalWidth) finish();
      else fail();
    }
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("無法載入預設底圖"));
    document.head.appendChild(script);
  });
}

async function loadDefaultBackground() {
  if (location.protocol !== "file:") {
    try {
      return await loadHtmlImage("BG.png");
    } catch (error) {
      console.warn(error);
    }
  }
  if (!window.DEFAULT_BG_DATA_URL) {
    await loadScript("default-bg.js");
  }
  if (!window.DEFAULT_BG_DATA_URL) {
    throw new Error("找不到預設底圖");
  }
  return loadHtmlImage(window.DEFAULT_BG_DATA_URL);
}

async function loadPosterFont() {
  // The Heavy OTF is applied through @font-face.
  // p5.loadFont() would parse the entire CJK file in JavaScript and can freeze the page.
  await document.fonts.load('900 42px "SourceHanSansHC"');
  await document.fonts.ready;
  if (!document.fonts.check('900 42px "SourceHanSansHC"')) {
    throw new Error("字型載入失敗");
  }
}

function loadFileImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("圖片載入失敗"));
    };
    image.src = url;
  });
}

function fileStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "-" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function onFieldsChanged() {
  updateSliderLabels();
  if (!state.showText) return;

  const fields = readFields();
  if (!hasAnyText(fields)) {
    state.showText = false;
    hideDownload();
    setError("請至少填寫小標題、標題或內文其中一項。");
    setStatus("請填寫文字後按「產生圖片」。");
    redraw();
    return;
  }

  setError("");
  redraw();
  setStatus("預覽已更新，可以下載 PNG。");
}

function generatePoster(event) {
  event.preventDefault();
  if (!state.ready) return;

  const fields = readFields();
  if (!hasAnyText(fields)) {
    state.showText = false;
    hideDownload();
    setError("請至少填寫小標題、標題或內文其中一項。");
    redraw();
    return;
  }

  setError("");
  state.showText = true;
  redraw();
  showDownload();
  setStatus("預覽已更新，可以下載 PNG。");

  if (window.matchMedia("(max-width: 959px)").matches) {
    document.getElementById("preview").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function downloadPoster() {
  const canvas = document.querySelector("#canvas-host canvas");
  if (!canvas) return;

  try {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `output-${fileStamp(new Date())}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    setError("瀏覽器無法匯出圖片。請改用本地伺服器開啟這個資料夾後再下載。");
  }
}

function resetPoster() {
  document.getElementById("subtitle").value = "";
  document.getElementById("title").value = "";
  document.getElementById("message1").value = "";
  document.getElementById("message2").value = "";
  offsetYInput.value = "0";
  backgroundInput.value = "";
  state.customImg = null;
  state.showText = false;
  hideDownload();
  setError("");
  setFileHint("未上傳時使用預設 BG.png。圖片會等比例放大並置中裁切。");
  updateSliderLabels();
  setStatus(state.ready ? "請填寫文字後按「產生圖片」。" : "正在載入字型與底圖…");
  redraw();
}

form.addEventListener("submit", generatePoster);
downloadButton.addEventListener("click", downloadPoster);
resetButton.addEventListener("click", resetPoster);
offsetYInput.addEventListener("input", onFieldsChanged);
["subtitle", "title", "message1", "message2"].forEach((id) => {
  document.getElementById(id).addEventListener("input", onFieldsChanged);
});

backgroundInput.addEventListener("change", async () => {
  const file = backgroundInput.files && backgroundInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setError("請上傳圖片檔。");
    return;
  }

  try {
    state.customImg = await loadFileImage(file);
    setFileHint(`已選擇：${file.name}`);
    setError("");
    redraw();
    if (state.showText) {
      setStatus("預覽已更新，可以下載 PNG。");
    }
  } catch (error) {
    setError("這張圖片無法讀取，請換一張。");
  }
});

async function init() {
  if (typeof p5 === "undefined") {
    setStatus("無法載入 p5.js。請連上網路後重新整理。");
    return;
  }

  new p5(sketch);

  try {
    const [background] = await Promise.all([loadDefaultBackground(), loadPosterFont()]);
    state.bgImg = background;
    state.ready = true;
    generateButton.disabled = false;
    setStatus("請填寫文字後按「產生圖片」。");
    redraw();
  } catch (error) {
    console.error(error);
    setStatus("載入失敗。請確認 BG.png、SourceHanSansHC-Heavy.otf 與網頁放在同一層，並重新整理。");
  }
}

init();
