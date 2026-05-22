export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  alpha: number
) {
  const s = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(0, -s * 0.2, -s * 1.1, -s * 0.15, -s, s * 0.35);
  ctx.bezierCurveTo(-s, s * 0.85, 0, s * 1.15, 0, s * 1.55);
  ctx.bezierCurveTo(0, s * 1.15, s, s * 0.85, s, s * 0.35);
  ctx.bezierCurveTo(s * 1.1, -s * 0.15, 0, -s * 0.2, 0, s * 0.35);
  ctx.closePath();
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5);
  grad.addColorStop(0, "rgba(255, 90, 110, 0.95)");
  grad.addColorStop(1, "rgba(229, 9, 20, 0.9)");
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(229, 9, 20, 0.45)";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

export function drawSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
  grad.addColorStop(0, "rgba(255, 200, 210, 0.95)");
  grad.addColorStop(0.5, "rgba(255, 80, 100, 0.85)");
  grad.addColorStop(1, "rgba(229, 9, 20, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
