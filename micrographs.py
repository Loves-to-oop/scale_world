"""
micrographs.py -- the museum photographed as if it were really on a slide, at its true size,
through a light microscope, a scanning electron microscope and a transmission electron
microscope, at several magnifications.

    python3 micrographs.py                 render every shot -> micrographs/*.jpg
    python3 micrographs.py 05 06           only shots whose names start with these
    python3 micrographs.py --reprocess     re-run the processing on the saved raw renders
                                           (micrographs/raw/, not committed), no Chrome

Each shot renders the scene (capture mode in scene.js, via headless Chrome) and then
processes the image the way each instrument forms one:
  light microscope  colour, blurred to its real resolution limit d = 0.61 λ / NA
  SEM               secondary-electron contrast: yield rises as 1/cos(tilt of the surface),
                    so slopes and edges glow; greyscale, shot noise, ~2 nm resolution
  TEM               a 70 nm thin section (70 cm at ×10⁷): stacked surfaces darken like
                    electron density; or negative stain, particles bright in dark stain
Field widths are real; every image gets a scale bar and an instrument data bar.
"""

import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
OUT = HERE / "micrographs"
RAW = OUT / "raw"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
S = 1e7                                   # the museum's magnification over reality
PX = 1600

# the walk-in cell where the section cuts it (y = 20 m): membrane and nucleus, centre x, z and radius,
# museum metres, from scene.js. The renderer draws only surfaces, so the processing fills the
# insides the way they section: cytoplasm full of ribosomes, nucleus full of chromatin.
CELL = dict(cell=(160, -470, 108), nucleus=(178, -470, 30 * (1 - (4 / 18) ** 2) ** 0.5))
RIBOSOMES_PER_UM2 = 300          # ~10 million ribosomes in ~2000 µm³ of cytoplasm, times a 70 nm section

# name, mode, box (x0, x1, z0, z1 in museum metres), extra params, instrument settings
SHOTS = [
    ("01_light_100x", "lm", (-1100, 1100, -1600, 600), {}, dict(mag="100×", na=0.25, lam=550e-9,
        line="Light microscope · bright field · 10× objective (NA 0.25)")),
    ("02_light_400x", "lm", (-280, 280, -560, 0), {}, dict(mag="400×", na=0.65, lam=550e-9,
        line="Light microscope · bright field · 40× objective (NA 0.65)")),
    ("03_light_1000x_oil", "lm", (-10, 250, -330, -70), {}, dict(mag="1000×", na=1.4, lam=550e-9,
        line="Light microscope · bright field · 100× oil immersion (NA 1.4)")),
    ("04_light_1000x_digital_zoom", "lm", (138, 203, -208, -143), {}, dict(mag="4000×", na=1.4, lam=550e-9,
        line="Light microscope · 100× oil · 4× more: 'empty magnification'")),
    ("05_SEM_500x", "sem", (-160, 200, -260, 60), {"tilt": 30}, dict(mag="×500", res=5e-9, kv="5.0 kV", wd="9.8 mm")),
    ("06_SEM_5000x", "sem", (12, 48, -168, -132), {"tilt": 30}, dict(mag="×5,000", res=3e-9, kv="5.0 kV", wd="6.2 mm")),
    ("07_SEM_36000x", "sem", (33.35, 38.35, -156.73, -151.73), {"tilt": 30}, dict(mag="×36,000", res=1.5e-9, kv="3.0 kV", wd="4.1 mm")),
    ("08_TEM_section_cell_4000x", "tem", (55, 265, -575, -365), {"y0": 19.6, "y1": 20.3, "op": 0.5},
        dict(mag="×4,000", line="TEM · thin section, 70 nm · through the walk-in cell", kind="section", cell=CELL)),
    ("09_TEM_section_nucleus_25000x", "tem", (128, 162, -490, -456), {"y0": 19.6, "y1": 20.3, "op": 0.5},
        dict(mag="×25,000", line="TEM · thin section, 70 nm · nuclear envelope, ER and ribosomes", kind="section", cell=CELL)),
    ("10_TEM_negative_stain_viruses", "tem", (-30, -2, -110, -82), {"op": 0.09, "bare": 1},
        dict(mag="×40,000", line="TEM · negative stain (uranyl acetate) · the virus hall, whole mount", kind="negstain")),
]


