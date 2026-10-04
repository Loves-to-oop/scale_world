"""
build.py -- make scale_world.html: one file, opens by double-click, desktop or VR.

    python3 build.py

three.js is inlined (Chrome blocks module imports from file:// pages): its one
export statement becomes `const THREE = {...}`, then scene.js follows.
"""

import re
from pathlib import Path

HERE = Path(__file__).parent
three = (HERE / "three.module.js").read_text(encoding="utf-8")
m = re.search(r"^export \{(.*?)\};\s*$", three, re.M | re.S)
three = three[:m.start()] + "const THREE = {" + ", ".join(
    n.strip() for n in m.group(1).split(",") if n.strip()) + "};\n"

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ten million times bigger</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#9cc4d8;
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #intro{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    background:rgba(10,30,45,.55);transition:opacity .6s;z-index:3}
  #intro.gone{opacity:0;pointer-events:none}
  .card{max-width:620px;background:rgba(245,250,252,.97);color:#16303d;border-radius:14px;
    padding:24px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{margin:0 0 6px;font:600 28px "Iowan Old Style",Palatino,Georgia,serif}
  table{border-collapse:collapse;margin:10px 0;font-size:14px}
  td{padding:2px 14px 2px 0} td:nth-child(2),td:nth-child(3){text-align:right}
  kbd{background:#e2edf2;border:1px solid #b9cfd9;border-radius:4px;padding:0 6px;font-size:13px}
  .dim{color:#5a7280;font-size:13px}
  #hud{position:fixed;left:14px;top:12px;z-index:2;background:rgba(10,30,45,.72);color:#e6f3f9;
    padding:10px 14px;border-radius:10px;font-size:13.5px;line-height:1.55;max-width:560px}
  #hud .k{background:rgba(255,255,255,.15);border-radius:4px;padding:0 5px;font-size:12px}
  #hud .dim{color:#a9c6d4;font-size:12.5px}
  #guide{position:fixed;right:14px;top:12px;z-index:2;background:rgba(10,30,45,.72);color:#e6f3f9;
    padding:10px 12px;border-radius:10px;font-size:13px;display:flex;flex-direction:column;gap:4px;min-width:170px}
  #guide button{all:unset;cursor:pointer;padding:3px 6px;border-radius:6px;display:flex;align-items:center;gap:8px}
  #guide button:hover{background:rgba(255,255,255,.15)}
  #guide i{width:10px;height:10px;border-radius:50%;display:inline-block}
  #vr{display:none;position:fixed;right:18px;bottom:18px;z-index:3;padding:12px 20px;
    font:600 15px -apple-system,sans-serif;border:0;border-radius:10px;background:#1d4e66;color:#fff;cursor:pointer}
</style></head><body>
<div id="intro"><div class="card">
  <h1>Ten million times bigger</h1>
  <p>Everything here is its real size multiplied by 10,000,000, so a nanometre becomes a
  centimetre and an atom becomes a grain of sand.</p>
  <table>
    <tr><td>water molecule</td><td>0.28 nm</td><td>2.8 mm</td></tr>
    <tr><td>DNA</td><td>2 nm wide</td><td>2 cm</td></tr>
    <tr><td>ribosome</td><td>21 nm</td><td>21 cm</td></tr>
    <tr><td>virus</td><td>100 nm</td><td>1 m</td></tr>
    <tr><td><b>you</b></td><td><b>170 nm</b></td><td><b>1.7 m</b></td></tr>
    <tr><td>E. coli bacterium</td><td>2 µm</td><td>20 m</td></tr>
    <tr><td>animal cell</td><td>20 µm</td><td>200 m</td></tr>
    <tr><td>human hair</td><td>80 µm</td><td>800 m</td></tr>
  </table>
  <p>Time matters too: water molecules jostle in <b>picoseconds</b>, bacteria swim in
  <b>milliseconds</b>. Press <kbd>[</kbd> <kbd>]</kbd> to slow or speed time; every motion uses
  its measured rate.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp;·&nbsp; drag to look &nbsp;·&nbsp;
  <kbd>space</kbd> up, <kbd>C</kbd> down (jetpack) &nbsp;·&nbsp; <kbd>F</kbd> jetpack / walk &nbsp;·&nbsp;
  <kbd>−</kbd><kbd>=</kbd> or scroll: speed &nbsp;·&nbsp; <kbd>shift</kbd> faster</p>
  <p>Time presets: <kbd>0</kbd> light (1 fs per second) &nbsp;·&nbsp; <kbd>1</kbd> water (1 ps per second) &nbsp;·&nbsp; <kbd>2</kbd> bacteria (1 ms) &nbsp;·&nbsp;
  <kbd>3</kbd> motor proteins and muscle (10 ms) &nbsp;·&nbsp; <kbd>N</kbd> fire the nerve</p>
  <p class="dim">One thing is impossible on purpose: visible light's wavelength (400–700 nm) would be
  4–7 m here, far larger than molecules, so you could not actually see them. It is drawn as if you could.</p>
  <p class="dim">click anywhere, or press any key, to begin</p>
</div></div>
<div id="hud"></div>
<div id="guide"></div>
<button id="vr">Enter VR</button>
<script type="module">
__THREE__
__SCENE__
</script></body></html>
"""

out = HERE / "scale_world.html"
out.write_text(PAGE.replace("__THREE__", three)
                   .replace("__SCENE__", (HERE / "scene.js").read_text(encoding="utf-8")),
               encoding="utf-8")
print(f"  wrote {out.name}, {out.stat().st_size // 1024} KB")
