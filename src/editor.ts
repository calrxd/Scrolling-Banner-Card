type BannerEntity = {
  entity_id: string;
  label?: string;
  icon?: string;
  bg_color?: string;
  icon_color?: string;
  text_color?: string;
};

type ScrollingBannerConfig = {
  type: "custom:scrolling-banner-card";
  title?: string;

  entities?: BannerEntity[];

  speed?: number;
  pause_on_hover?: boolean;
  divider?: boolean;

  background?: string;
  text_color?: string;
  divider_color?: string;

  css?: string;
};

type Hass = any;

function ensureArray<T>(v: any, fallback: T[]): T[] {
  return Array.isArray(v) ? v : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asStr(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: any, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNum(v: any, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

// Try to convert any css color to a hex picker default.
// If we can't, fall back to a safe default for the input[type=color].
function colorToHexOrDefault(v: string | undefined, fallbackHex: string) {
  if (!v) return fallbackHex;
  const s = v.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  return fallbackHex;
}

class ScrollingBannerCardEditor extends HTMLElement {
  private _config?: ScrollingBannerConfig;
  private _hass?: Hass;
  private _root?: ShadowRoot;

  setConfig(config: ScrollingBannerConfig) {
    this._config = {
      type: "custom:scrolling-banner-card",
      title: asStr(config.title, ""),

      entities: ensureArray<BannerEntity>(config.entities, []),

      speed: clamp(asNum(config.speed, 40), 10, 300),
      pause_on_hover: asBool(config.pause_on_hover, true),
      divider: asBool(config.divider, true),

      background: asStr(config.background, "transparent"),
      text_color: asStr(config.text_color, "rgba(255,255,255,0.92)"),
      divider_color: asStr(config.divider_color, "rgba(255,255,255,0.14)"),

      css: asStr(config.css, ""),
    };

    this._ensureRoot();
    this._render();
  }

  set hass(hass: Hass) {
    this._hass = hass;
    // update pickers after render
    this._syncPickers();
  }

  connectedCallback() {
    this._ensureRoot();
    this._render();
  }

  private _ensureRoot() {
    if (this._root) return;
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `
      <style>
        :host { display:block; }
        .wrap {
          padding: 12px;
        }

        .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .row > * { flex: 1 1 220px; }

        .section {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .h { font-size: 12px; opacity: .8; margin: 0 0 10px 0; font-weight: 700; letter-spacing:.2px; }
        .small { font-size:12px; opacity:.8; }

        input[type="text"], input[type="number"], textarea {
          width: 100%;
          padding: 10px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.12);
          color: inherit;
          box-sizing: border-box;
          outline: none;
        }

        input[type="checkbox"] { transform: scale(1.1); }

        .btn {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.10);
          cursor: pointer;
          user-select:none;
        }

        .entities {
          display:flex;
          flex-direction: column;
          gap: 12px;
        }

        .entity-card {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.08);
        }

        .entity-head {
          display:flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .entity-title {
          font-weight: 700;
          font-size: 12px;
          opacity: .9;
        }

        .remove {
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,80,80,0.14);
          cursor:pointer;
        }

        .grid2 {
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) {
          .grid2 { grid-template-columns: 1fr; }
        }

        .colorRow {
          display:flex;
          gap: 10px;
          align-items: center;
        }
        .colorRow input[type="color"]{
          width: 44px;
          height: 38px;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .picker {
          width:100%;
          min-width: 220px;
        }
      </style>
      <div class="wrap"></div>
    `;
  }

  private _render() {
    if (!this._root) return;
    const wrap = this._root.querySelector(".wrap") as HTMLDivElement;

    // ✅ Preserve focus + selection to fix the “1 letter then blur” issue
    const active = this._root.activeElement as any;
    const activeId = active?.id || "";
    const selStart = typeof active?.selectionStart === "number" ? active.selectionStart : null;
    const selEnd = typeof active?.selectionEnd === "number" ? active.selectionEnd : null;

    const cfg = this._config;
    if (!cfg) {
      wrap.innerHTML = `<div class="small">No config yet. Add the card, then open the editor.</div>`;
      return;
    }

    const entities = ensureArray<BannerEntity>(cfg.entities, []);

    wrap.innerHTML = `
      <div class="row">
        <div>
          <div class="h">Title (optional)</div>
          <input id="title" type="text" value="${asStr(cfg.title, "")}" placeholder="e.g. Status" />
        </div>
        <div>
          <div class="h">Speed (px/sec)</div>
          <input id="speed" type="number" min="10" max="300" step="1" value="${asNum(cfg.speed, 40)}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px;">
        <label class="small"><input id="pause_on_hover" type="checkbox" ${cfg.pause_on_hover ? "checked" : ""}/> Pause on hover</label>
        <label class="small"><input id="divider" type="checkbox" ${cfg.divider ? "checked" : ""}/> Dividers</label>
      </div>

      <div class="section">
        <div class="h">Global styling</div>

        <div class="grid2">
          <div>
            <div class="h">Background</div>
            <div class="colorRow">
              <input id="background_picker" type="color" value="${colorToHexOrDefault(cfg.background, "#000000")}" />
              <input id="background" type="text" value="${asStr(cfg.background, "")}" placeholder="e.g. rgba(0,0,0,0.2) or #121212" />
            </div>
          </div>

          <div>
            <div class="h">Text color</div>
            <div class="colorRow">
              <input id="text_color_picker" type="color" value="${colorToHexOrDefault(cfg.text_color, "#ffffff")}" />
              <input id="text_color" type="text" value="${asStr(cfg.text_color, "")}" placeholder="e.g. rgba(255,255,255,0.92)" />
            </div>
          </div>

          <div>
            <div class="h">Divider color</div>
            <div class="colorRow">
              <input id="divider_color_picker" type="color" value="${colorToHexOrDefault(cfg.divider_color, "#ffffff")}" />
              <input id="divider_color" type="text" value="${asStr(cfg.divider_color, "")}" placeholder="e.g. rgba(255,255,255,0.14)" />
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="h">Entities</div>
        <div style="margin-bottom:10px;">
          <button class="btn" id="add_entity">+ Add entity</button>
        </div>
        <div class="entities">
          ${entities
            .map(
              (e, i) => `
            <div class="entity-card" data-idx="${i}">
              <div class="entity-head">
                <div class="entity-title">Item ${i + 1}</div>
                <button class="remove" data-action="remove" data-idx="${i}">Remove</button>
              </div>

              <div class="grid2">
                <div class="picker">
                  <div class="h">Entity</div>
                  <div data-picker="entity" data-idx="${i}"></div>
                  <input id="entity_id_${i}" type="text" value="${asStr(e.entity_id, "")}" placeholder="sensor.temperature" style="margin-top:8px;" />
                </div>

                <div class="picker">
                  <div class="h">Icon</div>
                  <div data-picker="icon" data-idx="${i}"></div>
                  <input id="icon_${i}" type="text" value="${asStr(e.icon, "")}" placeholder="mdi:information-outline" style="margin-top:8px;" />
                </div>

                <div>
                  <div class="h">Label</div>
                  <input id="label_${i}" type="text" value="${asStr(e.label, "")}" placeholder="Optional label override" />
                </div>

                <div>
                  <div class="h">Pill background</div>
                  <div class="colorRow">
                    <input id="bg_color_picker_${i}" type="color" value="${colorToHexOrDefault(e.bg_color, "#202020")}" />
                    <input id="bg_color_${i}" type="text" value="${asStr(e.bg_color, "")}" placeholder="e.g. rgba(255,255,255,0.06)" />
                  </div>
                </div>

                <div>
                  <div class="h">Icon color</div>
                  <div class="colorRow">
                    <input id="icon_color_picker_${i}" type="color" value="${colorToHexOrDefault(e.icon_color, "#ffffff")}" />
                    <input id="icon_color_${i}" type="text" value="${asStr(e.icon_color, "")}" placeholder="e.g. #FFD966" />
                  </div>
                </div>

                <div>
                  <div class="h">Text color</div>
                  <div class="colorRow">
                    <input id="text_color_picker_${i}" type="color" value="${colorToHexOrDefault(e.text_color, "#ffffff")}" />
                    <input id="text_color_${i}" type="text" value="${asStr(e.text_color, "")}" placeholder="Overrides pill text only" />
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="section">
        <div class="h">Advanced</div>
        <div class="small" style="margin-bottom:8px;">Custom CSS injected into the card shadow root.</div>
        <textarea id="css" rows="6" placeholder="e.g. .pill { border-radius: 16px; }">${asStr(cfg.css, "")}</textarea>
      </div>
    `;

    this._wire();

    // ✅ Restore focus/selection (prevents “type 1 letter then field unselects”)
    if (activeId) {
      const el = this._root.querySelector(`#${CSS.escape(activeId)}`) as any;
      if (el && typeof el.focus === "function") {
        el.focus();
        if (selStart !== null && selEnd !== null && typeof el.setSelectionRange === "function") {
          el.setSelectionRange(selStart, selEnd);
        }
      }
    }

    // Add HA pickers (entity/icon) if HA provides them
    this._syncPickers();
  }

  private _wire() {
    if (!this._root || !this._config) return;

    const on = (sel: string, ev: string, fn: (e: any) => void) => {
      const el = this._root!.querySelector(sel);
      if (!el) return;
      el.addEventListener(ev, fn);
    };

    on("#title", "input", (e) => this._update({ title: (e.target as HTMLInputElement).value }));
    on("#speed", "input", (e) => this._update({ speed: clamp(Number((e.target as HTMLInputElement).value), 10, 300) }));
    on("#pause_on_hover", "change", (e) => this._update({ pause_on_hover: (e.target as HTMLInputElement).checked }));
    on("#divider", "change", (e) => this._update({ divider: (e.target as HTMLInputElement).checked }));

    // global colors (picker writes hex into text field too)
    on("#background_picker", "input", (e) => {
      const v = (e.target as HTMLInputElement).value;
      (this._root!.querySelector("#background") as HTMLInputElement).value = v;
      this._update({ background: v });
    });
    on("#background", "input", (e) => this._update({ background: (e.target as HTMLInputElement).value }));

    on("#text_color_picker", "input", (e) => {
      const v = (e.target as HTMLInputElement).value;
      (this._root!.querySelector("#text_color") as HTMLInputElement).value = v;
      this._update({ text_color: v });
    });
    on("#text_color", "input", (e) => this._update({ text_color: (e.target as HTMLInputElement).value }));

    on("#divider_color_picker", "input", (e) => {
      const v = (e.target as HTMLInputElement).value;
      (this._root!.querySelector("#divider_color") as HTMLInputElement).value = v;
      this._update({ divider_color: v });
    });
    on("#divider_color", "input", (e) => this._update({ divider_color: (e.target as HTMLInputElement).value }));

    on("#css", "input", (e) => this._update({ css: (e.target as HTMLTextAreaElement).value }));

    on("#add_entity", "click", () => {
      const entities = ensureArray<BannerEntity>(this._config!.entities, []);
      entities.push({ entity_id: "" });
      this._update({ entities });
    });

    // remove buttons (delegation)
    this._root!.querySelectorAll("[data-action='remove']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number((btn as HTMLElement).getAttribute("data-idx"));
        const entities = ensureArray<BannerEntity>(this._config!.entities, []);
        entities.splice(idx, 1);
        this._update({ entities });
      });
    });

    // entity row text inputs
    const entities = ensureArray<BannerEntity>(this._config.entities, []);
    entities.forEach((_, i) => {
      const bind = (id: string, key: keyof BannerEntity) => {
        const el = this._root!.querySelector(id) as HTMLInputElement | null;
        if (!el) return;
        el.addEventListener("input", () => {
          const next = ensureArray<BannerEntity>(this._config!.entities, []).slice();
          next[i] = { ...next[i], [key]: el.value };
          this._update({ entities: next });
        });
      };

      bind(`#entity_id_${i}`, "entity_id");
      bind(`#label_${i}`, "label");
      bind(`#icon_${i}`, "icon");
      bind(`#bg_color_${i}`, "bg_color");
      bind(`#icon_color_${i}`, "icon_color");
      bind(`#text_color_${i}`, "text_color");

      // per-entity color pickers
      const bindPicker = (pid: string, tid: string, key: keyof BannerEntity) => {
        const p = this._root!.querySelector(pid) as HTMLInputElement | null;
        const t = this._root!.querySelector(tid) as HTMLInputElement | null;
        if (!p || !t) return;
        p.addEventListener("input", () => {
          t.value = p.value;
          const next = ensureArray<BannerEntity>(this._config!.entities, []).slice();
          next[i] = { ...next[i], [key]: p.value };
          this._update({ entities: next });
        });
      };

      bindPicker(`#bg_color_picker_${i}`, `#bg_color_${i}`, "bg_color");
      bindPicker(`#icon_color_picker_${i}`, `#icon_color_${i}`, "icon_color");
      bindPicker(`#text_color_picker_${i}`, `#text_color_${i}`, "text_color");
    });
  }

  private _syncPickers() {
    if (!this._root || !this._config) return;

    const entities = ensureArray<BannerEntity>(this._config.entities, []);
    const hass = this._hass;

    // If HA pickers exist, mount them into the placeholder divs.
    entities.forEach((e, i) => {
      // ENTITY PICKER
      const entityHost = this._root!.querySelector(`[data-picker="entity"][data-idx="${i}"]`) as HTMLElement | null;
      if (entityHost && entityHost.childElementCount === 0 && customElements.get("ha-entity-picker")) {
        const picker = document.createElement("ha-entity-picker") as any;
        picker.className = "picker";
        if (hass) picker.hass = hass;
        picker.value = e.entity_id || "";
        picker.setAttribute("allow-custom-entity", "");
        picker.addEventListener("value-changed", (ev: any) => {
          const v = ev?.detail?.value ?? "";
          const input = this._root!.querySelector(`#entity_id_${i}`) as HTMLInputElement;
          input.value = v;
          const next = ensureArray<BannerEntity>(this._config!.entities, []).slice();
          next[i] = { ...next[i], entity_id: v };
          this._update({ entities: next });
        });
        entityHost.appendChild(picker);
      } else if (entityHost && entityHost.firstElementChild) {
        const picker = entityHost.firstElementChild as any;
        if (hass) picker.hass = hass;
        picker.value = e.entity_id || "";
      }

      // ICON PICKER
      const iconHost = this._root!.querySelector(`[data-picker="icon"][data-idx="${i}"]`) as HTMLElement | null;
      if (iconHost && iconHost.childElementCount === 0 && customElements.get("ha-icon-picker")) {
        const picker = document.createElement("ha-icon-picker") as any;
        picker.className = "picker";
        if (hass) picker.hass = hass;
        picker.value = e.icon || "";
        picker.addEventListener("value-changed", (ev: any) => {
          const v = ev?.detail?.value ?? "";
          const input = this._root!.querySelector(`#icon_${i}`) as HTMLInputElement;
          input.value = v;
          const next = ensureArray<BannerEntity>(this._config!.entities, []).slice();
          next[i] = { ...next[i], icon: v };
          this._update({ entities: next });
        });
        iconHost.appendChild(picker);
      } else if (iconHost && iconHost.firstElementChild) {
        const picker = iconHost.firstElementChild as any;
        if (hass) picker.hass = hass;
        picker.value = e.icon || "";
      }
    });
  }

  private _update(patch: Partial<ScrollingBannerConfig>) {
    if (!this._config) return;
    this._config = { ...this._config, ...patch };

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );

    // Re-render (now safe because we preserve focus)
    this._render();
  }
}

const TAG = "scrolling-banner-card-editor";
if (!customElements.get(TAG)) {
  customElements.define(TAG, ScrollingBannerCardEditor);
}
