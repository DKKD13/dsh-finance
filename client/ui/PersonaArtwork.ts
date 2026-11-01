type PixelRect = readonly [x: number, y: number, width: number, height: number]
interface Portrait {
  readonly background: string
  readonly halo: string
  readonly skin: string
  readonly shade: string
  readonly hair: string
  readonly hairLight: string
  readonly hairPixels: readonly PixelRect[]
  readonly highlights: readonly PixelRect[]
  readonly face: readonly [cheeks: number, jaw: number, chin: number]
  readonly eyes: readonly [y: number, spacing: number, width: number]
  readonly brows: readonly [y: number, thickness: number, tilt: number]
  readonly nose: readonly [width: number, height: number]
  readonly mouth: readonly [width: number, smile: number]
  readonly glasses: 'none' | 'round' | 'square' | 'fine'
  readonly beard: 'none' | 'stubble' | 'goatee' | 'full' | 'short'
  readonly beardColor: string
  readonly clothes: 'crew' | 'shirt' | 'suit' | 'hoodie' | 'turtleneck' | 'jacket'
  readonly coat: string
  readonly shirt: string
  readonly accent: string
}

// Hand-drawn interpretations, not photographs. Each named portrait has its own
// silhouette and facial geometry; the mentor/creator are fictional role avatars.
const PORTRAITS: Readonly<Record<string, Portrait>> = {
  'andrej-karpathy-perspective': {
    background: '#eef2f5', halo: '#dde6ec', skin: '#e5bc9f', shade: '#c99378', hair: '#5b4638', hairLight: '#80634e',
    hairPixels: [[17, 5, 13, 3], [14, 8, 19, 3], [13, 11, 6, 5], [29, 10, 5, 7], [13, 15, 2, 5]], highlights: [[17, 7, 9, 1], [15, 10, 4, 2]],
    face: [20, 18, 12], eyes: [22, 6, 2], brows: [19, 1, -1], nose: [2, 5], mouth: [7, 1], glasses: 'none', beard: 'none', beardColor: '#795b47',
    clothes: 'crew', coat: '#547794', shirt: '#6d91aa', accent: '#d5e2eb',
  },
  'elon-musk-perspective': {
    background: '#f0f0ed', halo: '#e0e1da', skin: '#ecc5b0', shade: '#c99680', hair: '#624e43', hairLight: '#8b7160',
    hairPixels: [[18, 4, 12, 2], [15, 6, 19, 3], [13, 9, 22, 3], [13, 12, 4, 5], [31, 11, 4, 8], [14, 17, 1, 3]], highlights: [[19, 6, 11, 1], [16, 8, 16, 1]],
    face: [26, 22, 18], eyes: [22, 7, 3], brows: [19, 2, 0], nose: [3, 4], mouth: [9, 0], glasses: 'none', beard: 'none', beardColor: '#806354',
    clothes: 'jacket', coat: '#313b46', shirt: '#e4e5de', accent: '#66788a',
  },
  'feynman-perspective': {
    background: '#f5f0e6', halo: '#e9dfca', skin: '#e8bfa3', shade: '#c69375', hair: '#7b7064', hairLight: '#b5aa93',
    hairPixels: [[16, 4, 10, 3], [26, 6, 8, 3], [12, 8, 10, 4], [29, 9, 8, 5], [10, 12, 6, 9], [32, 13, 6, 10], [11, 20, 4, 7], [33, 21, 4, 6]], highlights: [[16, 6, 7, 2], [12, 11, 3, 6], [33, 11, 3, 7]],
    face: [22, 18, 14], eyes: [21, 7, 3], brows: [17, 1, 1], nose: [2, 6], mouth: [10, 2], glasses: 'none', beard: 'none', beardColor: '#9d8d79',
    clothes: 'jacket', coat: '#9d8462', shirt: '#f0dfbc', accent: '#c4aa7d',
  },
  'ilya-sutskever-perspective': {
    background: '#edf0f2', halo: '#dce3e7', skin: '#dfb79c', shade: '#b68a71', hair: '#37352f', hairLight: '#686257',
    hairPixels: [[18, 3, 12, 3], [13, 6, 21, 4], [11, 10, 8, 5], [28, 9, 9, 5], [12, 14, 4, 9], [33, 14, 4, 10], [17, 10, 5, 3], [25, 10, 4, 4]], highlights: [[18, 5, 8, 1], [13, 9, 3, 3], [31, 10, 3, 2]],
    face: [22, 18, 14], eyes: [23, 6, 2], brows: [19, 2, 1], nose: [2, 5], mouth: [6, 0], glasses: 'none', beard: 'stubble', beardColor: '#978777',
    clothes: 'crew', coat: '#626e78', shirt: '#7f8b94', accent: '#b5bfc4',
  },
  'mrbeast-perspective': {
    background: '#edf3f4', halo: '#d5e7eb', skin: '#e6b497', shade: '#bf896c', hair: '#72513b', hairLight: '#a37a55',
    hairPixels: [[16, 5, 8, 3], [23, 3, 8, 5], [13, 8, 22, 4], [12, 12, 6, 7], [30, 11, 6, 9], [17, 10, 7, 4]], highlights: [[24, 5, 5, 1], [17, 8, 6, 1], [14, 11, 3, 3]],
    face: [22, 20, 14], eyes: [21, 7, 3], brows: [18, 2, -1], nose: [3, 5], mouth: [10, 2], glasses: 'none', beard: 'short', beardColor: '#79583f',
    clothes: 'hoodie', coat: '#4d91ad', shirt: '#76b2c8', accent: '#d9e9ec',
  },
  'munger-perspective': {
    background: '#f3efe5', halo: '#e6ddc8', skin: '#e9c6ac', shade: '#c59e83', hair: '#ded8cb', hairLight: '#f4eee2',
    hairPixels: [[15, 8, 5, 3], [29, 8, 5, 3], [11, 11, 6, 7], [32, 11, 5, 8], [11, 18, 3, 6], [35, 18, 3, 6]], highlights: [[12, 12, 3, 5], [33, 12, 3, 5]],
    face: [26, 24, 18], eyes: [23, 7, 2], brows: [19, 1, 0], nose: [4, 5], mouth: [8, 0], glasses: 'square', beard: 'none', beardColor: '#d4c4b0',
    clothes: 'suit', coat: '#48576b', shirt: '#f4eddd', accent: '#8d6b55',
  },
  'naval-perspective': {
    background: '#edf2e9', halo: '#dce6d4', skin: '#bc8d6b', shade: '#94674f', hair: '#30312d', hairLight: '#595448',
    hairPixels: [[15, 5, 7, 4], [23, 3, 8, 5], [30, 6, 5, 5], [12, 10, 7, 6], [19, 7, 9, 5], [29, 11, 8, 6], [12, 16, 3, 9], [34, 16, 3, 9]], highlights: [[16, 6, 3, 1], [25, 5, 3, 1], [31, 9, 3, 1]],
    face: [22, 20, 16], eyes: [22, 7, 2], brows: [18, 2, 0], nose: [3, 5], mouth: [7, 1], glasses: 'none', beard: 'full', beardColor: '#373832',
    clothes: 'crew', coat: '#536b62', shirt: '#718b7d', accent: '#c2d0b9',
  },
  'paul-graham-perspective': {
    background: '#edf1f4', halo: '#dce5eb', skin: '#e9c4b3', shade: '#c59c88', hair: '#aaa39a', hairLight: '#d1c9bc',
    hairPixels: [[17, 8, 5, 2], [29, 9, 4, 2], [12, 12, 4, 10], [33, 12, 4, 10], [13, 9, 5, 4], [31, 10, 4, 4]], highlights: [[13, 13, 2, 6], [34, 13, 2, 6]],
    face: [24, 22, 16], eyes: [22, 8, 2], brows: [19, 1, -1], nose: [3, 6], mouth: [9, 1], glasses: 'none', beard: 'none', beardColor: '#b5a496',
    clothes: 'shirt', coat: '#66889f', shirt: '#c5d9e4', accent: '#e6edf0',
  },
  'steve-jobs-perspective': {
    background: '#f0f0ed', halo: '#e0e0d9', skin: '#d6af91', shade: '#b18a72', hair: '#69665b', hairLight: '#a5a08f',
    hairPixels: [[14, 10, 5, 4], [29, 10, 5, 4], [12, 14, 4, 10], [33, 14, 3, 10]], highlights: [[13, 16, 2, 6], [33, 16, 1, 6]],
    face: [22, 18, 12], eyes: [22, 7, 2], brows: [18, 1, 1], nose: [2, 6], mouth: [6, 0], glasses: 'round', beard: 'goatee', beardColor: '#8a877c',
    clothes: 'turtleneck', coat: '#303537', shirt: '#3f4546', accent: '#6a7270',
  },
  'sun-yuchen-perspective': {
    background: '#eef1f7', halo: '#dce4f1', skin: '#e3bb96', shade: '#bd9274', hair: '#303735', hairLight: '#58615b',
    hairPixels: [[17, 5, 14, 3], [13, 8, 22, 4], [12, 12, 7, 5], [30, 11, 6, 8], [15, 10, 10, 3], [13, 17, 2, 5]], highlights: [[17, 7, 12, 1], [14, 10, 7, 1]],
    face: [22, 18, 12], eyes: [22, 6, 2], brows: [19, 1, 0], nose: [2, 4], mouth: [8, 1], glasses: 'fine', beard: 'none', beardColor: '#62675b',
    clothes: 'suit', coat: '#435c81', shirt: '#f0eee2', accent: '#516c9a',
  },
  'taleb-perspective': {
    background: '#f2eee6', halo: '#e4ddce', skin: '#cda47f', shade: '#aa7c5e', hair: '#898576', hairLight: '#b4ac98',
    hairPixels: [[12, 17, 3, 10], [34, 17, 3, 10], [13, 14, 3, 4], [33, 14, 3, 4]], highlights: [[12, 20, 2, 5], [35, 20, 1, 5]],
    face: [24, 22, 16], eyes: [23, 7, 2], brows: [19, 2, 1], nose: [4, 5], mouth: [8, 0], glasses: 'none', beard: 'short', beardColor: '#969181',
    clothes: 'jacket', coat: '#4a5558', shirt: '#efe8d9', accent: '#90978e',
  },
  'trump-perspective': {
    background: '#f4efec', halo: '#e9ddd5', skin: '#e5ac89', shade: '#c58a6c', hair: '#c9aa65', hairLight: '#e7d193',
    hairPixels: [[18, 4, 14, 2], [14, 6, 21, 3], [12, 9, 24, 3], [13, 12, 8, 3], [30, 12, 6, 8], [12, 15, 3, 6]], highlights: [[19, 5, 11, 1], [15, 7, 16, 1], [13, 10, 10, 1]],
    face: [26, 22, 18], eyes: [22, 8, 2], brows: [18, 1, 0], nose: [4, 4], mouth: [7, -1], glasses: 'none', beard: 'none', beardColor: '#c1a180',
    clothes: 'suit', coat: '#3e5b85', shirt: '#f6f0e5', accent: '#b55850',
  },
  'zhang-yiming-perspective': {
    background: '#edf3ef', halo: '#dae7df', skin: '#dfba99', shade: '#ba9376', hair: '#323d39', hairLight: '#5b6960',
    hairPixels: [[18, 5, 12, 3], [14, 8, 20, 4], [12, 12, 6, 5], [30, 12, 6, 7], [19, 10, 11, 3], [13, 17, 2, 4]], highlights: [[18, 7, 9, 1], [14, 11, 3, 2]],
    face: [22, 18, 14], eyes: [23, 7, 2], brows: [20, 1, 0], nose: [2, 4], mouth: [7, 1], glasses: 'round', beard: 'none', beardColor: '#5b655a',
    clothes: 'shirt', coat: '#6b8990', shirt: '#d4e2de', accent: '#eff3e9',
  },
  'zhangxuefeng-perspective': {
    background: '#f2eee7', halo: '#e4ddce', skin: '#dcb28b', shade: '#b68b68', hair: '#343a34', hairLight: '#62695a',
    hairPixels: [[16, 6, 4, 3], [22, 5, 5, 3], [29, 7, 4, 3], [13, 9, 22, 5], [12, 14, 4, 9], [33, 14, 4, 9]], highlights: [[17, 8, 3, 1], [23, 7, 3, 1], [30, 9, 2, 1]],
    face: [26, 24, 18], eyes: [23, 8, 2], brows: [19, 2, 0], nose: [3, 5], mouth: [10, 1], glasses: 'square', beard: 'none', beardColor: '#636a59',
    clothes: 'jacket', coat: '#475767', shirt: '#dce4e2', accent: '#79919c',
  },
  'x-mastery-mentor': {
    background: '#f1edf5', halo: '#e2daed', skin: '#c69c7d', shade: '#a77a60', hair: '#454352', hairLight: '#71687c',
    hairPixels: [[20, 4, 12, 3], [15, 7, 20, 4], [12, 11, 8, 5], [31, 11, 5, 10], [13, 16, 3, 8], [17, 11, 7, 3]], highlights: [[22, 6, 8, 1], [15, 10, 7, 1]],
    face: [24, 20, 14], eyes: [22, 7, 3], brows: [18, 1, -1], nose: [3, 4], mouth: [8, 1], glasses: 'none', beard: 'none', beardColor: '#75697a',
    clothes: 'hoodie', coat: '#766186', shirt: '#9682a5', accent: '#e4d8ed',
  },
  'huashu-nuwa': {
    background: '#f2eef5', halo: '#e3d9ec', skin: '#ddb599', shade: '#b78f76', hair: '#4b3e50', hairLight: '#7b627b',
    hairPixels: [[20, 1, 10, 5], [16, 5, 18, 5], [12, 10, 10, 5], [29, 10, 8, 8], [11, 15, 5, 23], [33, 17, 5, 21], [17, 11, 6, 3]], highlights: [[22, 2, 5, 2], [13, 16, 2, 17], [35, 19, 1, 17]],
    face: [20, 16, 12], eyes: [22, 6, 2], brows: [18, 1, -1], nose: [2, 4], mouth: [6, 1], glasses: 'none', beard: 'none', beardColor: '#7b627b',
    clothes: 'shirt', coat: '#587f80', shirt: '#c2dad3', accent: '#dce9df',
  },
}

