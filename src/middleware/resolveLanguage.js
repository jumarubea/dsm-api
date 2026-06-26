export const resolveLanguage = (req, res, next) => {
  // Default is English; only switch to Kiswahili when Accept-Language starts with 'sw'.
  req.lang = req.headers['accept-language']?.startsWith('sw') ? 'sw' : 'en';
  next();
};
