import { initCommon } from '/js/common/init.js';
import { VIDEO_PRESETS, videoSupported } from '/js/compress/video.js';

initCommon();

const $ = (selector) => document.querySelector(selector);

const IMAGE_FORMATS = { jpeg: { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' }, webp: { label: 'WebP', mime: 'image/webp', ext: 'webp' }, avif: { label: 'AVIF', mime: 'image/avif', ext: 'avif' }, png: { label: 'PNG', mime: 'image/png', ext: 'png' }};
const MIME_TO_FORMAT = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes;
    let i = -1;
    do { value /= 1024; i++; } while (value >= 1024 && i < units.length - 1);
    return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
};

const kindOf = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return /\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(file.name) ? 'video' : /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(file.name) ? 'image' : null;
};

const ICONS = { compare: '<path d="M12 3v18M8 7 3 12l5 5M16 7l5 5-5 5"/>', play: '<path d="M8 5v14l11-7Z"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>', remove: '<path d="M6 6l12 12M18 6 6 18"/>'};
const iconButton = (name, label, onClick) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
    button.addEventListener('click', onClick);
    return button;
};

const els = { imgFormat: $('#imgFormat'), imgQuality: $('#imgQuality'), imgQualityOut: $('#imgQualityOut'), imgWidth: $('#imgWidth'), vidFormat: $('#vidFormat'), vidRes: $('#vidRes'), vidQuality: $('#vidQuality'), vidMute: $('#vidMute')};

for (const [value, preset] of Object.entries(VIDEO_PRESETS)) els.vidFormat.append(new Option(preset.label, value));

const readImageSettings = () => ({ format: els.imgFormat.value, quality: Number(els.imgQuality.value), maxWidth: Number(els.imgWidth.value) || 0 });
const readVideoSettings = () => ({ preset: els.vidFormat.value, maxShort: Number(els.vidRes.value), quality: els.vidQuality.value, mute: els.vidMute.checked });

const syncQualityUi = () => {
    els.imgQualityOut.textContent = els.imgQuality.value;
    const lossless = els.imgFormat.value === 'png';
    els.imgQuality.disabled = lossless;
    els.imgQuality.closest('.range').toggleAttribute('data-disabled', lossless);
};

let worker = null;
const pending = new Map();
let nextRequest = 1;

const getWorker = () => {
    if (worker) return worker;
    worker = new Worker('/js/compress/image-worker.js', { type: 'module' });
    worker.onmessage = ({ data }) => {
        const request = pending.get(data.id);
        if (!request) return;
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data);
    };
    worker.onerror = (event) => {
        event.preventDefault();
        const error = new Error(event.message || 'Worker 發生錯誤');
        pending.forEach((request) => request.reject(error));
        pending.clear();
        worker.terminate();
        worker = null;
    };
    return worker;
};

const encodeImage = (file, settings) => new Promise((resolve, reject) => {
    const id = nextRequest++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, file, ...settings });
});

const jobs = [];
let nextJobId = 1;
let running = false;

const jobList = $('#jobs');
const resultSection = $('#resultSection');

const makeJob = (file, kind) => {
    const job = { id: nextJobId++, file, kind, state: 'queued', dirty: false, removed: false, progress: 0, result: null, error: '', conversion: null, url: URL.createObjectURL(file), resultUrl: null, li: document.createElement('li')};
    job.li.className = 'job';
    return job;
};

