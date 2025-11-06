import { useEffect, useRef, useState, memo } from "react";
import { useAudio } from "./audio/useAudio";

// Move AudioPlayer out of the main component and memoize so frequent game-loop
// re-renders don't remount or update the audio UI every frame.
const AudioPlayerInner = ({ src }: { src: string }) => {
  const { isPlaying, toggle, levels, error, currentTime, duration, seek } = useAudio(src);
  const cvsRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  // draw the analyser levels (simple bar meter)
  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!levels) {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        return;
      }
      const w = cvs.width;
      const h = cvs.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#94A3B8"; // slate
      const barW = Math.max(1, w / levels.length);
      for (let i = 0; i < levels.length; i++) {
        const v = levels[i] / 255;
        const bh = v * h;
        ctx.fillRect(i * barW, h - bh, barW - 1, bh);
      }
    };
    draw();
  }, [levels]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="rounded bg-white/10 px-3 py-1 text-sm"
          aria-pressed={isPlaying}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="text-xs opacity-80">Preview</div>
      </div>
      {/* Progress scrubber */}
      <div
        ref={progressRef}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        className="w-full h-3 bg-white/6 rounded-md relative cursor-pointer mt-2"
        onPointerDown={(e) => {
          e.stopPropagation();
          const el = progressRef.current; if (!el || !duration) return;
          dragging.current = true;
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const t = (x / rect.width) * duration;
          seek(t);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const el = progressRef.current; if (!el || !duration) return;
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const t = Math.max(0, Math.min(1, x / rect.width)) * duration;
          seek(t);
        }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={(e) => {
          if (!duration) return;
          if (e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, currentTime - 5)); }
          if (e.key === "ArrowRight") { e.preventDefault(); seek(Math.min(duration, currentTime + 5)); }
        }}
      >
        <div className="absolute inset-0 rounded-md overflow-hidden">
          <div
            className="h-full bg-white/40"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
      </div>
      <canvas ref={cvsRef} width={220} height={36} className="w-full rounded-md bg-white/3" />
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
};

export const AudioPlayer = memo(AudioPlayerInner);

// --- Tweakable gameplay constants ---
const WORLD = { width: 2000, height: 1200 };
const PLAYER = { speed: 320, size: 28 };

const ASPECT = 16 / 9;
const PADDING = 48; // min breathing room around the window

const NAV_H = 56;        // height of your fixed header (px)
const FOOTER_H = 28;     // bottom breathing room
const EXTRA_GAP = 12;    // extra safety gap
const MAX_VIEW = { width: 960, height: 540 }; // <= make the game box smaller (16:9)
const MINIMAP_MIN_WIDTH = 640; // hide minimap on narrow/mobile viewports

// Tiles
const TILE = 40;                          // tile size in px (fits your world nicely)
const COLS = WORLD.width / TILE;          // 2000/40 = 50
const ROWS = WORLD.height / TILE;         // 1200/40 = 30

const ZONES = [
  { id: "about", label: "About Me", color: "#6EE7B7", rect: { x: 180, y: 160, w: 260, h: 180 }, blurb: "Hi! I'm David, a UBC student building real-time audio tools and playful web apps." },
  { id: "projects", label: "Projects", color: "#93C5FD", rect: { x: 1500, y: 160, w: 320, h: 220 }, blurb: "Featured projects..." },
  { id: "music", label: "Music", color: "#FDE68A", rect: { x: 180, y: 800, w: 300, h: 200 }, blurb: "" },
  { id: "contact", label: "Contact", color: "#FCA5A5", rect: { x: 1500, y: 820, w: 280, h: 180 }, blurb: "Email form..." },
];

// Build a direct (streamable) URL from a Google Drive file ID
const driveDl = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;



// List your audio snippets here (title + Drive file ID)
const AUDIO_SNIPPETS = [
  { title: "DNA - BTS remake", id: "1eKdES58tGEVlESbv4kNjRuUQtzu01nLH", url: "/snippets/dna.wav" },
  { title: "Misty (acapella) Preview", id: "DRIVE_FILE_ID_2", url: "/snippets/misty.wav" },
  { title: "Caledonia (acapella) Preview", id: "DRIVE_FILE_ID_3", url: "/snippets/calereverb.wav" },
  { title: "Jazz Neo Soul Preview", id: "DRIVE_FILE_ID_4", url: "/snippets/simplebeat.wav" },
];

