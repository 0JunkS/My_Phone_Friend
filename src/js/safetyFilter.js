/**
 * Image Safety & Content Moderation Filter
 * Inspects uploaded images on the client side using pixel analysis,
 * color space segmentation (YCbCr / HSV), skin-to-surface ratios,
 * and gore/blood hue cluster metrics to reject inappropriate, NSFW, or violent content.
 */

export class SafetyFilter {
  /**
   * Evaluates an Image or Canvas element for safety
   * @param {HTMLImageElement|HTMLCanvasElement|File|Blob} input
   * @returns {Promise<{safe: boolean, reason?: string, details?: string, score: number}>}
   */
  static async evaluateImage(input) {
    let img;
    let cleanupUrl = null;

    try {
      if (input instanceof File || input instanceof Blob) {
        // Basic MIME check
        if (!input.type.startsWith('image/')) {
          return {
            safe: false,
            score: 0,
            reason: '지원하지 않는 파일 형식입니다. 이미지 파일(PNG, JPG, WEBP 등)을 올려주세요.',
          };
        }
        cleanupUrl = URL.createObjectURL(input);
        img = await this._loadImage(cleanupUrl);
      } else if (input instanceof HTMLImageElement) {
        img = input;
      } else if (input instanceof HTMLCanvasElement) {
        return this._analyzeCanvas(input);
      } else {
        return { safe: false, score: 0, reason: '유효한 이미지 형식이 아닙니다.' };
      }

      // Render to normalized canvas for analysis (160x160 for fast, accurate density estimation)
      const canvas = document.createElement('canvas');
      const size = 160;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);

      const result = this._analyzeCanvas(canvas);
      return result;
    } catch (err) {
      console.error('Safety analysis error:', err);
      return { safe: false, score: 0, reason: '이미지 분석 중 오류가 발생했습니다. 다른 이미지를 시도해주세요.' };
    } finally {
      if (cleanupUrl) {
        URL.revokeObjectURL(cleanupUrl);
      }
    }
  }

  static _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  static _analyzeCanvas(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const totalPixels = width * height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let skinPixels = 0;
    let bloodGorePixels = 0;
    let extremeDarkGorePixels = 0;
    let centerSkinPixels = 0;

    const centerStartX = Math.floor(width * 0.25);
    const centerEndX = Math.floor(width * 0.75);
    const centerStartY = Math.floor(height * 0.25);
    const centerEndY = Math.floor(height * 0.75);
    const centerTotalPixels = (centerEndX - centerStartX) * (centerEndY - centerStartY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 30) continue; // Skip transparent background

        // Convert RGB to HSV
        const hsv = this._rgbToHsv(r, g, b);
        const ycbcr = this._rgbToYCbCr(r, g, b);

        // 1. Skin tone detector (standard peer-reviewed multi-space heuristics)
        const isSkin = this._isSkinTone(r, g, b, hsv, ycbcr);
        if (isSkin) {
          skinPixels++;
          if (x >= centerStartX && x <= centerEndX && y >= centerStartY && y <= centerEndY) {
            centerSkinPixels++;
          }
        }

        // 2. Blood / Violent Gore detector (Heavy saturated crimson/blood red)
        const isBloodGore = (r > 130 && g < 50 && b < 50 && (r / (g + b + 1) > 1.8));
        if (isBloodGore) {
          bloodGorePixels++;
        }

        // 3. Necrotic / Morbid dark bruised pattern
        const isNecrotic = (r > 40 && r < 100 && g > 20 && g < 60 && b > 20 && b < 60 && hsv.s > 0.25 && hsv.v < 0.35);
        if (isNecrotic) {
          extremeDarkGorePixels++;
        }
      }
    }

    const skinRatio = skinPixels / totalPixels;
    const centerSkinRatio = centerSkinPixels / centerTotalPixels;
    const bloodRatio = bloodGorePixels / totalPixels;
    const necroticRatio = extremeDarkGorePixels / totalPixels;

    // Safety checks
    // A. Explicit / Excessive adult skin exposure check (>55% overall or >68% central concentration)
    if (skinRatio > 0.55 || (skinRatio > 0.38 && centerSkinRatio > 0.62)) {
      return {
        safe: false,
        score: Math.max(0, 1 - skinRatio),
        reason: '성인물 또는 과도한 노출이 포함된 이미지는 등록할 수 없습니다.',
        details: `피부 노출 비율(${Math.round(skinRatio * 100)}%)이 안전 기준치를 초과했습니다.`
      };
    }

    // B. Gore / Blood / Corpse violent check
    if (bloodRatio > 0.22 || (bloodRatio > 0.12 && necroticRatio > 0.15)) {
      return {
        safe: false,
        score: Math.max(0, 1 - bloodRatio * 2),
        reason: '잔혹하거나 유해한(혈흔/상해 등) 이미지는 등록할 수 없습니다.',
        details: `유해 시각 지수(${Math.round((bloodRatio + necroticRatio) * 100)}%)가 감지되었습니다.`
      };
    }

    // Passed safety inspection
    const safetyScore = Math.min(1.0, Math.max(0.7, 1 - (skinRatio * 0.4 + bloodRatio * 0.5)));
    return {
      safe: true,
      score: safetyScore,
      reason: '안전한 이미지로 확인되었습니다.',
      details: '유해 콘텐츠 검열 통과'
    };
  }

  static _rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, v };
  }

  static _rgbToYCbCr(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return { y, cb, cr };
  }

  static _isSkinTone(r, g, b, hsv, ycbcr) {
    // RGB condition: R > G > B and minimum light levels
    const rgbSkin = (r > 95) && (g > 40) && (b > 20) &&
                    (r > g) && (g > b) &&
                    ((r - g) > 15) &&
                    (Math.abs(r - g) > 15);

    // YCbCr bounds for diverse skin tones (Caucasian, Asian, African, Hispanic)
    const ycbcrSkin = (ycbcr.cb >= 77 && ycbcr.cb <= 127) &&
                      (ycbcr.cr >= 133 && ycbcr.cr <= 173);

    // HSV bounds: H in 0-50, S in 0.20-0.75, V >= 0.35
    const hsvSkin = (hsv.h >= 0 && hsv.h <= 50) &&
                    (hsv.s >= 0.20 && hsv.s <= 0.75) &&
                    (hsv.v >= 0.35);

    return (rgbSkin && ycbcrSkin) || (hsvSkin && ycbcrSkin);
  }
}
