import cron from "node-cron";
import Mail from "../models/Mail.js";

export const scheduleMail = (mailData, sendTime) => {
  const date = new Date(sendTime);

  const cronTime = `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;

  cron.schedule(cronTime, async () => {
    const { from, to, subject, body } = mailData;

    const senderMail = new Mail({ from, to, subject, body, folder: "sent", isStarred: false });
    const receiverMail = new Mail({ from, to, subject, body, folder: "inbox", isStarred: false });

    await senderMail.save();
    await receiverMail.save();
  });
};
