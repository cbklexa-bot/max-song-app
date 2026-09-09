// Normalize Robokassa credentials before robokassa-bootstrap.js reads them.
// This only removes accidental leading/trailing whitespace from these three variables.
process.env.ROBOKASSA_MERCHANT_LOGIN = String(process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
process.env.ROBOKASSA_PASSWORD1 = String(process.env.ROBOKASSA_PASSWORD1 || '').trim();
process.env.ROBOKASSA_PASSWORD2 = String(process.env.ROBOKASSA_PASSWORD2 || '').trim();
