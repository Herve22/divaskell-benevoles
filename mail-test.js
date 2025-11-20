import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('User:', process.env.SMTP_USER);
console.log('Pass length:', process.env.SMTP_PASS?.length); // Devrait afficher 10


const transporter = nodemailer.createTransport({
  host: 'pro2.mail.ovh.net',
  port: 587,                    // Port 587 pour STARTTLS
  secure: false,                // false pour STARTTLS
  requireTLS: true,             // Force l'utilisation de TLS
  auth: {
    user: process.env.SMTP_USER,  // Votre email complet
    pass: process.env.SMTP_PASS   // Votre mot de passe
  },
  tls: {
    rejectUnauthorized: true    // Vérifie le certificat
  }
});

console.log('📨 Envoi du mail de test...');

transporter.sendMail({
  from: process.env.SMTP_USER,
  to: process.env.MAIL_TO,    // Envoyez-vous un mail de test
  subject: 'Test SMTP OVH',
  text: 'Ceci est un mail de test.',
  html: '<p>Ceci est un <strong>mail de test</strong>.</p>'
})
.then(info => {
  console.log('✅ Mail envoyé avec succès !');
  console.log('Message ID:', info.messageId);
})
.catch(err => {
  console.error('❌ Erreur d\'envoi :', err);
});