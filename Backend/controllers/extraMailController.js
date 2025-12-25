import Mail from '../models/Mail.js';

export const saveDraft = async (req, res) => {
  const { to, subject, body } = req.body;
  const draft = await Mail.create({ from: req.user.email, to, subject, body, folder: 'draft' });
  res.json(draft);
};

export const scheduleMail = async (req, res) => {
  const { to, subject, body, scheduleTime } = req.body;
  const scheduled = await Mail.create({ from: req.user.email, to, subject, body, folder: 'scheduled', scheduleTime });
  res.json(scheduled);
};

export const toggleStar = async (req, res) => {
  const mail = await Mail.findById(req.params.id);
  mail.isStarred = !mail.isStarred;
  await mail.save();
  res.json(mail);
};

export const searchMail = async (req, res) => {
  const q = req.query.q;
  const results = await Mail.find({
    $or: [
      { subject: { $regex: q, $options: 'i' } },
      { body: { $regex: q, $options: 'i' } },
      { to: { $regex: q, $options: 'i' } },
      { from: { $regex: q, $options: 'i' } }
    ]
  });
  res.json(results);
};

export const uploadAttachment = (req, res) => {
  res.json({ message: 'File uploaded', file: req.file });
};