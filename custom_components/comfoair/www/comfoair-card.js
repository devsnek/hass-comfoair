/*
 * ComfoAir Lovelace card
 * -----------------------
 * A self-contained (no build step) custom card that replicates the
 * lovelace-hacomfoairmqtt visualization for this integration:
 * a ventilation-unit diagram with the four air temperatures, the supply/return
 * air levels, and status indicators (bypass, summer mode, filter, preheating),
 * plus controls for the comfort setpoint and the Fan Balance select.
 *
 * All entity ids are configurable because they depend on the device name; the
 * defaults below assume a device slug of "comfoair" and must usually be edited.
 *
 * Installation: none. The card ships with the integration, which serves it at
 * /comfoair/comfoair-card.js and loads it into the frontend automatically.
 * Just add a card of type "custom:comfoair-card" to a dashboard.
 */

const DEFAULTS = {
  title: "ComfoAir",
  climate: "climate.comfoair",
  outside_temp: "sensor.comfoair_outside_air_temperature",
  supply_temp: "sensor.comfoair_supply_air_temperature",
  return_temp: "sensor.comfoair_return_air_temperature",
  exhaust_temp: "sensor.comfoair_exhaust_air_temperature",
  supply_level: "sensor.comfoair_supply_air_level",
  return_level: "sensor.comfoair_return_air_level",
  intake_fan: "sensor.comfoair_supply_fan_speed",
  exhaust_fan: "sensor.comfoair_return_fan_speed",
  bypass: "binary_sensor.comfoair_bypass_valve_open",
  summer_mode: "binary_sensor.comfoair_summer_mode",
  preheating: "binary_sensor.comfoair_preheating_state",
  filter_status: "sensor.comfoair_filter_status",
  fan_balance: "select.comfoair_fan_balance",
  temp_step: 1,
};

// Display labels for the climate fan modes (the ComfoAir ventilation levels).
const FAN_MODE_LABELS = { off: "Away", low: "Low", medium: "Medium", high: "High" };

// Fan Balance select option slugs -> display labels (the integration exposes
// slug option values; names are localized via translations).
const FAN_BALANCE_LABELS = {
  balanced: "Balanced",
  supply_only: "Supply only",
  exhaust_only: "Exhaust only",
};

