
// ---------- the rock under Glen Carbon, Illinois ----------
// Depths in feet below the ground. Down to the base of the St. Louis Limestone (770 ft) the units, their order, their rocks and fossils come from
// the Illinois State Geological Survey's map of the Bethalto Quadrangle next door (Devera 2004), and the Herrin Coal sits where Glen Carbon's own
// mines found it (54 to 190 ft down). The glacial deposits on top are the usual sequence for this part of Madison County. Below 770 ft there is no
// deep well log for Glen Carbon in anything I found, so the deeper units are the standard sequence of this edge of the Illinois Basin with typical
// thicknesses: approximate (the Bethalto map's one deep test found Devonian limestone at 1,169 ft, which agrees).
// Each: name, top, bottom, age, rock, texture kind, colour, fossils, source tag ("isgs" | "typical" | "regional").
const STRATA = [
  ["Peoria Loess", 0, 15, "25,000-12,000 years", "wind-blown silt from the Mississippi valley at the end of the last ice age; tan, crumbly, breaks in vertical cliffs", "loess", "#b8955f", ["snail"], "typical"],
  ["Roxana Silt", 15, 19, "55,000-30,000 years", "an older loess, pinker and darker", "loess", "#a07a58", ["snail"], "typical"],
  ["Sangamon Geosol", 19, 23, "about 125,000 years", "a buried soil: the ground surface of the warm interglacial before the last ice age, reddish-brown clay", "soil", "#7a4a30", [], "typical"],
  ["Glasford Formation (Illinoian till)", 23, 48, "about 190,000-130,000 years", "glacial till: clay, silt and sand with pebbles and boulders, dumped by the Illinoian ice sheet that covered all of Madison County", "till", "#7a6a58", ["pebble"], "typical"],
  ["Shelburn Formation", 48, 70, "about 306 million years (Pennsylvanian)", "claystone and shale, gray, green and red; siltstone; thin coals", "shale", "#8a8a84", ["fern"], "isgs"],
  ["Piasa Limestone", 70, 78, "about 306 million years", "argillaceous limestone with echinoderms and brachiopods; fusulinids common in the lower part", "limestone", "#9a9a92", ["fusulinid", "brachiopod", "crinoid"], "isgs"],
  ["Shelburn Formation (shale)", 78, 128, "about 306 million years", "claystone, siltstone and shale", "shale", "#7e8078", ["fern"], "isgs"],
  ["Danville (No. 7) Coal", 128, 130, "about 306 million years", "a thin coal, overlain by black shale", "coal", "#1e1c1a", ["lepidodendron"], "isgs"],
  ["Shelburn Formation (shale)", 130, 141, "about 307 million years", "red and green claystone and limestone above the Brereton", "shale", "#6e6a62", [], "isgs"],
  ["Brereton Limestone", 141, 147, "about 307 million years", "dark gray, micritic, iron-stained limestone: the base of the Shelburn", "limestone", "#6a6a66", ["brachiopod"], "isgs"],
  ["Anna Shale", 147, 150, "about 307 million years", "black, marine shale, the sea flooding the coal swamp", "blackshale", "#26262a", ["lingula"], "isgs"],
  ["Herrin (No. 6) Coal", 150, 156, "about 308 million years", "the coal Glen Carbon's mines worked, and the town's name means coal valley: black, vitreous, bituminous, 6 ft thick, with a bluish clay 'blue band' near its base", "coal", "#141210", ["lepidodendron", "calamites"], "isgs"],
  ["Carbondale Formation (shale)", 156, 225, "about 308 million years", "gray shale and claystone with carbonized roots below the coals; sporadic sandstone", "shale", "#7a7a72", ["fern", "calamites"], "isgs"],
  ["Hanover Limestone", 225, 228, "about 309 million years", "dark to medium gray nodular limestone, up to 3 ft thick, full of brachiopods", "limestone", "#76766e", ["brachiopod"], "isgs"],
  ["Carbondale Formation (shale)", 228, 268, "about 309 million years", "shale and claystone", "shale", "#82827a", ["fern"], "isgs"],
  ["Oak Grove Limestone", 268, 272, "about 310 million years", "thin lime mudstones between thin dark gray and black shales", "limestone", "#5e5e5a", ["brachiopod"], "isgs"],
  ["Colchester (No. 2) Coal", 286, 288, "about 310 million years", "a thin vitreous coal near the base of the Carbondale, over an underclay full of roots", "coal", "#161412", ["stigmaria"], "isgs"],
  ["Tradewater Formation", 290, 370, "about 315 million years", "micaceous sandstone, siltstone and shale filling old river valleys cut into the Mississippian; Seahorn Limestone at the top; fossil plant debris near the base", "sandstone", "#a8987a", ["lepidodendron", "calamites"], "isgs"],
  ["Paint Creek Formation", 370, 400, "about 330 million years (Mississippian)", "red and green claystone and fossil-packed limestone", "limestone", "#8a8270", ["crinoid", "blastoid", "brachiopod", "coral", "bryozoan"], "isgs"],
  ["Yankeetown Sandstone", 400, 412, "about 331 million years", "very fine white, red and green sandstone, partly turned to chert", "sandstone", "#c0a888", [], "isgs"],
  ["Renault Limestone", 412, 422, "about 332 million years", "oolitic limestone with red echinoderm fragments", "limestone", "#a89a86", ["crinoid"], "isgs"],
  ["Aux Vases Sandstone", 422, 475, "about 333 million years", "clean white crossbedded quartz sandstone with ripple marks: an ancient tidal shore", "sandstone", "#d8ccae", [], "isgs"],
  ["Ste. Genevieve Limestone", 475, 545, "about 335 million years", "chalky white oolitic limestone, crossbedded: a shallow sea floor of tiny rolling grains", "limestone", "#d4cfc0", ["crinoid"], "isgs"],
  ["St. Louis Limestone", 545, 770, "about 338 million years", "thin-bedded gray limestone with white chert nodules; the colonial coral Acrocyathus common in the lower part", "limestone", "#9aa2a6", ["acrocyathus", "chert"], "isgs"],
  ["Salem Limestone", 770, 900, "about 340 million years", "granular limestone of tiny fossil fragments, bryozoans and forams", "limestone", "#b8b0a0", ["bryozoan"], "regional"],
  ["Warsaw Shale", 900, 1000, "about 342 million years", "shale and limestone, famous for geodes and the corkscrew bryozoan Archimedes", "shale", "#7a8074", ["geode", "bryozoan"], "regional"],
  ["Keokuk and Burlington Limestones", 1000, 1170, "about 345 million years", "crinoidal limestone and chert: some of the richest crinoid beds in the world are in these formations along the Mississippi valley", "limestone", "#b4ae9e", ["crinoid", "crinoid", "blastoid"], "regional"],
  ["Devonian limestone", 1170, 1300, "about 385 million years (Devonian)", "limestone with corals and brachiopods (the Bethalto map's deep test found Devonian limestone at 1,169 ft)", "limestone", "#a49a88", ["coral", "brachiopod"], "regional"],
  ["Silurian dolomite", 1300, 1500, "about 430 million years (Silurian)", "fine dolomite and limestone from a warm tropical sea, with reefs", "dolomite", "#c4b290", ["chaincoral", "crinoid"], "regional"],
  ["Maquoketa Shale", 1500, 1650, "about 445 million years (Ordovician)", "gray-green shale", "shale", "#6a7466", ["brachiopod"], "regional"],
  ["Kimmswick Limestone", 1650, 1800, "about 455 million years", "coarse fossil limestone: trilobites, brachiopods, straight-shelled nautiloids", "limestone", "#b8ac96", ["trilobite", "nautiloid", "brachiopod"], "regional"],
  ["Plattin Limestone", 1800, 2050, "about 460 million years", "dense, fine gray limestone", "limestone", "#8e8c84", ["nautiloid"], "regional"],
  ["Joachim Dolomite", 2050, 2200, "about 462 million years", "silty dolomite", "dolomite", "#b0a080", [], "regional"],
  ["St. Peter Sandstone", 2200, 2350, "about 465 million years", "nearly pure, round, frosted quartz sand: one of the purest sandstones on Earth, mined for glass", "sandstone", "#e8e0c8", [], "regional"],
  ["Prairie du Chien dolomites", 2350, 2900, "about 480 million years", "dolomites (Shakopee, Jefferson City) with chert and mats of fossil microbes (stromatolites)", "dolomite", "#c0ae8a", ["stromatolite"], "regional"],
  ["Eminence and Potosi Dolomites", 2900, 3400, "about 490 million years (Cambrian)", "dolomite with sparkling quartz drusy cavities", "dolomite", "#b4a482", ["stromatolite"], "regional"],
  ["Davis and Eau Claire Formations", 3400, 3900, "about 500 million years", "sandy dolomite, siltstone and shale with worm burrows and trilobites", "shale", "#8a7e6a", ["trilobite", "burrow"], "regional"],
  ["Mt. Simon Sandstone", 3900, 4300, "about 510 million years", "coarse crossbedded sandstone laid on the bare ancient continent: the deepest sedimentary layer", "sandstone", "#c8a882", [], "regional"],
  ["Precambrian granite and rhyolite", 4300, 32800, "about 1.47 billion years", "pink granite and rhyolite of the Eastern Granite-Rhyolite Province, the buried floor of the continent, cut by pegmatite veins and dikes", "granite", "#b88a7a", ["pegmatite", "dike"], "basement"],
  ["Middle crust: gneiss", 32800, 72200, "older than 1.5 billion years (age not known)", "banded gneiss and amphibolite: rock squeezed and heated until it flowed like taffy", "gneiss", "#8a8478", ["gneiss", "dike"], "seismic"],
  ["Lower crust: granulite", 72200, 190300, "1.5 billion years or more", "dense dark granulite with garnet and pyroxene, and deeper probably basalt added from below, where seismic waves speed up; the crust here is unusually thick", "granulite", "#55504a", ["garnet"], "seismic"],
  ["Upper mantle: peridotite", 190300, 196900, "the mantle", "green peridotite, mostly olivine with pyroxene and garnet: hot and, over millions of years, slowly flowing", "peridotite", "#5e6a3a", ["peridotite"], "seismic"]];
