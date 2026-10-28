# Boiler Troubleshooting

An offline training game for HVAC technicians: troubleshoot a Thermal Solutions EVA-3000 hot-water boiler (3,000 MBH,
modulating premix burner on a VFD, Honeywell RM7896D flame safeguard, Siemens RWF55 controller, 208 V 3-phase with a
115 V control circuit), modelled on the manufacturer's I&O manual. Twenty-two service calls cover electrical controls,
the water side and combustion.

Play: open `index.html` (or `boiler-troubleshooting.html`, the same file) in any browser. No internet needed.

## Publish on GitHub Pages
1. Create a new repository on GitHub (for example `boiler-troubleshooting`) and push this folder to it.
2. In the repository: Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
3. The game is then at `https://<your-account>.github.io/boiler-troubleshooting/`.

## Develop
Edit the source files, then run `python3 build.py`. See `CLAUDE.md` for how the game is built, tested and the rules it follows.
