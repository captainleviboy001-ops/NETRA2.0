// NETRA API Configuration
// Set the URLs below to connect the frontend to your n8n backend.

window.NETRA_CONFIG = {
  // Retinal image analysis endpoint (multipart/form-data POST)
  screenUrl: 'https://adhihackathon.app.n8n.cloud/webhook/diabetic-retinopathy/screen',

  // Referral queue endpoint (GET)
  referralQueueUrl: 'https://adhihackathon.app.n8n.cloud/webhook/diabetic-retinopathy/referral-queue',
};
