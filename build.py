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

# ---- the second page: the solar system with the Earth as a 12-inch globe -------------------------
import base64
img = lambda f: "data:image/jpeg;base64," + base64.b64encode((HERE / "textures" / f).read_bytes()).decode()
SOLAR = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The solar system on a desk</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#9ec9ec;
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #intro{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    background:rgba(10,30,45,.55);transition:opacity .6s;z-index:3}
  #intro.gone{opacity:0;pointer-events:none}
  .card{max-width:640px;background:rgba(245,250,252,.97);color:#16303d;border-radius:14px;
    padding:24px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{margin:0 0 6px;font:600 28px "Iowan Old Style",Palatino,Georgia,serif}
  table{border-collapse:collapse;margin:10px 0;font-size:14px}
  td{padding:2px 14px 2px 0} td:nth-child(2),td:nth-child(3){text-align:right}
  kbd{background:#e2edf2;border:1px solid #b9cfd9;border-radius:4px;padding:0 6px;font-size:13px}
  .dim{color:#5a7280;font-size:13px}
  #hud{position:fixed;left:14px;top:12px;z-index:2;background:rgba(10,30,45,.72);color:#e6f3f9;
    padding:10px 14px;border-radius:10px;font-size:13.5px;line-height:1.55;max-width:620px}
  #hud .k{background:rgba(255,255,255,.15);border-radius:4px;padding:0 5px;font-size:12px}
  #hud .dim{color:#a9c6d4;font-size:12.5px}
  #guide{position:fixed;right:14px;top:12px;z-index:2;background:rgba(10,30,45,.72);color:#e6f3f9;
    padding:10px 12px;border-radius:10px;font-size:13px;display:flex;flex-direction:column;gap:3px;min-width:190px}
  #guide .row{display:flex;justify-content:space-between;gap:6px}
  #guide button{all:unset;cursor:pointer;padding:3px 6px;border-radius:6px;display:flex;align-items:center;gap:8px}
  #guide button:hover{background:rgba(255,255,255,.15)}
  #guide button.drive{font-size:12px;color:#ffe9a8}
  #guide i{width:10px;height:10px;border-radius:50%;display:inline-block}
  #vr{display:none;position:fixed;right:18px;bottom:18px;z-index:3;padding:12px 20px;
    font:600 15px -apple-system,sans-serif;border:0;border-radius:10px;background:#1d4e66;color:#fff;cursor:pointer}
</style></head><body>
<div id="intro"><div class="card">
  <h1>The solar system on a desk</h1>
  <p>The Earth is a 12-inch desk globe. Everything else is at its real size and real distance for that
  scale, 1 : 41.8 million, and where it really is in its orbit today.</p>
  <table>
    <tr><td>the Moon</td><td>8.3 cm</td><td>9.2 m away</td></tr>
    <tr><td>the Space Station</td><td></td><td>1 cm above the globe</td></tr>
    <tr><td>the Sun</td><td>33 m</td><td>3.6 km away</td></tr>
    <tr><td>Mars</td><td>16 cm</td><td>1&ndash;9 km</td></tr>
    <tr><td>Jupiter</td><td>3.3 m</td><td>~20 km</td></tr>
    <tr><td>Neptune</td><td>1.2 m</td><td>~105 km</td></tr>
    <tr><td>the speed of light</td><td></td><td><b>7.2 m/s</b></td></tr>
  </table>
  <p>The ground is the plane of the Earth's orbit. Next to the desk an interstate has an exit for
  every planet; each road climbs or dips by how far that planet is above or below the plane today.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;·&nbsp; drag to look &nbsp;·&nbsp; scroll: speed &nbsp;·&nbsp;
  <kbd>F</kbd> jetpack &nbsp;·&nbsp; <kbd>1</kbd>&ndash;<kbd>9</kbd> drive to the Sun or a planet &nbsp;·&nbsp; in the car <kbd>W</kbd>/<kbd>S</kbd> faster / slower, <kbd>E</kbd> out</p>
  <p class="dim">click anywhere, or press any key, to begin</p>
</div></div>
<div id="hud"></div>
<div id="guide"></div>
<button id="vr">Enter VR</button>
<script type="module">
__THREE__
const EARTH_JPG = "__EARTH__", MOON_JPG = "__MOON__";
__SCENE__
</script></body></html>
"""
out2 = HERE / "solar_system.html"
out2.write_text(SOLAR.replace("__THREE__", three).replace("__EARTH__", img("earth.jpg")).replace("__MOON__", img("moon.jpg"))
                     .replace("__SCENE__", (HERE / "solar.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out2.name}, {out2.stat().st_size // 1024} KB")


# ---- the third page: falling beside the Galileo probe into Jupiter ------------------------------
GAL = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Into Jupiter with the Galileo probe</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#c8b89a;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #intro{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,15,10,.55);transition:opacity .6s;z-index:3}
  #intro.gone{opacity:0;pointer-events:none}
  .card{max-width:620px;background:rgba(250,246,238,.97);color:#2b2418;border-radius:14px;padding:24px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{margin:0 0 6px;font:600 28px "Iowan Old Style",Palatino,Georgia,serif}
  kbd{background:#efe6d6;border:1px solid #d4c4a6;border-radius:4px;padding:0 6px;font-size:13px}
  .dim{color:#7a6a50;font-size:13px}
  #vr{display:none;position:fixed;right:18px;bottom:18px;z-index:3;padding:12px 20px;font:600 15px -apple-system,sans-serif;border:0;border-radius:10px;background:#7a4a1e;color:#fff;cursor:pointer}
</style></head><body>
<div id="intro"><div class="card">
  <h1>Into Jupiter with the Galileo probe</h1>
  <p>7 December 1995. You are falling beside NASA's Galileo probe, 1.5 metres (5 feet) away, under its parachute,
  from the moment it opened until the probe's signal stopped 58 minutes later, 140 km deeper, at 22 times Earth's
  air pressure and 152 &deg;C. It runs in real time; speed it up to see the whole fall.</p>
  <p>The probe carried no camera. What you see is rebuilt from what it measured: the pressure, temperature and
  falling speed, the winds, the thin cloud layers it passed, the fading sunlight, and the radio static of distant lightning.</p>
  <p><kbd>[</kbd> <kbd>]</kbd> time &times;1 to &times;300 &nbsp;&middot;&nbsp; <kbd>space</kbd> pause &nbsp;&middot;&nbsp; <kbd>R</kbd> restart &nbsp;&middot;&nbsp;
  <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move round the probe &nbsp;&middot;&nbsp; drag to look<br>
  In VR: sticks move and turn &nbsp;&middot;&nbsp; <b>A</b>/<b>B</b> time slower/faster &nbsp;&middot;&nbsp; <b>X</b> restart</p>
  <p class="dim">click anywhere, or press any key, to begin</p>
</div></div>
<button id="vr">Enter VR</button>
<script type="module">
__THREE__
__SCENE__
</script></body></html>
"""
out3 = HERE / "galileo_probe.html"
out3.write_text(GAL.replace("__THREE__", three).replace("__SCENE__", (HERE / "galileo.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out3.name}, {out3.stat().st_size // 1024} KB")


# ---- the fourth page: falling into the Great Red Spot -------------------------------------------
GRS = GAL.replace("<title>Into Jupiter with the Galileo probe</title>", "<title>Into the Great Red Spot</title>")
i0, i1 = GRS.index('<div id="intro">'), GRS.index('<button id="vr">')
GRS = GRS[:i0] + """<div id="intro"><div class="card">
  <h1>Into the Great Red Spot</h1>
  <p>You start 12,000 km above Jupiter's Great Red Spot, a storm wider than the Earth, and fall into its calm centre:
  through the red haze, then the white-out of the ammonia cloud, the ammonium hydrosulfide and water cloud decks,
  and down to its roots, about 300 km below the cloud tops, at ~175 times Earth's air pressure and over 500 &deg;C.
  Your parachute opens at the top of the atmosphere.</p>
  <p>Nothing has ever gone into the spot. This is rebuilt from telescope and spacecraft images, Juno's microwave
  and gravity data, and the physics of the light and air. The approach from space is slowed so you can look.</p>
  <p><kbd>[</kbd> <kbd>]</kbd> time &times;1 to &times;1000 &nbsp;&middot;&nbsp; <kbd>space</kbd> pause &nbsp;&middot;&nbsp; <kbd>R</kbd> restart &nbsp;&middot;&nbsp;
  drag to look (start by looking down) &nbsp;&middot;&nbsp; <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move<br>
  In VR: look down &nbsp;&middot;&nbsp; sticks move and turn &nbsp;&middot;&nbsp; <b>A</b>/<b>B</b> time slower/faster &nbsp;&middot;&nbsp; <b>X</b> restart</p>
  <p class="dim">click anywhere, or press any key, to begin</p>
</div></div>
""" + GRS[i1:]
out4 = HERE / "great_red_spot.html"
out4.write_text(GRS.replace("__THREE__", three).replace("__SCENE__", (HERE / "grs.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out4.name}, {out4.stat().st_size // 1024} KB")


# ---- the fifth page: a day in Çatalhöyük ---------------------------------------------------------
CAT = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A day in Çatalhöyük, 7000 BC</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#c8d4d8;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #intro{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,22,12,.55);transition:opacity .6s;z-index:3}
  #intro.gone{opacity:0;pointer-events:none}
  .card{max-width:640px;background:rgba(250,244,232,.97);color:#2b2214;border-radius:14px;padding:24px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{margin:0 0 6px;font:600 28px "Iowan Old Style",Palatino,Georgia,serif}
  kbd{background:#efe2cc;border:1px solid #d4c0a0;border-radius:4px;padding:0 6px;font-size:13px}
  .dim{color:#7a6a50;font-size:13px}
  #vr{display:none;position:fixed;right:18px;bottom:18px;z-index:3;padding:12px 20px;font:600 15px -apple-system,sans-serif;border:0;border-radius:10px;background:#7a5a2e;color:#fff;cursor:pointer}
</style></head><body>
<div id="intro"><div class="card">
  <h1>A day in Çatalhöyük</h1>
  <p>Central Anatolia, about 7000 BC. You live in one of the world's first large towns: several thousand people in
  mud-brick houses packed wall to wall, with no streets. You walk across the roofs, and climb down a ladder through
  a hole in the roof to get into a house.</p>
  <p>Do your chores, talk to your neighbours, and climb into any house: white plastered rooms with ovens, red
  paintings, aurochs horns on the walls, and the family's dead buried under the sleeping platforms.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>shift</kbd> run &nbsp;&middot;&nbsp;
  <kbd>E</kbd> act, talk, climb in or out at a roof hatch<br>
  In VR: left stick walk, right stick turn, trigger run, <b>A</b> to act</p>
  <p class="dim">The town plan and the land around it are generated, at the real size and density (add ?seed=2 for another).
  The houses, their insides, the crafts and the landscape follow the excavations. Click to begin.</p>
</div></div>
<button id="vr">Enter VR</button>
<script type="module">
__THREE__
__SCENE__
</script></body></html>
"""
out5 = HERE / "catalhoyuk.html"
out5.write_text(CAT.replace("__THREE__", three).replace("__SCENE__", (HERE / "catal.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out5.name}, {out5.stat().st_size // 1024} KB")
