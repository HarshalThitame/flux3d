import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const outputDir = path.join(rootDir, 'manual-videos')

const WIDTH = 1080
const HEIGHT = 1920
const DURATION_MS = 15_000
const FPS = 30

const assets = new Map([
  ['logo.webp', 'image/webp'],
  ['light logo.webp', 'image/webp'],
  ['pot.webp', 'image/webp'],
  ['printer2-optimized.mp4', 'video/mp4'],
])

function html() {
  return String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flux3D Ad Renderer</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #050606;
    }

    canvas {
      display: block;
      width: min(100vw, calc(100vh * 9 / 16));
      height: min(100vh, calc(100vw * 16 / 9));
      margin: auto;
      background: #050606;
    }
  </style>
</head>
<body>
  <canvas id="ad" width="${WIDTH}" height="${HEIGHT}"></canvas>
  <script>
    const WIDTH = ${WIDTH};
    const HEIGHT = ${HEIGHT};
    const DURATION_MS = ${DURATION_MS};
    const FPS = ${FPS};
    const canvas = document.getElementById('ad');
    const ctx = canvas.getContext('2d', { alpha: false });

    window.__RENDER_PROGRESS__ = 0;
    window.__RENDER_RESULT__ = null;
    window.__RENDER_ERROR__ = null;

    const palette = {
      ink: '#050606',
      text: '#f7f4ec',
      muted: 'rgba(247, 244, 236, 0.72)',
      dim: 'rgba(247, 244, 236, 0.5)',
      cyan: '#11f2ff',
      cyanSoft: 'rgba(17, 242, 255, 0.18)',
      amber: '#ffca6c',
      green: '#42f29b',
      violet: '#9b7cff',
    };

    const assetPaths = {
      logo: '/assets/light%20logo.webp',
      compactLogo: '/assets/logo.webp',
      product: '/assets/pot.webp',
      printerVideo: '/assets/printer2-optimized.mp4',
    };

    function clamp(value, min = 0, max = 1) {
      return Math.min(Math.max(value, min), max);
    }

    function smoothstep(edge0, edge1, x) {
      const t = clamp((x - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    }

    function fade(t, startIn, endIn, startOut, endOut) {
      return smoothstep(startIn, endIn, t) * (1 - smoothstep(startOut, endOut, t));
    }

    function roundRect(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    }

    function fillRoundRect(x, y, w, h, r, fillStyle) {
      ctx.save();
      roundRect(x, y, w, h, r);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.restore();
    }

    function strokeRoundRect(x, y, w, h, r, strokeStyle, lineWidth = 1) {
      ctx.save();
      roundRect(x, y, w, h, r);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    }

    function drawCover(media, x, y, w, h, opacity = 1) {
      const sourceWidth = media.videoWidth || media.naturalWidth || media.width;
      const sourceHeight = media.videoHeight || media.naturalHeight || media.height;
      if (!sourceWidth || !sourceHeight) return false;
      const sourceRatio = sourceWidth / sourceHeight;
      const destRatio = w / h;
      let sx = 0;
      let sy = 0;
      let sw = sourceWidth;
      let sh = sourceHeight;

      if (sourceRatio > destRatio) {
        sw = sourceHeight * destRatio;
        sx = (sourceWidth - sw) / 2;
      } else {
        sh = sourceWidth / destRatio;
        sy = (sourceHeight - sh) / 2;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(media, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
      return true;
    }

    function drawContain(image, x, y, w, h, opacity = 1) {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight) return false;
      const scale = Math.min(w / sourceWidth, h / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
      ctx.restore();
      return true;
    }

    function loadImage(src) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });
    }

    function loadVideo(src) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.onloadeddata = async () => {
          try {
            video.currentTime = 0;
            await video.play();
          } catch {}
          resolve(video);
        };
        video.onerror = () => resolve(null);
      });
    }

    function setFont(weight, size, family = 'Inter, Arial, sans-serif') {
      ctx.font = String(weight) + ' ' + String(size) + 'px ' + family;
    }

    function drawTrackingText(text, x, y, tracking, fillStyle) {
      ctx.save();
      ctx.fillStyle = fillStyle;
      let cursor = x;
      for (const char of text) {
        ctx.fillText(char, cursor, y);
        cursor += ctx.measureText(char).width + tracking;
      }
      ctx.restore();
    }

    function drawGrid(t) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = 'rgba(247, 244, 236, 0.18)';
      ctx.lineWidth = 1;
      const spacing = 72;
      const offset = (t * 18) % spacing;
      for (let x = -spacing + offset; x < WIDTH + spacing; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
      for (let y = -spacing + offset; y < HEIGHT + spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBackground(t, video) {
      const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      gradient.addColorStop(0, '#050606');
      gradient.addColorStop(0.42, '#0d1010');
      gradient.addColorStop(1, '#050606');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (video && video.readyState >= 2) {
        drawCover(video, 0, 0, WIDTH, HEIGHT, 0.42);
      }

      const veil = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      veil.addColorStop(0, 'rgba(5, 6, 6, 0.88)');
      veil.addColorStop(0.36, 'rgba(5, 6, 6, 0.34)');
      veil.addColorStop(0.68, 'rgba(5, 6, 6, 0.52)');
      veil.addColorStop(1, 'rgba(5, 6, 6, 0.94)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const cyanGlow = ctx.createRadialGradient(WIDTH * 0.52, HEIGHT * 0.44, 0, WIDTH * 0.52, HEIGHT * 0.44, 560);
      cyanGlow.addColorStop(0, 'rgba(17, 242, 255, 0.24)');
      cyanGlow.addColorStop(0.42, 'rgba(17, 242, 255, 0.08)');
      cyanGlow.addColorStop(1, 'rgba(17, 242, 255, 0)');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const amberGlow = ctx.createRadialGradient(WIDTH * 0.92, HEIGHT * 0.82, 0, WIDTH * 0.92, HEIGHT * 0.82, 520);
      amberGlow.addColorStop(0, 'rgba(255, 202, 108, 0.18)');
      amberGlow.addColorStop(1, 'rgba(255, 202, 108, 0)');
      ctx.fillStyle = amberGlow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      drawGrid(t);

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(48, 250);
      ctx.lineTo(48, 118);
      ctx.lineTo(214, 118);
      ctx.stroke();
      ctx.strokeStyle = palette.amber;
      ctx.beginPath();
      ctx.moveTo(WIDTH - 48, HEIGHT - 250);
      ctx.lineTo(WIDTH - 48, HEIGHT - 118);
      ctx.lineTo(WIDTH - 214, HEIGHT - 118);
      ctx.stroke();
      ctx.restore();

      const sweepX = ((t * 0.26) % 1) * (WIDTH + 720) - 360;
      ctx.save();
      ctx.translate(sweepX, 0);
      ctx.rotate(-0.15);
      const sweep = ctx.createLinearGradient(0, 0, 260, 0);
      sweep.addColorStop(0, 'rgba(255,255,255,0)');
      sweep.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      sweep.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sweep;
      ctx.fillRect(0, -160, 260, HEIGHT + 320);
      ctx.restore();
    }

    function drawBrandBar(t, assets) {
      ctx.save();
      fillRoundRect(54, 52, WIDTH - 108, 92, 22, 'rgba(5, 6, 6, 0.46)');
      strokeRoundRect(54, 52, WIDTH - 108, 92, 22, 'rgba(247, 244, 236, 0.14)', 2);

      if (!drawContain(assets.logo, 76, 69, 198, 58, 1)) {
        setFont(950, 34);
        ctx.fillStyle = palette.text;
        ctx.fillText('Flux3D', 80, 111);
      }

      setFont(900, 22);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(247, 244, 236, 0.82)';
      ctx.fillText('PREMIUM PRINTS', WIDTH - 76, 106);
      ctx.textAlign = 'left';
      ctx.restore();

      const progress = clamp((t * 1000) / DURATION_MS);
      fillRoundRect(54, HEIGHT - 64, WIDTH - 108, 10, 5, 'rgba(247, 244, 236, 0.13)');
      const progressGradient = ctx.createLinearGradient(54, 0, WIDTH - 54, 0);
      progressGradient.addColorStop(0, palette.cyan);
      progressGradient.addColorStop(0.55, palette.violet);
      progressGradient.addColorStop(1, palette.amber);
      fillRoundRect(54, HEIGHT - 64, (WIDTH - 108) * progress, 10, 5, progressGradient);
    }

    function drawBadge(text, x, y, color = palette.cyan) {
      setFont(900, 25);
      const width = ctx.measureText(text).width + 78;
      fillRoundRect(x, y, width, 58, 16, 'rgba(5, 6, 6, 0.62)');
      strokeRoundRect(x, y, width, 58, 16, color.replace(')', ', 0.34)').replace('rgb', 'rgba'), 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 28, y + 29, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(247, 244, 236, 0.88)';
      ctx.fillText(text, x + 48, y + 38);
    }

    function drawOpening(t) {
      const alpha = fade(t, 0, 0.65, 3.75, 4.4);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBadge('PAN-INDIA DELIVERY', 70, 182);

      setFont(950, 30);
      drawTrackingText('PROTOTYPE TO PREMIUM PRINT', 74, 622, 2.5, palette.cyan);

      setFont(950, 118);
      ctx.fillStyle = palette.text;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
      ctx.shadowBlur = 34;
      ctx.fillText('Premium', 70, 748);
      ctx.fillStyle = palette.amber;
      ctx.fillText('3D Printing', 70, 864);
      ctx.shadowBlur = 0;

      setFont(800, 34);
      ctx.fillStyle = palette.muted;
      ctx.fillText('For businesses, creators, students', 74, 946);
      ctx.fillText('and custom gifting across India.', 74, 994);

      const stats = [
        ['₹99', 'STARTING'],
        ['0.05mm', 'DETAIL'],
        ['Photo QC', 'BEFORE SHIP'],
      ];
      stats.forEach(([value, label], index) => {
        const x = 70 + index * 306;
        fillRoundRect(x, 1100, 270, 126, 22, 'rgba(247, 244, 236, 0.08)');
        strokeRoundRect(x, 1100, 270, 126, 22, 'rgba(247, 244, 236, 0.13)', 2);
        setFont(950, 36);
        ctx.fillStyle = index === 1 ? palette.cyan : palette.text;
        ctx.fillText(value, x + 24, 1155);
        setFont(900, 19);
        ctx.fillStyle = palette.dim;
        ctx.fillText(label, x + 24, 1194);
      });
      ctx.restore();
    }

    function drawPrintStage(t, assets) {
      const alpha = fade(t, 3.55, 4.35, 8.35, 9.05);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      setFont(950, 32);
      drawTrackingText('YOUR MODEL, MADE REAL', 76, 262, 2.8, palette.cyan);

      const stageX = 86;
      const stageY = 386;
      const stageW = WIDTH - 172;
      const stageH = 680;
      fillRoundRect(stageX, stageY, stageW, stageH, 34, 'rgba(247, 244, 236, 0.075)');
      strokeRoundRect(stageX, stageY, stageW, stageH, 34, 'rgba(247, 244, 236, 0.14)', 2);

      const railY = stageY + 116;
      ctx.strokeStyle = 'rgba(247, 244, 236, 0.32)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(stageX + 92, railY);
      ctx.lineTo(stageX + stageW - 92, railY);
      ctx.stroke();

      const headX = stageX + 132 + (Math.sin(t * 5.2) * 0.5 + 0.5) * (stageW - 390);
      fillRoundRect(headX, railY - 56, 170, 78, 18, 'rgba(5, 6, 6, 0.82)');
      strokeRoundRect(headX, railY - 56, 170, 78, 18, 'rgba(247, 244, 236, 0.22)', 2);
      const nozzleX = headX + 85;
      ctx.strokeStyle = palette.cyan;
      ctx.shadowColor = palette.cyan;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(nozzleX, railY + 22);
      ctx.lineTo(nozzleX, railY + 160);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const productX = WIDTH / 2;
      const productY = stageY + 438 + Math.sin(t * 2.2) * 12;
      const glow = ctx.createRadialGradient(productX, productY, 0, productX, productY, 315);
      glow.addColorStop(0, 'rgba(17, 242, 255, 0.34)');
      glow.addColorStop(0.44, 'rgba(255, 202, 108, 0.12)');
      glow.addColorStop(1, 'rgba(17, 242, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, stageY + 210, WIDTH, 520);

      for (let index = 0; index < 13; index += 1) {
        const build = smoothstep(4.2 + index * 0.08, 4.8 + index * 0.08, t);
        const ringWidth = (390 - index * 16) * build;
        if (ringWidth <= 2) continue;
        ctx.save();
        ctx.globalAlpha = 0.2 + build * 0.65;
        ctx.strokeStyle = index % 2 ? palette.amber : palette.cyan;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(productX, productY + 116 - index * 18, ringWidth / 2, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (assets.product) {
        drawContain(assets.product, productX - 245, productY - 270, 490, 490, 0.92);
      }

      const cards = [
        ['01', 'Industrial Parts'],
        ['02', 'Rapid Prototypes'],
        ['03', 'Corporate Gifts'],
      ];
      cards.forEach(([number, label], index) => {
        const y = 1198 + index * 102;
        const slide = smoothstep(5.45 + index * 0.18, 6.05 + index * 0.18, t);
        const x = 80 + (1 - slide) * -70;
        ctx.globalAlpha = alpha * slide;
        fillRoundRect(x, y, WIDTH - 160, 76, 18, 'rgba(247, 244, 236, 0.09)');
        strokeRoundRect(x, y, WIDTH - 160, 76, 18, 'rgba(247, 244, 236, 0.14)', 2);
        fillRoundRect(x + 18, y + 15, 48, 46, 13, index === 1 ? palette.cyan : palette.amber);
        setFont(950, 21);
        ctx.fillStyle = '#050606';
        ctx.fillText(number, x + 28, y + 46);
        setFont(950, 39);
        ctx.fillStyle = palette.text;
        ctx.fillText(label, x + 88, y + 50);
        ctx.globalAlpha = alpha;
      });
      ctx.restore();
    }

    function drawDelivery(t) {
      const alpha = fade(t, 8.2, 9.0, 11.85, 12.55);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      fillRoundRect(70, 390, WIDTH - 140, 370, 30, 'rgba(247, 244, 236, 0.075)');
      strokeRoundRect(70, 390, WIDTH - 140, 370, 30, 'rgba(247, 244, 236, 0.14)', 2);

      const dots = [
        ['Upload', 170],
        ['Print', 420],
        ['QC', 665],
        ['Ship', 910],
      ];
      const lineProgress = smoothstep(8.8, 10.8, t);
      ctx.strokeStyle = 'rgba(247, 244, 236, 0.18)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(170, 560);
      ctx.lineTo(910, 560);
      ctx.stroke();
      const routeGradient = ctx.createLinearGradient(170, 0, 910, 0);
      routeGradient.addColorStop(0, palette.cyan);
      routeGradient.addColorStop(0.62, palette.violet);
      routeGradient.addColorStop(1, palette.amber);
      ctx.strokeStyle = routeGradient;
      ctx.beginPath();
      ctx.moveTo(170, 560);
      ctx.lineTo(170 + (910 - 170) * lineProgress, 560);
      ctx.stroke();

      dots.forEach(([label, x], index) => {
        const appear = smoothstep(9 + index * 0.22, 9.45 + index * 0.22, t);
        ctx.save();
        ctx.globalAlpha = appear;
        fillRoundRect(x - 58, 508, 116, 104, 20, 'rgba(5, 6, 6, 0.7)');
        strokeRoundRect(x - 58, 508, 116, 104, 20, index === 2 ? 'rgba(66, 242, 155, 0.52)' : 'rgba(17, 242, 255, 0.36)', 2);
        setFont(950, 22);
        ctx.fillStyle = palette.text;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, 570);
        ctx.textAlign = 'left';
        ctx.restore();
      });

      setFont(950, 82);
      ctx.fillStyle = palette.text;
      ctx.fillText('Delivered', 70, 930);
      ctx.fillStyle = palette.amber;
      ctx.fillText('Across India', 70, 1018);
      setFont(820, 34);
      ctx.fillStyle = palette.muted;
      ctx.fillText('Upload your model. Get a clear quote.', 74, 1104);
      ctx.fillText('Receive a premium finish with tracked shipping.', 74, 1156);

      const trust = [
        ['Photo QC', palette.green],
        ['NDA Ready', palette.cyan],
        ['B2B Bulk', palette.amber],
      ];
      trust.forEach(([label, color], index) => {
        const x = 74 + index * 308;
        fillRoundRect(x, 1286, 270, 92, 22, 'rgba(247, 244, 236, 0.085)');
        strokeRoundRect(x, 1286, 270, 92, 22, 'rgba(247, 244, 236, 0.13)', 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + 34, 1332, 9, 0, Math.PI * 2);
        ctx.fill();
        setFont(930, 27);
        ctx.fillStyle = palette.text;
        ctx.fillText(label, x + 58, 1342);
      });
      ctx.restore();
    }

    function drawFinal(t, assets) {
      const alpha = smoothstep(12.15, 12.85, t);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      const finalGlow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 640);
      finalGlow.addColorStop(0, 'rgba(17, 242, 255, 0.24)');
      finalGlow.addColorStop(0.36, 'rgba(255, 202, 108, 0.1)');
      finalGlow.addColorStop(1, 'rgba(17, 242, 255, 0)');
      ctx.fillStyle = finalGlow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (!drawContain(assets.logo, 340, 420, 400, 230, 1)) {
        setFont(950, 74);
        ctx.fillStyle = palette.text;
        ctx.textAlign = 'center';
        ctx.fillText('Flux3D', WIDTH / 2, 560);
        ctx.textAlign = 'left';
      }

      setFont(950, 85);
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.text;
      ctx.fillText('Print It', WIDTH / 2, 760);
      ctx.fillStyle = palette.amber;
      ctx.fillText('With Flux3D', WIDTH / 2, 850);

      setFont(820, 34);
      ctx.fillStyle = palette.muted;
      ctx.fillText('Premium 3D printing for ideas, parts and brands.', WIDTH / 2, 940);

      fillRoundRect(106, 1084, WIDTH - 212, 116, 24, 'rgba(255, 202, 108, 0.16)');
      strokeRoundRect(106, 1084, WIDTH - 212, 116, 24, 'rgba(255, 202, 108, 0.38)', 2);
      setFont(950, 40);
      ctx.fillStyle = palette.amber;
      ctx.fillText('flux3d.in  |  WhatsApp 9623023480', WIDTH / 2, 1155);

      const tags = ['Starting ₹99', 'Pan-India Delivery', 'Photo QC'];
      tags.forEach((tag, index) => {
        const x = 106 + index * 296;
        fillRoundRect(x, 1266, 260, 78, 18, 'rgba(247, 244, 236, 0.08)');
        strokeRoundRect(x, 1266, 260, 78, 18, 'rgba(247, 244, 236, 0.13)', 2);
        setFont(900, 25);
        ctx.fillStyle = palette.text;
        ctx.fillText(tag, x + 130, 1316);
      });
      ctx.textAlign = 'left';
      ctx.restore();
    }

    function drawFrame(t, loadedAssets) {
      drawBackground(t, loadedAssets.video);
      drawBrandBar(t, loadedAssets);
      drawOpening(t);
      drawPrintStage(t, loadedAssets);
      drawDelivery(t);
      drawFinal(t, loadedAssets);
    }

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
      }
      return btoa(binary);
    }

    async function main() {
      try {
        const [logo, compactLogo, product, video] = await Promise.all([
          loadImage(assetPaths.logo),
          loadImage(assetPaths.compactLogo),
          loadImage(assetPaths.product),
          loadVideo(assetPaths.printerVideo),
        ]);

        const loadedAssets = {
          logo,
          compactLogo,
          product,
          video,
        };

        const stream = canvas.captureStream(FPS);
        const mimeType = [
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4;codecs=h264',
          'video/mp4',
          'video/webm;codecs=vp9',
          'video/webm',
        ].find((type) => MediaRecorder.isTypeSupported(type));

        if (!mimeType) {
          throw new Error('No supported MediaRecorder video MIME type found.');
        }

        const chunks = [];
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 10_000_000,
        });

        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };

        const stopped = new Promise((resolve, reject) => {
          recorder.onstop = async () => {
            try {
              const blob = new Blob(chunks, { type: mimeType });
              const buffer = await blob.arrayBuffer();
              window.__RENDER_BASE64__ = arrayBufferToBase64(buffer);
              window.__RENDER_RESULT__ = {
                ready: true,
                mimeType,
                size: blob.size,
              };
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          recorder.onerror = () => reject(recorder.error || new Error('MediaRecorder failed.'));
        });

        recorder.start(1000);
        const start = performance.now();

        await new Promise((resolve) => {
          function tick(now) {
            const elapsed = Math.min(now - start, DURATION_MS);
            const t = elapsed / 1000;
            window.__RENDER_PROGRESS__ = elapsed / DURATION_MS;
            drawFrame(t, loadedAssets);
            if (elapsed < DURATION_MS) {
              requestAnimationFrame(tick);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(tick);
        });

        drawFrame(DURATION_MS / 1000, loadedAssets);
        await new Promise((resolve) => setTimeout(resolve, 200));
        recorder.stop();
        await stopped;
      } catch (error) {
        window.__RENDER_ERROR__ = error?.stack || error?.message || String(error);
      }
    }

    main();
  </script>
</body>
</html>`
}

function serve() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')

    if (url.pathname === '/' || url.pathname === '/ad.html') {
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      })
      response.end(html())
      return
    }

    if (url.pathname.startsWith('/assets/')) {
      const assetName = decodeURIComponent(url.pathname.slice('/assets/'.length))
      const mimeType = assets.get(assetName)
      if (!mimeType) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      const assetPath = path.join(publicDir, assetName)
      if (!existsSync(assetPath)) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      response.writeHead(200, {
        'content-type': mimeType,
        'cache-control': 'no-store',
      })
      createReadStream(assetPath).pipe(response)
      return
    }

    response.writeHead(404)
    response.end('Not found')
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function waitForChromeEndpoint(chrome) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for Chrome DevTools endpoint.'))
    }, 12_000)

    function inspect(data) {
      const text = data.toString()
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    }

    chrome.stderr.on('data', inspect)
    chrome.stdout.on('data', inspect)
    chrome.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited before DevTools was ready. Exit code: ${code}`))
    })
  })
}

