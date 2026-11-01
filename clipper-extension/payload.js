(() => {
  const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

  function importUrl(endpoint) {
    const url = new URL(endpoint || 'http://127.0.0.1:47643')
    if (!['http:', 'https:'].includes(url.protocol) || !LOOPBACK_HOSTS.has(url.hostname)) {
      throw new Error('Endpoint must be an HTTP(S) loopback address')
    }
    if (url.username || url.password || url.search || url.hash) throw new Error('Endpoint cannot contain credentials, query, or fragment')
    if (!url.pathname.endsWith('/clipper/v1/import')) {
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/clipper/v1/import`.replace(/^\/+/, '/')
    }
    return url.toString()
  }

  function tags(value) {
    return [...new Set(String(value || '').split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 30)
  }

  function buildClip(captured, settings, annotationHash) {
    const tagList = tags(settings.tags)
    const pageAnchor = captured.kind === 'page' && (settings.note.trim() || tagList.length) ? { exact: captured.text } : {}
    const annotation = {
      ...pageAnchor,
      ...(captured.textQuote || {}),
      ...(settings.note.trim() ? { note: settings.note.trim() } : {}),
      ...(tagList.length ? { tags: tagList } : {}),
      ...(captured.locator ? { locator: captured.locator } : {}),
    }
    const annotations = annotation.exact || annotation.note ? [annotation] : []
    return {
      schema: 'dsh.clipper/v1',
      kind: captured.kind,
      url: captured.url,
      title: captured.title,
      capturedAt: captured.capturedAt,
      content: { text: captured.text },
      annotations,
      ...(annotationHash ? { annotationHash } : {}),
      ...(settings.topic.trim() ? { topic: settings.topic.trim() } : {}),
      provenance: {
        capturedBy: 'dsh-local-clipper/1.0.0',
        captureMode: captured.kind,
      },
    }
  }

  function importRequest(clip, asOf) {
    return { bundle: clip, dryRun: false, asOf }
  }

  globalThis.DSHClipperPayload = { buildClip, importRequest, importUrl, tags }
})()