def font(n):
    for f in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/SFNS.ttf"]:
        try:
            return ImageFont.truetype(f, n)
        except OSError:
            pass
    return ImageFont.load_default()


def nice_bar(field_m):
    """a round scale-bar length near a fifth of the field, and its label"""
    target = field_m / 5
    for unit, k in (("mm", 1e-3), ("µm", 1e-6), ("nm", 1e-9)):
        if target >= k:
            for v in (500, 200, 100, 50, 20, 10, 5, 2, 1):
                if v * k <= target:
                    return v * k, f"{v} {unit}"
    return target, "?"


def bar_and_databar(img, field_m, text, dark_bar=True):
    """burn in a scale bar and an instrument data strip, like a real micrograph"""
    W, H = img.size
    strip = 70
    out = Image.new("RGB", (W, H + strip), (0, 0, 0))
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    L, lab = nice_bar(field_m)
    Lpx = int(L / field_m * W)
    x0, y0 = W - Lpx - 40, H + 22
    d.rectangle([x0, y0, x0 + Lpx, y0 + 10], fill=(255, 255, 255))
    d.text((x0 + Lpx / 2, y0 + 16), lab, fill=(255, 255, 255), font=font(24), anchor="mt")
    d.text((24, H + 18), text, fill=(235, 235, 235), font=font(24))
    return out


def light_microscope(img, field_m, s):
    a = np.asarray(img).astype(float) / 255
    a = 0.35 + 0.65 * a                                       # bright field: light through the specimen, never black
    gray = a.mean(axis=2, keepdims=True)
    a = gray + 0.6 * (a - gray)                               # stained tissue, weak colour
    im = Image.fromarray((a.clip(0, 1) * 255).astype(np.uint8))
    d = 0.61 * s["lam"] / s["na"]                             # Rayleigh resolution, m
    sigma = 0.36 * (d / field_m * PX)                         # Airy disc FWHM ≈ 0.84 d, so σ = FWHM / 2.355 ≈ 0.36 d
    if sigma > 0.4:
        im = im.filter(ImageFilter.GaussianBlur(sigma))
    y, x = np.mgrid[0:PX, 0:PX] / PX - 0.5                    # circular field stop and vignette
    r = np.hypot(x, y)
    v = np.clip(1.25 - 1.3 * r, 0, 1)[..., None] * (r < 0.5)[..., None]
    a = np.asarray(im).astype(float) * v + np.random.normal(0, 2.5, (PX, PX, 3))
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    text = f"{s['line']}   ·   {s['mag']}   ·   resolution ≈ {d * 1e9:.0f} nm   ·   field {field_m * 1e6:.0f} µm"
    return bar_and_databar(im, field_m, text)


