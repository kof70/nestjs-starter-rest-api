import { EmailTemplateData } from '../types/email-template.types';

/**
 * Email template generator
 * Requirements: 17.5
 */
export class EmailTemplates {
  /**
   * Generate welcome email template
   * Requirements: 17.1
   */
  static generateWelcomeEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `Welcome to ${data.courseTitle}!`
      : `Bienvenue dans ${data.courseTitle} !`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'Welcome!' : 'Bienvenue !'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `You have successfully enrolled in the course <strong>${data.courseTitle}</strong>.`
                  : `Vous êtes maintenant inscrit au cours <strong>${data.courseTitle}</strong>.`}
              </p>
              <p>
                ${isEnglish
                  ? 'Start your learning journey today and explore the course content at your own pace.'
                  : 'Commencez votre parcours d\'apprentissage dès aujourd\'hui et explorez le contenu du cours à votre rythme.'}
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">${isEnglish ? 'Go to Course' : 'Accéder au cours'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Happy learning!' : 'Bon apprentissage !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nYou have successfully enrolled in the course "${data.courseTitle}".\n\nStart your learning journey today!\n\nHappy learning!`
      : `Bonjour ${data.userName},\n\nVous êtes maintenant inscrit au cours "${data.courseTitle}".\n\nCommencez votre parcours d'apprentissage dès aujourd'hui !\n\nBon apprentissage !`;
    return { subject, html, text };
  }

  /**
   * Generate course published email template
   * Requirements: 17.2
   */
  static generateCoursePublishedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `${data.courseTitle} has been published!`
      : `${data.courseTitle} a été publié !`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'Course Published!' : 'Cours publié !'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `Great news! The course <strong>${data.courseTitle}</strong> has been published and is now available.`
                  : `Bonne nouvelle ! Le cours <strong>${data.courseTitle}</strong> a été publié et est maintenant disponible.`}
              </p>
              <p>
                ${isEnglish
                  ? 'You can now access all the course content and start learning.'
                  : 'Vous pouvez maintenant accéder à tout le contenu du cours et commencer à apprendre.'}
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">${isEnglish ? 'View Course' : 'Voir le cours'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Happy learning!' : 'Bon apprentissage !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nGreat news! The course "${data.courseTitle}" has been published and is now available.\n\nYou can now access all the course content and start learning.\n\nHappy learning!`
      : `Bonjour ${data.userName},\n\nBonne nouvelle ! Le cours "${data.courseTitle}" a été publié et est maintenant disponible.\n\nVous pouvez maintenant accéder à tout le contenu du cours et commencer à apprendre.\n\nBon apprentissage !`;
    return { subject, html, text };
  }

  /**
   * Generate certificate email template
   * Requirements: 17.3
   */
  static generateCertificateEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `Congratulations! Your certificate for ${data.courseTitle}`
      : `Félicitations ! Votre certificat pour ${data.courseTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f39c12; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f39c12; color: white; text-decoration: none; border-radius: 5px; }
            .certificate-id { background-color: #ecf0f1; padding: 10px; border-left: 4px solid #f39c12; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'Congratulations!' : 'Félicitations !'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `Congratulations on completing the course <strong>${data.courseTitle}</strong>!`
                  : `Félicitations pour avoir terminé le cours <strong>${data.courseTitle}</strong> !`}
              </p>
              <p>
                ${isEnglish
                  ? 'Your certificate has been generated and is ready to download.'
                  : 'Votre certificat a été généré et est prêt à être téléchargé.'}
              </p>
              <div class="certificate-id">
                <strong>${isEnglish ? 'Certificate ID' : 'ID du certificat'}:</strong> ${data.certificateId}
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">${isEnglish ? 'Download Certificate' : 'Télécharger le certificat'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Well done!' : 'Bravo !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nCongratulations on completing the course "${data.courseTitle}"!\n\nYour certificate has been generated and is ready to download.\n\nCertificate ID: ${data.certificateId}\n\nWell done!`
      : `Bonjour ${data.userName},\n\nFélicitations pour avoir terminé le cours "${data.courseTitle}" !\n\nVotre certificat a été généré et est prêt à être téléchargé.\n\nID du certificat: ${data.certificateId}\n\nBravo !`;
    return { subject, html, text };
  }

  /**
   * Generate quiz reminder email template
   * Requirements: 17.4
   */
  static generateQuizReminderEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `Reminder: Quiz deadline approaching for ${data.courseTitle}`
      : `Rappel : Date limite du quiz pour ${data.courseTitle}`;
    const deadlineStr = data.quizDeadline?.toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; }
            .deadline { background-color: #fee; padding: 10px; border-left: 4px solid #e74c3c; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'Quiz Reminder' : 'Rappel de quiz'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `This is a reminder that the quiz <strong>${data.quizTitle}</strong> in the course <strong>${data.courseTitle}</strong> is due soon.`
                  : `Ceci est un rappel que le quiz <strong>${data.quizTitle}</strong> du cours <strong>${data.courseTitle}</strong> arrive bientôt à échéance.`}
              </p>
              <div class="deadline">
                <strong>${isEnglish ? 'Deadline' : 'Date limite'}:</strong> ${deadlineStr}
              </div>
              <p>
                ${isEnglish
                  ? 'Make sure to complete the quiz before the deadline to avoid missing out.'
                  : 'Assurez-vous de compléter le quiz avant la date limite pour ne pas le manquer.'}
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">${isEnglish ? 'Take Quiz' : 'Passer le quiz'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Good luck!' : 'Bonne chance !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nThis is a reminder that the quiz "${data.quizTitle}" in the course "${data.courseTitle}" is due soon.\n\nDeadline: ${deadlineStr}\n\nMake sure to complete the quiz before the deadline.\n\nGood luck!`
      : `Bonjour ${data.userName},\n\nCeci est un rappel que le quiz "${data.quizTitle}" du cours "${data.courseTitle}" arrive bientôt à échéance.\n\nDate limite: ${deadlineStr}\n\nAssurez-vous de compléter le quiz avant la date limite.\n\nBonne chance !`;
    return { subject, html, text };
  }

  /**
   * Generate announcement email template
   * Requirements: 21.10
   */
  static generateAnnouncementEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `New announcement in ${data.courseTitle}`
      : `Nouvelle annonce dans ${data.courseTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #9b59b6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #9b59b6; color: white; text-decoration: none; border-radius: 5px; }
            .announcement { background-color: #fff; padding: 15px; border-left: 4px solid #9b59b6; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'New Announcement' : 'Nouvelle annonce'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `A new announcement has been posted in <strong>${data.courseTitle}</strong>.`
                  : `Une nouvelle annonce a été publiée dans <strong>${data.courseTitle}</strong>.`}
              </p>
              <div class="announcement">
                <h3>${data.announcementTitle}</h3>
                <p>${data.announcementContent}</p>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">${isEnglish ? 'View Course' : 'Voir le cours'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Stay informed!' : 'Restez informé !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nA new announcement has been posted in "${data.courseTitle}".\n\n${data.announcementTitle}\n\n${data.announcementContent}\n\nStay informed!`
      : `Bonjour ${data.userName},\n\nUne nouvelle annonce a été publiée dans "${data.courseTitle}".\n\n${data.announcementTitle}\n\n${data.announcementContent}\n\nRestez informé !`;
    return { subject, html, text };
  }

  /**
   * Generate team invitation email template
   * Requirements: 22.3
   */
  static generateTeamInvitationEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
    const isEnglish = data.language === 'EN';
    const subject = isEnglish
      ? `You've been invited to collaborate on ${data.courseTitle}`
      : `Vous avez été invité à collaborer sur ${data.courseTitle}`;
    const roleText = data.teamRole === 'EDITOR'
      ? (isEnglish ? 'Editor (can modify content)' : 'Éditeur (peut modifier le contenu)')
      : (isEnglish ? 'Viewer (read-only access)' : 'Observateur (accès en lecture seule)');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a085; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            .button { display: inline-block; padding: 10px 20px; background-color: #16a085; color: white; text-decoration: none; border-radius: 5px; }
            .role-info { background-color: #e8f8f5; padding: 10px; border-left: 4px solid #16a085; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isEnglish ? 'Team Invitation' : 'Invitation à l\'équipe'}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? 'Hello' : 'Bonjour'} ${data.userName},</p>
              <p>
                ${isEnglish
                  ? `You have been invited to join the course team for <strong>${data.courseTitle}</strong>.`
                  : `Vous avez été invité à rejoindre l'équipe du cours <strong>${data.courseTitle}</strong>.`}
              </p>
              <div class="role-info">
                <strong>${isEnglish ? 'Your role' : 'Votre rôle'}:</strong> ${roleText}
              </div>
              <p>
                ${isEnglish
                  ? 'Click the button below to accept the invitation and start collaborating.'
                  : 'Cliquez sur le bouton ci-dessous pour accepter l\'invitation et commencer à collaborer.'}
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.acceptanceLink}" class="button">${isEnglish ? 'Accept Invitation' : 'Accepter l\'invitation'}</a>
              </p>
            </div>
            <div class="footer">
              <p>${isEnglish ? 'Welcome to the team!' : 'Bienvenue dans l\'équipe !'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = isEnglish
      ? `Hello ${data.userName},\n\nYou have been invited to join the course team for "${data.courseTitle}".\n\nYour role: ${roleText}\n\nAccept invitation: ${data.acceptanceLink}\n\nWelcome to the team!`
      : `Bonjour ${data.userName},\n\nVous avez été invité à rejoindre l'équipe du cours "${data.courseTitle}".\n\nVotre rôle: ${roleText}\n\nAccepter l'invitation: ${data.acceptanceLink}\n\nBienvenue dans l'équipe !`;
    return { subject, html, text };
  }
}
