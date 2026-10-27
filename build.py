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


# ---- the sixth page: baseball on the Moon --------------------------------------------------------
MOON = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>Baseball on the Moon</title>").replace("background:#c8d4d8", "background:#05070c")
i0, i1 = MOON.index('<div id="intro">'), MOON.index('<button id="vr">')
MOON = MOON[:i0] + """<div id="intro"><div class="card">
  <h1>Baseball on the Moon</h1>
  <p>Tranquility Dome: a pressurised stadium under a glass dome 440 m across, with the grey Moon outside and the
  Earth in the black sky. Tonight the Shackleton Shadows visit the Tranquility Tides. You are in the stands.</p>
  <p>The Lunar League's answer to low gravity: a ball six times heavier (870 g), so it weighs on the Moon exactly what
  a baseball weighs on Earth. Its extra inertia means slower pitches (~70 mph), and it would barely leave a normal
  bat, so the league swings bats with twice the hitting mass. Every pitch and hit is computed: lunar gravity, the
  dome's air, the bat-ball collision. Fly balls hang for ten seconds or more, fielders leap three metres, runners lope.</p>
  <p><kbd>1</kbd>&ndash;<kbd>4</kbd> change seat &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>[</kbd> <kbd>]</kbd> game speed &nbsp;&middot;&nbsp; <kbd>space</kbd> pause<br>
  In VR: look around from your seat &nbsp;&middot;&nbsp; <b>X</b>/<b>Y</b> change seat &nbsp;&middot;&nbsp; <b>A</b>/<b>B</b> game speed &nbsp;&middot;&nbsp; right stick turn</p>
  <p class="dim">click anywhere, or press any key, to begin</p>
</div></div>
""" + MOON[i1:]
MOON = MOON.replace("__SCENE__", 'const EARTH_JPG = "__EARTH__";\n__SCENE__')
out6 = HERE / "moon_baseball.html"
out6.write_text(MOON.replace("__THREE__", three).replace("__EARTH__", img("earth.jpg")).replace("__SCENE__", (HERE / "moonball.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out6.name}, {out6.stat().st_size // 1024} KB")


# ---- the seventh page: President of the United States --------------------------------------------
PRES = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>Mr. or Madam President</title>").replace("background:#c8d4d8", "background:#9ec4e8")
i0, i1 = PRES.index('<div id="intro">'), PRES.index('<button id="vr">')
PRES = PRES[:i0] + """<div id="intro"><div class="card">
  <h1>President of the United States</h1>
  <p>Four years (eight, if re-elected) as President, one representative day each month. Walk the White House:
  the Oval Office, the Cabinet Room, the Situation Room, the Press Briefing Room, the Rose Garden. Take Marine One,
  the motorcade and Air Force One to the Capitol, Camp David, the United Nations, and towns across the country.</p>
  <p>Every day starts with the President's Daily Brief. Then the decisions come, each in the room where it would really
  happen: bills to sign or veto, budget deadlines, court vacancies, strikes, storms, hostages, calls from foreign leaders,
  press questions. They move your approval, your standing with Congress, the economy, the world, and the nation's security.
  The issues are fictional and nonpartisan; the facts about the job are real.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>shift</kbd> run &nbsp;&middot;&nbsp; <kbd>E</kbd> act &nbsp;&middot;&nbsp; <kbd>1</kbd>&ndash;<kbd>4</kbd> or click to choose<br>
  In VR: left stick walk (and choose in menus), right stick turn, <b>A</b> act / select</p>
  <p class="dim">Follow the gold marker to your next appointment. Click to begin.</p>
</div></div>
""" + PRES[i1:]
out7 = HERE / "president.html"
out7.write_text(PRES.replace("__THREE__", three).replace("__SCENE__", (HERE / "president.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out7.name}, {out7.stat().st_size // 1024} KB")


# ---- the eighth page: Cahokia, about 1100 CE --------------------------------------------------------
CAH = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>Cahokia, about 1100 CE</title>").replace("background:#c8d4d8", "background:#c8d6dc")
i0, i1 = CAH.index('<div id="intro">'), CAH.index('<button id="vr">')
CAH = CAH[:i0] + """<div id="intro"><div class="card">
  <h1>Cahokia, about 1100 CE</h1>
  <p>The largest city north of Mexico, at its height: perhaps 10,000&ndash;20,000 people in the American Bottom, the wide
  floodplain of the Mississippi across from today's St. Louis. Monks Mound rises 30 m over the Grand Plaza; a hundred more
  earthen mounds, thatched houses by the thousand, posts, plazas and fields spread across the plain.</p>
  <p>Everything is at its real size. Walk the Grand Plaza and climb Monks Mound; go west to the mound groups at East St. Louis
  and across the Mississippi at St. Louis, north to Horseshoe Lake, or east up the bluffs to the Emerald Acropolis, 20 km away.
  The land goes on past the map, generated as you travel.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>shift</kbd> run &nbsp;&middot;&nbsp;
  <kbd>&minus;</kbd> <kbd>=</kbd> or scroll: pace (up to very fast, for long trips) &nbsp;&middot;&nbsp; <kbd>F</kbd> fly &nbsp;&middot;&nbsp; <kbd>E</kbd> read about where you are &nbsp;&middot;&nbsp; <kbd>M</kbd> map<br>
  In VR: left stick walk, right stick turn, trigger run, <b>A</b> read, <b>B</b> pace, <b>X</b> travel to a place you have found, <b>Y</b> fly; the map is on your left wrist</p>
  <p class="dim">Mound positions and sizes, the plazas, Woodhenge, the waterways and the outlying centres follow archaeological maps and
  reports; houses and fields follow the excavated densities and house types, placed by a generator. Click to begin.</p>
</div></div>
""" + CAH[i1:]
out8 = HERE / "cahokia.html"
out8.write_text(CAH.replace("__THREE__", three).replace("__SCENE__", (HERE / "cahokia.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out8.name}, {out8.stat().st_size // 1024} KB")


# ---- the ninth page: a day in the Cambrian --------------------------------------------------------
CAMB = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>A day in the Cambrian</title>").replace("background:#c8d4d8", "background:#c8d0d4")
i0, i1 = CAMB.index('<div id="intro">'), CAMB.index('<button id="vr">')
CAMB = CAMB[:i0] + """<div id="intro"><div class="card">
  <h1>A day in the Cambrian</h1>
  <p>You are a biologist who has travelled back to one day in the Cambrian, __DATE__. You stand on bare land: there are no
  plants anywhere yet. The sea, just ahead, teems with the animals of the Cambrian explosion: trilobites and other arthropods,
  the great predator <i>Anomalocaris</i>, lobopodians, worms, sponges, comb jellies, and the first fish.</p>
  <p>You have scuba gear. Walk into the sea and dive; swim close to animals and press <kbd>E</kbd> to examine and log them in your
  field journal. Your wrist computer shows the date, the air (oxygen and CO₂), the tide, your depth and your air supply.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; in the sea you swim where you look, <kbd>space</kbd> up, <kbd>C</kbd> down &nbsp;&middot;&nbsp;
  <kbd>shift</kbd> faster &nbsp;&middot;&nbsp; <kbd>&minus;</kbd> <kbd>=</kbd> pace &nbsp;&middot;&nbsp; <kbd>E</kbd> examine &nbsp;&middot;&nbsp; <kbd>F</kbd> fly<br>
  In VR: left stick move, right stick turn (and up / down while swimming), trigger faster, <b>A</b> examine, <b>X</b> pace, <b>Y</b> fly; the computer is on your left wrist</p>
  <p class="dim">The world is generated without end (add ?seed=2 for another coast). The date, the air, the sky, the land and the animals follow
  the fossil record and the scientific literature; colours of the animals are unknown and shown in muted tones. Click to begin.</p>
</div></div>
""" + CAMB[i1:]
out9 = HERE / "cambrian.html"
out9.write_text(CAMB.replace("__DATE__", "about 518 million years ago").replace("__THREE__", three).replace("__SCENE__", (HERE / "cambrian.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out9.name}, {out9.stat().st_size // 1024} KB")


# ---- the tenth page: a day in the Devonian ------------------------------------------------------
DEV = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>A day in the Devonian</title>").replace("background:#c8d4d8", "background:#c8d6e0")
i0, i1 = DEV.index('<div id="intro">'), DEV.index('<button id="vr">')
DEV = DEV[:i0] + """<div id="intro"><div class="card">
  <h1>A day in the Devonian</h1>
  <p>You are a biologist who has travelled back about 380 million years, to the Late Devonian: the Age of Fishes. The first
  forests are rising along the rivers, Archaeopteris trees up to 25 m tall, though there are still no seeds, flowers or grass and no
  animals bigger than a scorpion on land. In the water: armoured placoderms, early sharks, lungfish, coelacanths, and the lobe-finned
  fishes on their way to becoming land animals, like Tiktaalik.</p>
  <p>You start on the shore of the Miguasha estuary (Quebec). Use 🌍 Travel (T) to go to the Gogo reef (Australia), the rivers of Tiktaalik
  (Arctic Canada), a Baltic delta (Latvia) or Scotland, or click anywhere on the map. Dive with your scuba gear; press <kbd>E</kbd> by any animal or
  plant to examine it. The wrist computer shows the air (oxygen ~18%), the date and time, your depth and your air.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; in the water you swim where you look, <kbd>space</kbd> up, <kbd>C</kbd> down &nbsp;&middot;&nbsp;
  <kbd>shift</kbd> faster &nbsp;&middot;&nbsp; <kbd>&minus;</kbd> <kbd>=</kbd> pace &nbsp;&middot;&nbsp; <kbd>E</kbd> examine &nbsp;&middot;&nbsp; <kbd>F</kbd> fly &nbsp;&middot;&nbsp; <kbd>T</kbd> travel<br>
  In VR: left stick move, right stick turn (and up / down while swimming), trigger faster, <b>A</b> examine, <b>X</b> pace, <b>Y</b> fly; the computer is on your left wrist</p>
  <p class="dim">The sites span about ±5 million years around 380 Ma, as noted on arrival. Plants, animals, air and climate follow the scientific literature;
  colours are unknown and are educated guesses, explained for each species. Click to begin.</p>
</div></div>
""" + DEV[i1:]
out10 = HERE / "devonian.html"
out10.write_text(DEV.replace("__THREE__", three).replace("__SCENE__", (HERE / "devonian.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out10.name}, {out10.stat().st_size // 1024} KB")


# ---- the eleventh page: a train journey, London to Rome, 1250 -----------------------------------
MT = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>London to Rome by train, 1250</title>").replace("background:#c8d4d8", "background:#c8d6dc")
i0, i1 = MT.index('<div id="intro">'), MT.index('<button id="vr">')
MT = MT[:i0] + """<div id="intro"><div class="card">
  <h1>London to Rome, summer 1250</h1>
  <p>A comfortable train (sleeping cars, a dining car, a lounge, and an observation car with an open platform at the back) travels
  from London to Rome in the year 1250. No one outside can see it. You see what they saw: Old St Paul's and London Bridge with its houses,
  pilgrims on the road to Canterbury, the Channel, Amiens Cathedral half built among cranes, Notre-Dame just finished and the new
  Sainte-Chapelle, the Champagne fair town of Troyes, Lyon where the pope is living, the Alps over the Mont Cenis pass, the tower houses
  of Tuscany, and Rome among its ruins.</p>
  <p>Walk through the cars; watch from the windows or the rear platform. Between the towns: villages, strip fields, haymaking, windmills,
  castles, monasteries, shepherds, carts and pilgrims, by region.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>&minus;</kbd> <kbd>=</kbd> train speed &nbsp;&middot;&nbsp; <kbd>N</kbd> next town &nbsp;&middot;&nbsp; <kbd>P</kbd> stop / go &nbsp;&middot;&nbsp;
  <kbd>E</kbd> sleep in a berth (until morning), or read the map in the lounge<br>
  In VR: left stick walk, right stick turn, <b>A</b> sleep / map, <b>B</b> faster, <b>X</b> slower, <b>Y</b> next town</p>
  <p class="dim">Landmarks stand where they stood and as they were in 1250 (built, half built, or not yet begun), from historians' accounts and Matthew Paris's
  itinerary map of about 1250. The countryside between is generated by region. Click to begin.</p>
</div></div>
""" + MT[i1:]
out11 = HERE / "medieval_train.html"
out11.write_text(MT.replace("__THREE__", three).replace("__SCENE__", (HERE / "medieval_train.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out11.name}, {out11.stat().st_size // 1024} KB")


# ---- the twelfth page: the time train, one year every second ------------------------------------
TT = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>The time train: one year a second</title>").replace("background:#c8d4d8", "background:#c8d6e0")
i0, i1 = TT.index('<div id="intro">'), TT.index('<button id="vr">')
TT = TT[:i0] + """<div id="intro"><div class="card">
  <h1>The time train</h1>
  <p>A comfortable long-distance train leaves the present and runs back through time at exactly <b>one year every second</b>. It covers 25 m of track a second,
  so the land beside the line is a timeline: each spot belongs to one year, with a sign at every year, boards for events, and the buildings, vehicles, people,
  plants, animals and ice of that year. Look back and you see the more recent past; look ahead, the older.</p>
  <p>The line follows a river valley like the Hudson. Going back: modern towns, the mid-century, steam and the rails' beginning in 1851 (before that, no rails),
  colonial farms and sloops, Henry Hudson in 1609, Lenape villages, the first farmers, Clovis hunters, mammoths and mastodons, the great ice sheet at its height
  20,000 years ago (six hours away), and at the end of the line, two years of travel away, the dinosaurs' last day.</p>
  <p>The itinerary on every car's front wall gives the arrival time of each stop at a year a second.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>N</kbd> jump to the next stop &nbsp;&middot;&nbsp; <kbd>P</kbd> pause &nbsp;&middot;&nbsp;
  <kbd>E</kbd> in a roomette berth: sleep eight hours (28,800 years)<br>
  In VR: left stick walk, right stick turn, <b>A</b> sleep / next stop info, <b>Y</b> jump to the next stop</p>
  <p class="dim">Events are real; the scenery is generated by era, more general the further back you go. Click to begin.</p>
</div></div>
""" + TT[i1:]
out12 = HERE / "time_train.html"
out12.write_text(TT.replace("__THREE__", three).replace("__SCENE__", (HERE / "time_train.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out12.name}, {out12.stat().st_size // 1024} KB")


# ---- the thirteenth page: London and Westminster on Christmas Day 1066 -----------------------------
LN = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>London, Christmas Day 1066: the crowning of William</title>").replace("background:#c8d4d8", "background:#b8bcc0").replace("#intro.gone{", "#intro{overflow-y:auto;align-items:flex-start;padding:16px 0;box-sizing:border-box} #intro .card{margin:auto} #intro.gone{", 1)
i0, i1 = LN.index('<div id="intro">'), LN.index('<button id="vr">')
LN = LN[:i0] + """<div id="intro"><div class="card">
  <h1>London, Christmas Day 1066</h1>
  <p>Ten weeks after Hastings, William, duke of Normandy, is crowned king in Edward the Confessor's new abbey at Westminster.
  Walk the real ground as it was: Thorney Island between the Tyburn's mouths, the abbey with its unfinished nave, the Strand past the fields
  over abandoned Lundenwic, Fleet Street and Ludgate, the Roman wall, St Paul's, Cheapside and the Saxon lanes, the hithes, the timber
  London Bridge, and burnt Southwark. Go into the houses.</p>
  <p>From 10:00 the coronation unfolds as the chroniclers tell it: the procession, the questions in French and English, the great shout,
  the guards setting fire to the houses outside, the congregation fleeing, and the crowning by Archbishop Ealdred.</p>
  <p>Or choose <b>a market day</b> a few days earlier (Christmas Day was a holy day, when trading was forbidden): stalls along Cheapside, butchers at the
  Shambles and in Eastcheap, fish at the hithes, pigs and sheep driven in. Carry a purse of silver pennies and buy at the stalls; on either day,
  drink at an alehouse, sit in the king's hall, or hire a boatman on the river.</p>
  <p><b>Choose who you are</b>: a time traveller (unseen, with field notes), a comb-maker of Bread Street, an alewife of Eastcheap, a Southwark fisherman whose
  house was burned last month, or an English thegn. Each has a home, a household and a day of the time's ordinary work (press <kbd>E</kbd> at home), and people
  treat you by your rank: greetings, bows, Norman guards, doors closed to you. The world stays open: go anywhere.</p>
  <p>Around London: the Domesday villages (Islington, St Pancras, Stepney, Kensington, Chelsea, Battersea, Bermondsey and more) with their farms, open fields in strips,
  meadows, woods, water mills and the Roman roads; ploughing, threshing and herding; and on the Thames, ships from Rouen and Flanders below the bridge, barges and boats above it.</p>
  <p>Or go forward to <b>summer 1100</b>, a generation after the Conquest: the White Tower finished, Baynard's Castle and Montfichet's Tower in the west of
  the City, William Rufus's Westminster Hall, the new St Paul's rising after the fire of 1087, St Mary-le-Bow, the abbey's nave complete, Southwark rebuilt,
  and the harvest beginning on Lammas Day.</p>
  <p>Or to <b>Michaelmas 1285</b>, under Edward I, on an autumn market day: London Bridge in stone, lined with houses; Old St Paul's with its great spire and its Gothic choir building; Henry III's Gothic abbey joined to the old nave; the whitewashed Tower in its new concentric walls and moat; the friaries, the Temple, the Guildhall and the Great Conduit; Southwark, Smithfield, the Strand and Clerkenwell.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; <kbd>E</kbd> read a marker, a person, or go into a house &nbsp;&middot;&nbsp;
  <kbd>N</kbd> next moment &nbsp;&middot;&nbsp; <kbd>T</kbd> time speed &nbsp;&middot;&nbsp; <kbd>L</kbd> markers &nbsp;&middot;&nbsp; <kbd>F</kbd> fly<br>
  In VR: left stick walk, right stick turn, <b>A</b> read / go in, <b>B</b> next place, <b>X</b> next moment, <b>Y</b> time speed</p>
  <p class="dim">Every marker says whether a thing is <b>known</b> (archaeology, records), <b>inferred</b> (place known, form guessed), or <b>typical</b> (a stand-in where
  what stood is unknown). The places on the guide list are all open from the start. Click to begin.</p>
</div></div>
""" + LN[i1:]
out13 = HERE / "london1066.html"
out13.write_text(LN.replace("__THREE__", three).replace("__SCENE__", (HERE / "london1066.js").read_text(encoding="utf-8")), encoding="utf-8")
print(f"  wrote {out13.name}, {out13.stat().st_size // 1024} KB")

# ---- the fourteenth page: an antimatter starship at 1 g ------------------------------------------------------------------
SS = CAT.replace("<title>A day in Çatalhöyük, 7000 BC</title>", "<title>Starship: 1 g to the stars</title>").replace("background:#c8d4d8", "background:#05080c")
i0, i1 = SS.index('<div id="intro">'), SS.index('<button id="vr">')
SS = SS[:i0] + """<div id="intro"><div class="card">
  <h1>Starship: 1 g to the stars</h1>
  <p>A large antimatter starship waits in orbit near Earth. Its autopilot can take it to any star on its list: it accelerates at a steady
  <b>1 g</b> (which you feel as ordinary gravity) to the halfway point, turns over, and decelerates at 1 g to arrive at rest, in orbit near
  the most interesting planet. Known planets are real; elsewhere they are generated.</p>
  <p>The trip computer on the bridge works it out exactly, from the metric of special relativity: the ship's own <b>proper time</b> and the
  stars' <b>coordinate time</b> (both starting at today's date and time), the <b>proper velocity</b> w = &gamma;v (which can exceed c) and the
  <b>map velocity</b> v (which never does). Out of the windows the sky is shown as you would see it: at high speed the stars crowd ahead and
  turn blue, and fade and redden behind.</p>
  <p>Proxima Centauri takes 3.5 years by the ship's clock (5.9 on Earth); the centre of the galaxy, 26,670 light years away, takes under 20.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;&middot;&nbsp; drag to look &nbsp;&middot;&nbsp; click the console buttons &nbsp;&middot;&nbsp; <kbd>[</kbd> <kbd>]</kbd> slower / faster time &nbsp;&middot;&nbsp;
  the lift (in the middle of each deck) has buttons inside, or <kbd>Q</kbd>/<kbd>Z</kbd> up / down when you are in it; the cupola, for looking out, is at the top<br>
  In VR: left stick walk, right stick turn, trigger to press buttons, <b>A</b> in the lift: next deck, <b>X</b>/<b>Y</b> slower / faster time</p>
  <p class="dim">Star positions, distances and known planets are real; ship design follows published studies of antimatter rockets. Click to begin.</p>
</div></div>
""" + SS[i1:]
SS = SS.replace("__SCENE__", 'const EARTH_JPG = "__EARTH__", MOON_JPG = "__MOON__";\n__SCENE__')
out14 = HERE / "starship.html"
out14.write_text(SS.replace("__THREE__", three).replace("__EARTH__", img("earth.jpg")).replace("__MOON__", img("moon.jpg")).replace("__SCENE__", (HERE / "starship.js").read_text(encoding="utf-8")), encoding="utf-8")
