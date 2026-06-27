/*
 * ComfoAir Lovelace card — SVG airflow diagram
 * ─────────────────────────────────────────────
 * A self-contained (no build step) custom card that visualises the
 * ventilation unit with a counter-flow heat-exchanger diagram:
 *   • four air temperatures colour-coded from blue (cold) to red (warm)
 *   • two fan icons that spin proportionally to RPM via SMIL animation
 *   • ventilation level buttons (Away / Low / Medium / High)
 *   • comfort setpoint with − / + controls
 *   • status chips (bypass, summer mode, preheating, filter)
 *   • optional Fan Balance select (rendered only when `fan_balance` is configured)
 *
 * All entity ids are configurable; the defaults assume a device slug of
 * "comfoair" and must usually be edited to match the actual device name.
 *
 * Fan speed animation uses the RPM sensors.  Point `supply_fan` /
 * `return_fan` at `sensor.comfoair_supply_fan_speed_rpm` (or the `_speed`
 * percentage variant if RPM sensors are unavailable — the animation will
 * still work, just scaled differently).
 *
 * Installation: none — the card ships with the integration, which serves it
 * at /comfoair/comfoair-card.js and loads it into the frontend automatically.
 * Add a card of type "custom:comfoair-card" to a dashboard.
 */

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
  fan_balance:   null,   // optional, e.g. "select.comfoair_fan_balance"
  temp_step:     1,
};

const FAN_MODE_LABELS = { off: "Away", low: "Low", medium: "Medium", high: "High" };

const FAN_BALANCE_LABELS = {
  balanced:     "Balanced",
  supply_only:  "Supply only",
  exhaust_only: "Exhaust only",
};

// Maps a temperature in °C to an HSL colour string.
// -15 °C → blue (hue 240), +10 °C → cyan-green (hue 120), +35 °C → red (hue 0).
function _tempColor(celsius) {
  const frac = Math.max(0, Math.min(1, (celsius + 15) / 50));
  return `hsl(${Math.round(240 - frac * 240)},72%,50%)`;
}

// SVG 3-blade fan path (blades sweep clockwise from the top).
// Drawn at local (0,0) so <animateTransform> can rotate it in place.
const _BLADE_PATH =
  "M 0,0 C -1,-4 -4,-8 0,-10 C 4,-8 3,-3 0,0 Z";

class ComfoAirCard extends HTMLElement {
  setConfig(config) {
    this._cfg  = { ...DEFAULTS, ...(config || {}) };
    this._built = false;
    this._sig   = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 6; }

  // ── helpers ──────────────────────────────────────────────────────────────

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

  // ── actions ──────────────────────────────────────────────────────────────

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

  _cycleFanMode() {
    const s = this._st(this._cfg.climate);
    if (!s) return;
    const modes = s.attributes.fan_modes || ["off", "low", "medium", "high"];
    const idx = modes.indexOf(s.attributes.fan_mode);
    this._setFanMode(modes[(idx + 1) % modes.length]);
  }

  _setBalance(option) {
    this._hass.callService("select", "select_option", {
      entity_id: this._cfg.fan_balance, option,
    });
  }

  // ── change detection ─────────────────────────────────────────────────────

  _signature() {
    const keys = [
      "climate", "outside_temp", "supply_temp", "return_temp", "exhaust_temp",
      "supply_level", "return_level", "supply_fan", "return_fan",
      "bypass", "summer_mode", "preheating", "filter_status", "fan_balance",
    ];
    return keys.map(k => {
      const s = this._st(this._cfg[k]);
      if (!s) return `${k}:∅`;
      const x = k === "climate"
        ? `${s.attributes.temperature}/${s.attributes.fan_mode}` : "";
      return `${k}:${s.state}:${x}`;
    }).join("|");
  }

  // ── render ───────────────────────────────────────────────────────────────

