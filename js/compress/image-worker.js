const VENDOR = '/web-assets/vendor';

const encoders = {
    jpeg: async () => {
        const { default: encode } = await import(`${VENDOR}/jsquash-jpeg/encode.js`);
        return (imageData, quality) => encode(imageData, { quality });
    },
    webp: async () => {
        const { default: encode } = await import(`${VENDOR}/jsquash-webp/encode.js`);
        return (imageData, quality) => encode(imageData, { quality });
    },
    avif: async () => {
        const { default: encode } = await import(`${VENDOR}/jsquash-avif/encode.js`);
        return (imageData, quality) => encode(imageData, { quality, speed: 7 });
    },
    png: async () => {
        const { default: optimise } = await import(`${VENDOR}/jsquash-oxipng/optimise.js`);
        return (imageData) => optimise(imageData, { level: 3, interlace: false, optimiseAlpha: true });
    }
};

const loaded = new Map();
const getEncoder = (format) => {
    if (!loaded.has(format)) loaded.set(format, encoders[format]());
    return loaded.get(format);
};

self.onmessage = async ({ data }) => {
    const { id, file, format, quality, maxWidth } = data;
    try {
        const bitmap = await createImageBitmap(file);
        const srcWidth = bitmap.width;
        const srcHeight = bitmap.height;
        let width = srcWidth;
        let height = srcHeight;
        if (maxWidth && width > maxWidth) {
            height = Math.max(1, Math.round(height * maxWidth / width));
            width = maxWidth;
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingQuality = 'high';
        if (format === 'jpeg') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const imageData = ctx.getImageData(0, 0, width, height);
        const encode = await getEncoder(format);
        const buffer = await encode(imageData, quality);
        self.postMessage({ id, buffer, width, height, srcWidth, srcHeight }, [buffer]);
    } catch (error) {
        self.postMessage({ id, error: String(error?.message ?? error) });
    }
};