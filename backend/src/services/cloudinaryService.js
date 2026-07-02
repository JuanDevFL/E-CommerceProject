import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Sube un Buffer al folder indicado en Cloudinary y devuelve el resultado completo.
 * @param {Buffer} buffer
 * @param {{ folder?: string, publicId?: string }} [options]
 * @returns {Promise<import('cloudinary').UploadApiResponse>}
 */
export function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const { folder = 'azami/products', publicId } = options;

    const streamOptions = {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };

    if (publicId) {
      streamOptions.public_id = publicId;
    }

    const stream = cloudinary.uploader.upload_stream(streamOptions, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });

    stream.end(buffer);
  });
}
