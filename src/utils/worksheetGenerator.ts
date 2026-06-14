import { DayName, DayProgression } from '../types';

interface WorksheetEntry {
  text: string;
  meaning?: string;
  stars: number;
}

// Collect up to 8 sentences the kid practiced today (questions + timeline),
// each with its star score, to fill "TODAY'S 8 PHRASES".
function collectEntries(dayState: DayProgression): WorksheetEntry[] {
  const entries: WorksheetEntry[] = [];

  dayState.questionsAnswers?.forEach((q) => {
    entries.push({
      text: q.answer,
      stars: q.stars || 0,
    });
  });

  dayState.timelineSentences?.forEach((t) => {
    entries.push({
      text: t.text,
      stars: t.stars || 0,
    });
  });

  // Pad up to 8 with empty rows
  while (entries.length < 8) {
    entries.push({ text: '', stars: 0 });
  }

  return entries.slice(0, 8);
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, filled: number, size = 22) {
  const total = 5;
  for (let i = 0; i < total; i++) {
    const cx = x + i * (size + 4);
    drawStar(ctx, cx, y, size / 2, i < filled ? '#FACC15' : '#E5E7EB');
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.beginPath();
  const spikes = 5;
  const step = Math.PI / spikes;
  let rot = (Math.PI / 2) * 3;
  ctx.moveTo(cx, cy - r);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * r;
    let y = cy + Math.sin(rot) * r;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * (r / 2.2);
    y = cy + Math.sin(rot) * (r / 2.2);
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number) {
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

const DAY_LABEL_VI: Record<DayName, string> = {
  Monday: 'Thu Hai',
  Tuesday: 'Thu Ba',
  Wednesday: 'Thu Tu',
  Thursday: 'Thu Nam',
  Friday: 'Thu Sau',
  Saturday: 'Thu Bay',
  Sunday: 'Chu Nhat',
};

/**
 * Builds the "MY ENGLISH WEEK" printable worksheet for a given day
 * and returns a PNG data URL.
 */
export function generateWorksheetPNG(
  dayName: DayName,
  kidName: string,
  dayState: DayProgression,
  starsEarned: number
): string {
  const W = 1050;
  const H = 1485; // A4-ish ratio
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Left margin strip
  ctx.fillStyle = '#F0F6FF';
  ctx.fillRect(0, 0, 80, H);

  const marginX = 110;
  const contentW = W - marginX - 60;

  // ===== Header =====
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 46px Arial';
  ctx.fillText('MY ENGLISH WEEK', marginX, 90);

  ctx.font = 'bold 22px Arial';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Day: ${dayName}  (${DAY_LABEL_VI[dayName]})`, marginX, 140);

  ctx.font = '18px Arial';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Name / Ten: ${kidName || '________________'}`, marginX, 172);
  ctx.fillText(`Date: ____ / ____ / ______`, marginX + 420, 172);

  // ===== Stats bar =====
  let y = 210;
  roundRect(ctx, marginX, y, contentW, 90, 24);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  const colW = contentW / 3;
  // Sentences Spoken
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 17px Arial';
  ctx.fillText('Sentences Spoken', marginX + 30, y + 35);
  roundRect(ctx, marginX + 30, y + 48, colW - 70, 28, 8);
  ctx.fillStyle = '#DBEAFE';
  ctx.fill();
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(String(dayState.timelineSentences?.filter(t => t.recordingState === 'completed').length || 0), marginX + 45, y + 68);

  // Unique Phrases
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 17px Arial';
  ctx.fillText('Unique Phrases', marginX + colW + 30, y + 35);
  roundRect(ctx, marginX + colW + 30, y + 48, colW - 70, 28, 8);
  ctx.fillStyle = '#DCFCE7';
  ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 18px Arial';
  const uniqueCount = new Set(dayState.timelineSentences?.map(t => t.text)).size;
  ctx.fillText(String(uniqueCount), marginX + colW + 45, y + 68);

  // Average stars
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 17px Arial';
  ctx.fillText('Average Stars', marginX + colW * 2 + 30, y + 35);
  const allStars = [
    ...(dayState.questionsAnswers?.map(q => q.stars || 0) || []),
    ...(dayState.timelineSentences?.map(t => t.stars || 0) || []),
  ].filter(s => s > 0);
  const avg = allStars.length ? Math.round(allStars.reduce((a, b) => a + b, 0) / allStars.length) : 0;
  drawStars(ctx, marginX + colW * 2 + 30, y + 60, avg, 22);

  // ===== Today's 8 Phrases =====
  y += 130;
  roundRect(ctx, marginX, y, contentW, 620, 24);
  ctx.strokeStyle = '#C7D2FE';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText("TODAY'S PHRASES / CAU CUA HOM NAY", marginX + contentW / 2, y + 40);
  ctx.textAlign = 'left';

  const entries = collectEntries(dayState);
  const rowH = 70;
  let rowY = y + 70;

  entries.forEach((entry, idx) => {
    const cy = rowY + idx * rowH;

    // Number badge
    ctx.beginPath();
    ctx.arc(marginX + 35, cy + 22, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1E3A8A';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(idx + 1), marginX + 35, cy + 27);
    ctx.textAlign = 'left';

    // Stars
    drawStars(ctx, marginX + 65, cy + 10, entry.stars, 20);

    // Sentence text
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 19px Arial';
    const text = entry.text || '_______________________________________';
    ctx.fillText(text, marginX + 220, cy + 27, contentW - 240);

    // Meaning line
    ctx.fillStyle = '#94A3B8';
    ctx.font = '15px Arial';
    ctx.fillText('Nghia: ______________________________________________', marginX + 220, cy + 52);

    // Divider
    if (idx < entries.length - 1) {
      dashedLine(ctx, marginX + 20, cy + rowH - 14, marginX + contentW - 20);
    }
  });

  // ===== Diary section =====
  y += 650;
  roundRect(ctx, marginX, y, contentW, 380, 24);
  ctx.strokeStyle = '#DDD6FE';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#5B21B6';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MY ENGLISH DIARY', marginX + contentW / 2, y + 40);
  ctx.font = '16px Arial';
  ctx.fillStyle = '#7C3AED';
  ctx.fillText('Write 5-7 sentences about your day.', marginX + contentW / 2, y + 68);
  ctx.textAlign = 'left';

  for (let i = 0; i < 7; i++) {
    const lineY = y + 110 + i * 38;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX + 30, lineY);
    ctx.lineTo(marginX + contentW - 30, lineY);
    ctx.stroke();
  }

  // ===== Footer: favorite sentence + stars earned =====
  y += 410;
  roundRect(ctx, marginX, y, contentW * 0.6 - 10, 110, 20);
  ctx.fillStyle = '#FEF9C3';
  ctx.fill();
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('MY FAVORITE SENTENCE TODAY', marginX + 25, y + 35);
  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX + 25, y + 75);
  ctx.lineTo(marginX + contentW * 0.6 - 35, y + 75);
  ctx.stroke();

  const box2X = marginX + contentW * 0.6 + 10;
  roundRect(ctx, box2X, y, contentW * 0.4 - 10, 110, 20);
  ctx.fillStyle = '#ECFDF5';
  ctx.fill();
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STARS EARNED TODAY', box2X + (contentW * 0.4 - 10) / 2, y + 35);
  drawStars(ctx, box2X + (contentW * 0.4 - 10) / 2 - 55, y + 55, 5, 24);
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`+${starsEarned} stars`, box2X + (contentW * 0.4 - 10) / 2, y + 100);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export function downloadWorksheetPNG(dayName: DayName, kidName: string, dayState: DayProgression, starsEarned: number) {
  const dataUrl = generateWorksheetPNG(dayName, kidName, dayState, starsEarned);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `MyEnglishWeek_${dayName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
