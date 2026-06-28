/*
 * ESPHome ComfoAir Lovelace card
 * Counter-flow heat-exchanger diagram with temperature-coloured airflow ribbons.
 *
 * Installation: ships with the integration — no manual resource registration needed.
 * Add a card of type "custom:esphome-comfoair-card" to a dashboard.
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
};

const FAN_MODE_LABELS = { off: "Away", low: "Low", medium: "Medium", high: "High" };

const FAN_BALANCE_LABELS = {
  balanced:     "Balanced",
  supply_only:  "Supply only",
  exhaust_only: "Exhaust only",
};

function _tempColor(celsius) {
  const frac = Math.max(0, Math.min(1, (celsius + 15) / 50));
  return `hsl(${Math.round(240 - frac * 240)},72%,50%)`;
}

const _BLADE_PATH = "M 0,0 C -1,-4 -4,-8 0,-10 C 4,-8 3,-3 0,0 Z";

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

  getCardSize() { return 7; }

  _st(id) {
    if (!id || !this._hass) return undefined;
    return this._hass.states[id];
  }

  _raw(id) {
    const s = this._st(id);
    if (!s || s.state === "unknown" || s.state === "unavailable") return null;
    const n = parseFloat(s.state);
    return Number.isNaN(n) ? null : n;
  }

  _num(id, d = 1) {
    const s = this._st(id);
    if (!s || s.state === "unknown" || s.state === "unavailable") return "—";
    const n = parseFloat(s.state);
    if (Number.isNaN(n)) return s.state;
    const u = s.attributes.unit_of_measurement || "";
    return `${n.toFixed(d)}${u ? " " + u : ""}`;
  }

  _text(id) {
    const s = this._st(id);
    return (!s || s.state === "unknown" || s.state === "unavailable") ? "—" : s.state;
  }

  _isOn(id) {
    const s = this._st(id);
    return s ? s.state === "on" : false;
  }

  _color(id) {
    const v = this._raw(id);
    return v != null ? _tempColor(v) : "var(--secondary-text-color)";
  }

  _esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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

  _signature() {
    const keys = [
      "climate", "outside_temp", "supply_temp", "return_temp", "exhaust_temp",
      "supply_level", "return_level", "supply_fan", "return_fan",
      "bypass", "summer_mode", "preheating", "filter_status", "fan_balance",
    ];
    return keys.map(k => {
      const s = this._st(this._cfg[k]);
      if (!s) return `${k}:null`;
      const x = k === "climate"
        ? `${s.attributes.temperature}/${s.attributes.fan_mode}` : "";
      return `${k}:${s.state}:${x}`;
    }).join("|");
  }

  _render() {
    if (!this._hass || !this._cfg) return;
    const sig = this._signature();
    if (this._built && sig === this._sig) return;
    this._sig = sig;

    const cfg      = this._cfg;
    const climate  = this._st(cfg.climate);
    const target   = climate?.attributes.temperature;
    const current  = climate?.attributes.current_temperature;
    const fanMode  = climate?.attributes.fan_mode;
    const fanModes = climate?.attributes.fan_modes ?? ["off", "low", "medium", "high"];
    const fanModeLabel = FAN_MODE_LABELS[fanMode] ??
      (fanMode ? fanMode[0].toUpperCase() + fanMode.slice(1) : "—");

    const supplyRpm = this._raw(cfg.supply_fan) ?? 0;
    const returnRpm = this._raw(cfg.return_fan) ?? 0;
    const sDur = supplyRpm > 0 ? Math.max(0.2, Math.min(10, 60 / supplyRpm)).toFixed(2) : null;
    const rDur = returnRpm > 0 ? Math.max(0.2, Math.min(10, 60 / returnRpm)).toFixed(2) : null;

    const outsideC = this._color(cfg.outside_temp);
    const supplyC  = this._color(cfg.supply_temp);
    const returnC  = this._color(cfg.return_temp);
    const exhaustC = this._color(cfg.exhaust_temp);

    const supplyLvl  = this._raw(cfg.supply_level);
    const returnLvl  = this._raw(cfg.return_level);
    const filterFull = this._text(cfg.filter_status).toLowerCase() === "full";

    this.innerHTML = `
<ha-card>
<style>
  .ca { padding: 8px 16px 16px; }
  .ca-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .ca-title { font-size: 1.1em; font-weight: 600; }
  .ca-subtitle { font-size: .82em; color: var(--secondary-text-color); margin-top: 1px; }
  .ca-corners { display: flex; justify-content: space-between; padding: 0 2px; }
  .ca-corner { display: flex; flex-direction: column; max-width: 46%; cursor: pointer; }
  .ca-corner-r { align-items: flex-end; text-align: right; }
  .ca-temp-big { font-size: 1.4em; font-weight: 700; line-height: 1.15; }
  .ca-air-lbl {
    font-size: .68em; color: var(--secondary-text-color);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .ca-stat { font-size: .78em; color: var(--secondary-text-color); }
  .ca-svg { width: 100%; display: block; }
  .ca-levels { display: flex; gap: 6px; margin: 8px 0 6px; }
  .ca-level {
    flex: 1; padding: 6px 0; border-radius: 6px; cursor: pointer;
    font-size: .88em; border: 1px solid var(--divider-color);
    background: var(--card-background-color); color: var(--primary-text-color);
  }
  .ca-level.on {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color);
  }
  .ca-ctrl { display: flex; align-items: center; gap: 6px; margin: 2px 0 6px; cursor: pointer; }
  .ca-setpoint { font-size: 1.3em; font-weight: 700; min-width: 46px; text-align: center; }
  .ca-cur { font-size: .85em; color: var(--secondary-text-color); }
  .ca-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0; }
  .ca-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 14px; font-size: .85em; cursor: pointer;
    background: var(--secondary-background-color);
  }
  .ca-chip.on   { color: var(--state-active-color, var(--primary-color)); }
  .ca-chip.warn { color: var(--error-color); }
  .ca-balance { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .ca-balance select {
    flex: 1; padding: 6px; border-radius: 6px; font-size: .9em;
    background: var(--card-background-color); color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
</style>
<div class="ca">

  <div class="ca-hdr">
    <div>
      <div class="ca-title">${this._esc(cfg.title)}</div>
      <div class="ca-subtitle">● ${this._esc(fanModeLabel)}</div>
    </div>
  </div>

  <!-- top corners: Outside Air (left) | Return Air (right) -->
  <div class="ca-corners">
    <div class="ca-corner" data-e="${cfg.outside_temp}">
      ${supplyRpm > 0 ? `<span class="ca-stat">⚙ ${supplyRpm.toFixed(0)} rpm</span>` : ""}
      <span class="ca-temp-big" style="color:${outsideC}">${this._esc(this._num(cfg.outside_temp))}</span>
      <span class="ca-air-lbl">Outside Air</span>
    </div>
    <div class="ca-corner ca-corner-r" data-e="${cfg.return_temp}">
      ${returnLvl != null ? `<span class="ca-stat">⊙ ${returnLvl.toFixed(0)} %</span>` : ""}
      <span class="ca-temp-big" style="color:${returnC}">${this._esc(this._num(cfg.return_temp))}</span>
      <span class="ca-air-lbl">Return Air</span>
    </div>
  </div>

  ${this._svg({ outsideC, supplyC, returnC, exhaustC, sDur, rDur, cfg })}

  <!-- bottom corners: Exhaust Air (left) | Supply Air (right) -->
  <div class="ca-corners">
    <div class="ca-corner" data-e="${cfg.exhaust_temp}">
      <span class="ca-air-lbl">Exhaust Air</span>
      <span class="ca-temp-big" style="color:${exhaustC}">${this._esc(this._num(cfg.exhaust_temp))}</span>
      ${returnRpm > 0 ? `<span class="ca-stat">⚙ ${returnRpm.toFixed(0)} rpm</span>` : ""}
    </div>
    <div class="ca-corner ca-corner-r" data-e="${cfg.supply_temp}">
      <span class="ca-air-lbl">Supply Air</span>
      <span class="ca-temp-big" style="color:${supplyC}">${this._esc(this._num(cfg.supply_temp))}</span>
      ${supplyLvl != null ? `<span class="ca-stat">⊙ ${supplyLvl.toFixed(0)} %</span>` : ""}
    </div>
  </div>

  <div class="ca-levels">
    ${fanModes.map(m => {
      const lbl = FAN_MODE_LABELS[m] ?? (m[0].toUpperCase() + m.slice(1));
      return `<button class="ca-level${m === fanMode ? " on" : ""}" data-mode="${this._esc(m)}">${this._esc(lbl)}</button>`;
    }).join("")}
  </div>

  <div class="ca-ctrl" data-e="${cfg.climate}">
    <ha-icon-button class="ca-down" label="Lower temperature">
      <ha-icon icon="mdi:minus"></ha-icon>
    </ha-icon-button>
    <span class="ca-setpoint">${target != null ? target + "°" : "—"}</span>
    <ha-icon-button class="ca-up" label="Raise temperature">
      <ha-icon icon="mdi:plus"></ha-icon>
    </ha-icon-button>
    <span class="ca-cur">${current != null ? "now " + current + "°" : ""}</span>
  </div>

  <div class="ca-row">
    ${this._chip(cfg.bypass, this._isOn(cfg.bypass), false,
        "mdi:valve", "Bypass " + (this._isOn(cfg.bypass) ? "open" : "closed"))}
    ${this._chip(cfg.summer_mode, this._isOn(cfg.summer_mode), false,
        "mdi:weather-sunny", this._isOn(cfg.summer_mode) ? "Summer" : "Winter")}
    ${this._chip(cfg.preheating, this._isOn(cfg.preheating), false,
        "mdi:heating-coil", "Preheat " + (this._isOn(cfg.preheating) ? "on" : "off"))}
    ${this._chip(cfg.filter_status, false, filterFull,
        "mdi:air-filter", "Filter " + this._text(cfg.filter_status))}
  </div>

  ${this._renderBalance()}

</div>
</ha-card>`;

    this._wire();
    this._built = true;
  }

  _chip(id, on, warn, icon, label) {
    const cls = warn ? "ca-chip warn" : on ? "ca-chip on" : "ca-chip";
    return `<span class="${cls}" data-e="${id}">` +
      `<ha-icon icon="${icon}"></ha-icon>${this._esc(label)}</span>`;
  }

  // ── SVG airflow diagram ─────────────────────────────────────────────────
  //
  //  viewBox 0 0 300 100    stroke-width 36
  //
  //  Supply ribbon  (Outside → Supply):  M 0,25 H 80 L 220,75 H 300   TL → BR
  //  Exhaust ribbon (Return  → Exhaust): M 300,25 H 220 L 80,75 H 0   TR → BL
  //
  //  The two paths cross at (150, 50).
  //  Spinning fan icons sit on the top flat segments (near each inlet).
  //  Directional chevrons on the bottom flat segments show flow direction.

  _svg({ outsideC, supplyC, returnC, exhaustC, sDur, rDur, cfg }) {
    const W  = 300, H = 100;
    const pt = 25;    // y of top flat segments
    const pb = 75;    // y of bottom flat segments
    const kl = 80;    // x: left kink (horizontal → diagonal)
    const kr = 220;   // x: right kink

    // Fan positions: ⅔ along each top flat segment from the node edge
    const fSX = Math.round(kl * 2 / 3);           // supply fan  (~53, on TL seg)
    const fRX = Math.round(W - (W - kr) * 2 / 3); // return fan  (~247, on TR seg)

    const blades = (color) => [0, 120, 240].map(a =>
      `<path d="${_BLADE_PATH}" fill="${color}" transform="rotate(${a})"/>`
    ).join("");

    const anim = (dur) => dur
      ? `<animateTransform attributeName="transform" type="rotate"
           from="0 0 0" to="360 0 0" dur="${dur}s"
           repeatCount="indefinite" additive="sum"/>`
      : "";

    const fan = (x, y, color, dur, eid) =>
      `<g transform="translate(${x} ${y})" data-e="${eid}" style="cursor:pointer">
        <circle r="12" fill="var(--card-background-color)" opacity="0.78"/>
        ${blades(color)}
        <circle r="2" fill="${color}"/>
        ${anim(dur)}
      </g>`;

    // Chevron pointing right → (tip at right)
    const chevR = (x, y) =>
      `<polygon points="${x-9},${y-8} ${x+9},${y} ${x-9},${y+8}" fill="rgba(255,255,255,0.30)"/>`;
    // Chevron pointing left ← (tip at left)
    const chevL = (x, y) =>
      `<polygon points="${x+9},${y-8} ${x-9},${y} ${x+9},${y+8}" fill="rgba(255,255,255,0.30)"/>`;

    // Midpoints of the bottom flat segments
    const midBR = Math.round(kr + (W - kr) / 2);   // ~260, supply bottom seg
    const midBL = Math.round(kl / 2);               //  ~40, exhaust bottom seg

    return `<svg class="ca-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="ComfoAir airflow diagram">
  <defs>
    <linearGradient id="eca-sg" gradientUnits="userSpaceOnUse"
        x1="0" y1="${pt}" x2="${W}" y2="${pb}">
      <stop offset="0%"   stop-color="${outsideC}"/>
      <stop offset="100%" stop-color="${supplyC}"/>
    </linearGradient>
    <linearGradient id="eca-rg" gradientUnits="userSpaceOnUse"
        x1="${W}" y1="${pt}" x2="0" y2="${pb}">
      <stop offset="0%"   stop-color="${returnC}"/>
      <stop offset="100%" stop-color="${exhaustC}"/>
    </linearGradient>
  </defs>

  <!-- exhaust ribbon: Return(TR) → Exhaust(BL) — drawn first (behind) -->
  <path d="M${W},${pt} H${kr} L${kl},${pb} H0"
    fill="none" stroke="url(#eca-rg)" stroke-width="36"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- supply ribbon: Outside(TL) → Supply(BR) — drawn on top -->
  <path d="M0,${pt} H${kl} L${kr},${pb} H${W}"
    fill="none" stroke="url(#eca-sg)" stroke-width="36"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- directional chevrons on the bottom flat segments -->
  ${chevR(midBR, pb)}
  ${chevL(midBL, pb)}

  <!-- spinning fan icons on the top flat segments -->
  ${fan(fSX, pt, outsideC, sDur, cfg.supply_fan)}
  ${fan(fRX, pt, returnC,  rDur, cfg.return_fan)}
</svg>`;
  }

  _renderBalance() {
    const s = this._st(this._cfg.fan_balance);
    if (!s) return "";
    const options = s.attributes.options ?? ["balanced", "supply_only", "exhaust_only"];
    const opts = options.map(o => {
      const lbl = FAN_BALANCE_LABELS[o] ?? o;
      return `<option value="${this._esc(o)}"${o === s.state ? " selected" : ""}>${this._esc(lbl)}</option>`;
    }).join("");
    return `<div class="ca-balance">
      <ha-icon icon="mdi:fan"></ha-icon>
      <span>Fan balance</span>
      <select class="ca-bal-sel">${opts}</select>
    </div>`;
  }

  _wire() {
    this.querySelectorAll("[data-e]").forEach(el => {
      const id = el.getAttribute("data-e");
      if (!id) return;
      el.addEventListener("click", ev => {
        if (ev.target.closest(".ca-ctrl") || ev.target.closest(".ca-balance")) return;
        this._moreInfo(id);
      });
    });

    this.querySelectorAll(".ca-level").forEach(b =>
      b.addEventListener("click", e => {
        e.stopPropagation();
        this._setFanMode(b.dataset.mode);
      })
    );

    const down = this.querySelector(".ca-down");
    const up   = this.querySelector(".ca-up");
    if (down) down.addEventListener("click", e => { e.stopPropagation(); this._setTemp(-1); });
    if (up)   up.addEventListener("click",   e => { e.stopPropagation(); this._setTemp(+1); });

    const sel = this.querySelector(".ca-bal-sel");
    if (sel) sel.addEventListener("change", e => this._setBalance(e.target.value));
  }
}

customElements.define("esphome-comfoair-card", ESPHomeComfoAirCard);

window.customCards ??= [];
window.customCards.push({
  type:        "esphome-comfoair-card",
  name:        "ComfoAir Card",
  description: "Counter-flow heat-exchanger diagram with temperature-coloured airflow ribbons, animated fan icons, and ventilation controls.",
  preview:     false,
});

})();
