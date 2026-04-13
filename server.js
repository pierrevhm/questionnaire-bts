require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' })); // le PDF base64 peut être volumineux
app.use(express.static(path.join(__dirname))); // sert le HTML / logo / etc.

// ── Transporteur email ──────────────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true pour port 465, false sinon
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ── Corps HTML de l'email de notification ──────────────────────────────────
function buildEmailHTML(fd) {
    const civilite = fd.civilite === 'madame' ? 'Madame' : fd.civilite === 'monsieur' ? 'Monsieur' : '';
    const qcmLabels = {
        q1:  ['Océan Arctique','Océan Pacifique','Océan Indien','Océan Atlantique'],
        q2:  ['1792','1804','1776','1789'],
        q3:  ['48','42','36','50'],
        q4:  ["Aucun chat n'est un chien",'Tous les chiens sont des chats','Tous les chats sont des chiens',"Il est possible qu'un chat ne soit pas un chien"],
        q5:  ['Détaillé','Compliqué','Bref','Évasif'],
        q6:  ['Elle a oubliée son sac.','Il à été surpris.','Ils sont allez au marché.','Nous avons bien mangé.'],
        q7:  ['I go to the school all days','I go to school every day','I am going to school every day','I go at school all days'],
        q8:  ["She don't like pizza",'He have two brothers','They goes to work','We are ready'],
        q9:  ["Blâmer l'autre pour l'erreur",'Ignorer le problème',"Élever la voix pour s'imposer","Écouter l'autre et chercher une solution commune"],
        q10: ['La compétitivité',"L'autorité","L'indépendance totale","L'écoute"],
    };
    const letterToIndex = { a: 0, b: 1, c: 2, d: 3 };

    function qcmRow(num, name) {
        const letter = fd[name];
        const val    = (letter && qcmLabels[name]) ? qcmLabels[name][letterToIndex[letter]] : '<em>Non répondu</em>';
        return `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;color:#153353">${num}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${val}</td></tr>`;
    }

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;">

<div style="background:#153353;color:white;padding:20px 28px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:1.4rem;">BTS Business School</h1>
    <p style="margin:4px 0 0;opacity:.75;font-size:.9rem;">Nouveau dossier de candidature reçu</p>
</div>

<div style="border:1px solid #ddd;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px;">

    <h2 style="color:#FEB753;border-bottom:2px solid #FEB753;padding-bottom:6px;">État Civil</h2>
    <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 10px;width:40%;font-weight:600;color:#153353">Civilité</td><td style="padding:5px 10px">${civilite}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Nom</td><td style="padding:5px 10px">${fd.nom || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Prénom</td><td style="padding:5px 10px">${fd.prenom || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Date de naissance</td><td style="padding:5px 10px">${fd.date_naissance ? new Date(fd.date_naissance).toLocaleDateString('fr-FR') : ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Nationalité</td><td style="padding:5px 10px">${fd.nationalite || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Adresse</td><td style="padding:5px 10px">${[fd.adresse, fd.code_postal, fd.ville].filter(Boolean).join(', ')}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Téléphone</td><td style="padding:5px 10px">${fd.telephone || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Email</td><td style="padding:5px 10px">${fd.email || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Situation familiale</td><td style="padding:5px 10px">${fd.situation_familiale || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Situation de handicap</td><td style="padding:5px 10px">${fd.handicap === 'oui' ? 'Oui' : fd.handicap === 'non' ? 'Non' : ''}</td></tr>
    </table>

    <h2 style="color:#FEB753;border-bottom:2px solid #FEB753;padding-bottom:6px;margin-top:24px;">Formation</h2>
    <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 10px;width:40%;font-weight:600;color:#153353">Baccalauréat</td><td style="padding:5px 10px">${fd.baccalaureat || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Année d'obtention</td><td style="padding:5px 10px">${fd.bac_annee || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Département</td><td style="padding:5px 10px">${fd.bac_departement || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Dernier diplôme</td><td style="padding:5px 10px">${fd.dernier_diplome || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Classe précédente</td><td style="padding:5px 10px">${fd.classe_prec || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Classe actuelle</td><td style="padding:5px 10px">${fd.classe_actuelle || ''}</td></tr>
    </table>

    <h2 style="color:#FEB753;border-bottom:2px solid #FEB753;padding-bottom:6px;margin-top:24px;">Entreprise d'accueil</h2>
    <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 10px;width:40%;font-weight:600;color:#153353">Alternance trouvée</td><td style="padding:5px 10px">${fd.alternance === 'oui' ? 'Oui' : 'Non'}</td></tr>
        ${fd.alternance === 'oui' ? `
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Entreprise</td><td style="padding:5px 10px">${fd.ent_nom || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Contact</td><td style="padding:5px 10px">${fd.ent_contact_nom || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Fonction</td><td style="padding:5px 10px">${fd.ent_contact_fonction || ''}</td></tr>
        <tr><td style="padding:5px 10px;font-weight:600;color:#153353">Tél. entreprise</td><td style="padding:5px 10px">${fd.ent_tel || ''}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:5px 10px;font-weight:600;color:#153353">Email entreprise</td><td style="padding:5px 10px">${fd.ent_email || ''}</td></tr>
        ` : ''}
    </table>

    <h2 style="color:#FEB753;border-bottom:2px solid #FEB753;padding-bottom:6px;margin-top:24px;">Test de positionnement</h2>
    <p><strong style="color:#153353">Niveau :</strong> ${{ debutant:'Débutant', intermediaire:'Intermédiaire', avance:'Avancé', expert:'Expert' }[fd.niveau] || ''}</p>
    <p><strong style="color:#153353">Motivations :</strong><br>${(fd.motivation || '').replace(/\n/g,'<br>')}</p>
    <p><strong style="color:#153353">Compétences visées :</strong><br>${(fd.competences_visees || '').replace(/\n/g,'<br>')}</p>
    <p><strong style="color:#153353">Conditions particulières :</strong><br>${(fd.conditions || '').replace(/\n/g,'<br>')}</p>
    <p><strong style="color:#153353">Projet professionnel :</strong><br>${(fd.projet_pro || '').replace(/\n/g,'<br>')}</p>

    <h2 style="color:#FEB753;border-bottom:2px solid #FEB753;padding-bottom:6px;margin-top:24px;">Réponses QCM</h2>
    <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
        <thead>
            <tr style="background:#153353;color:white;">
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Question</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Réponse choisie</th>
            </tr>
        </thead>
        <tbody>
            ${qcmRow('1 — Plus grand océan', 'q1')}
            ${qcmRow('2 — Révolution française', 'q2')}
            ${qcmRow('3 — Suite logique', 'q3')}
            ${qcmRow('4 — Logique chats/chiens', 'q4')}
            ${qcmRow('5 — Synonyme de "succinct"', 'q5')}
            ${qcmRow('6 — Phrase correcte', 'q6')}
            ${qcmRow('7 — Traduction anglais', 'q7')}
            ${qcmRow('8 — Sentence correct (EN)', 'q8')}
            ${qcmRow('9 — Gestion de conflit', 'q9')}
            ${qcmRow('10 — Qualité travail équipe', 'q10')}
        </tbody>
    </table>

    <p style="margin-top:28px;padding:12px 16px;background:#f0f2fc;border-left:4px solid #153353;font-size:.85rem;color:#555;">
        Le dossier complet est disponible en pièce jointe au format PDF.
    </p>
</div>

<p style="text-align:center;color:#aaa;font-size:.75rem;margin-top:16px;">
    BTS Business School — Dossier reçu le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
</p>
</body>
</html>`;
}

// ── Route POST /submit ──────────────────────────────────────────────────────
app.post('/submit', async (req, res) => {
    const { formData, pdfBase64, fileName } = req.body;

    if (!formData || !pdfBase64) {
        return res.status(400).json({ error: 'Données manquantes.' });
    }

    // Extraire la partie base64 pure (sans le préfixe data:application/pdf;base64,)
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;

    try {
        const transporter = createTransporter();
        await transporter.verify(); // vérifie la connexion SMTP

        await transporter.sendMail({
            from:    `"BTS Business School" <${process.env.SMTP_USER}>`,
            to:      process.env.EMAIL_DESTINATAIRE,
            replyTo: formData.email || undefined,
            subject: `Nouvelle candidature — ${formData.prenom || ''} ${formData.nom || ''}`.trim(),
            html:    buildEmailHTML(formData),
            attachments: [{
                filename:    fileName || 'dossier_candidature.pdf',
                content:     base64Data,
                encoding:    'base64',
                contentType: 'application/pdf',
            }],
        });

        console.log(`[OK] Dossier envoyé pour ${formData.prenom} ${formData.nom} → ${process.env.EMAIL_DESTINATAIRE}`);
        res.json({ success: true });

    } catch (err) {
        console.error('[ERREUR envoi email]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Route GET / — sert le formulaire ───────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dossier-candidature.html'));
});

// ── Démarrage ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ Serveur BTS démarré : http://localhost:${PORT}`);
    console.log(`   Dossiers envoyés à  : ${process.env.EMAIL_DESTINATAIRE || '(non configuré)'}`);
    console.log(`   SMTP                : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}\n`);
});
