/* =============================================================
   ⚙️ CONFIGURATION WHITE LABEL
   Modifie uniquement ce fichier pour personnaliser l'app client.
   ============================================================= */

const STORE_CONFIG = {
  name: "Cuisine & Co",                          /* ✏️ PERSONNALISER — Nom du magasin */
  logo: "🏠",                                    /* ✏️ PERSONNALISER — Emoji ou URL image */
  primaryColor: "#1a1a2e",                        /* ✏️ PERSONNALISER — Couleur principale */
  accentColor: "#e94560",                         /* ✏️ PERSONNALISER — Couleur accent */
  phone: "+32 04 123 45 67",                      /* ✏️ PERSONNALISER — Téléphone magasin */
  email: "contact@cuisineco.be",                  /* ✏️ PERSONNALISER — Email contact */
  address: "Rue de la Cuisine 12, 4000 Liège",    /* ✏️ PERSONNALISER — Adresse */
  supportEmail: "support@cuisineco.be",            /* ✏️ PERSONNALISER — Email support */
  emailJsServiceId: "YOUR_SERVICE_ID",             /* ✏️ EMAILJS — Service ID */
  emailJsTemplateId: "YOUR_TEMPLATE_ID",           /* ✏️ EMAILJS — Template ID */
  emailJsPublicKey: "YOUR_PUBLIC_KEY",             /* ✏️ EMAILJS — Public Key */
  appVersion: "3.0.0"                              /* ✏️ PERSONNALISER — Version */
};

/* Utilisateurs démo */
const DEMO_USERS = [
  { email: "magasin@demo.com", pass: "admin",  firstName: "Sarah",     lastName: "MARTINEZ", role: "magasin" },
  { email: "poseur@demo.com",  pass: "1234",   firstName: "Lucas",     lastName: "MARTIN",   role: "poseur", poseurId: 1 },
  { email: "nathan@demo.com",  pass: "1234",   firstName: "Nathan",    lastName: "DUBOIS",   role: "poseur", poseurId: 2 }
];

/* Poseurs */
const POSEURS_INIT = [
  { id: 1, nom: "MARTIN",  prenom: "Lucas",  email: "lucas@cuisineco.be",  tel: "+32 476 11 22 33", actif: true,  couleur: "#3b82f6" },
  { id: 2, nom: "DUBOIS",  prenom: "Nathan", email: "nathan@cuisineco.be", tel: "+32 477 44 55 66", actif: true,  couleur: "#22c55e" },
  { id: 3, nom: "LECOMTE", prenom: "Axel",   email: "axel@cuisineco.be",   tel: "+32 478 77 88 99", actif: false, couleur: "#f97316" }
];