const renderJob = (job) => {
    const { li } = job;
    li.dataset.state = job.state;

    const thumb = document.createElement('div');
    thumb.className = 'job-thumb';
    const media = document.createElement(job.kind === 'video' ? 'video' : 'img');
    media.src = job.kind === 'video' ? `${job.url}#t=0.1` : job.url;
    if (job.kind === 'video') { media.muted = true; media.preload = 'metadata'; } else { media.alt = ''; }
    thumb.append(media);

    const body = document.createElement('div');
    body.className = 'job-body';
    const name = document.createElement('p');
    name.className = 'job-name';
    name.textContent = job.file.name;
    name.title = job.file.name;
    const meta = document.createElement('p');
    meta.className = 'job-meta';
    body.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'job-actions';

    if (job.state === 'queued') {
        meta.textContent = `${formatBytes(job.file.size)} · 等待中...`;
    } else if (job.state === 'working') {
        meta.textContent = `${formatBytes(job.file.size)} · ${job.kind === 'video' ? `轉檔中 ${Math.round(job.progress * 100)}%` : '壓縮中...'}`;
        const bar = document.createElement('div');
        bar.className = 'job-bar';
        bar.style.setProperty('--p', String(job.progress));
        if (job.kind === 'image') bar.toggleAttribute('data-indeterminate', true);
        bar.append(document.createElement('i'));
        body.append(bar);
    } else if (job.state === 'error') {
        meta.textContent = `失敗：${job.error}`;
    } else if (job.result) {
        const { size, note } = job.result;
        const delta = Math.round((1 - size / job.file.size) * 100);
        const badge = document.createElement('span');
        badge.className = 'job-saving';
        if (delta < 0) badge.dataset.bad = '';
        badge.textContent = delta >= 0 ? `−${delta}%` : `+${-delta}%`;
        meta.append(badge, `${formatBytes(job.file.size)} → ${formatBytes(size)}${note ? ` · ${note}` : ''}`);

        actions.append(iconButton(job.kind === 'video' ? 'play' : 'compare', job.kind === 'video' ? '播放結果' : '比較前後', () => openCompare(job)), iconButton('download', '下載', () => download(job)));
    }
    actions.append(iconButton('remove', '移除', () => removeJob(job)));

    li.replaceChildren(thumb, body, actions);
};

const download = (job) => {
    if (!job.result) return;
    const a = document.createElement('a');
    a.href = job.resultUrl;
    const base = job.file.name.replace(/\.[^.]+$/, '');
    a.download = job.result.unchanged ? job.file.name : `${base}-compressed.${job.result.ext}`;
    document.body.append(a);
    a.click();
    a.remove();
};

const removeJob = (job) => {
    job.removed = true;
    job.conversion?.cancel().catch(() => {});
    jobs.splice(jobs.indexOf(job), 1);
    job.li.remove();
    URL.revokeObjectURL(job.url);
    if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    resultSection.hidden = jobs.length === 0;
};

const setResult = (job, blob, info) => {
    if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    job.resultUrl = URL.createObjectURL(blob);
    job.result = { size: blob.size, ...info };
};

const runImage = async (job) => {
    const settings = readImageSettings();
    const sourceFormat = MIME_TO_FORMAT[job.file.type];
    const format = settings.format === 'auto' ? (sourceFormat ?? 'webp') : settings.format;
    const out = await encodeImage(job.file, { format, quality: settings.quality, maxWidth: settings.maxWidth });
    const blob = new Blob([out.buffer], { type: IMAGE_FORMATS[format].mime });

    const resized = out.width !== out.srcWidth;
    if (blob.size >= job.file.size && format === sourceFormat && !resized) {
        setResult(job, job.file, { ext: IMAGE_FORMATS[format].ext, unchanged: true, note: '已經夠小，沿用原檔' });
        return;
    }
    const parts = [IMAGE_FORMATS[format].label];
    parts.push(resized ? `${out.srcWidth}×${out.srcHeight} → ${out.width}×${out.height}` : `${out.width}×${out.height}`);
    if (job.file.type === 'image/gif') parts.push('動圖只保留第一幀');
    setResult(job, blob, { ext: IMAGE_FORMATS[format].ext, note: parts.join(' · ') });
};

const runVideo = async (job) => {
    if (!videoSupported()) throw new Error('這個瀏覽器不支援 WebCodecs');
    const { compressVideo } = await import('/js/compress/video.js');
    const out = await compressVideo(job.file, readVideoSettings(), (progress) => {
        job.progress = progress;
        if (job.state === 'working') renderJob(job);
    }, (conversion) => { job.conversion = conversion; });
    const resized = out.width !== out.srcWidth || out.height !== out.srcHeight;
    const dims = resized ? `${out.srcWidth}×${out.srcHeight} → ${out.width}×${out.height}` : `${out.width}×${out.height}`;
    setResult(job, out.blob, { ext: out.ext, note: `${out.label} · ${dims}` });
};