// fill the gaps (shale between named beds) so the column is continuous
for (let i = STRATA.length - 1; i > 0; i--) { const a = STRATA[i - 1], b = STRATA[i]; if (a[2] < b[1]) STRATA.splice(i, 0, ["Carbondale Formation (shale)", a[2], b[1], "about 310 million years", "shale and claystone", "shale", "#7c7c74", [], "isgs"]); }
const FOSSIL_INFO = { snail: ["Land snails", "Tiny shells of snails that lived on the cold, grassy plains of the ice age; loess is full of them."], pebble: ["Glacial pebbles", "Stones dragged hundreds of miles by the ice sheet from Canada and the upper Midwest: granite, basalt, quartzite."],
  fern: ["Fern and seed-fern leaves (Pecopteris, Neuropteris)", "Fronds of plants that grew in the coal swamps, pressed into the shale."], fusulinid: ["Fusulinids", "Single-celled animals with shells the size and shape of a grain of wheat; they date Pennsylvanian limestones."],
  brachiopod: ["Brachiopods", "Two-shelled sea animals, not clams: the most common fossil in Illinois limestones."], crinoid: ["Crinoids (sea lilies)", "Animals related to starfish that stood on stalks of stacked discs; the round discs are everywhere in these limestones."],
  lepidodendron: ["Lepidodendron bark", "The scale tree: a 100-ft club moss of the coal swamps; its bark has a diamond pattern of leaf scars. Coal is mostly these plants."], calamites: ["Calamites", "A giant horsetail, with ribbed, jointed stems."],
  lingula: ["Lingula", "A small tongue-shaped brachiopod that lived in the muddy water when the sea flooded the swamp."], stigmaria: ["Stigmaria", "The roots of the scale trees, with round scars where rootlets grew, in the clay under the coal."],
  blastoid: ["Blastoids (Pentremites)", "Little rosebud-shaped relatives of the crinoids; Pentremites is common in these late Mississippian beds."], coral: ["Horn corals", "Solitary rugose corals, shaped like horns."],
  bryozoan: ["Bryozoans (Archimedes)", "Colonies of tiny animals; Archimedes grew around a corkscrew-shaped axis."], acrocyathus: ["Acrocyathus", "A colonial coral, its many-sided cells packed like a honeycomb: a marker of the St. Louis Limestone."],
  chert: ["Chert nodules", "Lumps of flint-like silica, grown in the limestone; people made arrowheads from them."], geode: ["Geodes", "Hollow balls lined with quartz crystals, grown in the Warsaw shale; the Keokuk area is world-famous for them."],
  chaincoral: ["Chain coral (Halysites)", "A Silurian colonial coral whose tubes join in chains."], trilobite: ["Trilobites", "Armoured sea creatures; the Ordovician Isotelus grew more than a foot long."],
  pegmatite: ["Pegmatite vein", "Giant crystals of white and pink feldspar, quartz and mica, grown from the last watery melt as the granite cooled."], dike: ["Dike", "A sheet of once-molten rock that forced its way up a crack and froze there."], gneiss: ["Banded gneiss", "Rock squeezed and heated so deep that its minerals separated into light and dark bands without melting."], garnet: ["Garnets", "Deep red crystals that grow only at the high pressures and temperatures of the deep crust."], peridotite: ["Olivine (peridot)", "Green olivine, the most common mineral of the upper mantle; the gem peridot is olivine. Pieces like this come up in volcanoes."],
  nautiloid: ["Straight nautiloids", "Relatives of the squid with long cone-shaped shells, divided into chambers."], stromatolite: ["Stromatolites and oncolites", "Layered mounds (stromatolites) and balls (oncolites) built by mats of microbes in shallow water: the oldest kind of fossil."], burrow: ["Worm burrows", "Tunnels left in the sea-floor mud by animals; their bodies were too soft to be preserved."] };