const NEUTRAL: Portrait = {
  background: '#eff1f2', halo: '#dfe4e6', skin: '#d0ae94', shade: '#ad8a73', hair: '#5e6566', hairLight: '#8b9290',
  hairPixels: [[17, 6, 14, 3], [13, 9, 22, 5], [12, 14, 4, 7], [33, 14, 3, 7]], highlights: [[18, 8, 9, 1]],
  face: [22, 20, 14], eyes: [22, 7, 2], brows: [19, 1, 0], nose: [2, 4], mouth: [7, 0], glasses: 'none', beard: 'none', beardColor: '#8b9290',
  clothes: 'crew', coat: '#74838b', shirt: '#93a1a6', accent: '#cdd7d9',
}

/** One static, centred 96×96 portrait on the existing 240×126 canvas. */
export function drawPersonaArtwork(ctx: CanvasRenderingContext2D, name: string): void {
  const p = Object.prototype.hasOwnProperty.call(PORTRAITS, name) ? PORTRAITS[name]! : NEUTRAL
  const ink = '#303b3c'
  const pixel = (x: number, y: number, width: number, height: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(72 + x * 2, 15 + y * 2, width * 2, height * 2)
  }
  const blocks = (shapes: readonly PixelRect[], color: string) => shapes.forEach(([x, y, w, h]) => pixel(x, y, w, h, color))
  ctx.clearRect(0, 0, 240, 126)
  ctx.fillStyle = p.background
  ctx.fillRect(0, 0, 240, 126)
  blocks([[8, 0, 32, 4], [4, 4, 40, 4], [0, 8, 48, 32], [4, 40, 40, 4], [8, 44, 32, 4]], p.halo)

  const [cheeks, jaw, chin] = p.face
  const left = 24 - cheeks / 2, right = 24 + cheeks / 2
  pixel(20, 33, 8, 7, p.shade)
  pixel(22, 34, 6, 5, p.skin)
  blocks([[left - 2, 21, 2, 5], [right, 21, 2, 5]], p.shade)
  blocks([[left + 2, 9, cheeks - 4, 5], [left, 14, cheeks, 13], [24 - jaw / 2, 27, jaw, 5], [24 - chin / 2, 32, chin, 3]], p.skin)
  blocks([[left, 16, 2, 10], [24 - jaw / 2, 28, 2, 4]], p.shade)
  blocks(p.hairPixels, p.hair)
  blocks(p.highlights, p.hairLight)

  if (p.beard === 'full') {
    blocks([[left + 1, 25, 3, 6], [right - 4, 25, 3, 6], [24 - jaw / 2, 29, jaw, 4], [24 - chin / 2, 32, chin, 3]], p.beardColor)
    pixel(20, 28, 8, 3, p.skin)
    pixel(20, 27, 8, 1, p.beardColor)
  } else if (p.beard === 'short' || p.beard === 'stubble') {
    blocks([[24 - jaw / 2 + 1, 30, jaw - 2, 2], [24 - chin / 2, 32, chin, 2]], p.beardColor)
    if (p.beard === 'short') blocks([[left + 1, 26, 2, 4], [right - 3, 26, 2, 4], [21, 28, 6, 1]], p.beardColor)
  } else if (p.beard === 'goatee') {
    blocks([[20, 30, 8, 4], [21, 28, 6, 1], [22, 34, 4, 1]], p.beardColor)
  }

  const [eyeY, spacing, eyeWidth] = p.eyes
  for (const [cx, side] of [[24 - spacing, -1], [24 + spacing, 1]] as const) {
    pixel(cx - 2, eyeY - 1, 5, 3, '#f4eadb')
    pixel(cx - 1, eyeY, eyeWidth, 2, ink)
    const [browY, thickness, tilt] = p.brows
    pixel(cx - 3, browY + (side === 1 ? tilt : 0), 6, thickness, p.beard === 'none' ? p.hair : ink)
    if (p.glasses !== 'none') {
      const x = cx - 4, y = eyeY - 3
      if (p.glasses === 'round') {
        blocks([[x + 2, y, 4, 1], [x + 1, y + 1, 1, 1], [x + 6, y + 1, 1, 1], [x, y + 2, 1, 3], [x + 7, y + 2, 1, 3], [x + 1, y + 5, 1, 1], [x + 6, y + 5, 1, 1], [x + 2, y + 6, 4, 1]], ink)
      } else {
        const frame = p.glasses === 'fine' ? '#687981' : ink
        blocks([[x, y, 9, 1], [x, y + 6, 9, 1], [x, y + 1, 1, 5], [x + 8, y + 1, 1, 5]], frame)
      }
    }
  }
  if (p.glasses !== 'none') pixel(28 - spacing, eyeY - 1, spacing * 2 - 8, 1, ink)
  pixel(23, eyeY + 2, p.nose[0], p.nose[1], p.shade)
  pixel(22, eyeY + p.nose[1] + 1, p.nose[0] + 1, 1, p.shade)
  const [mouthWidth, smile] = p.mouth
  const mouthX = 24 - Math.floor(mouthWidth / 2)
  pixel(mouthX, 30, mouthWidth, 1, '#986d60')
  if (smile !== 0) blocks([[mouthX - 1, 30 - Math.sign(smile), 1, 1], [mouthX + mouthWidth, 30 - Math.sign(smile), 1, 1]], '#986d60')

  // Stepped shoulders/collars stay inside the 48×48 logical portrait grid.
  blocks([[17, 37, 14, 2], [11, 39, 26, 3], [7, 42, 34, 4], [4, 46, 40, 2]], p.coat)
  if (p.clothes === 'turtleneck') {
    pixel(18, 34, 12, 7, p.coat)
    pixel(18, 38, 12, 1, p.shirt)
  } else if (p.clothes === 'suit') {
    blocks([[20, 37, 8, 11], [18, 38, 3, 3], [27, 38, 3, 3]], p.shirt)
    blocks([[16, 40, 3, 3], [18, 43, 3, 4], [29, 40, 3, 3], [27, 43, 3, 4]], p.accent)
    blocks([[23, 39, 2, 3], [22, 42, 4, 6]], p.accent)
  } else if (p.clothes === 'hoodie') {
    blocks([[15, 36, 4, 5], [29, 36, 4, 5], [18, 39, 12, 2]], p.shirt)
    blocks([[19, 41, 1, 5], [28, 41, 1, 5]], p.accent)
  } else if (p.clothes === 'shirt' || p.clothes === 'jacket') {
    pixel(20, 38, 8, 10, p.shirt)
    blocks([[18, 37, 4, 3], [26, 37, 4, 3], [20, 40, 3, 2], [25, 40, 3, 2]], p.shirt)
    if (p.clothes === 'shirt') blocks([[24, 43, 1, 1], [24, 46, 1, 1]], p.accent)
  } else {
    pixel(19, 37, 10, 2, p.shirt)
    pixel(21, 39, 6, 1, p.shirt)
  }
}