def sem(img, field_m, s):
    n = np.asarray(img).astype(float) / 255 * 2 - 1           # view-space normals
    nz = np.clip(n[..., 2], 0.08, 1)
    bg = (np.abs(n[..., 0]) < 0.01) & (np.abs(n[..., 1]) < 0.01) & (n[..., 2] > 0.99)
    y = 0.30 + 0.55 * (1 - nz) ** 0.8                         # secondary-electron yield climbs as surfaces tilt away (∝ 1/cos θ)
    y = y + 0.12 * n[..., 1]                                  # Everhart-Thornley detector above: faces turned to it a bit brighter
    lap = np.abs(np.asarray(Image.fromarray((nz * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)).astype(float) / 255)
    y = np.clip(y + 0.5 * lap, 0, 1)                          # edge effect: rims glow
    y[bg] = 0.06                                              # nothing there: no electrons back
    m = Image.fromarray((bg * 255).astype(np.uint8))          # empty background is only real where it reaches the
    for t in range(0, PX, 20):                                # edge of the frame; enclosed patches are gaps in a mesh
        for xy in ((t, 0), (t, PX - 1), (0, t), (PX - 1, t)):
            if m.getpixel(xy) == 255:
                ImageDraw.floodfill(m, xy, 128)
    hole = (np.asarray(img).astype(int).sum(axis=2) < 40) | (np.asarray(m) == 255)   # fill these from around them
    if hole.any():
        k = ImageFilter.GaussianBlur(20)
        num = np.asarray(Image.fromarray(((y * ~hole) * 255).astype(np.uint8)).filter(k)).astype(float)
        den = np.asarray(Image.fromarray((~hole * 255).astype(np.uint8)).filter(k)).astype(float)
        y[hole] = (num / np.maximum(den, 1))[hole]
    y = y + np.random.normal(0, 0.035, y.shape)               # shot noise
    im = Image.fromarray((y.clip(0, 1) * 255).astype(np.uint8)).convert("RGB")
    sigma = s["res"] / field_m * PX / 2.355
    if sigma > 0.4:
        im = im.filter(ImageFilter.GaussianBlur(sigma))
    text = f"SEM   SE   {s['kv']}   WD {s['wd']}   {s['mag']}   field {field_m * 1e6:.2f} µm" if field_m < 1e-5 else \
           f"SEM   SE   {s['kv']}   WD {s['wd']}   {s['mag']}   field {field_m * 1e6:.0f} µm"
    return bar_and_databar(im, field_m, text)


def blob_noise(sigma_px, rng):
    """smooth random field, mean 0 and spread 1, with features about sigma_px across"""
    n = int(np.clip(PX / sigma_px / 2, 4, PX))                # a coarse random grid, smoothly enlarged
    f = Image.fromarray(rng.standard_normal((n, n)).astype(np.float32)).resize((PX, PX), Image.BICUBIC)
    f = np.asarray(f).astype(float)
    return (f - f.mean()) / (f.std() + 1e-9)


def section_fill(field_m, box, c):
    """transmission (1 = clear) of what fills the cell in a 70 nm slice: grainy cytoplasm with
    ribosomes as dark 25 nm dots, chromatin clumped in the nucleus and packed under its envelope"""
    rng = np.random.default_rng(7)
    m = (box[1] - box[0]) / PX                                # museum metres per pixel
    yy, xx = np.mgrid[0:PX, 0:PX] * m
    xx, yy = xx + box[0], yy + box[2]                         # image top is the box's z0 (camera up = -z)
    um = 1e-6 * S / m                                         # pixels per real micrometre
    rc = np.hypot(xx - c["cell"][0], yy - c["cell"][1]) / c["cell"][2]
    rn = np.hypot(xx - c["nucleus"][0], yy - c["nucleus"][1]) / c["nucleus"][2]
    cyto, nuc = (rc < 1) & (rn >= 1), rn < 1
    t = np.ones((PX, PX))
    t[cyto] = 0.80 + 0.04 * blob_noise(max(0.01 * um, 0.6), rng)[cyto]           # the protein soup, grainy at ~10 nm
    clump = np.tanh(1.5 * blob_noise(0.05 * um, rng))                             # chromatin clumps ~0.1-0.2 µm, sharp-edged
    dark = np.clip(0.55 + 0.3 * clump, 0, 1) + 0.35 * np.clip((rn - 0.93) / 0.07, 0, 1)   # heterochromatin under the envelope
    t[nuc] = (0.80 - 0.32 * np.clip(dark, 0, 1))[nuc]
    # ribosomes: dark dots at the real density in the cytoplasm (the scene's own are hidden points)
    area_um2 = cyto.sum() / um ** 2
    n = rng.poisson(RIBOSOMES_PER_UM2 * area_um2)
    ys, xs = np.nonzero(cyto)
    pick = rng.integers(0, len(xs), n) if len(xs) else []
    dots = Image.new("L", (PX, PX), 0)
    d = ImageDraw.Draw(dots)
    r = max(0.0125 * um, 0.7)                                 # 25 nm across
    for i in pick:
        d.ellipse([xs[i] - r, ys[i] - r, xs[i] + r, ys[i] + r], fill=255)
    t = t * (1 - 0.45 * np.asarray(dots).astype(float) / 255)
    t[np.abs(rc - 1) * c["cell"][2] < max(0.008e-6 * S, 1.5 * m)] *= 0.35          # the plasma membrane, 8 nm
    return t


def tem(img, field_m, s):
    a = np.asarray(img.convert("L")).astype(float) / 255     # 1 = clear, 0 = dense
    if s["kind"] == "negstain":
        dense = 1 - a                                         # where the particles are thick
        dense = np.clip(dense - np.median(dense), 0, 1)          # the empty grid (a faint hall floor) is the zero
        dense = np.clip(dense / max(np.percentile(dense, 99.7), 1e-3), 0, 1) ** 0.7
        stain = 0.32 + 0.5 * dense                            # stain is excluded by particles: they read bright
        edge = np.asarray(Image.fromarray((dense * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)).astype(float) / 255
        y = stain - 0.35 * np.clip(edge * 3, 0, 1)            # stain pools at the particle rims
        y[dense < 0.02] = 0.30
    else:
        y = 0.88 * a ** 1.4 + 0.06                            # osmium/lead staining: membranes dark
        if "cell" in s:
            y = y * section_fill(field_m, s["box"], s["cell"])
    y = Image.fromarray((np.clip(y, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    y = np.asarray(y).astype(float) / 255 + np.random.normal(0, 0.03, (PX, PX))
    im = Image.fromarray((y.clip(0, 1) * 255).astype(np.uint8)).convert("RGB")
    text = f"{s['line']}   ·   80 kV   ·   {s['mag']}   ·   field {field_m * 1e6:.2f} µm"
    return bar_and_databar(im, field_m, text)


def process(name, mode, box, inst, raw):
    field = (box[1] - box[0]) / S
    img = {"lm": light_microscope, "sem": sem, "tem": tem}[mode](raw, field, dict(inst, box=box))
    img.save(OUT / f"{name}.jpg", quality=92)
    print(f"  {name}: field {field * 1e6:.2f} µm")


def main():
    args = sys.argv[1:]
    shots = [sh for sh in SHOTS if not [a for a in args if not a.startswith("-")]
             or any(sh[0].startswith(a) for a in args if not a.startswith("-"))]
    RAW.mkdir(parents=True, exist_ok=True)
    if "--reprocess" in args:
        for name, mode, box, extra, inst in shots:
            if (RAW / f"{name}.png").exists():
                process(name, mode, box, inst, Image.open(RAW / f"{name}.png").convert("RGB"))
        return
    subprocess.run(["python3", "build.py"], cwd=HERE, check=True)
    got = {}

    class H(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(HERE), **k)

        def log_message(self, *a):
            pass

        def do_POST(self):
            got["png"] = self.rfile.read(int(self.headers["Content-Length"]))
            self.send_response(204); self.end_headers()

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    for name, mode, box, extra, inst in shots:
        q = f"cap=1&shot=1&mode={mode}&box={','.join(map(str, box))}&px={PX}&wait=5000" + \
            "".join(f"&{k}={v}" for k, v in extra.items())
        got.clear()
        with tempfile.TemporaryDirectory() as prof:
            ch = subprocess.Popen([CHROME, "--headless=new", f"--user-data-dir={prof}", "--use-angle=swiftshader",
                                   "--enable-unsafe-swiftshader", f"--window-size={PX},{PX}",
                                   f"http://127.0.0.1:{port}/scale_world.html?{q}"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            t0 = time.time()
            while "png" not in got and time.time() - t0 < 240:
                time.sleep(0.5)
            ch.terminate(); ch.wait()
        if "png" not in got:
            print(f"  {name}: no image (timed out)"); continue
        (RAW / f"{name}.png").write_bytes(got["png"])
        process(name, mode, box, inst, Image.open(RAW / f"{name}.png").convert("RGB"))
    srv.shutdown()


if __name__ == "__main__":
    main()