  _render() {
    if (!this._hass || !this._cfg) return;
    const sig = this._signature();
    if (this._built && sig === this._sig) return;
    this._sig = sig;

    const cfg     = this._cfg;
    const climate = this._st(cfg.climate);
    const target  = climate?.attributes.temperature;
    const current = climate?.attributes.current_temperature;
    const fanMode = climate?.attributes.fan_mode;
    const fanModes = climate?.attributes.fan_modes ?? ["off", "low", "medium", "high"];

    const supplyRpm = this._raw(cfg.supply_fan) ?? 0;
    const returnRpm = this._raw(cfg.return_fan) ?? 0;
    // Rotation period: clamp to [0.2s, 10s].  60/rpm = seconds per revolution.
    const sDur = supplyRpm > 0 ? Math.max(0.2, Math.min(10, 60 / supplyRpm)).toFixed(2) : null;
    const rDur = returnRpm > 0 ? Math.max(0.2, Math.min(10, 60 / returnRpm)).toFixed(2) : null;

    const outsideC = this._color(cfg.outside_temp);
    const supplyC  = this._color(cfg.supply_temp);
    const returnC  = this._color(cfg.return_temp);
    const exhaustC = this._color(cfg.exhaust_temp);

    const filterFull = this._text(cfg.filter_status).toLowerCase() === "full";

    this.innerHTML = `
<ha-card header="${this._esc(cfg.title)}">
<style>
  .ca { padding: 8px 16px 16px; }
  .ca-svg { width: 100%; display: block; }
  .ca-node { cursor: pointer; }
  .ca-levels { display: flex; gap: 6px; margin: 6px 0; }
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
  .ca-ctrl {
    display: flex; align-items: center; gap: 6px; margin: 2px 0 6px;
    cursor: pointer;
  }
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
  .ca-levels-row { display: flex; justify-content: space-between;
                   font-size: .82em; color: var(--secondary-text-color); margin: 0 0 6px; }
  .ca-balance { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .ca-balance select {
    flex: 1; padding: 6px; border-radius: 6px; font-size: .9em;
    background: var(--card-background-color); color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
</style>
<div class="ca">
  ${this._svg({ outsideC, supplyC, returnC, exhaustC, sDur, rDur, cfg })}
  <div class="ca-levels-row">
    <span data-e="${cfg.supply_level}">Supply: ${this._num(cfg.supply_level, 0)}</span>
    <span data-e="${cfg.return_level}">Return: ${this._num(cfg.return_level, 0)}</span>
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
    <span class="ca-cur">${current != null ? "now " + current + "°" : ""}</span>
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

  // ── SVG airflow diagram ───────────────────────────────────────────────────
  //
  // Layout (viewBox 0 0 300 210):
  //
  //   [outside 45,38]               [supply 255,38]
  //         \   (supply fan≈87,63)      /
  //          \                         /
  //       [unit box: 110,72 → 190,128]
  //          /                         \
  //         /   (return fan≈212,147)    \
  //   [exhaust 45,172]              [return 255,172]
  //
  // Supply (fresh-air) path: outside→unit TL→(cross)→unit TR→supply
  // Exhaust (stale-air) path: return→unit BR→(cross)→unit BL→exhaust
  // The X-crossing inside the unit symbolises the counter-flow heat exchanger.

  _svg({ outsideC, supplyC, returnC, exhaustC, sDur, rDur, cfg }) {
    // Node centres
    const NO  = [45,  38];   // outside
    const NSP = [255, 38];   // supply
    const NEX = [45,  172];  // exhaust
    const NRE = [255, 172];  // return

    // Unit box
    const UX = 110, UY = 72, UW = 80, UH = 56;

    // Points where legs touch the unit corners (inset by 6px)
    const TL = [UX,       UY + 6];
    const TR = [UX + UW,  UY + 6];
    const BL = [UX,       UY + UH - 6];
    const BR = [UX + UW,  UY + UH - 6];

    // Leg start/end (offset from node centre so text can sit next to it)
    const OSout = [NO[0] + 20, NO[1] + 8];  // outside → TL
    const SPout = [NSP[0] - 20, NSP[1] + 8]; // TR → supply
    const REout = [NRE[0] - 20, NRE[1] - 8]; // return → BR
    const EXout = [NEX[0] + 20, NEX[1] - 8]; // BL → exhaust

    // Fan icon centres (⅔ along the leg, closer to the unit)
    const fSX = Math.round((OSout[0] + 2 * TL[0]) / 3);
    const fSY = Math.round((OSout[1] + 2 * TL[1]) / 3);
    const fRX = Math.round((REout[0] + 2 * BR[0]) / 3);
    const fRY = Math.round((REout[1] + 2 * BR[1]) / 3);

    const fan = (x, y, color, dur, entityId) => {
      const blades = [0, 120, 240].map(a =>
        `<path d="${_BLADE_PATH}" fill="${color}" transform="rotate(${a})"/>`
      ).join("");
      const anim = dur
        ? `<animateTransform attributeName="transform" type="rotate"
             from="0 0 0" to="360 0 0" dur="${dur}s"
             repeatCount="indefinite" additive="sum"/>`
        : "";
      return `<g transform="translate(${x} ${y})" class="ca-node" data-e="${entityId}">
        ${blades}
        <circle cx="0" cy="0" r="2" fill="${color}"/>
        ${anim}
      </g>`;
    };

    return `<svg class="ca-svg" viewBox="0 0 300 210" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="ComfoAir airflow diagram">

  <!-- ── outside → unit (supply path, fresh air) ── -->
  <line x1="${OSout[0]}" y1="${OSout[1]}" x2="${TL[0]}" y2="${TL[1]}"
    stroke="${outsideC}" stroke-width="3" stroke-linecap="round"/>
  <!-- ── unit → supply (supply path, heated air) ── -->
  <line x1="${TR[0]}" y1="${TR[1]}" x2="${SPout[0]}" y2="${SPout[1]}"
    stroke="${supplyC}" stroke-width="3" stroke-linecap="round"/>
  <!-- ── return → unit (stale-air path) ── -->
  <line x1="${REout[0]}" y1="${REout[1]}" x2="${BR[0]}" y2="${BR[1]}"
    stroke="${returnC}" stroke-width="3" stroke-linecap="round"/>
  <!-- ── unit → exhaust (cooled stale air) ── -->
  <line x1="${BL[0]}" y1="${BL[1]}" x2="${EXout[0]}" y2="${EXout[1]}"
    stroke="${exhaustC}" stroke-width="3" stroke-linecap="round"/>

  <!-- unit box -->
  <rect x="${UX}" y="${UY}" width="${UW}" height="${UH}" rx="6"
    fill="var(--card-background-color)" stroke="var(--divider-color)" stroke-width="2"/>

  <!-- counter-flow crossing (heat exchanger symbol) -->
  <line x1="${TL[0]}" y1="${TL[1]}" x2="${BR[0]}" y2="${BR[1]}"
    stroke="${outsideC}" stroke-width="2" opacity="0.45"/>
  <line x1="${TR[0]}" y1="${TR[1]}" x2="${BL[0]}" y2="${BL[1]}"
    stroke="${returnC}" stroke-width="2" opacity="0.45"/>

  <!-- fan icons -->
  ${fan(fSX, fSY, outsideC, sDur, cfg.supply_fan)}
  ${fan(fRX, fRY, returnC,  rDur, cfg.return_fan)}

  <!-- temperature nodes (clickable) -->
  <g class="ca-node" data-e="${cfg.outside_temp}">
    <text x="${NO[0]}" y="${NO[1] - 10}" text-anchor="middle"
      fill="var(--secondary-text-color)" font-size="9">Outside</text>
    <text x="${NO[0]}" y="${NO[1] + 5}" text-anchor="middle"
      fill="${outsideC}" font-size="14" font-weight="600">${this._esc(this._num(cfg.outside_temp))}</text>
  </g>
  <g class="ca-node" data-e="${cfg.supply_temp}">
    <text x="${NSP[0]}" y="${NSP[1] - 10}" text-anchor="middle"
      fill="var(--secondary-text-color)" font-size="9">Supply</text>
    <text x="${NSP[0]}" y="${NSP[1] + 5}" text-anchor="middle"
      fill="${supplyC}" font-size="14" font-weight="600">${this._esc(this._num(cfg.supply_temp))}</text>
  </g>
  <g class="ca-node" data-e="${cfg.exhaust_temp}">
    <text x="${NEX[0]}" y="${NEX[1] - 4}" text-anchor="middle"
      fill="${exhaustC}" font-size="14" font-weight="600">${this._esc(this._num(cfg.exhaust_temp))}</text>
    <text x="${NEX[0]}" y="${NEX[1] + 11}" text-anchor="middle"
      fill="var(--secondary-text-color)" font-size="9">Exhaust</text>
  </g>
  <g class="ca-node" data-e="${cfg.return_temp}">
    <text x="${NRE[0]}" y="${NRE[1] - 4}" text-anchor="middle"
      fill="${returnC}" font-size="14" font-weight="600">${this._esc(this._num(cfg.return_temp))}</text>
    <text x="${NRE[0]}" y="${NRE[1] + 11}" text-anchor="middle"
      fill="var(--secondary-text-color)" font-size="9">Return</text>
  </g>
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

  // ── event wiring ─────────────────────────────────────────────────────────

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

customElements.define("comfoair-card", ComfoAirCard);

window.customCards ??= [];
window.customCards.push({
  type:        "comfoair-card",
  name:        "ComfoAir Card",
  description: "SVG counter-flow heat-exchanger diagram with colour-coded temperatures, animated fan icons, ventilation level buttons, status chips and optional Fan Balance.",
  preview:     false,
});
