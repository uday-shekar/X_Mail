// backend/controllers/attachmentController.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';

dotenv.config();

let gfs;
const conn = mongoose.connection;

conn.once('open', () => {
  gfs = new GridFSBucket(conn.db, {
    bucketName: 'attachments',
  });
});

export const uploadAttachment = (req, res) => {
  res.status(200).json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
  });
};

export const downloadAttachment = (req, res) => {
  const { filename } = req.params;
  if (!gfs) {
    return res.status(500).json({ message: 'Bucket not initialized yet' });
  }

  const file = gfs.openDownloadStreamByName(filename);

  file.on('error', () => {
    return res.status(404).json({ message: 'File not found' });
  });

  res.set('Content-Type', 'application/octet-stream');
  file.pipe(res);
};
