import {
    Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget,
    Mp4OutputFormat, WebMOutputFormat, Quality, canEncodeVideo
} from '/web-assets/vendor/mediabunny/mediabunny.min.mjs';

export const VIDEO_PRESETS = { 'mp4-avc': { label: 'MP4 · H.264（相容性最好）', container: 'mp4', codec: 'avc' }, 'mp4-hevc': { label: 'MP4 · H.265（較小，部分瀏覽器不支援）', container: 'mp4', codec: 'hevc' }, 'webm-vp9': { label: 'WebM · VP9', container: 'webm', codec: 'vp9' }, 'webm-av1': { label: 'WebM · AV1（最小，較慢）', container: 'webm', codec: 'av1' }};

export const videoSupported = () => typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

export const compressVideo = async (file, options, onProgress, onStart) => {
    const preset = VIDEO_PRESETS[options.preset];
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('找不到影像軌，這可能不是影片檔');

    const srcWidth = track.displayWidth;
    const srcHeight = track.displayHeight;
    const scale = options.maxShort ? Math.min(1, options.maxShort / Math.min(srcWidth, srcHeight)) : 1;
    const width = scale < 1 ? even(srcWidth * scale) : srcWidth;
    const height = scale < 1 ? even(srcHeight * scale) : srcHeight;

    const quality = new Quality(options.quality);
    if (!(await canEncodeVideo(preset.codec, { width, height, quality }))) throw new Error(`這個瀏覽器無法使用 ${preset.codec.toUpperCase()} 編碼 ${width}×${height}，請改選其他格式`);

    const output = new Output({
        format: preset.container === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat(),
        target: new BufferTarget()
    });

    const video = { codec: preset.codec, quality, forceTranscode: true };
    if (scale < 1) Object.assign(video, { width, height, fit: 'fill' });

    const conversion = await Conversion.init({
        input,
        output,
        video,
        audio: options.mute ? { discard: true } : {},
        showWarnings: false
    });
    if (!conversion.isValid) throw new Error('這個影片無法轉換（編碼或容器不受支援）');

    conversion.onProgress = onProgress;
    onStart(conversion);
    await conversion.execute();

    const mime = preset.container === 'webm' ? 'video/webm' : 'video/mp4';
    return {
        blob: new Blob([output.target.buffer], { type: mime }),
        ext: preset.container,
        width,
        height,
        srcWidth,
        srcHeight,
        label: preset.label.split('（')[0]
    };
};