const runJob = async (job) => {
    job.state = 'working';
    job.progress = 0;
    job.dirty = false;
    renderJob(job);
    try {
        await (job.kind === 'video' ? runVideo(job) : runImage(job));
        job.state = 'done';
    } catch (error) {
        job.state = 'error';
        job.error = job.removed || job.dirty ? '' : (error?.message ?? String(error));
    }
    job.conversion = null;
    if (job.removed) return;
    if (job.dirty) job.state = 'queued';
    renderJob(job);
};

const pump = async () => {
    if (running) return;
    running = true;
    try {
        for (let job; (job = jobs.find((j) => j.state === 'queued'));) await runJob(job);
    } finally {
        running = false;
    }
};

const requeue = (kind) => {
    for (const job of jobs) {
        if (job.kind !== kind) continue;
        if (job.state === 'working') {
            job.dirty = true;
            job.conversion?.cancel().catch(() => {});
        } else {
            job.state = 'queued';
            renderJob(job);
        }
    }
    pump();
};

const debounce = (fn, ms) => {
    let timer;
    return () => { clearTimeout(timer); timer = setTimeout(fn, ms); };
};
const requeueImages = debounce(() => requeue('image'), 350);
const requeueVideos = debounce(() => requeue('video'), 350);

const addFiles = (files) => {
    let added = 0;
    for (const file of files) {
        const kind = kindOf(file);
        if (!kind) continue;
        const job = makeJob(file, kind);
        jobs.push(job);
        jobList.append(job.li);
        renderJob(job);
        added++;
    }
    if (added) {
        resultSection.hidden = false;
        pump();
    }
};

const cmp = $('#cmp');
const cmpStage = $('#cmpStage');
const cmpRange = $('#cmpRange');

const openCompare = (job) => {
    $('#cmpTitle').textContent = job.file.name;
    $('#cmpBefore').textContent = `原檔 ${formatBytes(job.file.size)}`;
    $('#cmpAfter').textContent = `壓縮 ${formatBytes(job.result.size)}`;
    cmpStage.replaceChildren();
    if (job.kind === 'video') {
        const video = document.createElement('video');
        video.src = job.resultUrl;
        video.controls = true;
        video.playsInline = true;
        cmpStage.removeAttribute('data-compare');
        cmpStage.append(video);
        cmpRange.hidden = true;
    } else {
        const after = new Image();
        after.src = job.resultUrl;
        after.alt = '壓縮';
        const before = new Image();
        before.src = job.url;
        before.alt = '原檔';
        before.className = 'cmp-before';
        cmpStage.setAttribute('data-compare', '');
        cmpStage.append(after, before);
        cmpRange.hidden = false;
        cmpRange.value = '50';
        cmpStage.style.setProperty('--pos', '50%');
    }
    cmp.showModal();
};

cmpRange.addEventListener('input', () => cmpStage.style.setProperty('--pos', `${cmpRange.value}%`));
$('#cmpClose').addEventListener('click', () => cmp.close());
cmp.addEventListener('click', (event) => { if (event.target === cmp) cmp.close(); });
cmp.addEventListener('close', () => cmpStage.replaceChildren());

els.imgFormat.addEventListener('change', () => { syncQualityUi(); requeueImages(); });
els.imgQuality.addEventListener('input', () => { syncQualityUi(); requeueImages(); });
els.imgWidth.addEventListener('input', requeueImages);
[els.vidFormat, els.vidRes, els.vidQuality, els.vidMute].forEach((el) => el.addEventListener('change', requeueVideos));

const fileInput = $('#fileInput');
fileInput.addEventListener('change', () => { addFiles([...fileInput.files]); fileInput.value = ''; });

const drop = $('#drop');
['dragenter', 'dragover'].forEach((type) => drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.setAttribute('data-over', '');
}));
['dragleave', 'drop'].forEach((type) => drop.addEventListener(type, () => drop.removeAttribute('data-over')));
addEventListener('dragover', (event) => event.preventDefault());
addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files.length) addFiles([...event.dataTransfer.files]);
});
addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files ?? [])];
    if (files.length) addFiles(files);
});

$('#downloadAll').addEventListener('click', async () => {
    for (const job of jobs.filter((j) => j.result)) {
        download(job);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
});
$('#clearAll').addEventListener('click', () => [...jobs].forEach(removeJob));

syncQualityUi();
if (!videoSupported()) $('#videoWarn').hidden = false;