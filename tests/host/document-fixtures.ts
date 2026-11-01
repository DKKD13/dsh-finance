function pdfText(text: string): string {
  return `BT /F1 18 Tf 72 720 Td (${text.replace(/([\\()])/gu, '\\$1')}) Tj ET`
}

export function makePdf(pageTexts: string[], encrypted = false): Buffer {
  const pageCount = pageTexts.length
  const fontId = 2 + pageCount * 2 + 1
  const encryptId = fontId + 1
  const objects: string[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${pageTexts.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] >>`
  pageTexts.forEach((text, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    const stream = text.length === 0 ? '' : pdfText(text)
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  })
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  if (encrypted) objects[encryptId] = '<< /Filter /Standard /V 1 /R 2 /O <0000000000000000000000000000000000000000000000000000000000000000> /U <0000000000000000000000000000000000000000000000000000000000000000> /P -4 >>'
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let id = 1; id < objects.length; id += 1) {
    if (objects[id] === undefined) continue
    offsets[id] = Buffer.byteLength(pdf)
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R${encrypted ? ` /Encrypt ${encryptId} 0 R /ID [<00000000000000000000000000000000><00000000000000000000000000000000>]` : ''} >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'ascii')
}
