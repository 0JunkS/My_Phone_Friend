with open('src/js/character.js', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 1. Add showLimbs to constructor (after this.scale = ...)
old_scale_line = "    this.scale = options.scale || 1.0;"
new_scale_line = "    this.scale = options.scale || 1.0;\n    this.showLimbs = options.showLimbs !== false; // toggle arms/legs on custom photo"
content = content.replace(old_scale_line, new_scale_line, 1)

# 2. Add showLimbs to updateCustomization signature and body
old_update = "  updateCustomization({ type, customPhotoUrl, accessory, hueShift, scale }) {\n    if (type !== undefined) this.type = type;\n    if (customPhotoUrl !== undefined) this.customPhotoUrl = customPhotoUrl;\n    if (accessory !== undefined) this.accessory = accessory;\n    if (hueShift !== undefined) this.hueShift = hueShift;\n    if (scale !== undefined) {\n      this.scale = scale;\n      this.width = Math.round((this.baseWidth || 110) * this.scale);\n      this.height = Math.round((this.baseHeight || 120) * this.scale);\n    }\n    this.renderVisuals();\n  }"
new_update = "  updateCustomization({ type, customPhotoUrl, accessory, hueShift, scale, showLimbs }) {\n    if (type !== undefined) this.type = type;\n    if (customPhotoUrl !== undefined) this.customPhotoUrl = customPhotoUrl;\n    if (accessory !== undefined) this.accessory = accessory;\n    if (hueShift !== undefined) this.hueShift = hueShift;\n    if (showLimbs !== undefined) this.showLimbs = showLimbs;\n    if (scale !== undefined) {\n      this.scale = scale;\n      this.width = Math.round((this.baseWidth || 110) * this.scale);\n      this.height = Math.round((this.baseHeight || 120) * this.scale);\n    }\n    this.renderVisuals();\n  }"
# normalize CRLF
content_lf = content.replace('\r\n', '\n')
old_update_lf = old_update.replace('\r\n', '\n')
new_update_lf = new_update.replace('\r\n', '\n')
if old_update_lf in content_lf:
    content_lf = content_lf.replace(old_update_lf, new_update_lf)
    print('updateCustomization patched OK')
else:
    print('WARNING: updateCustomization pattern not found - check manually')

# 3. Make custom photo arms/legs conditional on this.showLimbs
old_photo_limbs = """        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#64748b" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#64748b" /></g>"""
new_photo_limbs = """        ${this.showLimbs ? `
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#64748b" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#64748b" /></g>` : ''}"""

old_photo_arms = """        <g class="nano-arm-left" style="transform-origin: 18px 65px;"><circle cx="16" cy="65" r="6" fill="#64748b" /></g>
        <g class="nano-arm-right" style="transform-origin: 92px 65px;"><circle cx="94" cy="65" r="6" fill="#64748b" /></g>"""
new_photo_arms = """        ${this.showLimbs ? `
        <g class="nano-arm-left" style="transform-origin: 18px 65px;"><circle cx="16" cy="65" r="6" fill="#64748b" /></g>
        <g class="nano-arm-right" style="transform-origin: 92px 65px;"><circle cx="94" cy="65" r="6" fill="#64748b" /></g>` : ''}"""

if old_photo_limbs in content_lf:
    content_lf = content_lf.replace(old_photo_limbs, new_photo_limbs)
    print('photo legs patched OK')
else:
    print('WARNING: photo legs pattern not found')

if old_photo_arms in content_lf:
    content_lf = content_lf.replace(old_photo_arms, new_photo_arms)
    print('photo arms patched OK')
else:
    print('WARNING: photo arms pattern not found')

with open('src/js/character.js', 'w', encoding='utf-8') as f:
    f.write(content_lf)
print('Done!')
