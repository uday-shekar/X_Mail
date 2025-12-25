import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from 'dotenv';

dotenv.config();

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}-${file.originalname}`,
    bucketName: 'attachments',
  }),
});

export const upload = multer({ storage }); // ✅ named export