// rock features rather than fossils in the deep layers
const ROCKY = new Set(["pegmatite", "dike", "gneiss", "garnet", "peridotite", "geode", "chert", "pebble"]);
// the temperature of the rock (deg C) at a depth below the ground outside, from heat flow (about 50 mW per square metre in southwestern Illinois) and
// the heat made by radioactivity in the crust: about 13 C near the surface, 40 C at the granite, about 730 C at the base of the crust
function tempC(dm) { const z = Math.max(0, dm) / 1000; if (z <= 10) return 13 + 20 * z - 0.24 * z * z; const z2 = z - 10; return 189 + 15.2 * z2 - 0.08 * z2 * z2; }
const fmtTemp = c => `${Math.round(c * 9 / 5 + 32)} °F (${Math.round(c)} °C)`;
const depthAtTemp = T => { let lo = 0, hi = 60000; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (tempC(m) < T) lo = m; else hi = m; } return lo / 0.3048; };
// things to pass on the way down: [depth in ft below the ground, title, what it is]
const MARKS = [[13123, "As deep as the deepest mine", "Mponeng gold mine in South Africa goes about 4 km (2.5 miles) down, the deepest anyone works."],
  [Math.round(depthAtTemp(122)), "The limit of life", "Microbes live in rock miles down, but none known can live above about 122 C (252 F). Here the rock reaches that, so below this the rock is probably lifeless."],
  [29032, "Mount Everest, upside down", "Mount Everest is 8,849 m (29,032 ft) tall: stood on its head here, its summit would just reach this depth."],
  [35876, "As deep as the deepest ocean", "Challenger Deep in the Pacific is 10,935 m (35,876 ft) deep."],
  [40230, "The deepest hole ever drilled", "The Kola Superdeep Borehole in Russia reached 12,262 m (40,230 ft) in 1989. Below here, no person or drill has ever been."],
  [49200, "Where Illinois earthquakes start", "Most earthquakes in Illinois begin roughly 5 to 20 km down, in rock still cold and stiff enough to snap."],
  [Math.round(depthAtTemp(350)), "Where rock begins to flow", "At about 350 C (660 F) the rock is hot enough to bend and creep slowly instead of breaking, so earthquakes are rare below here."],
  [190300, "The Moho: the base of the crust", "Seismic waves suddenly speed up here, to about 8 km a second, as they pass from crust into mantle. Under the St. Louis area it is about 57 to 62 km down (EarthScope OIINK seismic experiment), much deeper than the usual 35 to 40 km."]];