// --- TILEMAP ---
// Each string is one row with COLS characters.
// '#' = solid tile, '.' = empty.
// Start with an empty map:
const EMPTY_ROW = ".".repeat(COLS);
const MAP_ROWS_BASE: string[] = Array(ROWS).fill(EMPTY_ROW);

// Add outer border walls:
MAP_ROWS_BASE[0] = "#".repeat(COLS);
MAP_ROWS_BASE[ROWS - 1] = "#".repeat(COLS);
for (let r = 1; r < ROWS - 1; r++) {
  const arr = MAP_ROWS_BASE[r].split("");
  arr[0] = "#";
  arr[COLS - 1] = "#";
  MAP_ROWS_BASE[r] = arr.join("");
}

// (Optional) central “plaza” like your old walls:
const xL = Math.floor(900 / TILE);   // 15
const xR = Math.floor(1150 / TILE);  // 35
const yTop = Math.floor(400 / TILE); // 7 or 8 depending on rounding
const yBot = Math.floor(600 / TILE); // 14

// Horizontal bars
{
  const rowTop = MAP_ROWS_BASE[yTop].split("");
  for (let c = xL; c <= xR; c++) rowTop[c] = "#";
  MAP_ROWS_BASE[yTop] = rowTop.join("");

  const rowBot = MAP_ROWS_BASE[yBot].split("");
  for (let c = xL; c <= xR; c++) rowBot[c] = "#";
  MAP_ROWS_BASE[yBot] = rowBot.join("");
}

// Vertical posts
for (let r = yTop; r <= yBot; r++) {
  const arr = MAP_ROWS_BASE[r].split("");
  arr[xL] = "#";
  arr[Math.floor(1150 / TILE)] = "#";
  MAP_ROWS_BASE[r] = arr.join("");
}

// Freeze map
const MAP_ROWS: string[] = MAP_ROWS_BASE;

function computeViewport() {
  // available space inside the page (leave some padding + account for fixed header/footer)
  const ww = Math.max(320, window.innerWidth - PADDING * 2);
  const wh = Math.max(
    240,
    window.innerHeight - PADDING * 2 - NAV_H - FOOTER_H - EXTRA_GAP
  );

  // cap by world size first
  let w = Math.min(ww, WORLD.width);
  let h = Math.min(wh, WORLD.height);

  // enforce 16:9 inside the available box
  const boxAspect = w / h;
  if (boxAspect > ASPECT) {
    w = Math.floor(h * ASPECT);
  } else {
    h = Math.floor(w / ASPECT);
  }

  // final clamp so the canvas stays smaller than the navbar/bottom edges
  w = Math.min(w, MAX_VIEW.width);
  h = Math.min(h, MAX_VIEW.height);

  return { width: w, height: h };
}


function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// === Helpers & refs ===
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Tile helpers
const isSolid = (tx: number, ty: number) =>
  ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && MAP_ROWS[ty].charCodeAt(tx) === 35; // '#'

function rectToTileRange(x: number, y: number, w: number, h: number) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);
  return { left, right, top, bottom };
}

function clampToWorldX(x: number, w: number) {
  return Math.max(0, Math.min(WORLD.width - w, x));
}
function clampToWorldY(y: number, h: number) {
  return Math.max(0, Math.min(WORLD.height - h, y));
}

// Axis-sweep tile collision
function moveAndCollide(next: { x: number; y: number; w: number; h: number }, vx: number, vy: number, dt: number) {
  // X step
  next.x += vx * dt;
  next.x = clampToWorldX(next.x, next.w);
  let rng = rectToTileRange(next.x, next.y, next.w, next.h);
  if (vx > 0) {
    // moving right → check right edge tiles
    for (let ty = rng.top; ty <= rng.bottom; ty++) {
      if (isSolid(rng.right, ty)) {
        next.x = rng.right * TILE - next.w; // flush against tile’s left
        rng = rectToTileRange(next.x, next.y, next.w, next.h);
        break;
      }
    }
  } else if (vx < 0) {
    for (let ty = rng.top; ty <= rng.bottom; ty++) {
      if (isSolid(rng.left, ty)) {
        next.x = (rng.left + 1) * TILE;
        rng = rectToTileRange(next.x, next.y, next.w, next.h);
        break;
      }
    }
  }

  // Y step
  next.y += vy * dt;
  next.y = clampToWorldY(next.y, next.h);
  rng = rectToTileRange(next.x, next.y, next.w, next.h);
  if (vy > 0) {
    // moving down → check bottom edge tiles
    for (let tx = rng.left; tx <= rng.right; tx++) {
      if (isSolid(tx, rng.bottom)) {
        next.y = rng.bottom * TILE - next.h; // flush against tile’s top
        break;
      }
    }
  } else if (vy < 0) {
    for (let tx = rng.left; tx <= rng.right; tx++) {
      if (isSolid(tx, rng.top)) {
        next.y = (rng.top + 1) * TILE;
        break;
      }
    }
  }
}

