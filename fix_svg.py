with open('src/js/character.js', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')

# Fix SVG sizes - replace fixed 110/120 with 100%
content = content.replace(
    'viewBox="0 0 110 120" width="110" height="120" style="filter:',
    'viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;filter:'
)
content = content.replace(
    'viewBox="0 0 110 120" width="110" height="120">',
    'viewBox="0 0 110 120" width="100%" height="100%" style="display:block;overflow:visible;">'
)

# Fix updateTransform - remove hardcoded overlay position and fix scaleY issue
old_transform = '''  updateTransform() {
    const scaleFactor = this.scale || 1.0;
    this.el.style.setProperty('--char-scale', scaleFactor);
    this.el.style.width = `${this.width}px`;
    this.el.style.height = `${this.height}px`;

    if (document.body.classList.contains('mode-overlay')) {
      this.el.style.left = '15px';
      this.el.style.top = '25px';
      const facingScale = this.facingRight ? scaleFactor : -scaleFactor;
      this.bodyWrapper.style.setProperty('--char-facing', facingScale);
      this.bodyWrapper.style.transform = `scaleX(${facingScale}) scaleY(${scaleFactor})`;
      return;
    }

    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    const facingScale = this.facingRight ? scaleFactor : -scaleFactor;
    this.bodyWrapper.style.setProperty('--char-facing', facingScale);
    this.bodyWrapper.style.transform = `scaleX(${facingScale}) scaleY(${scaleFactor})`;
  }'''

new_transform = '''  updateTransform() {
    const scaleFactor = Math.max(0.5, this.scale || 1.0);
    const w = Math.max(60, this.width || Math.round(110 * scaleFactor));
    const h = Math.max(60, this.height || Math.round(120 * scaleFactor));

    this.el.style.setProperty('--char-scale', scaleFactor);
    this.el.style.width = `${w}px`;
    this.el.style.height = `${h}px`;
    this.el.style.left = `${this.x || 0}px`;
    this.el.style.top = `${this.y || 0}px`;
    this.el.style.display = 'block';
    this.el.style.visibility = 'visible';
    this.el.style.opacity = '1';

    const facingScale = this.facingRight ? 1 : -1;
    this.bodyWrapper.style.setProperty('--char-facing', facingScale);
    this.bodyWrapper.style.transform = `scaleX(${facingScale})`;
  }'''

# normalize CRLF for matching
content_lf = content.replace('\r\n', '\n')
old_transform_lf = old_transform.replace('\r\n', '\n')
new_transform_lf = new_transform.replace('\r\n', '\n')

if old_transform_lf in content_lf:
    content_lf = content_lf.replace(old_transform_lf, new_transform_lf)
    print('updateTransform replaced OK')
else:
    print('WARNING: updateTransform pattern not found!')

# Fix say method - add speakTTS call if not already present
if 'speakTTS' not in content_lf:
    old_say = '''  say(text, durationMs = 3500) {
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('active');
    sound.playTalkBlip();

    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.remove('active');
    }, durationMs);
  }'''
    new_say = '''  say(text, durationMs = 4500) {
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('active');
    sound.playTalkBlip();
    this.speakTTS(text);
    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.remove('active');
    }, durationMs);
  }

  speakTTS(text) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const cleanSpeech = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
      if (!cleanSpeech) return;
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.lang = 'ko-KR';
        utterance.pitch = 1.35;
        utterance.rate = 1.05;
        const voices = synth.getVoices();
        const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
        if (koVoice) utterance.voice = koVoice;
        synth.speak(utterance);
      };
      if (synth.getVoices().length === 0) {
        synth.onvoiceschanged = () => { speak(); synth.onvoiceschanged = null; };
      } else {
        speak();
      }
    } catch(e) {}
  }'''
    if old_say.replace('\r\n', '\n') in content_lf:
        content_lf = content_lf.replace(old_say.replace('\r\n', '\n'), new_say)
        print('say+speakTTS replaced OK')
    else:
        print('WARNING: say pattern not found!')
else:
    print('speakTTS already present, skipping')

svg_count = content_lf.count('width="100%"')
print(f'SVG 100% count: {svg_count}')

with open('src/js/character.js', 'w', encoding='utf-8') as f:
    f.write(content_lf)
print('Done! File written as UTF-8 LF')
