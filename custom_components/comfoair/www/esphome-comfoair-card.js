/*
 * ESPHome ComfoAir Lovelace card
 * Visual design adapted from TimWeyand/lovelace-comfoair (MIT License).
 * Entity names adapted for the devsnek/hass-comfoair HA integration.
 */

(function () {

const DEFAULTS = {
  title:         "ComfoAir",
  climate:       "climate.comfoair",
  outside_temp:  "sensor.comfoair_outside_air_temperature",
  supply_temp:   "sensor.comfoair_supply_air_temperature",
  return_temp:   "sensor.comfoair_return_air_temperature",
  exhaust_temp:  "sensor.comfoair_exhaust_air_temperature",
  supply_level:  "sensor.comfoair_supply_air_level",
  return_level:  "sensor.comfoair_return_air_level",
  supply_fan:    "sensor.comfoair_supply_fan_speed_rpm",
  return_fan:    "sensor.comfoair_return_fan_speed_rpm",
  bypass:        "binary_sensor.comfoair_bypass_valve_open",
  summer_mode:   "binary_sensor.comfoair_summer_mode",
  preheating:    "binary_sensor.comfoair_preheating_state",
  filter_status: "sensor.comfoair_filter_status",
  fan_balance:   null,
  temp_step:     1,
  temp_min:      -10,
  temp_max:       30,
  show_legend:   true,
  animation:     true,
};

const FAN_MODES  = { off: "Away", low: "Low", medium: "Medium", high: "High" };
const FAN_ICONS  = { off: "mdi:sleep", low: "mdi:fan-speed-1", medium: "mdi:fan-speed-2", high: "mdi:fan-speed-3" };
const BAL_LABELS = { balanced: "Balanced", supply_only: "Supply only", exhaust_only: "Exhaust only" };

// oklch color scale: cold blue (left) → warm orange (right)
// Same 6-stop scale used by TimWeyand/lovelace-comfoair.
const _CSTOPS = [[.6,.16,252],[.72,.13,215],[.8,.14,155],[.82,.16,95],[.66,.19,45],[.5,.205,28]];
function _lerp(a, b, t) { return a + (b - a) * t; }
function _tempColor(celsius, min, max) {
  const frac = Math.max(0, Math.min(1, (celsius - min) / (max - min)));
  const n = Math.min(_CSTOPS.length - 2, Math.floor(frac * (_CSTOPS.length - 1)));
  const t = frac * (_CSTOPS.length - 1) - n;
  const L = _lerp(_CSTOPS[n][0], _CSTOPS[n+1][0], t);
  const C = _lerp(_CSTOPS[n][1], _CSTOPS[n+1][1], t);
  const H = _lerp(_CSTOPS[n][2], _CSTOPS[n+1][2], t);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

// SVG path strings — viewBox 0 0 440 132 (same as TimWeyand).
// Supply  ribbon: Outside Air (TL) → Supply Air (BR)
// Exhaust ribbon: Return Air  (TR) → Exhaust Air (BL)
const _PS = "M6,19 H120 L320,113 H434";
const _PR = "M434,19 H320 L120,113 H6";

// ─────────────────────────────────────────────────────────────────────────────

class ESPHomeComfoAirCard extends HTMLElement {
  setConfig(config) {
    this._cfg   = { ...DEFAULTS, ...(config || {}) };
    this._built = false;
    this._sig   = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 8; }

  // ── state helpers ──────────────────────────────────────────────────────────

  _st(id) {
    return (!id || !this._hass) ? undefined : this._hass.states[id];
  }
  _raw(id) {
    const s = this._st(id);
    if (!s || s.state === "unknown" || s.state === "unavailable") return null;
    const n = parseFloat(s.state);
    return Number.isNaN(n) ? null : n;
  }
  _text(id) {
    const s = this._st(id);
    return (!s || s.state === "unknown" || s.state === "unavailable") ? "—" : s.state;
  }
  _isOn(id) {
    const s = this._st(id);
    return s ? s.state === "on" : false;
  }
  _esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ── HA interactions ────────────────────────────────────────────────────────

  _moreInfo(id) {
    if (!id) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId: id };
    this.dispatchEvent(ev);
  }
  _setTemp(delta) {
    const s = this._st(this._cfg.climate);
    if (!s) return;
    const cur = Number(s.attributes.temperature);
    if (!Number.isNaN(cur))
      this._hass.callService("climate", "set_temperature", {
        entity_id: this._cfg.climate,
        temperature: cur + delta * Number(this._cfg.temp_step || 1),
      });
  }
  _setFanMode(mode) {
    if (!mode) return;
    this._hass.callService("climate", "set_fan_mode", {
      entity_id: this._cfg.climate, fan_mode: mode,
    });
  }
  _setBalance(option) {
    this._hass.callService("select", "select_option", {
      entity_id: this._cfg.fan_balance, option,
    });
  }

  // ── change detection ───────────────────────────────────────────────────────

  _signature() {
    const keys = [
      "climate","outside_temp","supply_temp","return_temp","exhaust_temp",
      "supply_level","return_level","supply_fan","return_fan",
      "bypass","summer_mode","preheating","filter_status","fan_balance",
    ];
    return keys.map(k => {
      const s = this._st(this._cfg[k]);
      if (!s) return `${k}:null`;
      const x = k === "climate"
        ? `${s.attributes.temperature}/${s.attributes.fan_mode}` : "";
      return `${k}:${s.state}:${x}`;
    }).join("|");
  }

  // ── main render ────────────────────────────────────────────────────────────

  _render() {
    if (!this._hass || !this._cfg) return;
    const sig = this._signature();
    if (this._built && sig === this._sig) return;
    this._sig = sig;

    const cfg     = this._cfg;
    const climate = this._st(cfg.climate);
    const target  = climate?.attributes.temperature;
    const fanMode  = climate?.attributes.fan_mode ?? "off";
    const fanModes = climate?.attributes.fan_modes ?? ["off", "low", "medium", "high"];
    const fanLabel = FAN_MODES[fanMode] ?? (fanMode[0].toUpperCase() + fanMode.slice(1));

    const min = cfg.temp_min;
    const max = cfg.temp_max;

    const outsideRaw = this._raw(cfg.outside_temp);
    const supplyRaw  = this._raw(cfg.supply_temp);
    const returnRaw  = this._raw(cfg.return_temp);
    const exhaustRaw = this._raw(cfg.exhaust_temp);

    const colorOf  = v => v != null ? _tempColor(v, min, max) : "var(--secondary-text-color)";
    const outsideC = colorOf(outsideRaw);
    const supplyC  = colorOf(supplyRaw);
    const returnC  = colorOf(returnRaw);
    const exhaustC = colorOf(exhaustRaw);

    // Heat recovery efficiency
    let recovery = null;
    if (outsideRaw != null && returnRaw != null && supplyRaw != null) {
      const denom = returnRaw - outsideRaw;
      if (denom > 0.5) recovery = Math.round(100 * Math.min(1, (supplyRaw - outsideRaw) / denom));
    }

    const supplyLvl = this._raw(cfg.supply_level);
    const returnLvl = this._raw(cfg.return_level);
    const supplyRpm = this._raw(cfg.supply_fan);
    const returnRpm = this._raw(cfg.return_fan);

    // Animation: circles glide along ribbon; duration inversely proportional to fan level
    const lvlDur = lvl => (lvl != null && lvl > 0)
      ? Math.max(2, Math.min(30, 600 / lvl)).toFixed(1) : null;
    const sDur = cfg.animation ? lvlDur(supplyLvl) : null;
    const rDur = cfg.animation ? lvlDur(returnLvl) : null;

    const filterFull = this._text(cfg.filter_status).toLowerCase() === "full";
    const bypassOn   = this._isOn(cfg.bypass);
    const summerOn   = this._isOn(cfg.summer_mode);
    const preheatOn  = this._isOn(cfg.preheating);

    this.innerHTML = `<ha-card>
<style>
  .ca { padding: 14px 16px 12px; }
  /* ── header ── */
  .hd { display: flex; align-items: center; gap: 11px; padding: 2px 2px 12px; }
  .hd .ic { width: 34px; height: 34px; border-radius: 10px; flex: none;
    display: flex; align-items: center; justify-content: center;
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.14);
    color: var(--primary-color); }
  .hd .ttl { font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; }
  .hd .st  { font-size: 12px; color: var(--secondary-text-color); margin-top: 1px;
    display: flex; align-items: center; gap: 6px; }
  .hd .dot { width: 7px; height: 7px; border-radius: 50%;
    background: var(--disabled-text-color, #777); }
  .hd .dot.live { background: #36c46b; }
  .hd .grow { flex: 1; }
  .hd .recov { text-align: right; line-height: 1.05; min-height: 30px; }
  .hd .recov b    { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
  .hd .recov span { display: block; font-size: 10px; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--secondary-text-color); margin-top: 1px; }
  /* ── temperature badge ── */
  .tbadge { display: inline-flex; align-items: baseline; justify-content: center; gap: 1px;
    width: 88px; padding: 3px 4px; border-radius: 10px; line-height: 1;
    font-variant-numeric: tabular-nums;
    background: var(--bg); color: var(--fg); border: 1px solid var(--bd);
    box-shadow: 0 2px 10px -4px rgba(0, 0, 0, 0.5);
    transition: background 0.5s, color 0.5s, border-color 0.5s; cursor: pointer; }
  .tbadge .v { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .tbadge .u { font-size: 12px; font-weight: 600; opacity: 0.7; }
  /* ── label ── */
  .lbl { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--secondary-text-color); font-weight: 600;
    display: flex; align-items: center; gap: 5px; }
  .lbl.rev { flex-direction: row-reverse; }
  .lbl ha-icon { --mdc-icon-size: 14px; }
  /* ── subtitle (fan rpm / level) ── */
  .subt { font-size: 11px; color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums;
    cursor: pointer; }
  .subt ha-icon { --mdc-icon-size: 15px; opacity: 0.85; }
  /* ── lanes 3-column grid ── */
  .lanes { display: flex; flex-direction: column; gap: 3px; --hub-w: 188px; }
  .trow { display: grid; grid-template-columns: 1fr var(--hub-w) 1fr; gap: 10px; padding: 0 6px; }
  .trow.top { align-items: end; }
  .trow.bot { align-items: start; }
  .tcell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tcell.l { align-items: flex-start; }
  .tcell.r { align-items: flex-end; text-align: right; }
  /* ── SVG flowband ── */
  .flowband { position: relative; width: 100%; aspect-ratio: 440 / 132; }
  .airsvg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .airrib { fill: none; stroke-width: 38; stroke-linejoin: round; stroke-linecap: round; }
  .airarrow { fill: rgba(255, 255, 255, 0.92);
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.28)); }
  .flow-hi { opacity: 0.5; }
  /* ── center hub overlay ── */
  .hub { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 4; }
  .corehub { background: var(--card-background-color);
    border: 1px solid var(--divider-color); border-radius: 15px; padding: 6px 9px;
    box-shadow: 0 6px 22px -6px rgba(0, 0, 0, 0.55);
    display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .setpc { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .setpc button { width: 24px; height: 24px; border-radius: 50%;
    border: 1px solid var(--divider-color);
    background: transparent; color: var(--primary-text-color); font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: 0.15s; }
  .setpc button:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .setpc .val { min-width: 56px; text-align: center; font-size: 17px; font-weight: 700;
    font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .setpc .val small { font-size: 11px; font-weight: 600; color: var(--secondary-text-color); }
  .fanrow { display: flex; gap: 2px; background: rgba(127, 127, 127, 0.14);
    border-radius: 11px; padding: 3px; }
  .fanrow button { width: 32px; height: 26px; border: 0; background: transparent;
    border-radius: 8px; color: var(--secondary-text-color); cursor: pointer;
    transition: 0.15s; display: flex; align-items: center; justify-content: center; }
  .fanrow button:hover { color: var(--primary-text-color); }
  .fanrow button.on { background: var(--primary-color); color: #fff;
    box-shadow: 0 2px 8px -2px var(--primary-color); }
  .fanrow ha-icon { --mdc-icon-size: 18px; }
  /* ── legend ── */
  .legend { display: flex; align-items: center; gap: 9px; padding: 8px 4px 2px; }
  .legend .bar { flex: 1; height: 7px; border-radius: 4px; }
  .legend .mn, .legend .mx { font-size: 11px; color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums; font-weight: 600; min-width: 44px; }
  .legend .mx { text-align: right; }
  /* ── status chips ── */
  .status { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
    margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
  .chip { display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 7px 2px 4px; border-radius: 11px;
    color: var(--secondary-text-color); transition: 0.25s; cursor: pointer; }
  .chip ha-icon { --mdc-icon-size: 23px; transition: 0.25s; }
  .chip .nm { font-size: 10.5px; font-weight: 600; }
  .chip .vs { font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--secondary-text-color); opacity: 0.65; }
  .chip.on   { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
  .chip.warn { color: var(--error-color);
    background: color-mix(in srgb, var(--error-color) 12%, transparent); }
  /* ── fan balance ── */
  .ca-balance { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .ca-balance select { flex: 1; padding: 6px; border-radius: 6px; font-size: .9em;
    background: var(--card-background-color); color: var(--primary-text-color);
    border: 1px solid var(--divider-color); }
</style>
<div class="ca">

  <div class="hd">
    <div class="ic"><ha-icon icon="mdi:hvac"></ha-icon></div>
    <div>
      <div class="ttl">${this._esc(cfg.title)}</div>
      <div class="st">
        <span class="dot ${fanMode !== "off" ? "live" : ""}"></span>
        <span>${this._esc(fanLabel)}</span>
      </div>
    </div>
    <div class="grow"></div>
    ${recovery != null
      ? `<div class="recov"><b>${recovery}%</b><span>Heat recovery</span></div>`
      : ""}
  </div>

  <div class="lanes">

    <div class="trow top">
      <div class="tcell l">
        ${supplyRpm != null
          ? `<div class="subt" data-e="${cfg.supply_fan}">
               <ha-icon icon="mdi:fan"></ha-icon>${supplyRpm.toFixed(0)}&nbsp;rpm
             </div>`
          : ""}
        ${this._badge(outsideC, outsideRaw, cfg.outside_temp)}
        <div class="lbl"><ha-icon icon="mdi:tree-outline"></ha-icon>Outside Air</div>
      </div>
      <div></div>
      <div class="tcell r">
        ${returnLvl != null
          ? `<div class="subt" data-e="${cfg.return_level}">
               <ha-icon icon="mdi:gauge"></ha-icon>${returnLvl.toFixed(0)}&thinsp;%
             </div>`
          : ""}
        ${this._badge(returnC, returnRaw, cfg.return_temp)}
        <div class="lbl rev"><ha-icon icon="mdi:home-thermometer-outline"></ha-icon>Return Air</div>
      </div>
    </div>

    <div class="flowband">
      <svg class="airsvg" viewBox="0 0 440 132" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="eca-sg" gradientUnits="userSpaceOnUse"
              x1="6" y1="19" x2="434" y2="113">
            <stop offset="0%"   stop-color="${outsideC}"/>
            <stop offset="100%" stop-color="${supplyC}"/>
          </linearGradient>
          <linearGradient id="eca-rg" gradientUnits="userSpaceOnUse"
              x1="434" y1="19" x2="6" y2="113">
            <stop offset="0%"   stop-color="${returnC}"/>
            <stop offset="100%" stop-color="${exhaustC}"/>
          </linearGradient>
          <filter id="eca-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4.5"/>
          </filter>
        </defs>
        <!-- exhaust ribbon (TR→BL) drawn first, behind supply -->
        <path class="airrib" d="${_PR}" stroke="url(#eca-rg)"/>
        <!-- supply ribbon (TL→BR) drawn on top -->
        <path class="airrib" d="${_PS}" stroke="url(#eca-sg)"/>
        <!-- directional arrows near the ribbon kinks -->
        <polygon class="airarrow" points="86,11 86,27 102,19"/>
        <polygon class="airarrow" points="354,11 354,27 338,19"/>
        <polygon class="airarrow" points="102,105 102,121 86,113"/>
        <polygon class="airarrow" points="338,105 338,121 354,113"/>
        <!-- animated flow circles (glide along ribbons at fan speed) -->
        ${(sDur || rDur) ? `<g class="flow-hi" filter="url(#eca-soft)">
          ${sDur ? `
            <circle r="11" fill="#fff"><animateMotion path="${_PS}" dur="${sDur}s" begin="0s" repeatCount="indefinite"/></circle>
            <circle r="11" fill="#fff"><animateMotion path="${_PS}" dur="${sDur}s" begin="-${(parseFloat(sDur)/2).toFixed(1)}s" repeatCount="indefinite"/></circle>` : ""}
          ${rDur ? `
            <circle r="11" fill="#fff"><animateMotion path="${_PR}" dur="${rDur}s" begin="0s" repeatCount="indefinite"/></circle>
            <circle r="11" fill="#fff"><animateMotion path="${_PR}" dur="${rDur}s" begin="-${(parseFloat(rDur)/2).toFixed(1)}s" repeatCount="indefinite"/></circle>` : ""}
        </g>` : ""}
      </svg>
      <div class="hub">
        <div class="corehub">
          <div class="setpc" data-e="${cfg.climate}">
            <button class="ca-dn">−</button>
            <div class="val">${target != null ? `${target}<small>°</small>` : "—"}</div>
            <button class="ca-up">+</button>
          </div>
          <div class="fanrow">
            ${fanModes.map(m => {
              const icon = FAN_ICONS[m] ?? "mdi:fan";
              const lbl  = FAN_MODES[m]  ?? m;
              return `<button class="ca-fm ${m === fanMode ? "on" : ""}" data-mode="${this._esc(m)}" title="${this._esc(lbl)}">
                <ha-icon icon="${this._esc(icon)}"></ha-icon>
              </button>`;
            }).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="trow bot">
      <div class="tcell l">
        <div class="lbl"><ha-icon icon="mdi:export"></ha-icon>Exhaust Air</div>
        ${this._badge(exhaustC, exhaustRaw, cfg.exhaust_temp)}
        ${returnRpm != null
          ? `<div class="subt" data-e="${cfg.return_fan}">
               <ha-icon icon="mdi:fan"></ha-icon>${returnRpm.toFixed(0)}&nbsp;rpm
             </div>`
          : ""}
      </div>
      <div></div>
      <div class="tcell r">
        <div class="lbl rev"><ha-icon icon="mdi:import"></ha-icon>Supply Air</div>
        ${this._badge(supplyC, supplyRaw, cfg.supply_temp)}
        ${supplyLvl != null
          ? `<div class="subt" data-e="${cfg.supply_level}">
               <ha-icon icon="mdi:gauge"></ha-icon>${supplyLvl.toFixed(0)}&thinsp;%
             </div>`
          : ""}
      </div>
    </div>

  </div>

  ${cfg.show_legend ? this._legend(min, max) : ""}

  <div class="status">
    ${this._chip("mdi:fan",          "Fan",    fanLabel,                           fanMode !== "off", false, cfg.climate,      "var(--primary-color)")}
    ${this._chip("mdi:air-filter",   "Filter", this._text(cfg.filter_status),      false,             filterFull, cfg.filter_status, null)}
    ${this._chip("mdi:valve",        "Bypass", bypassOn ? "open" : "closed",       bypassOn,          false, cfg.bypass,       "var(--state-active-color, var(--primary-color))")}
    ${this._chip("mdi:heating-coil", "Preheat",preheatOn ? "on" : "off",           preheatOn,         false, cfg.preheating,   "var(--warning-color)")}
    ${this._chip(summerOn ? "mdi:weather-sunny" : "mdi:snowflake",
                              summerOn ? "Summer" : "Winter", null, summerOn, false, cfg.summer_mode, "var(--primary-color)")}
  </div>

  ${this._renderBalance()}

</div>
</ha-card>`;

    this._wire();
    this._built = true;
  }

  // ── sub-render helpers ─────────────────────────────────────────────────────

  _badge(color, val, id) {
    const text  = val != null ? val.toFixed(1) : "—";
    const style = val != null
      ? `--fg:${color};--bd:color-mix(in srgb,${color} 45%,transparent);--bg:color-mix(in srgb,${color} 14%,transparent)`
      : "--fg:var(--secondary-text-color);--bd:var(--divider-color);--bg:transparent";
    return `<div class="tbadge" style="${style}" data-e="${id}">
      <span class="v">${text}</span><span class="u">°C</span>
    </div>`;
  }

  _chip(icon, label, sub, on, warn, id, activeColor) {
    const cls   = warn ? "chip warn" : on ? "chip on" : "chip";
    const style = (on && !warn && activeColor) ? `style="--c:${activeColor}"` : "";
    return `<div class="${cls}" ${style} data-e="${id ?? ""}">
      <ha-icon icon="${this._esc(icon)}"></ha-icon>
      <span class="nm">${this._esc(label)}</span>
      ${sub ? `<span class="vs">${this._esc(sub)}</span>` : ""}
    </div>`;
  }

  _legend(min, max) {
    const stops = [0, .25, .5, .75, 1].map(f =>
      _tempColor(min + f * (max - min), min, max)
    );
    const grad = stops.map((c, i) => `${c} ${i * 25}%`).join(", ");
    return `<div class="legend">
      <span class="mn">${Math.round(min)}°C</span>
      <div class="bar" style="background:linear-gradient(90deg,${grad})"></div>
      <span class="mx">${Math.round(max)}°C</span>
    </div>`;
  }

  _renderBalance() {
    const s = this._st(this._cfg.fan_balance);
    if (!s) return "";
    const options = s.attributes.options ?? ["balanced", "supply_only", "exhaust_only"];
    const opts = options.map(o => {
      const lbl = BAL_LABELS[o] ?? o;
      return `<option value="${this._esc(o)}"${o === s.state ? " selected" : ""}>${this._esc(lbl)}</option>`;
    }).join("");
    return `<div class="ca-balance">
      <ha-icon icon="mdi:fan"></ha-icon>
      <span>Fan balance</span>
      <select class="ca-bal-sel">${opts}</select>
    </div>`;
  }

  // ── event wiring ───────────────────────────────────────────────────────────

  _wire() {
    this.querySelectorAll("[data-e]").forEach(el => {
      const id = el.getAttribute("data-e");
      if (!id) return;
      el.addEventListener("click", ev => {
        ev.stopPropagation();
        // setpc contains its own buttons — only open more-info when clicking the
        // value display, not the +/− buttons (those have their own handlers).
        if (ev.target.closest(".ca-dn, .ca-up, .ca-fm, .ca-bal-sel")) return;
        this._moreInfo(id);
      });
    });

    const dn = this.querySelector(".ca-dn");
    const up = this.querySelector(".ca-up");
    if (dn) dn.addEventListener("click", e => { e.stopPropagation(); this._setTemp(-1); });
    if (up) up.addEventListener("click", e => { e.stopPropagation(); this._setTemp(+1); });

    this.querySelectorAll(".ca-fm").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); this._setFanMode(b.dataset.mode); })
    );

    const sel = this.querySelector(".ca-bal-sel");
    if (sel) sel.addEventListener("change", e => this._setBalance(e.target.value));
  }
}

customElements.define("esphome-comfoair-card", ESPHomeComfoAirCard);

window.customCards ??= [];
window.customCards.push({
  type:        "esphome-comfoair-card",
  name:        "ComfoAir Card",
  description: "Counter-flow heat-exchanger diagram with temperature-coloured ribbons and animated airflow.",
  preview:     false,
});

})();