export default function PortfolioGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [player, setPlayer] = useState({ x: 500, y: 500, w: PLAYER.size, h: PLAYER.size });
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.75 });
  const [activeZone, setActiveZone] = useState<string | null>(null);

  // Which zone (if any) the player is overlapping this frame:
  const overlapRef = useRef<string | null>(null);
  // Minimap toggle
  const [showMinimap, setShowMinimap] = useState(true);

  // Refs for snippet list items to enable keyboard navigation / focus
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Touch joystick state
  const touchRef = useRef<{ id: number | null, startX: number, startY: number, dx: number, dy: number }>({ id: null, startX: 0, startY: 0, dx: 0, dy: 0 });
  const [stamina, setStamina] = useState(1); // 0..1

  // Viewport state
  const [viewport, setViewport] = useState(
    typeof window !== "undefined" ? computeViewport() : { width: 1024, height: 576 }
  );

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setViewport(computeViewport()));
    };
    window.addEventListener("resize", onResize);
    onResize(); // initialize
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Prevent page from scrolling while the game is mounted
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Keep modal state in sync with the URL hash (so #projects opens the modal)
  useEffect(() => {
    const applyFromHash = () => {
      const id = window.location.hash.slice(1);
      if (ZONES.some(z => z.id === id)) {
        setActiveZone(id);
      } else {
        setActiveZone(null);
      }
    };
    window.addEventListener("hashchange", applyFromHash);
    applyFromHash(); // on load
    return () => window.removeEventListener("hashchange", applyFromHash);
  }, []);

  // Open/close helpers that also update the URL (no history spam)
  // const openZone = (id: string) => {
  //   setActiveZone(id);
  //   history.replaceState(null, "", `#${id}`);
  // };
  const closeZone = () => {
    setActiveZone(null);
    history.replaceState(null, "", " ");
  };

  // Load saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pf-save");
      if (!raw) return;
      const save = JSON.parse(raw);
      if (save && typeof save === "object") {
        if (save.player && typeof save.player.x === "number") {
          setPlayer((p) => ({ ...p, x: save.player.x, y: save.player.y }));
        }
        if (save.activeZone && ZONES.some(z => z.id === save.activeZone)) {
          setActiveZone(save.activeZone);
        }
      }
    } catch { }
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", "shift"].includes(k)) {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [k]: true }));
      }
      if (k === "escape") {
        setActiveZone(null);
      }
      if (k === "enter") {
        const id = overlapRef.current;
        if (id) setActiveZone(id);
      }
      if (k === "m") {
        setShowMinimap((v) => !v);
      }
      if (k === "-" || k === "_" || k === "[") {
        e.preventDefault();
        setCamera((c) => ({ ...c, zoom: Math.max(0.5, +(c.zoom - 0.05).toFixed(2)) })); // zoom out
      }
      if (k === "=" || k === "+" || k === "]") {
        e.preventDefault();
        setCamera((c) => ({ ...c, zoom: Math.min(1.5, +(c.zoom + 0.05).toFixed(2)) })); // zoom in
      }
      if (k === "0") {
        e.preventDefault();
        setCamera((c) => ({ ...c, zoom: 0.75 })); // reset
      }
    };
    const up = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Dynamic document title
  useEffect(() => {
    const defaultTitle = "David — Interactive Portfolio";
    const zone = ZONES.find((z) => z.id === activeZone);
    document.title = zone ? `${zone.label} — David` : defaultTitle;
    return () => { document.title = defaultTitle; };
  }, [activeZone]);

  // Loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      let ix = 0, iy = 0;
      // keyboard
      if (keys["w"] || keys["arrowup"]) iy -= 1;
      if (keys["s"] || keys["arrowdown"]) iy += 1;
      if (keys["a"] || keys["arrowleft"]) ix -= 1;
      if (keys["d"] || keys["arrowright"]) ix += 1;

      // touch joystick
      if (touchRef.current.id !== null) {
        const { dx, dy } = touchRef.current;
        const dead = 8; // pixels
        const mag = Math.hypot(dx, dy);
        if (mag > dead) {
          ix += dx / mag;
          iy += dy / mag;
        }
      }

      // Velocity
      let vx = 0, vy = 0;
      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy) || 1;
        const speed = keys["shift"] ? PLAYER.speed * 1.8 : PLAYER.speed; // hold Shift to sprint
        vx = (ix / len) * speed;
        vy = (iy / len) * speed;
      }

      // --- Stamina and modified movement speed ---
      const sprinting = keys["shift"]; // or include gamepad flag if you added one
      const base = PLAYER.speed;
      const boost = base * 1.8;
      const moveSpeed = sprinting && stamina > 0.05 ? boost : base;

      // replace where you used PLAYER.speed with moveSpeed:
      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy) || 1;
        vx = (ix / len) * moveSpeed;
        vy = (iy / len) * moveSpeed;
      }

      // stamina drain/regen
      const drain = 0;   // per second
      const regen = 0.35;  // per second
      let s = stamina;
      if (sprinting && (ix || iy)) s = Math.max(0, s - drain * dt);
      else s = Math.min(1, s + regen * dt);
      if (s !== stamina) setStamina(s);

      let next = { ...player };

      // Move with collision
      moveAndCollide(next, vx, vy, dt);

      // Clamp to world
      next.x = Math.max(0, Math.min(WORLD.width - next.w, next.x));
      next.y = Math.max(0, Math.min(WORLD.height - next.h, next.y));

      // const vW = viewport.width / camera.zoom;
      // const vH = viewport.height / camera.zoom;

      // Camera target = keep player slightly off-center (soft bounds) + smooth lerp
      const marginX = viewport.width * 0.3;
      const marginY = viewport.height * 0.3;
      const targetX = next.x + next.w / 2;
      const targetY = next.y + next.h / 2;

      let desiredX = camera.x;
      let desiredY = camera.y;

      if (targetX - camera.x < marginX) desiredX = Math.max(0, targetX - marginX);
      if (targetX - camera.x > viewport.width - marginX)
        desiredX = Math.min(WORLD.width - viewport.width, targetX - (viewport.width - marginX));
      if (targetY - camera.y < marginY) desiredY = Math.max(0, targetY - marginY);
      if (targetY - camera.y > viewport.height - marginY)
        desiredY = Math.min(WORLD.height - viewport.height, targetY - (viewport.height - marginY));

      // Smoothly approach desired position
      const cam = {
        x: lerp(camera.x, desiredX, 0.12),
        y: lerp(camera.y, desiredY, 0.12),
        zoom: camera.zoom,
      };

      // Save lightweight state
      try {
        localStorage.setItem("pf-save", JSON.stringify({
          player: { x: next.x, y: next.y },
          activeZone
        }));
      } catch { }

      setPlayer(next);
      setCamera(cam);

      // Render
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0B1220";
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        ctx.save();
        ctx.scale(camera.zoom, camera.zoom);   // zoom first
        ctx.translate(-cam.x, -cam.y);         // then move the camera

        // Compute visible tile range from camera & viewport (ZOOM-AWARE + PADDING)
        const vW = viewport.width / camera.zoom;  // world-space view width
        const vH = viewport.height / camera.zoom;  // world-space view height
        const PAD = 2 * TILE;                      // overdraw to prevent gaps

        const tx0 = Math.max(0, Math.floor((camera.x - PAD) / TILE));
        const ty0 = Math.max(0, Math.floor((camera.y - PAD) / TILE));
        const tx1 = Math.min(COLS - 1, Math.floor((camera.x + vW + PAD) / TILE));
        const ty1 = Math.min(ROWS - 1, Math.floor((camera.y + vH + PAD) / TILE));

        ctx.lineWidth = 1 / camera.zoom;

        // Grid lines (optional, visible window only)
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        // verticals
        for (let x = tx0 * TILE; x <= (tx1 + 1) * TILE; x += TILE) {
          ctx.beginPath(); ctx.moveTo(x, ty0 * TILE); ctx.lineTo(x, (ty1 + 1) * TILE); ctx.stroke();
        }
        // horizontals
        for (let y = ty0 * TILE; y <= (ty1 + 1) * TILE; y += TILE) {
          ctx.beginPath(); ctx.moveTo(tx0 * TILE, y); ctx.lineTo((tx1 + 1) * TILE, y); ctx.stroke();
        }

        // Zones
        for (const z of ZONES) {
          const { x, y, w, h } = z.rect;
          ctx.fillStyle = z.color; ctx.globalAlpha = 0.18; ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = z.color; ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "white"; ctx.font = "bold 20px Inter, system-ui, sans-serif"; ctx.fillText(z.label, x + 10, y - 8);
        }

        // Solid tiles (visible window only)
        ctx.fillStyle = "#1F2937";
        for (let ty = ty0; ty <= ty1; ty++) {
          const row = MAP_ROWS[ty];
          for (let tx = tx0; tx <= tx1; tx++) {
            if (row.charCodeAt(tx) === 35) { // '#'
              ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
            }
          }
        }

        // Player
        ctx.fillStyle = "#A78BFA";
        ctx.beginPath();
        ctx.arc(next.x + next.w / 2, next.y + next.h / 2, next.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0B1220";
        ctx.beginPath();
        ctx.arc(next.x + next.w / 2 - 6, next.y + next.h / 2 - 4, 3, 0, Math.PI * 2);
        ctx.arc(next.x + next.w / 2 + 6, next.y + next.h / 2 - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Zone prompt if overlapping
        const inZone = ZONES.find((z) => intersects(next, { ...z.rect }));
        if (inZone) {
          const { x, y, w } = inZone.rect;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(x + w / 2 - 70, y - 36, 140, 26);
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.strokeRect(x + w / 2 - 70, y - 36, 140, 26);
          ctx.fillStyle = "white";
          ctx.font = "12px Inter, system-ui, sans-serif";
          ctx.fillText("Press Enter to open", x + w / 2 - 54, y - 18);
        }

        ctx.restore();

        // // === OLD STATIC Minimap (screen space) ===
        // ctx.save();
        // ctx.setTransform(1, 0, 0, 1, 0, 0); // draw in screen coords
        // const mmX = MINIMAP.padding;
        // const mmY = MINIMAP.padding + 40; // below top bar
        // const sx = MINIMAP.w / WORLD.width;
        // const sy = MINIMAP.h / WORLD.height;

        // // bg
        // ctx.fillStyle = "rgba(0,0,0,0.4)";
        // ctx.fillRect(mmX - 6, mmY - 6, MINIMAP.w + 12, MINIMAP.h + 12);
        // ctx.fillStyle = "rgba(30,41,59,0.9)"; // slate
        // ctx.fillRect(mmX, mmY, MINIMAP.w, MINIMAP.h);

        // // tiles
        // ctx.fillStyle = "rgba(148,163,184,0.9)";
        // for (let ty = 0; ty < ROWS; ty++) {
        //   const row = MAP_ROWS[ty];
        //   for (let tx = 0; tx < COLS; tx++) {
        //     if (row.charCodeAt(tx) === 35) {
        //       ctx.fillRect(mmX + tx * TILE * sx, mmY + ty * TILE * sy, Math.max(1, TILE * sx), Math.max(1, TILE * sy));
        //     }
        //   }
        // }

        // // zones
        // for (const z of ZONES) {
        //   const { x, y, w, h } = z.rect;
        //   ctx.fillStyle = z.color + "CC"; // add alpha
        //   ctx.fillRect(mmX + x * sx, mmY + y * sy, Math.max(2, w * sx), Math.max(2, h * sy));
        // }

        // // player dot
        // ctx.fillStyle = "#A78BFA";
        // ctx.beginPath();
        // ctx.arc(mmX + (player.x + player.w / 2) * sx, mmY + (player.y + player.h / 2) * sy, 3, 0, Math.PI * 2);
        // ctx.fill();

        // ctx.restore();

        // Joystick UI (screen space)
        if (touchRef.current.id !== null) {
          const r = 34;
          const cx = touchRef.current.startX;
          const cy = touchRef.current.startY;

          // switch to identity transform so drawing is screen-anchored
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          const mag = Math.hypot(touchRef.current.dx, touchRef.current.dy);
          const nx = mag ? touchRef.current.dx / mag : 0;
          const ny = mag ? touchRef.current.dy / mag : 0;

          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(cx + nx * r, cy + ny * r, 14, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.restore();
        }

        // HUD
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText("Move with WASD. Walk into a colored zone to open it.", 16, 24);

        // Minimap (toggle with 'M')
        if (showMinimap) {
          if (showMinimap && viewport.width >= MINIMAP_MIN_WIDTH) {
            const mmW = 180, mmH = 108, pad = 12;
            const mmX = pad, mmY = pad + 28;
            const sx = mmW / WORLD.width;
            const sy = mmH / WORLD.height;

            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(mmX - 6, mmY - 6, mmW + 12, mmH + 12);
            ctx.fillStyle = "rgba(30,41,59,0.9)";
            ctx.fillRect(mmX, mmY, mmW, mmH);

            // Zones
            for (const z of ZONES) {
              const { x, y, w, h } = z.rect;
              ctx.fillStyle = z.color + "CC";
              ctx.fillRect(mmX + x * sx, mmY + y * sy, Math.max(2, w * sx), Math.max(2, h * sy));
            }
            // Player
            ctx.fillStyle = "#A78BFA";
            ctx.beginPath();
            ctx.arc(mmX + (next.x + next.w / 2) * sx, mmY + (next.y + next.h / 2) * sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // === Stamina ring (screen space) ===
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // const cx = 24;
        const cy = viewport.height - 24;
        const r = 16;

        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(24, cy, r, 0, Math.PI * 2); ctx.stroke();

        // arc for current stamina
        ctx.strokeStyle = "#A78BFA";
        ctx.beginPath();
        ctx.arc(24, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * stamina);
        ctx.stroke();

        ctx.restore();
      }

      // Zone enter (edge trigger)
      const pBox = player;
      const nowIn = ZONES.find((z) => intersects({ ...next }, { ...z.rect }));
      const wasIn = ZONES.find((z) => intersects({ ...pBox }, { ...z.rect }));
      overlapRef.current = nowIn ? nowIn.id : null; // <-- keep latest overlap for Enter key

      if (nowIn && !wasIn) {
        setActiveZone(nowIn.id);
      }

      raf = requestAnimationFrame(step);
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [player, camera, keys]);


  // Keep canvas pixel/CSS size synced to viewport + DPR (works at any zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [viewport]);

  const zoneData = ZONES.find(z => z.id === activeZone);

  

  return (
    <div className="relative w-full h-screen bg-slate-900 text-white">
      {/* Fullscreen canvas layer */}
      {/* Floating game window (centered, with neon glow + glass) */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
        {/* Glow layer */}
        <div
          aria-hidden
          className="absolute pointer-events-none -z-10 w-[min(90vw,1280px)] h-[min(60vw,720px)]
                    rounded-[28px] blur-3xl opacity-60
                    bg-[conic-gradient(at_30%_20%,#a78bfa_0deg,#22d3ee_120deg,#38bdf8_240deg,#a78bfa_360deg)]
                    animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        {/* Glass/card + canvas */}
        <div
          className="pointer-events-auto relative rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden
                    backdrop-blur-md bg-[rgba(15,23,42,0.65)]
                    bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(255,255,255,0.06),rgba(0,0,0,0)_60%)]"
          style={{ width: viewport.width, height: viewport.height }}
        >
          <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
          <canvas
            ref={canvasRef}
            className="block w-full h-full bg-slate-950/60"
            onPointerDown={(e) => {
              const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              if (touchRef.current.id === null) {
                (e.target as Element).setPointerCapture(e.pointerId);
                touchRef.current = { id: e.pointerId, startX: x, startY: y, dx: 0, dy: 0 };
              }
            }}
            onPointerMove={(e) => {
              if (touchRef.current.id === e.pointerId) {
                const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const R = 34;
                let dx = x - touchRef.current.startX;
                let dy = y - touchRef.current.startY;
                const m = Math.hypot(dx, dy);
                if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
                touchRef.current.dx = dx;
                touchRef.current.dy = dy;
              }
            }}
            onPointerUp={(e) => {
              if (touchRef.current.id === e.pointerId) {
                touchRef.current = { id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
              }
            }}
          />
        </div>
      </div>


      {/* Overlays */}
      {/* Header (glass) */}
      <header className="fixed top-0 left-0 right-0 z-30">
        {/* Full-width background strip */}
        <div className="w-full backdrop-blur-md bg-white/5 border-b border-white/10">
          {/* Centered content inside */}
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">davidting.dev</a>
            <nav className="hidden md:flex gap-6 text-sm">
              {ZONES.map((z) => (
                <a
                  key={z.id}
                  href={`#${z.id}`}
                  className="opacity-80 hover:opacity-100 underline-offset-4 hover:underline"
                >
                  {z.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* <div className="pointer-events-none absolute left-4 top-16 z-10 text-sm opacity-80">
        Press <span className="font-semibold">Esc</span> to close a panel.
      </div> */}
      <div className="mt-4 text-sm opacity-80">
        Press <span className="font-semibold">Esc</span> to close a panel • Press <span className="font-semibold">M</span> to toggle minimap.
      </div>


      {zoneData && (
        <div role="dialog" aria-modal="true" aria-labelledby="zone-title"
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden pointer-events-auto"
          style={{ zIndex: 99999 }}
          onClick={() => closeZone()}>
          <div
            className="max-w-4xl w-full bg-slate-900 rounded-2xl ring-1 ring-white/10 shadow-2xl relative flex flex-col max-h-[min(85vh,800px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 px-6 py-4 bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-white/10">
              <h2 className="text-2xl font-semibold">{zoneData.label}</h2>
              <button
                onClick={() => setActiveZone(null)}
                className="absolute right-4 top-3 rounded-full px-3 py-1 bg-white/10 hover:bg-white/20"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 pb-6 pt-2 overflow-y-auto min-h-0 max-h-[calc(min(85vh,800px)-64px)]">
              <p className="opacity-90 leading-relaxed">{zoneData.blurb}</p>

              {zoneData.id === "about" && (
                <div className="mt-3 grid md:grid-cols-[160px,1fr] gap-6 items-start">
                  {/* Left: photo (replace src) */}
                  {/* If you don’t have a photo yet, keep the placeholder div below instead */}
                  {/* <img src="/headshot.jpg" alt="David Ting" className="aspect-square object-cover rounded-xl" /> */}
                  {/* <div className="aspect-square rounded-xl bg-white/5" /> */}
                  <img src="/headshot.jpg" alt="David Ting" className="aspect-square object-cover rounded-xl" />

                  {/* Right: bio + links */}
                  <div className="space-y-3">
                    <p>
                      I’m David, a UBC student building real-time audio tools (pitch-shifting, pYIN/librosa),
                      playful JS/React experiences, and performance-minded web apps. I like shipping scrappy
                      MVPs fast, then polishing the UX.
                    </p>
                    <ul className="list-disc list-inside opacity-90">
                      <li>Current: interactive portfolio game (this site!)</li>
                      <li>Ongoing: Melodyne-style plugin for Ableton</li>
                      <li>Also: NBAchat (WebSockets), Spotify recs app (React/Node)</li>
                    </ul>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <a className="underline" href="/resume.pdf" target="_blank" rel="noreferrer">Résumé</a>
                      <a className="underline" href="mailto:dting01@student.ubc.ca">Email</a>
                      <a className="underline" href="https://github.com/dlt87" target="_blank" rel="noreferrer">GitHub</a>
                      <a className="underline" href="https://www.linkedin.com/in/davidting1/" target="_blank" rel="noreferrer">LinkedIn</a>
                    </div>
                  </div>
                </div>
              )}

              {zoneData.id === "projects" && (
                <div className="mt-3 grid md:grid-cols-[160px,1fr] gap-6 items-start">
                  <div className="space-y-3">
                    <p>
                      Uhm... this is awkward. You found the projects section, but I haven’t added any projects yet!
                      Feel free to check back later, or reach out via email or LinkedIn to see what I’m working on.
                    </p>

                    <ul className="list-disc list-inside opacity-90">
                      <li>Current: interactive portfolio game (this site!)</li>
                      <li>Ongoing: Melodyne-style plugin for Ableton</li>
                      <li>Also: NBAchat (WebSockets), Spotify recs app (React/Node)</li>
                    </ul>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <a className="underline" href="mailto:dting01@student.ubc.ca">Email</a>
                      <a className="underline" href="https://github.com/dlt87" target="_blank" rel="noreferrer">GitHub</a>
                      <a className="underline" href="https://www.linkedin.com/in/davidting1/" target="_blank" rel="noreferrer">LinkedIn</a>
                    </div>
                  </div>
                </div>
              )}

              {zoneData.id === "music" && (
                <div className="mt-6 space-y-4">
                  <p className="opacity-90">
                    Since I was a kid, I’ve loved making music. In my free time I love to
                    produce with friends using Ableton Live. I’m fascinated by audio tech and
                    signal processing, which is why I’m building a pitch-correction plugin as a side project.
                  </p>

                  <p className="opacity-90">
                    Below are some demos of my own music productions over the years:
                  </p>

                  {/* YouTube embed (responsive 16:9) */}
                  <div className="mb-4">
                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                      <iframe
                        src="https://www.youtube.com/embed/Px3x7RFv3QU"
                        title="DNA - BTS remake"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Fallback link */}
                  <a
                    className="underline opacity-80 hover:opacity-100"
                    href="https://www.youtube.com/playlist?list=PLHUXvDXP_PIHpIIdL3MZiEWjvS_JRxEJB&index=2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open playlist on YouTube
                  </a>

                  {/* Responsive YouTube playlist embed */}
                  <div className="rounded-xl ring-1 ring-white/10 overflow-hidden bg-white/5">
                    <div style={{ position: "relative", paddingTop: "56.25%" /* 16:9 */ }}>
                      <iframe
                        src="https://www.youtube-nocookie.com/embed/videoseries?list=PLHUXvDXP_PIHpIIdL3MZiEWjvS_JRxEJB"
                        title="David Ting — YouTube Playlist"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          border: 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Fallback link */}
                  <a
                    className="underline opacity-80 hover:opacity-100"
                    href="https://drive.google.com/file/d/1kpqR3N1diPjQYoEa8c_eWq8E6Pt9ivV2/view?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open video on Google Drive
                  </a>

                  {/* Google Drive video embed */}
                  <div className="rounded-xl ring-1 ring-white/10 overflow-hidden bg-white/5">
                    <div style={{ position: "relative", paddingTop: "56.25%" /* 16:9 */ }}>
                      <iframe
                        src="https://drive.google.com/file/d/1kpqR3N1diPjQYoEa8c_eWq8E6Pt9ivV2/preview"
                        title="Music demo — Google Drive"
                        loading="lazy"
                        allow="autoplay"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          border: 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Audio snippet list */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Random Snippets</h3>

                    {/* Scrollable list with simple prev/next controls */}
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        type="button"
                        className="rounded bg-white/6 px-2 py-1 text-sm"
                        onClick={() => {
                          // focus first
                          const first = itemRefs.current[AUDIO_SNIPPETS[0].id];
                          first?.focus();
                        }}
                      >
                        First
                      </button>
                      <button
                        type="button"
                        className="rounded bg-white/6 px-2 py-1 text-sm"
                        onClick={() => {
                          // focus last
                          const last = itemRefs.current[AUDIO_SNIPPETS[AUDIO_SNIPPETS.length - 1].id];
                          last?.focus();
                        }}
                      >
                        Last
                      </button>
                      <div className="text-xs opacity-80">Use Tab / Shift+Tab to navigate, Enter to toggle play.</div>
                    </div>

                    <div className="space-y-3 pr-2">
                      <ul className="space-y-3">
                        {AUDIO_SNIPPETS.map((a, idx) => {
                          const src = a.url ?? driveDl(a.id);
                          return (
                            <li
                              key={a.id}
                              ref={(el) => { itemRefs.current[a.id] = el; }}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  // find a button inside and click it
                                  const btn = (e.currentTarget as HTMLElement).querySelector("button");
                                  if (btn) {
                                    (btn as HTMLButtonElement).click();
                                  }
                                }
                                if (e.key === "ArrowDown") {
                                  const next = AUDIO_SNIPPETS[Math.min(AUDIO_SNIPPETS.length - 1, idx + 1)];
                                  itemRefs.current[next.id]?.focus();
                                }
                                if (e.key === "ArrowUp") {
                                  const prev = AUDIO_SNIPPETS[Math.max(0, idx - 1)];
                                  itemRefs.current[prev.id]?.focus();
                                }
                              }}
                              className="space-y-1 outline-none focus:ring-2 focus:ring-white/20 rounded-md p-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{a.title}</div>
                                <a href={src} target="_blank" rel="noreferrer" className="text-xs opacity-80 underline">Open</a>
                              </div>
                              <AudioPlayer src={src} />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Helper chip */}
      <div className="fixed left-4 bottom-4 z-20 rounded-full bg-black/60 backdrop-blur px-4 py-2 text-sm ring-1 ring-white/10">
        Move with WASD • Shift to sprint • M toggles minimap
      </div>

      <footer className="pointer-events-auto absolute bottom-8 right-3 z-10 text-xs opacity-60">
        © {new Date().getFullYear()} dting.dev — Built as a tiny game.
      </footer>
    </div>
  );
}