class CdpClient {
  constructor(endpoint) {
    this.endpoint = endpoint
    this.nextId = 1
    this.pending = new Map()
  }

  connect() {
    this.socket = new WebSocket(this.endpoint)
    this.socket.on('message', (data) => {
      const message = JSON.parse(data.toString())
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) {
        pending.reject(new Error(message.error.message || JSON.stringify(message.error)))
      } else {
        pending.resolve(message.result || {})
      }
    })

    return new Promise((resolve, reject) => {
      this.socket.once('open', resolve)
      this.socket.once('error', reject)
    })
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.socket.send(JSON.stringify(payload))

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  close() {
    this.socket?.close()
  }
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      returnByValue: true,
      awaitPromise: false,
    },
    sessionId
  )

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.')
  }

  return result.result?.value
}

async function waitForRender(cdp, sessionId) {
  let lastProgress = -1
  const started = Date.now()

  while (Date.now() - started < 60_000) {
    const state = await evaluate(
      cdp,
      sessionId,
      `({
        ready: Boolean(window.__RENDER_RESULT__ && window.__RENDER_RESULT__.ready),
        error: window.__RENDER_ERROR__ || null,
        progress: window.__RENDER_PROGRESS__ || 0,
        mimeType: window.__RENDER_RESULT__?.mimeType || null,
        size: window.__RENDER_RESULT__?.size || 0
      })`
    )

    if (state?.error) {
      throw new Error(state.error)
    }

    const progress = Math.round((state?.progress || 0) * 100)
    if (progress >= lastProgress + 15) {
      lastProgress = progress
      console.log(`Render progress: ${progress}%`)
    }

    if (state?.ready) {
      return state
    }

    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  throw new Error('Timed out waiting for video render.')
}

async function readBase64(cdp, sessionId) {
  const length = await evaluate(cdp, sessionId, 'window.__RENDER_BASE64__?.length || 0')
  if (!length) {
    throw new Error('Rendered video was empty.')
  }

  let output = ''
  const chunkSize = 1_000_000
  for (let start = 0; start < length; start += chunkSize) {
    const end = Math.min(start + chunkSize, length)
    output += await evaluate(cdp, sessionId, `window.__RENDER_BASE64__.slice(${start}, ${end})`)
  }
  return output
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  const server = await serve()
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const chromeProfile = await mkdtemp(path.join(tmpdir(), 'flux3d-ad-chrome-'))

  const chrome = spawn(
    'google-chrome',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
      '--remote-debugging-port=0',
      `--user-data-dir=${chromeProfile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let cdp
  try {
    const endpoint = await waitForChromeEndpoint(chrome)
    cdp = new CdpClient(endpoint)
    await cdp.connect()

    const { targetId } = await cdp.send('Target.createTarget', {
      url: `http://127.0.0.1:${port}/ad.html`,
    })
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })

    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send('Page.enable', {}, sessionId)

    const state = await waitForRender(cdp, sessionId)
    const base64 = await readBase64(cdp, sessionId)
    const buffer = Buffer.from(base64, 'base64')
    const extension = String(state.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
    const outputPath = path.join(outputDir, `flux3d-premium-reel.${extension}`)

    await writeFile(outputPath, buffer)
    console.log(`Saved ${outputPath}`)
    console.log(`MIME ${state.mimeType}; ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
  } finally {
    cdp?.close()
    if (chrome.exitCode === null) {
      chrome.kill('SIGTERM')
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 2_000)
        chrome.once('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }
    server.close()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(chromeProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        break
      } catch (error) {
        if (attempt === 4) {
          console.warn(`Could not remove temporary Chrome profile: ${chromeProfile}`)
          console.warn(error)
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
