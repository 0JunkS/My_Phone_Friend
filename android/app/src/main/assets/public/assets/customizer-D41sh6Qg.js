(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function e(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=e(i);fetch(i.href,r)}})();class E{constructor(){this.ctx=null,this.enabled=!0,this.initAudioContext=this.initAudioContext.bind(this),window.addEventListener("pointerdown",this.initAudioContext,{once:!0}),window.addEventListener("keydown",this.initAudioContext,{once:!0})}initAudioContext(){if(!this.ctx){const t=window.AudioContext||window.webkitAudioContext;t&&(this.ctx=new t)}this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}toggleSound(t){return typeof t=="boolean"?this.enabled=t:this.enabled=!this.enabled,this.enabled}playTap(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.createOscillator(),e=this.ctx.createGain(),s=this.ctx.currentTime;t.type="sine",t.frequency.setValueAtTime(440,s),t.frequency.exponentialRampToValueAtTime(880,s+.08),e.gain.setValueAtTime(.2,s),e.gain.exponentialRampToValueAtTime(.001,s+.08),t.connect(e),e.connect(this.ctx.destination),t.start(s),t.stop(s+.08)}playLift(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.createOscillator(),e=this.ctx.createGain(),s=this.ctx.currentTime;t.type="triangle",t.frequency.setValueAtTime(320,s),t.frequency.exponentialRampToValueAtTime(950,s+.18),e.gain.setValueAtTime(.25,s),e.gain.exponentialRampToValueAtTime(.01,s+.18),t.connect(e),e.connect(this.ctx.destination),t.start(s),t.stop(s+.18)}playDrop(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.createOscillator(),e=this.ctx.createGain(),s=this.ctx.currentTime;t.type="sine",t.frequency.setValueAtTime(600,s),t.frequency.exponentialRampToValueAtTime(180,s+.12),e.gain.setValueAtTime(.3,s),e.gain.exponentialRampToValueAtTime(.001,s+.12),t.connect(e),e.connect(this.ctx.destination),t.start(s),t.stop(s+.12)}playHappy(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=[523.25,659.25,783.99,1046.5],e=this.ctx.currentTime;t.forEach((s,i)=>{const r=this.ctx.createOscillator(),n=this.ctx.createGain(),o=e+i*.08,a=.2;r.type="triangle",r.frequency.setValueAtTime(s,o),n.gain.setValueAtTime(.18,o),n.gain.exponentialRampToValueAtTime(.001,o+a),r.connect(n),n.connect(this.ctx.destination),r.start(o),r.stop(o+a)})}playSad(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=[440,392,349.23],e=this.ctx.currentTime;t.forEach((s,i)=>{const r=this.ctx.createOscillator(),n=this.ctx.createGain(),o=e+i*.14,a=.35;r.type="sine",r.frequency.setValueAtTime(s,o),r.frequency.exponentialRampToValueAtTime(s*.95,o+a),n.gain.setValueAtTime(.15,o),n.gain.exponentialRampToValueAtTime(.001,o+a),r.connect(n),n.connect(this.ctx.destination),r.start(o),r.stop(o+a)})}playMenuOpen(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),s=this.ctx.createOscillator(),i=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(700,t),e.frequency.exponentialRampToValueAtTime(1200,t+.1),s.type="triangle",s.frequency.setValueAtTime(1050,t),s.frequency.exponentialRampToValueAtTime(1400,t+.1),i.gain.setValueAtTime(.15,t),i.gain.exponentialRampToValueAtTime(.001,t+.12),e.connect(i),s.connect(i),i.connect(this.ctx.destination),e.start(t),s.start(t),e.stop(t+.12),s.stop(t+.12)}playWarning(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),s=this.ctx.createGain();e.type="sawtooth",e.frequency.setValueAtTime(220,t),e.frequency.setValueAtTime(180,t+.08),s.gain.setValueAtTime(.2,t),s.gain.exponentialRampToValueAtTime(.001,t+.2),e.connect(s),s.connect(this.ctx.destination),e.start(t),e.stop(t+.2)}playTalkBlip(){if(!this.enabled||(this.initAudioContext(),!this.ctx))return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),s=this.ctx.createGain(),i=[550,620,700,780,850],r=i[Math.floor(Math.random()*i.length)];e.type="sine",e.frequency.setValueAtTime(r,t),s.gain.setValueAtTime(.08,t),s.gain.exponentialRampToValueAtTime(.001,t+.05),e.connect(s),s.connect(this.ctx.destination),e.start(t),e.stop(t+.05)}}const l=new E,f={NANO_BANANA:"nano_banana",BERRY_CAT:"berry_cat",CLOUD_PUPPY:"cloud_puppy",CHOCO_DINO:"choco_dino",CUSTOM_PHOTO:"custom_photo"},c={WALK:"walk",LIFTED:"lifted",SAD:"sad",HAPPY:"happy"},O=60*60*1e3;class ${constructor(t,e={}){this.container=t,this.type=e.type||f.NANO_BANANA,this.state=c.WALK,this.customPhotoUrl=e.customPhotoUrl||null,this.accessory=e.accessory||"none",this.hueShift=e.hueShift||0,this.scale=e.scale||1,this.showLimbs=e.showLimbs!==!1,this.affection=70,this.lastCareTime=Date.now(),this.lastSpeechTime=Date.now(),this.careDecayTimer=null,this.x=e.startX||Math.max(50,window.innerWidth/2-55),this.y=e.startY||Math.max(100,window.innerHeight-240),this.minY=e.minY??10,this.vx=(Math.random()-.5)*1.5,this.vy=0,this.baseWidth=110,this.baseHeight=120,this.width=Math.round(this.baseWidth*this.scale),this.height=Math.round(this.baseHeight*this.scale),this.facingRight=!0,this.isDragging=!1,this.dragStartX=0,this.dragStartY=0,this.lastPointerX=0,this.lastPointerY=0,this.pointerVx=0,this.pointerVy=0,this.longPressTimer=null,this.longPressThreshold=450,this.hasTriggeredLongPress=!1,this.dragDistance=0,this.tapTimestamps=[],this.tripleTapWindow=600,this.emotionTimeout=null,this.speechTimeout=null,this.onLongPress=e.onLongPress||null,this.onTap=e.onTap||null,this.onTripleTap=e.onTripleTap||null,this.el=document.createElement("div"),this.el.className="character-container",this.el.setAttribute("data-state",this.state),this.speechBubble=document.createElement("div"),this.speechBubble.className="character-speech-bubble",this.speechBubble.textContent="",this.el.appendChild(this.speechBubble),this.longPressRing=document.createElement("div"),this.longPressRing.className="long-press-ring",this.el.appendChild(this.longPressRing),this.bodyWrapper=document.createElement("div"),this.bodyWrapper.className="character-body-wrapper",this.el.appendChild(this.bodyWrapper),this.container.appendChild(this.el),this.renderVisuals(),this.attachEvents(),this.startPhysicsLoop(),this.startAffectionMonitor()}renderVisuals(){this.bodyWrapper.innerHTML=this.getCharacterSvg(),this.updateTransform()}getCharacterSvg(){let t=this.getAccessorySvg();return this.type===f.CUSTOM_PHOTO&&this.customPhotoUrl?this.renderCustomPhotoSvg(t):this.type===f.BERRY_CAT?this.renderBerryCatSvg(t):this.type===f.CLOUD_PUPPY?this.renderCloudPuppySvg(t):this.type===f.CHOCO_DINO?this.renderChocoDinoSvg(t):this.renderNanoBananaSvg(t)}renderNanoBananaSvg(t){let e,s,i,r="";return this.state===c.LIFTED?(e='<circle cx="42" cy="46" r="5" fill="#1e293b" /><circle cx="44" cy="44" r="2" fill="#fff" />',s='<circle cx="68" cy="46" r="5" fill="#1e293b" /><circle cx="70" cy="44" r="2" fill="#fff" />',i='<ellipse cx="55" cy="62" rx="4" ry="6" fill="#ef4444" stroke="#1e293b" stroke-width="1.5" />',r='<path d="M78 35 Q85 30 82 42" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" />'):this.state===c.SAD?(e='<path d="M38 48 Q43 43 47 48" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" /><circle cx="39" cy="53" r="3.5" fill="#38bdf8" />',s='<path d="M63 48 Q67 43 72 48" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" /><circle cx="71" cy="53" r="3.5" fill="#38bdf8" />',i='<path d="M48 64 Q55 58 62 64" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />'):this.state===c.HAPPY?(e='<path d="M38 46 Q43 38 48 46" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />',s='<path d="M62 46 Q67 38 72 46" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />',i='<path d="M46 58 Q55 72 64 58 Z" fill="#ef4444" stroke="#1e293b" stroke-width="1.5" /><circle cx="55" cy="64" r="2.5" fill="#fca5a5" />'):(e='<ellipse cx="43" cy="46" rx="4" ry="5.5" fill="#1e293b" /><circle cx="45" cy="44" r="2" fill="#fff" />',s='<ellipse cx="67" cy="46" rx="4" ry="5.5" fill="#1e293b" /><circle cx="69" cy="44" r="2" fill="#fff" />',i='<path d="M49 60 Q55 67 61 60" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />'),`
      <svg viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;filter: hue-rotate(${this.hueShift}deg);">
        <defs>
          <linearGradient id="bananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="45%" stop-color="#fde047" />
            <stop offset="90%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#ca8a04" />
          </linearGradient>
          <linearGradient id="bananaTip" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#84cc16" />
            <stop offset="100%" stop-color="#65a30d" />
          </linearGradient>
          <filter id="nanoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(234,179,8,0.35)" />
          </filter>
        </defs>

        <ellipse cx="55" cy="112" rx="28" ry="6" fill="rgba(0,0,0,0.18)" />

        <g class="nano-leg-left" style="transform-origin: 42px 98px;">
          <ellipse cx="42" cy="104" rx="6" ry="8" fill="#ca8a04" stroke="#854d0e" stroke-width="1.5" />
          <ellipse cx="40" cy="110" rx="7" ry="4" fill="#a16207" />
        </g>

        <g class="nano-leg-right" style="transform-origin: 68px 98px;">
          <ellipse cx="68" cy="104" rx="6" ry="8" fill="#ca8a04" stroke="#854d0e" stroke-width="1.5" />
          <ellipse cx="70" cy="110" rx="7" ry="4" fill="#a16207" />
        </g>

        <g filter="url(#nanoGlow)">
          <path d="M 55 10 Q 57 3 62 2 Q 65 3 63 12 Z" fill="url(#bananaTip)" stroke="#4d7c0f" stroke-width="1" />
          <path d="M 55 10 C 78 18, 92 48, 88 80 C 85 96, 72 104, 55 103 C 38 104, 25 96, 22 80 C 18 48, 32 18, 55 10 Z" 
                fill="url(#bananaGrad)" stroke="#a16207" stroke-width="2.5" />
          <path d="M 55 14 C 72 24, 82 50, 78 80 C 76 90, 68 98, 55 99" 
                fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" />
          <path d="M 55 14 C 38 24, 28 50, 32 80" 
                fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" opacity="0.6" />
        </g>

        <ellipse cx="33" cy="56" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <ellipse cx="77" cy="56" rx="6" ry="4" fill="#fb7185" opacity="0.6" />

        ${e}
        ${s}
        ${i}
        ${r}

        <g class="nano-arm-left" style="transform-origin: 26px 60px;">
          <path d="M 26 60 Q 14 62 12 52" stroke="#a16207" stroke-width="4" stroke-linecap="round" fill="none" />
          <circle cx="12" cy="50" r="4.5" fill="#fde047" stroke="#a16207" stroke-width="1.5" />
        </g>

        <g class="nano-arm-right" style="transform-origin: 84px 60px;">
          <path d="M 84 60 Q 96 62 98 52" stroke="#a16207" stroke-width="4" stroke-linecap="round" fill="none" />
          <circle cx="98" cy="50" r="4.5" fill="#fde047" stroke="#a16207" stroke-width="1.5" />
        </g>

        ${t}
      </svg>
    `}renderBerryCatSvg(t){let e=this.state===c.SAD?"M48 64 Q55 60 62 64":this.state===c.HAPPY?"M46 58 Q55 70 64 58 Z":"M50 60 Q55 65 60 60";return`
      <svg viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#f43f5e" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#f43f5e" /></g>
        <polygon points="26,38 38,12 50,30" fill="#fb7185" stroke="#e11d48" stroke-width="2" />
        <polygon points="84,38 72,12 60,30" fill="#fb7185" stroke="#e11d48" stroke-width="2" />
        <polygon points="30,34 38,18 46,30" fill="#fecdd3" />
        <polygon points="80,34 72,18 64,30" fill="#fecdd3" />
        <circle cx="55" cy="62" r="38" fill="#fda4af" stroke="#e11d48" stroke-width="2.5" />
        <line x1="20" y1="56" x2="35" y2="58" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="20" y1="64" x2="35" y2="62" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="90" y1="56" x2="75" y2="58" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="90" y1="64" x2="75" y2="62" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <circle cx="43" cy="52" r="4.5" fill="#1e293b" /><circle cx="45" cy="50" r="1.5" fill="#fff" />
        <circle cx="67" cy="52" r="4.5" fill="#1e293b" /><circle cx="69" cy="50" r="1.5" fill="#fff" />
        <polygon points="53,57 57,57 55,60" fill="#be123c" />
        <path d="${e}" stroke="#be123c" stroke-width="2" fill="${this.state===c.HAPPY?"#ef4444":"none"}" />
        <g class="nano-arm-left" style="transform-origin: 24px 68px;"><circle cx="20" cy="68" r="6" fill="#f43f5e" /></g>
        <g class="nano-arm-right" style="transform-origin: 86px 68px;"><circle cx="90" cy="68" r="6" fill="#f43f5e" /></g>
        ${t}
      </svg>
    `}renderCloudPuppySvg(t){return`
      <svg viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#60a5fa" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#60a5fa" /></g>
        <ellipse cx="24" cy="42" rx="10" ry="18" fill="#3b82f6" transform="rotate(-15 24 42)" />
        <ellipse cx="86" cy="42" rx="10" ry="18" fill="#3b82f6" transform="rotate(15 86 42)" />
        <path d="M 55 26 C 70 26, 85 36, 88 52 C 96 56, 98 70, 90 78 C 88 92, 70 98, 55 96 C 40 98, 22 92, 20 78 C 12 70, 14 56, 22 52 C 25 36, 40 26, 55 26 Z" 
              fill="#93c5fd" stroke="#2563eb" stroke-width="2.5" />
        <circle cx="43" cy="52" r="4.5" fill="#1e293b" />
        <circle cx="67" cy="52" r="4.5" fill="#1e293b" />
        <ellipse cx="55" cy="58" rx="5" ry="4" fill="#1e293b" />
        <path d="M50 63 Q55 70 60 63" stroke="#1e293b" stroke-width="2" fill="none" />
        <g class="nano-arm-left" style="transform-origin: 22px 70px;"><circle cx="18" cy="70" r="6" fill="#3b82f6" /></g>
        <g class="nano-arm-right" style="transform-origin: 88px 70px;"><circle cx="92" cy="70" r="6" fill="#3b82f6" /></g>
        ${t}
      </svg>
    `}renderChocoDinoSvg(t){return`
      <svg viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="8" ry="7" fill="#10b981" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="8" ry="7" fill="#10b981" /></g>
        <polygon points="55,16 62,6 68,18" fill="#f59e0b" />
        <polygon points="70,22 80,14 82,28" fill="#f59e0b" />
        <polygon points="38,22 28,14 26,28" fill="#f59e0b" />
        <circle cx="55" cy="60" r="36" fill="#34d399" stroke="#059669" stroke-width="2.5" />
        <circle cx="43" cy="50" r="4.5" fill="#1e293b" />
        <circle cx="67" cy="50" r="4.5" fill="#1e293b" />
        <path d="M47 62 Q55 70 63 62" stroke="#1e293b" stroke-width="2" fill="none" />
        <g class="nano-arm-left" style="transform-origin: 24px 66px;"><circle cx="18" cy="66" r="6" fill="#059669" /></g>
        <g class="nano-arm-right" style="transform-origin: 86px 66px;"><circle cx="92" cy="66" r="6" fill="#059669" /></g>
        ${t}
      </svg>
    `}renderCustomPhotoSvg(t){return`
      <svg viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;">
        <defs>
          <clipPath id="customPhotoClip">
            <circle cx="55" cy="55" r="38" />
          </clipPath>
          <filter id="photoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />
          </filter>
        </defs>
        <ellipse cx="55" cy="112" rx="28" ry="6" fill="rgba(0,0,0,0.22)" />
        
        ${this.showLimbs?`
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#64748b" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#64748b" /></g>`:""}
        
        <g filter="url(#photoShadow)">
          <image href="${this.customPhotoUrl}" x="17" y="17" width="76" height="76" clip-path="url(#customPhotoClip)" preserveAspectRatio="xMidYMid slice" />
        </g>

        ${this.showLimbs?`
        <g class="nano-arm-left" style="transform-origin: 18px 65px;"><circle cx="16" cy="65" r="6" fill="#64748b" /></g>
        <g class="nano-arm-right" style="transform-origin: 92px 65px;"><circle cx="94" cy="65" r="6" fill="#64748b" /></g>`:""}
        
        ${t}
      </svg>
    `}getAccessorySvg(){switch(this.accessory){case"party_hat":return`
          <g transform="translate(55, 12)">
            <polygon points="-12,0 0,-24 12,0" fill="#ec4899" stroke="#be185d" stroke-width="1.5" />
            <circle cx="0" cy="-24" r="4" fill="#facc15" />
            <circle cx="-4" cy="-8" r="2" fill="#38bdf8" />
            <circle cx="4" cy="-14" r="2" fill="#a855f7" />
          </g>
        `;case"cat_ears":return`
          <g>
            <polygon points="34,22 42,4 50,20" fill="#f43f5e" stroke="#9f1239" stroke-width="1.5" />
            <polygon points="37,20 42,8 47,19" fill="#fecdd3" />
            <polygon points="76,22 68,4 60,20" fill="#f43f5e" stroke="#9f1239" stroke-width="1.5" />
            <polygon points="73,20 68,8 63,19" fill="#fecdd3" />
          </g>
        `;case"sunglasses":return`
          <g transform="translate(26, 40)">
            <rect x="2" y="2" width="22" height="14" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
            <rect x="34" y="2" width="22" height="14" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
            <line x1="24" y1="8" x2="34" y2="8" stroke="#0f172a" stroke-width="3" />
            <line x1="6" y1="5" x2="16" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
            <line x1="38" y1="5" x2="48" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
          </g>
        `;case"ribbon":return`
          <g transform="translate(55, 20)">
            <polygon points="0,0 -16,-10 -14,10" fill="#f43f5e" />
            <polygon points="0,0 16,-10 14,10" fill="#f43f5e" />
            <circle cx="0" cy="0" r="5" fill="#fb7185" stroke="#be123c" stroke-width="1" />
          </g>
        `;case"angel_wings":return`
          <g>
            <path d="M 24 55 C 5 45, 0 25, 12 18 C 22 28, 22 40, 24 55 Z" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
            <path d="M 86 55 C 105 45, 110 25, 98 18 C 88 28, 88 40, 86 55 Z" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
            <ellipse cx="55" cy="8" rx="20" ry="4" fill="none" stroke="#facc15" stroke-width="3" />
          </g>
        `;default:return""}}startAffectionMonitor(){setInterval(()=>{const e=Date.now()-Math.max(this.lastCareTime,this.lastSpeechTime);e>O?(this.affection=Math.max(10,this.affection-5),this.triggerBoredomSpeech()):e>5*60*1e3&&Math.random()<.25&&this.triggerBoredomSpeech()},3e4)}triggerBoredomSpeech(){const t=["주인님 뭐하고 계실까? 🍌💭","심심해요... 같이 놀아요! ✨","나노바나나는 집사님 기다리는 중! 🍌","혹시 바쁘신가요? 💛","기억해둘 일 있으시면 말씀해주세요! 📝"],e=t[Math.floor(Math.random()*t.length)];this.say(e,4e3),this.affection<35&&this.state!==c.LIFTED&&this.setState(c.SAD,5e3)}petCare(t=15){this.lastCareTime=Date.now(),this.affection=Math.min(100,this.affection+t),this.state!==c.LIFTED&&this.setState(c.HAPPY,2500)}setState(t,e=0){this.state!==t&&(this.state=t,this.el.setAttribute("data-state",this.state),this.renderVisuals(),this.emotionTimeout&&(clearTimeout(this.emotionTimeout),this.emotionTimeout=null),t===c.HAPPY?(l.playHappy(),this.spawnParticles("heart",5),this.spawnParticles("star",4)):t===c.SAD?(l.playSad(),this.spawnParticles("tear",4)):t===c.LIFTED&&(l.playLift(),this.spawnParticles("sweat",3)),e>0&&(this.emotionTimeout=setTimeout(()=>{const s=this.affection<35?c.SAD:c.WALK;this.setState(s)},e)))}spawnParticles(t,e=3){const i={heart:["💖","💕","✨","💛"],star:["⭐","🌟","✨"],tear:["💧","💦","😢"],sweat:["💦","❕","❗"]}[t]||["✨"];for(let r=0;r<e;r++){const n=document.createElement("div");n.className="particle-fx",n.textContent=i[Math.floor(Math.random()*i.length)],n.style.fontSize=`${Math.floor(14+Math.random()*10)}px`,n.style.left=`${this.x+30+Math.random()*40}px`,n.style.top=`${this.y+10+Math.random()*30}px`;const o=(Math.random()-.5)*80,a=-(20+Math.random()*50);n.style.setProperty("--dx",`${o}px`),n.style.setProperty("--dy",`${a}px`),this.container.appendChild(n),setTimeout(()=>n.remove(),1200)}}say(t,e=4500){this.speechTimeout&&clearTimeout(this.speechTimeout),this.speechBubble.textContent=t,this.speechBubble.classList.add("active"),l.playTalkBlip(),this.speakTTS(t),this.speechTimeout=setTimeout(()=>{this.speechBubble.classList.remove("active")},e)}speakTTS(t){try{const e=window.speechSynthesis;if(!e)return;e.cancel();const s=t.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,"").trim();if(!s)return;const i=()=>{const r=new SpeechSynthesisUtterance(s);r.lang="ko-KR",r.pitch=1.35,r.rate=1.05;const o=e.getVoices().find(a=>a.lang.includes("ko")||a.lang.includes("KR"));o&&(r.voice=o),e.speak(r)};e.getVoices().length===0?e.onvoiceschanged=()=>{i(),e.onvoiceschanged=null}:i()}catch(e){console.warn("TTS Speech error:",e)}}attachEvents(){let t=!1;const e=n=>n.touches&&n.touches.length>0?{x:n.touches[0].clientX??n.touches[0].pageX??0,y:n.touches[0].clientY??n.touches[0].pageY??0}:n.changedTouches&&n.changedTouches.length>0?{x:n.changedTouches[0].clientX??n.changedTouches[0].pageX??0,y:n.changedTouches[0].clientY??n.changedTouches[0].pageY??0}:{x:n.clientX??n.pageX??0,y:n.clientY??n.pageY??0},s=n=>{if(n.cancelable&&n.preventDefault(),t=!0,this.isDragging=!0,this.hasTriggeredLongPress=!1,this.dragDistance=0,n.pointerId&&this.el.setPointerCapture)try{this.el.setPointerCapture(n.pointerId)}catch{}const o=e(n);this.dragStartX=o.x-this.x,this.dragStartY=o.y-this.y,this.lastPointerX=o.x,this.lastPointerY=o.y,this.pointerVx=0,this.pointerVy=0,this.longPressTimer&&clearTimeout(this.longPressTimer),this.longPressRing.classList.add("charging"),this.longPressTimer=setTimeout(()=>{this.isDragging&&this.dragDistance<15&&(this.hasTriggeredLongPress=!0,this.longPressRing.classList.remove("charging"),l.playMenuOpen(),this.onLongPress&&this.onLongPress(this.x+this.width/2,this.y+this.height/2))},this.longPressThreshold),this.setState(c.LIFTED)},i=n=>{if(!t||!this.isDragging)return;n.cancelable&&n.preventDefault();const o=e(n),a=o.x-this.lastPointerX,h=o.y-this.lastPointerY;this.dragDistance+=Math.abs(a)+Math.abs(h),this.dragDistance>15&&this.longPressTimer&&(clearTimeout(this.longPressTimer),this.longPressTimer=null,this.longPressRing.classList.remove("charging")),this.pointerVx=a*.4,this.pointerVy=h*.4,this.lastPointerX=o.x,this.lastPointerY=o.y,this.x=o.x-this.dragStartX,this.y=o.y-this.dragStartY,this.constrainBounds(),this.updateTransform()},r=n=>{if(t){if(t=!1,this.isDragging=!1,this.longPressRing.classList.remove("charging"),n&&n.pointerId&&this.el.releasePointerCapture)try{this.el.releasePointerCapture(n.pointerId)}catch{}if(this.longPressTimer&&(clearTimeout(this.longPressTimer),this.longPressTimer=null),this.hasTriggeredLongPress)this.setState(c.WALK);else if(this.dragDistance<18){const o=Date.now();this.tapTimestamps.push(o),this.tapTimestamps=this.tapTimestamps.filter(a=>o-a<=this.tripleTapWindow),this.tapTimestamps.length>=3?(this.tapTimestamps=[],l.playHappy(),this.say("말씀하세요! 듣고 있어요 🎙️✨",2500),this.onTripleTap&&this.onTripleTap()):(l.playTap(),this.petCare(10),this.onTap&&this.onTap())}else l.playDrop(),this.petCare(5),this.vx=Math.max(-6,Math.min(6,this.pointerVx)),this.vy=Math.max(-6,Math.min(6,this.pointerVy)),this.setState(c.WALK)}};this.el.addEventListener("pointerdown",s,{passive:!1}),window.addEventListener("pointermove",i,{passive:!1}),window.addEventListener("pointerup",r,{passive:!1}),window.addEventListener("pointercancel",r,{passive:!1}),this.el.addEventListener("touchstart",s,{passive:!1}),window.addEventListener("touchmove",i,{passive:!1}),window.addEventListener("touchend",r,{passive:!1}),window.addEventListener("touchcancel",r,{passive:!1})}getViewportSize(){try{const e=(this.container.ownerDocument||document).defaultView||window,s=e.visualViewport,i=s?s.width:this.container.clientWidth||e.innerWidth||300,r=s?s.height:this.container.clientHeight||e.innerHeight||400;return{width:i,height:r}}catch{return{width:window.innerWidth,height:window.innerHeight}}}constrainBounds(){const{width:t,height:e}=this.getViewportSize(),s=Math.max(0,t-this.width),i=Math.max(10,e-this.height-10);this.x<0?(this.x=0,this.vx=Math.abs(this.vx)*.8,this.facingRight=!0):this.x>s&&(this.x=s,this.vx=-Math.abs(this.vx)*.8,this.facingRight=!1),this.y<this.minY?(this.y=this.minY,this.vy=Math.abs(this.vy)*.8):this.y>i&&(this.y=i,this.vy=-Math.abs(this.vy)*.8)}startPhysicsLoop(){let t=performance.now(),e=0;const s=i=>{const r=Math.min((i-t)/1e3,.1);if(t=i,!this.isDragging){if(e+=r,e>2.2&&(e=0,Math.random()<.4)){const n=this.state===c.SAD?.8:1.8;this.vx=(Math.random()-.5)*n*2,this.vy=(Math.random()-.5)*n*1.5,this.facingRight=this.vx>=0}this.x+=this.vx*60*r,this.y+=this.vy*60*r,this.vx*=.99,this.vy*=.99,this.constrainBounds(),this.updateTransform()}requestAnimationFrame(s)};requestAnimationFrame(s)}updateTransform(){const t=Math.max(.5,this.scale||1),e=Math.max(60,this.width||Math.round(110*t)),s=Math.max(60,this.height||Math.round(120*t));this.el.style.setProperty("--char-scale",t),this.el.style.width=`${e}px`,this.el.style.height=`${s}px`,this.el.style.left=`${this.x||0}px`,this.el.style.top=`${this.y||0}px`,this.el.style.display="block",this.el.style.visibility="visible",this.el.style.opacity="1";const i=this.facingRight?1:-1;this.bodyWrapper.style.setProperty("--char-facing",i),this.bodyWrapper.style.transform=`scaleX(${i})`}updateCustomization({type:t,customPhotoUrl:e,accessory:s,hueShift:i,scale:r,showLimbs:n}){t!==void 0&&(this.type=t),e!==void 0&&(this.customPhotoUrl=e),s!==void 0&&(this.accessory=s),i!==void 0&&(this.hueShift=i),n!==void 0&&(this.showLimbs=n),r!==void 0&&(this.scale=r,this.width=Math.round((this.baseWidth||110)*this.scale),this.height=Math.round((this.baseHeight||120)*this.scale)),this.renderVisuals()}}class _{static async evaluateImage(t){let e,s=null;try{if(t instanceof File||t instanceof Blob){if(!t.type.startsWith("image/"))return{safe:!1,score:0,reason:"지원하지 않는 파일 형식입니다. 이미지 파일(PNG, JPG, WEBP 등)을 올려주세요."};s=URL.createObjectURL(t),e=await this._loadImage(s)}else if(t instanceof HTMLImageElement)e=t;else return t instanceof HTMLCanvasElement?this._analyzeCanvas(t):{safe:!1,score:0,reason:"유효한 이미지 형식이 아닙니다."};const i=document.createElement("canvas"),r=160;return i.width=r,i.height=r,i.getContext("2d",{willReadFrequently:!0}).drawImage(e,0,0,r,r),this._analyzeCanvas(i)}catch(i){return console.error("Safety analysis error:",i),{safe:!1,score:0,reason:"이미지 분석 중 오류가 발생했습니다. 다른 이미지를 시도해주세요."}}finally{s&&URL.revokeObjectURL(s)}}static _loadImage(t){return new Promise((e,s)=>{const i=new Image;i.crossOrigin="anonymous",i.onload=()=>e(i),i.onerror=r=>s(r),i.src=t})}static _analyzeCanvas(t){const e=t.getContext("2d",{willReadFrequently:!0}),s=t.width,i=t.height,r=s*i,o=e.getImageData(0,0,s,i).data;let a=0,h=0,P=0,k=0;const v=Math.floor(s*.25),A=Math.floor(s*.75),C=Math.floor(i*.25),S=Math.floor(i*.75),L=(A-v)*(S-C);for(let m=0;m<i;m++)for(let x=0;x<s;x++){const T=(m*s+x)*4,d=o[T],p=o[T+1],u=o[T+2];if(o[T+3]<30)continue;const b=this._rgbToHsv(d,p,u),V=this._rgbToYCbCr(d,p,u);this._isSkinTone(d,p,u,b,V)&&(a++,x>=v&&x<=A&&m>=C&&m<=S&&k++),d>130&&p<50&&u<50&&d/(p+u+1)>1.8&&h++,d>40&&d<100&&p>20&&p<60&&u>20&&u<60&&b.s>.25&&b.v<.35&&P++}const g=a/r,R=k/L,y=h/r,M=P/r;return g>.55||g>.38&&R>.62?{safe:!1,score:Math.max(0,1-g),reason:"성인물 또는 과도한 노출이 포함된 이미지는 등록할 수 없습니다.",details:`피부 노출 비율(${Math.round(g*100)}%)이 안전 기준치를 초과했습니다.`}:y>.22||y>.12&&M>.15?{safe:!1,score:Math.max(0,1-y*2),reason:"잔혹하거나 유해한(혈흔/상해 등) 이미지는 등록할 수 없습니다.",details:`유해 시각 지수(${Math.round((y+M)*100)}%)가 감지되었습니다.`}:{safe:!0,score:Math.min(1,Math.max(.7,1-(g*.4+y*.5))),reason:"안전한 이미지로 확인되었습니다.",details:"유해 콘텐츠 검열 통과"}}static _rgbToHsv(t,e,s){t/=255,e/=255,s/=255;const i=Math.max(t,e,s),r=Math.min(t,e,s);let n,o,a=i;const h=i-r;if(o=i===0?0:h/i,i===r)n=0;else{switch(i){case t:n=(e-s)/h+(e<s?6:0);break;case e:n=(s-t)/h+2;break;case s:n=(t-e)/h+4;break}n/=6}return{h:n*360,s:o,v:a}}static _rgbToYCbCr(t,e,s){const i=.299*t+.587*e+.114*s,r=128-.168736*t-.331264*e+.5*s,n=128+.5*t-.418688*e-.081312*s;return{y:i,cb:r,cr:n}}static _isSkinTone(t,e,s,i,r){const n=t>95&&e>40&&s>20&&t>e&&e>s&&t-e>15&&Math.abs(t-e)>15,o=r.cb>=77&&r.cb<=127&&r.cr>=133&&r.cr<=173,a=i.h>=0&&i.h<=50&&i.s>=.2&&i.s<=.75&&i.v>=.35;return n&&o||a&&o}}const D="my_phone_friend_custom_pref_v1";class U{constructor(t){this.character=t,this.currentType=f.NANO_BANANA,this.currentAccessory="none",this.currentHue=0,this.customPhotoUrl=null,this.currentScale=1,this.showLimbs=!0,this.loadPreferences()}loadPreferences(){try{const t=localStorage.getItem(D);if(t){const e=JSON.parse(t);this.currentType=e.type||f.NANO_BANANA,this.currentAccessory=e.accessory||"none",this.currentHue=e.hueShift||0,this.currentScale=e.scale||1,this.customPhotoUrl=e.customPhotoUrl||null,this.showLimbs=e.showLimbs!==!1,this.applyCustomization(),window.AndroidPetBridge&&window.AndroidPetBridge.syncPetData&&window.AndroidPetBridge.syncPetData(t)}}catch(t){console.warn("Failed to load customizer preferences:",t)}}savePreferences(){try{const t={type:this.currentType,accessory:this.currentAccessory,hueShift:this.currentHue,scale:this.currentScale,customPhotoUrl:this.customPhotoUrl,showLimbs:this.showLimbs},e=JSON.stringify(t);localStorage.setItem(D,e),window.dispatchEvent(new Event("characterUpdated")),window.AndroidPetBridge&&window.AndroidPetBridge.syncPetData&&window.AndroidPetBridge.syncPetData(e)}catch(t){console.warn("Failed to save customizer preferences:",t)}}applyCustomization(){this.character.updateCustomization({type:this.currentType,accessory:this.currentAccessory,hueShift:this.currentHue,scale:this.currentScale,customPhotoUrl:this.customPhotoUrl,showLimbs:this.showLimbs})}setCharacterType(t){this.currentType=t,this.applyCustomization(),this.savePreferences(),l.playTap(),this.character.setState(c.HAPPY,1800)}setAccessory(t){this.currentAccessory=t,this.applyCustomization(),this.savePreferences(),l.playTap(),this.character.setState(c.HAPPY,1500)}setHue(t){this.currentHue=parseInt(t,10)||0,this.applyCustomization(),this.savePreferences()}setScale(t){this.currentScale=parseFloat(t)||1,this.applyCustomization(),this.savePreferences()}setShowLimbs(t){this.showLimbs=!!t,this.applyCustomization(),this.savePreferences()}async handleImageUpload(t){if(!t)return{success:!1,message:"파일이 선택되지 않았습니다."};try{const e=await _.evaluateImage(t);return e.safe?new Promise(s=>{const i=new FileReader;i.onload=r=>{this.customPhotoUrl=r.target.result,this.currentType=f.CUSTOM_PHOTO,this.applyCustomization(),this.savePreferences(),l.playHappy(),this.character.setState(c.HAPPY,2500),this.character.say("새로운 캐릭터로 변신 완료! ✨",3e3),s({success:!0,censored:!1,message:"건전하고 안전한 사진으로 확인되어 캐릭터로 설정되었습니다! 🍌✨"})},i.onerror=()=>{s({success:!1,message:"이미지를 읽는 도중 오류가 발생했습니다."})},i.readAsDataURL(t)}):(l.playWarning(),{success:!1,censored:!0,message:`[업로드 차단] ${e.reason}
${e.details||""}`})}catch(e){return console.error("Image upload failed:",e),{success:!1,message:"이미지 처리 중 문제가 발생했습니다."}}}removeCustomPhoto(){this.customPhotoUrl=null,this.currentType=f.NANO_BANANA,this.applyCustomization(),this.savePreferences(),l.playTap()}}export{c as C,$ as a,f as b,U as c,l as s};
