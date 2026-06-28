/*
 * esphome-comfoair-card
 * Based on TimWeyand/lovelace-comfoair v0.16.3 (MIT License).
 * Entity defaults adapted for the devsnek/hass-comfoair HA integration.
 */function t(t,e,i,s){var n,r=arguments.length,o=r<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(n=t[a])&&(o=(r<3?n(o):r>3?n(e,i,o):n(e,i))||o);return r>3&&o&&Object.defineProperty(e,i,o),o}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),n=new WeakMap;class r{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new r(i,t,s)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:p,getOwnPropertySymbols:h,getPrototypeOf:u}=Object,m=globalThis,f=m.trustedTypes,g=f?f.emptyScript:"",_=m.reactiveElementPolyfillSupport,v=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?g:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},$=(t,e)=>!l(t,e),y={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:$};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class x extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=y){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&c(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:n}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const r=s?.call(this);n?.call(this,e),this.requestUpdate(t,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??y}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const t=this.properties,e=[...p(t),...h(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),n=e.litNonce;void 0!==n&&s.setAttribute("nonce",n),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==n?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=s;const r=n.fromAttribute(e,t.type);this[s]=r??this._$Ej?.get(s)??r,this._$Em=null}}requestUpdate(t,e,i,s=!1,n){if(void 0!==t){const r=this.constructor;if(!1===s&&(n=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??$)(n,e)||i.useDefault&&i.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:n},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==n||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[v("elementProperties")]=new Map,x[v("finalized")]=new Map,_?.({ReactiveElement:x}),(m.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const w=globalThis,A=t=>t,S=w.trustedTypes,E=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+k,N=`<${M}>`,P=document,O=()=>P.createComment(""),U=t=>null===t||"object"!=typeof t&&"function"!=typeof t,T=Array.isArray,z="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,H=/-->/g,L=/>/g,j=RegExp(`>|${z}(?:([^\\s"'>=/]+)(${z}*=${z}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,I=/"/g,D=/^(?:script|style|textarea|title)$/i,B=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),W=B(1),q=B(2),V=Symbol.for("lit-noChange"),G=Symbol.for("lit-nothing"),Z=new WeakMap,K=P.createTreeWalker(P,129);function Q(t,e){if(!T(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}const J=(t,e)=>{const i=t.length-1,s=[];let n,r=2===e?"<svg>":3===e?"<math>":"",o=R;for(let e=0;e<i;e++){const i=t[e];let a,l,c=-1,d=0;for(;d<i.length&&(o.lastIndex=d,l=o.exec(i),null!==l);)d=o.lastIndex,o===R?"!--"===l[1]?o=H:void 0!==l[1]?o=L:void 0!==l[2]?(D.test(l[2])&&(n=RegExp("</"+l[2],"g")),o=j):void 0!==l[3]&&(o=j):o===j?">"===l[0]?(o=n??R,c=-1):void 0===l[1]?c=-2:(c=o.lastIndex-l[2].length,a=l[1],o=void 0===l[3]?j:'"'===l[3]?I:F):o===I||o===F?o=j:o===H||o===L?o=R:(o=j,n=void 0);const p=o===j&&t[e+1].startsWith("/>")?" ":"";r+=o===R?i+N:c>=0?(s.push(a),i.slice(0,c)+C+i.slice(c)+k+p):i+k+(-2===c?e:p)}return[Q(t,r+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class Y{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let n=0,r=0;const o=t.length-1,a=this.parts,[l,c]=J(t,e);if(this.el=Y.createElement(l,i),K.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=K.nextNode())&&a.length<o;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(C)){const e=c[r++],i=s.getAttribute(t).split(k),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:n,name:o[2],strings:i,ctor:"."===o[1]?st:"?"===o[1]?nt:"@"===o[1]?rt:it}),s.removeAttribute(t)}else t.startsWith(k)&&(a.push({type:6,index:n}),s.removeAttribute(t));if(D.test(s.tagName)){const t=s.textContent.split(k),e=t.length-1;if(e>0){s.textContent=S?S.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],O()),K.nextNode(),a.push({type:2,index:++n});s.append(t[e],O())}}}else if(8===s.nodeType)if(s.data===M)a.push({type:2,index:n});else{let t=-1;for(;-1!==(t=s.data.indexOf(k,t+1));)a.push({type:7,index:n}),t+=k.length-1}n++}}static createElement(t,e){const i=P.createElement("template");return i.innerHTML=t,i}}function X(t,e,i=t,s){if(e===V)return e;let n=void 0!==s?i._$Co?.[s]:i._$Cl;const r=U(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),void 0===r?n=void 0:(n=new r(t),n._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=n:i._$Cl=n),void 0!==n&&(e=X(t,n._$AS(t,e.values),n,s)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??P).importNode(e,!0);K.currentNode=s;let n=K.nextNode(),r=0,o=0,a=i[0];for(;void 0!==a;){if(r===a.index){let e;2===a.type?e=new et(n,n.nextSibling,this,t):1===a.type?e=new a.ctor(n,a.name,a.strings,this,t):6===a.type&&(e=new ot(n,this,t)),this._$AV.push(e),a=i[++o]}r!==a?.index&&(n=K.nextNode(),r++)}return K.currentNode=P,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=G,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=X(this,t,e),U(t)?t===G||null==t||""===t?(this._$AH!==G&&this._$AR(),this._$AH=G):t!==this._$AH&&t!==V&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>T(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==G&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(P.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Y.createElement(Q(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new tt(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=Z.get(t.strings);return void 0===e&&Z.set(t.strings,e=new Y(t)),e}k(t){T(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const n of t)s===e.length?e.push(i=new et(this.O(O()),this.O(O()),this,this.options)):i=e[s],i._$AI(n),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=A(t).nextSibling;A(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,n){this.type=1,this._$AH=G,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=G}_$AI(t,e=this,i,s){const n=this.strings;let r=!1;if(void 0===n)t=X(this,t,e,0),r=!U(t)||t!==this._$AH&&t!==V,r&&(this._$AH=t);else{const s=t;let o,a;for(t=n[0],o=0;o<n.length-1;o++)a=X(this,s[i+o],e,o),a===V&&(a=this._$AH[o]),r||=!U(a)||a!==this._$AH[o],a===G?t=G:t!==G&&(t+=(a??"")+n[o+1]),this._$AH[o]=a}r&&!s&&this.j(t)}j(t){t===G?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class st extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===G?void 0:t}}class nt extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==G)}}class rt extends it{constructor(t,e,i,s,n){super(t,e,i,s,n),this.type=5}_$AI(t,e=this){if((t=X(this,t,e,0)??G)===V)return;const i=this._$AH,s=t===G&&i!==G||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,n=t!==G&&(i===G||s);s&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){X(this,t)}}const at=w.litHtmlPolyfillSupport;at?.(Y,et),(w.litHtmlVersions??=[]).push("3.3.3");const lt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ct extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let n=s._$litPart$;if(void 0===n){const t=i?.renderBefore??null;s._$litPart$=n=new et(e.insertBefore(O(),t),t,void 0,i??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}}ct._$litElement$=!0,ct.finalized=!0,lt.litElementHydrateSupport?.({LitElement:ct});const dt=lt.litElementPolyfillSupport;dt?.({LitElement:ct}),(lt.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const pt=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ht={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:$},ut=(t=ht,e,i)=>{const{kind:s,metadata:n}=i;let r=globalThis.litPropertyMetadata.get(n);if(void 0===r&&globalThis.litPropertyMetadata.set(n,r=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const n=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,n,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const n=this[s];e.call(this,i),this.requestUpdate(s,n,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function mt(t){return(e,i)=>"object"==typeof i?ut(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ft(t){return mt({...t,state:!0,attribute:!1})}var gt,_t;!function(t){t.language="language",t.system="system",t.comma_decimal="comma_decimal",t.decimal_comma="decimal_comma",t.space_comma="space_comma",t.none="none"}(gt||(gt={})),function(t){t.language="language",t.system="system",t.am_pm="12",t.twenty_four="24"}(_t||(_t={}));var vt=function(t,e,i,s){s=s||{},i=null==i?{}:i;var n=new Event(e,{bubbles:void 0===s.bubbles||s.bubbles,cancelable:Boolean(s.cancelable),composed:void 0===s.composed||s.composed});return n.detail=i,t.dispatchEvent(n),n};const bt="esphome-comfoair-card",$t="esphome-comfoair-card-editor",yt=[{mode:"off",icon:"mdi:fan-off"},{mode:"low",icon:"mdi:fan-speed-1"},{mode:"medium",icon:"mdi:fan-speed-2"},{mode:"high",icon:"mdi:fan-speed-3"}],xt={off:"Aus",low:"Stufe 1",medium:"Stufe 2",high:"Stufe 3"},wt=["entity","tempSensor1","tempSensor2","tempSensor3","tempSensor4","filterstatus","bypass_valve","summer_mode","preheat","fan_speed_supply","fan_speed_exhaust","return_air_level","supply_air_level"];function At(t,e){if(t&&e)return t.states?t.states[e]:void 0}function St(t,e){const i=At(t,e);return i&&"unavailable"!==i.state&&"unknown"!==i.state&&""!==i.state?i.state:"—"}function Et(t,e){const i=At(t,e);if(!i)return;const s=parseFloat(i.state);return Number.isNaN(s)?void 0:s}const Ct=(t,e,i)=>t+(e-t)*i,kt=[[.6,.16,252],[.72,.13,215],[.8,.14,155],[.82,.16,95],[.66,.19,45],[.5,.205,28]];function Mt(t){const e=kt,i=(t=>Math.min(1,Math.max(0,t)))(t),s=i*(e.length-1),n=Math.min(e.length-2,Math.floor(s)),r=s-n,o=Ct(e[n][0],e[n+1][0],r),a=Ct(e[n][1],e[n+1][1],r),l=Ct(e[n][2],e[n+1][2],r);return`oklch(${o.toFixed(3)} ${a.toFixed(3)} ${l.toFixed(1)})`}function Nt(t,e,i){const s="on"===e;switch(t){case"fan":{const t=(i??"off").toLowerCase();return{icon:"mdi:fan",label:"Fan",sub:xt[t]??t,active:"off"!==t,color:"#03a9f4"}}case"filter":{const fA="on"===e||"full"===(e||"").toLowerCase();return{icon:"mdi:air-filter",label:"Filter",sub:fA?"Replace":"OK",active:fA,color:"#f5a623"}};case"bypass":return{icon:"mdi:valve",label:"Bypass",sub:s?"Open":"Closed",active:s,color:"#36c46b"};case"preheat":return{icon:"mdi:radiator",label:"Preheat",sub:s?"Active":"Off",active:s,color:"#ff7043"};case"season":return s?{icon:"mdi:weather-sunny",label:"Summer",sub:"",active:!0,color:"#ffb300"}:{icon:"mdi:snowflake",label:"Winter",sub:"",active:!0,color:"#4fc3f7"}}}const Pt=t=>"temperature"===t.attributes?.device_class,Ot=t=>"rpm"===t.attributes?.unit_of_measurement,Ut=t=>"%"===t.attributes?.unit_of_measurement,Tt=()=>!0,zt=[{field:"tempSensor1",domain:"sensor",predicate:Pt,keywords:["outside","outdoor","außen","aussen"]},{field:"tempSensor2",domain:"sensor",predicate:Pt,keywords:["exhaust","fortluft","abluft"]},{field:"tempSensor3",domain:"sensor",predicate:Pt,keywords:["return","extract","rückluft","rueckluft"]},{field:"tempSensor4",domain:"sensor",predicate:Pt,keywords:["supply","zuluft"]},{field:"filterstatus",domain:"sensor",predicate:Tt,keywords:["filter"]},{field:"bypass_valve",domain:"binary_sensor",predicate:Tt,keywords:["bypass"]},{field:"summer_mode",domain:"binary_sensor",predicate:Tt,keywords:["summer","sommer"]},{field:"preheat",domain:"binary_sensor",predicate:Tt,keywords:["preheat","preheating","vorheiz"]},{field:"fan_speed_supply",domain:"sensor",predicate:Ot,keywords:["supply","zuluft"]},{field:"fan_speed_exhaust",domain:"sensor",predicate:Ot,keywords:["exhaust","fortluft","abluft","return"]},{field:"return_air_level",domain:"sensor",predicate:Ut,keywords:["return","extract","rückluft","rueckluft"]},{field:"supply_air_level",domain:"sensor",predicate:Ut,keywords:["supply","zuluft"]}];function Rt(t,e){if(!t||!e)return{};let i=[];const s=t.entities?.[e]?.device_id??void 0;if(s&&t.entities&&(i=Object.keys(t.entities).filter(e=>t.entities[e].device_id===s)),0===i.length){const s=function(t){const e=t.split(".")[1]??"";return e.replace(/_climate$/,"")||e}(e);i=Object.keys(t.states).filter(t=>t.startsWith(`sensor.${s}_`)||t.startsWith(`binary_sensor.${s}_`))}const n={};for(const e of zt){const s=i.filter(i=>{if(!i.startsWith(`${e.domain}.`))return!1;const s=t.states[i];if(!s||!e.predicate(s))return!1;const n=`${i} ${String(s.attributes?.friendly_name??"")}`.toLowerCase();return e.keywords.some(t=>n.includes(t))});if(s.length){const t=s.reduce((t,e)=>e.length<t.length?e:t);n[e.field]=t}}return n}const Ht={en:{invalid_config:"Invalid configuration",no_entity:"No climate entity defined",detected:"entities detected",advanced:"Advanced / manual mapping"},de:{invalid_config:"Ungültige Konfiguration",no_entity:"Keine climate-Entity ausgewählt",detected:"Entities erkannt",advanced:"Erweitert / manuelle Zuordnung"},nb:{invalid_config:"Ikke gyldig konfigurasjon",no_entity:"Ingen climate-enhet valgt",detected:"enheter funnet",advanced:"Avansert / manuell tilordning"}};function Lt(t,e){let i=(e||"en").replace(/['"]+/g,"").split("-")[0].toLowerCase();return Ht[i]||(i="en"),Ht[i][t]??Ht.en[t]??t}const jt=[{name:"name",selector:{text:{}}},{name:"tempSensor1",selector:{entity:{domain:"sensor",device_class:"temperature"}}},{name:"tempSensor2",selector:{entity:{domain:"sensor",device_class:"temperature"}}},{name:"tempSensor3",selector:{entity:{domain:"sensor",device_class:"temperature"}}},{name:"tempSensor4",selector:{entity:{domain:"sensor",device_class:"temperature"}}},{name:"filterstatus",selector:{entity:{domain:"binary_sensor"}}},{name:"bypass_valve",selector:{entity:{domain:"binary_sensor"}}},{name:"summer_mode",selector:{entity:{domain:"binary_sensor"}}},{name:"preheat",selector:{entity:{domain:"binary_sensor"}}},{name:"fan_speed_supply",selector:{entity:{domain:"sensor"}}},{name:"fan_speed_exhaust",selector:{entity:{domain:"sensor"}}},{name:"return_air_level",selector:{entity:{domain:"sensor"}}},{name:"supply_air_level",selector:{entity:{domain:"sensor"}}}],Ft={entity:"CA350/550 Climate-Entity (Pflicht)",animation:"Animation",animation_speed_source:"Tempo-Quelle",animation_speed:"Festes Tempo (%)",color_scale:"Farbskala",temp_min:"Feste Skala – Min (°C)",temp_max:"Feste Skala – Max (°C)",show_legend:"Temperaturskala einblenden",name:"Name (optional)",tempSensor1:"Außentemperatur",tempSensor2:"Fortlufttemperatur",tempSensor3:"Rücklufttemperatur",tempSensor4:"Zulufttemperatur",filterstatus:"Filterstatus",bypass_valve:"Bypass-Ventil",summer_mode:"Sommermodus",preheat:"Vorheizregister",fan_speed_supply:"Lüfterdrehzahl Zuluft",fan_speed_exhaust:"Lüfterdrehzahl Fortluft",return_air_level:"Rückluft-Stufe",supply_air_level:"Zuluft-Stufe"};let It=class extends ct{constructor(){super(...arguments),this._detectedCount=0,this._label=t=>Ft[t.name]??t.name}setConfig(t){this._config=t}_mainSchema(){const t=this._config,e=[{name:"entity",required:!0,selector:{entity:{domain:"climate"}}},{name:"animation",selector:{select:{options:[{value:"animated",label:"Animiert (Luftströme + Lüfter)"},{value:"static",label:"Statisch"}]}}}];return"animated"===t.animation&&(e.push({name:"animation_speed_source",selector:{select:{options:[{value:"fixed",label:"Festes Tempo (%)"},{value:"level",label:"Nach Luftmenge (Supply/Return %)"}]}}}),"level"!==t.animation_speed_source&&e.push({name:"animation_speed",selector:{number:{min:10,max:200,step:10,unit_of_measurement:"%",mode:"slider"}}})),e.push({name:"color_scale",selector:{select:{options:[{value:"auto",label:"Auto (aktuelle Werte)"},{value:"fixed",label:"Fest (manueller Bereich)"}]}}}),"fixed"===t.color_scale&&e.push({name:"temp_min",selector:{number:{min:-30,max:20,step:1,unit_of_measurement:"°C",mode:"box"}}},{name:"temp_max",selector:{number:{min:0,max:50,step:1,unit_of_measurement:"°C",mode:"box"}}}),e.push({name:"show_legend",selector:{boolean:{}}}),e}render(){return this.hass&&this._config?W`
      <div class="editor">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._mainSchema()}
          .computeLabel=${this._label}
          @value-changed=${this._mainChanged}
        ></ha-form>
        ${this._detectedCount>0?W`<div class="hint">✓ ${this._detectedCount} ${Lt("detected",this.hass.language)}</div>`:""}
        <ha-expansion-panel outlined>
          <span slot="header">${Lt("advanced",this.hass.language)}</span>
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${jt}
            .computeLabel=${this._label}
            @value-changed=${this._advancedChanged}
          ></ha-form>
        </ha-expansion-panel>
      </div>
    `:W``}_mainChanged(t){t.stopPropagation();const e=t.detail.value,i=e.entity??"",s=!!i&&i!==this._config.entity;let n={...this._config,...e};if(s){const t=n;for(const e of wt)"entity"!==e&&delete t[e];const e=Rt(this.hass,i);n={...n,...e},this._detectedCount=Object.keys(e).length}this._emit(n)}_advancedChanged(t){t.stopPropagation(),this._emit({...this._config,...t.detail.value})}_emit(t){this._config=t,vt(this,"config-changed",{config:t})}static get styles(){return o`
      .hint { color: var(--success-color, #43a047); padding: 4px 0 8px; font-size: 0.9em; }
      ha-form { display: block; }
      ha-expansion-panel { margin-top: 8px; }
    `}};t([mt({attribute:!1})],It.prototype,"hass",void 0),t([ft()],It.prototype,"_config",void 0),t([ft()],It.prototype,"_detectedCount",void 0),It=t([pt($t)],It),console.info("%c ESPHOME-COMFOAIR-CARD %c 0.16.3 ","color:orange;font-weight:bold;background:black","color:white;font-weight:bold;background:dimgray"),window.customCards=window.customCards||[],window.customCards.push({type:bt,name:"ComfoAir Card",preview:!1,description:"Counter-flow heat-exchanger card for the hass-comfoair integration."});const Dt="M6,19 H120 L320,113 H434",Bt="M434,19 H320 L120,113 H6";let Wt=class extends ct{static async getConfigElement(){return document.createElement($t)}static getStubConfig(t){if(!t)return{entity:""};const e=Object.keys(t.states).find(t=>t.startsWith("climate.")&&/comfo|ca\d{3}|wtw/i.test(t));return e?{entity:e,animation:"static",animation_speed_source:"fixed",animation_speed:50,color_scale:"auto",temp_min:-10,temp_max:30,...Rt(t,e)}:{entity:""}}setConfig(t){if(!t)throw new Error(Lt("invalid_config",this.hass?.language));this._config=t}getCardSize(){return 5}shouldUpdate(t){if(t.has("_config"))return!0;const e=t.get("hass");if(!e||!this._config)return!0;const i=this._config,s=wt.map(t=>i[t]).filter(t=>!!t);return s.some(t=>e.states[t]!==this.hass.states[t])}render(){if(!this.hass||!this._config)return W``;const t=this._config,e=this.hass,i=At(e,t.entity);if(!i)return W`<ha-card>
        <hui-warning>${Lt("no_entity",this.hass.language)}: ${t.entity||"—"}</hui-warning>
      </ha-card>`;const s=i.attributes.fan_mode,n=s?.toLowerCase(),r=i.attributes.temperature,o="animated"===t.animation,a="fixed"===t.color_scale?"fixed":"auto",l=!!n&&"off"!==n,c=Et(e,t.tempSensor1),d=Et(e,t.tempSensor2),p=Et(e,t.tempSensor3),h=Et(e,t.tempSensor4),u=function(t,e="auto",i=-10,s=30){if("fixed"===e)return[i,s];const n=t.filter(t=>null!=t&&!Number.isNaN(t));if(0===n.length)return[i,s];let r=Math.min(...n),o=Math.max(...n);if(o-r<4){const t=(o+r)/2;r=t-2,o=t+2}const a=.12*(o-r);return[r-a,o+a]}([c,d,p,h],a,Number.isFinite(Number(t.temp_min))?Number(t.temp_min):-10,Number.isFinite(Number(t.temp_max))?Number(t.temp_max):30),[m,f,g,_]=[c,d,p,h].map(t=>function(t,e){if(null==t||Number.isNaN(t))return"var(--disabled-text-color, #888)";const[i,s]=e;return Mt((t-i)/(s-i||1))}(t,u));let v=1,b=1;if(o){const i="level"===t.animation_speed_source?"level":"fixed";v=qt(e,t,i,t.supply_air_level),b=qt(e,t,i,t.return_air_level)}const $=(3/v).toFixed(1),y=(3/b).toFixed(1),x=At(e,t.bypass_valve)?.state,w="on"===x?null:function(t,e,i){if(null==t||null==e||null==i)return null;const s=e-t;if(s<=.5)return null;const n=(i-t)/s;return n<=0?null:Math.round(100*Math.min(1,n))}(c,p,h),A=[Nt("fan",void 0,s),Nt("filter",At(e,t.filterstatus)?.state),Nt("bypass",x),Nt("preheat",At(e,t.preheat)?.state),Nt("season",At(e,t.summer_mode)?.state)],S=t=>t.replace(".",","),E=(t,i)=>W`<div class="tempbadge ${i?"clickable":""}" style=${`--fg:${t};--bd:color-mix(in srgb, ${t} 45%, transparent);--bg:color-mix(in srgb, ${t} 14%, transparent)`} @click=${()=>this._moreInfo(i)} title=${i?"Verlauf anzeigen":""}><span class="v">${S(St(e,i))}</span><span class="u">°C</span></div>`,C=(t,i)=>{const s=Et(e,t)??0,n=o&&l&&s>0;return W`<div class="subt ${t?"clickable":""}" @click=${()=>this._moreInfo(t)}>
        <ha-icon class=${n?"spinico spin":"spinico"} style=${n?`animation-duration:${(1.6/i).toFixed(2)}s`:""} icon="mdi:fan"></ha-icon>
        <span>${St(e,t)}</span>&nbsp;rpm
      </div>`},k=t=>W`<div class="subt ${t?"clickable":""}" @click=${()=>this._moreInfo(t)}>
        <ha-icon icon="mdi:gauge"></ha-icon><span>${St(e,t)}</span>&nbsp;%
      </div>`,M=(t,e,i=!1)=>W`<div class="lbl ${i?"rev":""}"><ha-icon icon=${t}></ha-icon>${e}</div>`,N=W`
      <div class="hub corehub">
        <div class="setpc">
          <button @click=${()=>this._stepTemp(-1)} aria-label="cooler">−</button>
          <div class="val">${null!=r?S(String(r)):"—"}<small>°C</small></div>
          <button @click=${()=>this._stepTemp(1)} aria-label="warmer">+</button>
        </div>
        <div class="fanrow">
          ${yt.map(t=>W`<button
              class=${function(t,e){return!!t&&t.toLowerCase()===e.toLowerCase()}(s,t.mode)?"on":""}
              title=${t.mode}
              @click=${()=>this._setFan(t.mode)}
            ><ha-icon icon=${t.icon}></ha-icon></button>`)}
        </div>
      </div>`;return W`
      <ha-card class=${o?"animated":""}>
        <div class="hd">
          <div class="ic"><ha-icon icon="mdi:hvac"></ha-icon></div>
          <div>
            <div class="ttl">${t.name||"ComfoAir"}</div>
            <div class="st"><span class="dot ${l?"live":""}"></span><span>${n?xt[n]??s:"—"}</span></div>
          </div>
          <div class="grow"></div>
          <div class="recov">
            ${null!=w?W`<b>${w}%</b><span>Heat recovery</span>`:""}
          </div>
        </div>

        <div class="lanes">
          <div class="trow top">
            <div class="tcell l">${C(t.fan_speed_supply,v)}${E(m,t.tempSensor1)}${M("mdi:tree-outline","Outside air")}</div>
            <div></div>
            <div class="tcell r">${k(t.return_air_level)}${E(g,t.tempSensor3)}${M("mdi:home-thermometer-outline","Return air",!0)}</div>
          </div>

          <div class="flowband">
            <svg class="airsvg" viewBox="0 0 440 132" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs>
                <linearGradient id="gSupply" x1="6" y1="19" x2="434" y2="113" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color=${m}></stop><stop offset="100%" stop-color=${_}></stop>
                </linearGradient>
                <linearGradient id="gExhaust" x1="434" y1="19" x2="6" y2="113" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color=${g}></stop><stop offset="100%" stop-color=${f}></stop>
                </linearGradient>
                <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4.5"></feGaussianBlur></filter>
              </defs>
              <path class="airrib" d=${Dt} stroke="url(#gSupply)"></path>
              <path class="airrib" d=${Bt} stroke="url(#gExhaust)"></path>
              <polygon class="airarrow" points="86,11 86,27 102,19"></polygon>
              <polygon class="airarrow" points="354,11 354,27 338,19"></polygon>
              <polygon class="airarrow" points="102,105 102,121 86,113"></polygon>
              <polygon class="airarrow" points="338,105 338,121 354,113"></polygon>
              ${o&&l?this._flowGroup($,y):""}
            </svg>
            ${N}
          </div>

          <div class="trow bot">
            <div class="tcell l">${M("mdi:export","Exhaust air")}${E(f,t.tempSensor2)}${C(t.fan_speed_exhaust,b)}</div>
            <div></div>
            <div class="tcell r">${M("mdi:import","Supply air",!0)}${E(_,t.tempSensor4)}${k(t.supply_air_level)}</div>
          </div>
        </div>

        ${t.show_legend?W`<div class="legend">
          <span class="mn">${Math.round(u[0])}°C</span>
          <div class="bar" style="background:linear-gradient(90deg, ${Mt(0)}, ${Mt(.25)}, ${Mt(.5)}, ${Mt(.75)}, ${Mt(1)})"></div>
          <span class="mx">${Math.round(u[1])}°C</span>
        </div>`:""}

        <div class="status">
          ${A.map(t=>W`<div class="chip ${t.active?"on":""}" style="--c:${t.color}">
              <ha-icon icon=${t.icon}></ha-icon>
              <span class="nm">${t.label}</span>
              ${t.sub?W`<span class="vs">${t.sub}</span>`:""}
            </div>`)}
        </div>
      </ha-card>
    `}_flowGroup(t,e){const i=(Number(t)/2).toFixed(1),s=(Number(e)/2).toFixed(1);return q`<g class="flow-hi" filter="url(#soft)">
      <circle r="11" fill="#fff"><animateMotion path=${Dt} dur="${t}s" begin="0s" repeatCount="indefinite"></animateMotion></circle>
      <circle r="11" fill="#fff"><animateMotion path=${Dt} dur="${t}s" begin="-${i}s" repeatCount="indefinite"></animateMotion></circle>
      <circle r="11" fill="#fff"><animateMotion path=${Bt} dur="${e}s" begin="0s" repeatCount="indefinite"></animateMotion></circle>
      <circle r="11" fill="#fff"><animateMotion path=${Bt} dur="${e}s" begin="-${s}s" repeatCount="indefinite"></animateMotion></circle>
    </g>`}_moreInfo(t){t&&vt(this,"hass-more-info",{entityId:t})}_setFan(t){this._config.entity&&this.hass.callService("climate","set_fan_mode",{entity_id:this._config.entity,fan_mode:t})}_stepTemp(t){const e=At(this.hass,this._config.entity),i=Number(e?.attributes.temperature);if(!Number.isFinite(i))return;const s=Number(e.attributes.target_temp_step),n=Number.isFinite(s)&&s>0?s:.5,r=Number(e.attributes.min_temp),o=Number(e.attributes.max_temp),a=function(t,e,i,s,n){const r=Math.round(10*(t+n*e))/10;return Math.min(s,Math.max(i,r))}(i,n,Number.isFinite(r)?r:-1/0,Number.isFinite(o)?o:1/0,t);this.hass.callService("climate","set_temperature",{entity_id:this._config.entity,temperature:a})}static get styles(){return o`
      ha-card {
        padding: 14px 16px 12px;
        --arrow: rgba(255, 255, 255, 0.92);
      }
      .hd { display: flex; align-items: center; gap: 11px; padding: 2px 2px 12px; }
      .hd .ic {
        width: 34px; height: 34px; border-radius: 10px; flex: none;
        display: flex; align-items: center; justify-content: center;
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.14);
        color: var(--primary-color);
      }
      .hd .ttl { font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; }
      .hd .st { font-size: 12px; color: var(--secondary-text-color); margin-top: 1px; display: flex; align-items: center; gap: 6px; }
      .hd .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--disabled-text-color, #777); }
      .hd .dot.live { background: #36c46b; }
      .hd .grow { flex: 1; }
      .hd .recov { text-align: right; line-height: 1.05; min-height: 30px; }
      .hd .recov b { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
      .hd .recov span { display: block; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--secondary-text-color); margin-top: 1px; }

      .tempbadge {
        display: inline-flex; align-items: baseline; justify-content: center; gap: 1px;
        width: 88px; padding: 3px 4px; border-radius: 10px; line-height: 1;
        font-variant-numeric: tabular-nums;
        background: var(--bg); color: var(--fg); border: 1px solid var(--bd);
        box-shadow: 0 2px 10px -4px rgba(0, 0, 0, 0.5);
        transition: background 0.5s, color 0.5s, border-color 0.5s;
      }
      .tempbadge .v { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
      .tempbadge .u { font-size: 12px; font-weight: 600; opacity: 0.7; }
      .lbl { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--secondary-text-color); font-weight: 600; display: flex; align-items: center; gap: 5px; }
      .lbl.rev { flex-direction: row-reverse; }
      .lbl ha-icon { --mdc-icon-size: 14px; }
      .subt { font-size: 11px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
      .subt ha-icon { --mdc-icon-size: 15px; opacity: 0.85; }
      .clickable { cursor: pointer; }
      .tempbadge.clickable:hover { filter: brightness(1.08); }
      .subt.clickable:hover { color: var(--primary-text-color); }

      .corehub {
        background: var(--card-background-color);
        border: 1px solid var(--divider-color); border-radius: 15px; padding: 6px 9px;
        box-shadow: 0 6px 22px -6px rgba(0, 0, 0, 0.55);
        display: flex; flex-direction: column; align-items: center; gap: 5px;
      }
      .setpc { display: flex; align-items: center; gap: 6px; }
      .setpc button {
        width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--divider-color);
        background: transparent; color: var(--primary-text-color); font-size: 15px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: 0.15s;
      }
      .setpc button:hover { border-color: var(--primary-color); color: var(--primary-color); }
      .setpc .val { min-width: 56px; text-align: center; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
      .setpc .val small { font-size: 11px; font-weight: 600; color: var(--secondary-text-color); }
      .fanrow { display: flex; gap: 2px; background: rgba(127, 127, 127, 0.14); border-radius: 11px; padding: 3px; }
      .fanrow button {
        width: 32px; height: 26px; border: 0; background: transparent; border-radius: 8px;
        color: var(--secondary-text-color); cursor: pointer; transition: 0.15s;
        display: flex; align-items: center; justify-content: center;
      }
      .fanrow button:hover { color: var(--primary-text-color); }
      .fanrow button.on { background: var(--primary-color); color: #fff; box-shadow: 0 2px 8px -2px var(--primary-color); }
      .fanrow ha-icon { --mdc-icon-size: 18px; }

      .lanes { display: flex; flex-direction: column; gap: 3px; --hub-w: 188px; }
      .trow { display: grid; grid-template-columns: 1fr var(--hub-w) 1fr; gap: 10px; padding: 0 6px; }
      .trow.top { align-items: end; }
      .trow.bot { align-items: start; }
      .tcell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .tcell.l { align-items: flex-start; }
      .tcell.r { align-items: flex-end; text-align: right; }

      .flowband { position: relative; width: 100%; aspect-ratio: 440 / 132; }
      .airsvg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .airrib { fill: none; stroke-width: 38; stroke-linejoin: round; stroke-linecap: round; }
      .airarrow { fill: var(--arrow); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.28)); }
      .flow-hi { opacity: 0.5; }
      .hub { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 4; }

      .spinico.spin { animation-name: spin; animation-timing-function: linear; animation-iteration-count: infinite; transform-origin: center; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .legend { display: flex; align-items: center; gap: 9px; padding: 8px 4px 2px; }
      .legend .bar { flex: 1; height: 7px; border-radius: 4px; }
      .legend .mn, .legend .mx { font-size: 11px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; font-weight: 600; min-width: 44px; }
      .legend .mx { text-align: right; }

      .status { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
      .chip { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 7px 2px 4px; border-radius: 11px; color: var(--secondary-text-color); transition: 0.25s; }
      .chip ha-icon { --mdc-icon-size: 23px; transition: 0.25s; }
      .chip .nm { font-size: 10.5px; font-weight: 600; }
      .chip .vs { font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--secondary-text-color); opacity: 0.65; }
      .chip.on { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
      .chip.on .vs { color: var(--c); opacity: 0.9; }
      .chip.on ha-icon { filter: drop-shadow(0 0 7px var(--c)); }
    `}};function qt(t,e,i,s){return function(t,e,i){if("level"===t){const t=null==i||Number.isNaN(i)?50:i;return Math.min(2.5,Math.max(.2,t/50))}const s=null==e||Number.isNaN(e)?50:e;return Math.min(2,Math.max(.1,s/100))}(i,e.animation_speed,Et(t,s))}t([mt({attribute:!1})],Wt.prototype,"hass",void 0),t([ft()],Wt.prototype,"_config",void 0),Wt=t([pt(bt)],Wt);

/* ── hass-comfoair defaults ──────────────────────────────────────────────────
 * Patch setConfig so a card with no explicit entity config still works out of
 * the box.  Explicit YAML overrides always win (spread order: defaults first).
 * ─────────────────────────────────────────────────────────────────────────── */
{
  const _ca = customElements.get('esphome-comfoair-card');
  if (_ca) {
    const _VER = 'v0.16.3-hca.1';

    /* Version badge: appended once to ha-card after first render */
    const _fu = _ca.prototype.firstUpdated;
    _ca.prototype.firstUpdated = function (ch) {
      if (_fu) _fu.call(this, ch);
      const card = this.renderRoot && this.renderRoot.querySelector('ha-card');
      if (card && !card.querySelector('.hca-ver')) {
        const el = document.createElement('div');
        el.className = 'hca-ver';
        el.textContent = _VER;
        el.style.cssText = [
          'text-align:right',
          'font-size:9.5px',
          'font-family:monospace',
          'font-weight:600',
          'letter-spacing:0.04em',
          'opacity:0.30',
          'padding:2px 16px 8px',
          'color:var(--secondary-text-color)',
          'pointer-events:none',
          'user-select:none',
        ].join(';');
        card.appendChild(el);
      }
    };

    const _sc = _ca.prototype.setConfig;
    _ca.prototype.setConfig = function (cfg) {
      cfg = cfg || {};
      if (!cfg.entity) cfg = Object.assign({}, cfg, { entity: 'climate.comfoair' });
      const _def = {
        animation:              'animated',
        animation_speed_source: 'level',
        color_scale:            'auto',
        show_legend:             true,
        tempSensor1:  'sensor.comfoair_outside_air_temperature',
        tempSensor2:  'sensor.comfoair_exhaust_air_temperature',
        tempSensor3:  'sensor.comfoair_return_air_temperature',
        tempSensor4:  'sensor.comfoair_supply_air_temperature',
        filterstatus: 'sensor.comfoair_filter_status',
        bypass_valve: 'binary_sensor.comfoair_bypass_valve_open',
        summer_mode:  'binary_sensor.comfoair_summer_mode',
        preheat:      'binary_sensor.comfoair_preheating_state',
        fan_speed_supply:  'sensor.comfoair_supply_fan_speed_rpm',
        fan_speed_exhaust: 'sensor.comfoair_return_fan_speed_rpm',
        return_air_level:  'sensor.comfoair_return_air_level',
        supply_air_level:  'sensor.comfoair_supply_air_level',
      };
      cfg = Object.assign({}, _def, cfg);
      _sc.call(this, cfg);
    };
  }
}