class ComfoAirCard extends HTMLElement {
  setConfig(config) {
    // Merge user config over the defaults so any omitted entity falls back.
    this._config = { ...DEFAULTS, ...(config || {}) };
    this._built = false;
    this._lastSignature = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  // ---- helpers ------------------------------------------------------------

  _state(entityId) {
    if (!entityId || !this._hass) return undefined;
    return this._hass.states[entityId];
  }

  _num(entityId, digits = 1) {
    const s = this._state(entityId);
    if (!s || s.state === "unknown" || s.state === "unavailable" || s.state === "")
      return "—";
    const n = Number(s.state);
    if (Number.isNaN(n)) return s.state;
    const unit = s.attributes.unit_of_measurement || "";
    return `${n.toFixed(digits)}${unit ? " " + unit : ""}`;
  }

  _text(entityId) {
    const s = this._state(entityId);
    if (!s || s.state === "unknown" || s.state === "unavailable" || s.state === "")
      return "—";
    return s.state;
  }

  _isOn(entityId) {
    const s = this._state(entityId);
    return s ? s.state === "on" : false;
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  // ---- actions ------------------------------------------------------------

  _setTemp(delta) {
    const c = this._config.climate;
    const s = this._state(c);
    if (!s) return;
    const cur = Number(s.attributes.temperature);
    if (Number.isNaN(cur)) return;
    const next = cur + delta * Number(this._config.temp_step || 1);
    this._hass.callService("climate", "set_temperature", {
      entity_id: c,
      temperature: next,
    });
  }

  _setFanBalance(option) {
    this._hass.callService("select", "select_option", {
      entity_id: this._config.fan_balance,
      option,
    });
  }

  // Set the ventilation level via the climate fan mode (off/low/medium/high),
  // which the coordinator maps to CMD_SET_LEVEL. This is what actually changes
  // the fan speed — the fan-speed sensors themselves are read-only.
  _setFanMode(mode) {
    if (!mode) return;
    this._hass.callService("climate", "set_fan_mode", {
      entity_id: this._config.climate,
      fan_mode: mode,
    });
  }

  // Advance to the next ventilation level, wrapping around (used when the fan
  // area is clicked).
  _cycleFanMode() {
    const s = this._state(this._config.climate);
    if (!s) return;
    const modes = s.attributes.fan_modes || ["off", "low", "medium", "high"];
    if (!modes.length) return;
    const idx = modes.indexOf(s.attributes.fan_mode);
    this._setFanMode(modes[(idx + 1) % modes.length]);
  }

  // ---- rendering ----------------------------------------------------------

  _signature() {
    // Re-render only when something we display actually changed.
    const ids = [
      "climate", "outside_temp", "supply_temp", "return_temp", "exhaust_temp",
      "supply_level", "return_level", "intake_fan", "exhaust_fan",
      "bypass", "summer_mode", "preheating", "filter_status", "fan_balance",
    ];
    const parts = ids.map((k) => {
      const s = this._state(this._config[k]);
      if (!s) return `${k}:∅`;
      const t = k === "climate"
        ? `${s.attributes.temperature}/${s.attributes.fan_mode}`
        : "";
      return `${k}:${s.state}:${t}`;
    });
    return parts.join("|");
  }

  _render() {
    if (!this._hass || !this._config) return;
    const sig = this._signature();
    if (this._built && sig === this._lastSignature) return;
    this._lastSignature = sig;

    const cfg = this._config;
    const climate = this._state(cfg.climate);
    const target = climate ? climate.attributes.temperature : undefined;
    const current = climate ? climate.attributes.current_temperature : undefined;

    const filterFull = this._text(cfg.filter_status).toLowerCase() === "full";

    this.innerHTML = `
      <ha-card header="${this._escape(cfg.title)}">
        <style>
          .ca-wrap { padding: 8px 16px 16px; }
          .ca-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            grid-template-rows: auto auto;
            gap: 8px 12px;
            align-items: center;
            margin: 8px 0 12px;
          }
          .ca-port { display: flex; flex-direction: column; cursor: pointer; }
          .ca-port .lbl { font-size: 0.8em; color: var(--secondary-text-color); }
          .ca-port .val { font-size: 1.3em; font-weight: 600; }
          .ca-right { text-align: right; }
          .ca-unit {
            grid-row: 1 / span 2;
            text-align: center;
            border: 2px solid var(--divider-color);
            border-radius: 10px;
            padding: 10px 14px;
            min-width: 96px;
          }
          .ca-unit .set { font-size: 1.6em; font-weight: 700; }
          .ca-unit .cur { font-size: 0.85em; color: var(--secondary-text-color); }
          .ca-tempbtns {
            margin-top: 6px;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 8px;
          }
          .ca-tempbtns ha-icon-button { --mdc-icon-button-size: 32px; }
          .ca-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
          .ca-chip {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 4px 10px; border-radius: 16px;
            background: var(--secondary-background-color);
            font-size: 0.9em; cursor: pointer;
          }
          .ca-chip.on { color: var(--state-active-color, var(--primary-color)); }
          .ca-chip.warn { color: var(--error-color); }
          .ca-levels { display: flex; gap: 6px; margin: 4px 0 8px; }
          .ca-level {
            flex: 1; padding: 6px 0; border-radius: 6px;
            border: 1px solid var(--divider-color);
            background: var(--card-background-color);
            color: var(--primary-text-color);
            cursor: pointer; font-size: 0.9em;
          }
          .ca-level.on {
            background: var(--primary-color);
            color: var(--text-primary-color, #fff);
            border-color: var(--primary-color);
          }
          .ca-fans { display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.95em; }
          .ca-fan-cycle { cursor: pointer; }
          .ca-balance { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
          .ca-balance select {
            flex: 1; padding: 6px; border-radius: 6px;
            background: var(--card-background-color);
            color: var(--primary-text-color);
            border: 1px solid var(--divider-color);
          }
        </style>
        <div class="ca-wrap">
          <div class="ca-grid">
            <!-- left = outdoor side, right = indoor (house) side -->
            <div class="ca-port" data-e="${cfg.outside_temp}">
              <span class="lbl">⮕ Outside air</span>
              <span class="val">${this._num(cfg.outside_temp)}</span>
            </div>

            <div class="ca-unit" data-e="${cfg.climate}">
              <div class="cur">Comfort</div>
              <div class="set">${target != null ? target + "°" : "—"}</div>
              <div class="cur">now ${current != null ? current + "°" : "—"}</div>
              <div class="ca-tempbtns">
                <ha-icon-button class="ca-temp-down" label="Lower">
                  <ha-icon icon="mdi:minus"></ha-icon>
                </ha-icon-button>
                <ha-icon-button class="ca-temp-up" label="Raise">
                  <ha-icon icon="mdi:plus"></ha-icon>
                </ha-icon-button>
              </div>
            </div>

            <div class="ca-port ca-right" data-e="${cfg.supply_temp}">
              <span class="lbl">Supply to house ⮕</span>
              <span class="val">${this._num(cfg.supply_temp)}</span>
            </div>

            <div class="ca-port" data-e="${cfg.exhaust_temp}">
              <span class="lbl">⬅ Exhaust to outside</span>
              <span class="val">${this._num(cfg.exhaust_temp)}</span>
            </div>

            <div class="ca-port ca-right" data-e="${cfg.return_temp}">
              <span class="lbl">⬅ Return from house</span>
              <span class="val">${this._num(cfg.return_temp)}</span>
            </div>
          </div>

          ${this._renderLevels()}

          <div class="ca-fans ca-fan-cycle" title="Click to change the ventilation level">
            <span>⬆ Supply fan: ${this._num(cfg.intake_fan, 0)}</span>
            <span>⬇ Return fan: ${this._num(cfg.exhaust_fan, 0)}</span>
          </div>
          <div class="ca-fans">
            <span data-e="${cfg.supply_level}">Supply level: ${this._num(cfg.supply_level, 0)}</span>
            <span data-e="${cfg.return_level}">Return level: ${this._num(cfg.return_level, 0)}</span>
          </div>

          <div class="ca-row">
            <span class="ca-chip ${this._isOn(cfg.bypass) ? "on" : ""}" data-e="${cfg.bypass}">
              <ha-icon icon="mdi:valve"></ha-icon> Bypass ${this._isOn(cfg.bypass) ? "open" : "closed"}
            </span>
            <span class="ca-chip ${this._isOn(cfg.summer_mode) ? "on" : ""}" data-e="${cfg.summer_mode}">
              <ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._isOn(cfg.summer_mode) ? "Summer" : "Winter"}
            </span>
            <span class="ca-chip ${this._isOn(cfg.preheating) ? "on" : ""}" data-e="${cfg.preheating}">
              <ha-icon icon="mdi:heating-coil"></ha-icon> Preheat ${this._isOn(cfg.preheating) ? "on" : "off"}
            </span>
            <span class="ca-chip ${filterFull ? "warn" : ""}" data-e="${cfg.filter_status}">
              <ha-icon icon="mdi:air-filter"></ha-icon> Filter ${this._text(cfg.filter_status)}
            </span>
          </div>

          ${this._renderBalance()}
        </div>
      </ha-card>
    `;

    this._wire();
    this._built = true;
  }

  _renderLevels() {
    const s = this._state(this._config.climate);
    if (!s) return "";
    const modes = s.attributes.fan_modes || ["off", "low", "medium", "high"];
    const cur = s.attributes.fan_mode;
    const btns = modes
      .map((m) => {
        const label = FAN_MODE_LABELS[m] || m.charAt(0).toUpperCase() + m.slice(1);
        return `<button class="ca-level ${m === cur ? "on" : ""}" data-mode="${this._escape(m)}">${this._escape(label)}</button>`;
      })
      .join("");
    return `<div class="ca-levels">${btns}</div>`;
  }

  _renderBalance() {
    const s = this._state(this._config.fan_balance);
    if (!s) return "";
    const options = s.attributes.options || ["balanced", "supply_only", "exhaust_only"];
    const opts = options
      .map((o) => {
        const label = FAN_BALANCE_LABELS[o] || o;
        return `<option value="${this._escape(o)}" ${o === s.state ? "selected" : ""}>${this._escape(label)}</option>`;
      })
      .join("");
    return `
      <div class="ca-balance">
        <ha-icon icon="mdi:fan"></ha-icon>
        <span>Fan balance</span>
        <select class="ca-balance-select">${opts}</select>
      </div>`;
  }

  _wire() {
    // Click-through to more-info for any element with a data-e entity id.
    this.querySelectorAll("[data-e]").forEach((el) => {
      const id = el.getAttribute("data-e");
      if (!id) return;
      el.addEventListener("click", (ev) => {
        // Don't hijack clicks on the temp buttons / select.
        if (ev.target.closest(".ca-tempbtns") || ev.target.closest(".ca-balance"))
          return;
        this._moreInfo(id);
      });
    });

    // Ventilation level buttons (Away / Low / Medium / High).
    this.querySelectorAll(".ca-level").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        this._setFanMode(b.getAttribute("data-mode"));
      });
    });

    // Clicking the fan area cycles the ventilation level.
    const fanCycle = this.querySelector(".ca-fan-cycle");
    if (fanCycle) fanCycle.addEventListener("click", () => this._cycleFanMode());

    const down = this.querySelector(".ca-temp-down");
    const up = this.querySelector(".ca-temp-up");
    if (down) down.addEventListener("click", (e) => { e.stopPropagation(); this._setTemp(-1); });
    if (up) up.addEventListener("click", (e) => { e.stopPropagation(); this._setTemp(1); });

    const sel = this.querySelector(".ca-balance-select");
    if (sel) sel.addEventListener("change", (e) => this._setFanBalance(e.target.value));
  }

  _escape(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

customElements.define("comfoair-card", ComfoAirCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "comfoair-card",
  name: "ComfoAir Card",
  description: "Ventilation-unit diagram with temperatures, levels, status and Fan Balance control.",
});
