// middleware/uploadMiddleware.js
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from 'dotenv';
dotenv.config();

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useUnifiedTopology: true },
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'attachments'
    };
  }
});

const upload = multer({ storage });
export default upload;
