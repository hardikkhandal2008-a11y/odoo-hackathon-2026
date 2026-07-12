function buildPasswordResetEmail({ to, fullName, resetToken, resetUrl }) {
  return {
    to,
    subject: "AssetFlow Password Reset",
    html: `
      <p>Hello ${fullName},</p>
      <p>You requested a password reset for your AssetFlow account.</p>
      <p>Use this reset token: <strong>${resetToken}</strong></p>
      <p>Or open this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
    `,
    text: `Hello ${fullName}, reset your AssetFlow password using token: ${resetToken}`
  };
}

function sendEmail(payload) {
  // Email-ready structure: plug in nodemailer/SendGrid here in production.
  console.log("[Email Ready]", {
    to: payload.to,
    subject: payload.subject
  });

  return { queued: true, provider: "console" };
}

module.exports = {
  buildPasswordResetEmail,
  sendEmail
};
