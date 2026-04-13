/* =============================================================
   📦 DONNÉES MOCKÉES
   Ce fichier contient les données de démo.
   En production, ces données viendraient d'une API.
   ============================================================= */

const NOW = new Date();
function _dOff(days, sh = 8, sm = 0, eh = 17, em = 0) {
  const d = new Date(NOW); d.setDate(d.getDate() + days);
  const s = new Date(d); s.setHours(sh, sm, 0, 0);
  const e = new Date(d); e.setHours(eh, em, 0, 0);
  return { start: s.toISOString(), end: e.toISOString() };
}

/* Placeholder SVG images */
const _ph = (w, h, bg, fg, txt) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect width='${w}' height='${h}' fill='${encodeURIComponent(bg)}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='${encodeURIComponent(fg)}' font-family='sans-serif' font-size='14'%3E${encodeURIComponent(txt)}%3C/text%3E%3C/svg%3E`;

/* ---- Poseurs (copie mutable) ---- */
let POSEURS = JSON.parse(JSON.stringify(POSEURS_INIT));

/* ---- Dossiers ---- */
let DOSSIERS = [
  {
    id: 1, num: "DOS-2026-0041", status: "done", poseurId: 1,
    client: { civ: "Mme", firstName: "Marie", lastName: "LAMBERT", address: "Avenue des Lilas 45", city: "4000 Liège", phone: "+32 478 12 34 56", email: "marie.lambert@gmail.com" },
    amount: 8450,
    documents: [
      { id: 1, name: "Bon de commande", type: "pdf", date: "2026-03-15", url: "" },
      { id: 2, name: "Plan cuisine 3D", type: "image", date: "2026-03-16", url: _ph(400, 300, "#e5e7eb", "#6b7280", "Plan cuisine 3D") },
      { id: 3, name: "Photo avant travaux", type: "image", date: "2026-03-20", url: _ph(400, 300, "#dbeafe", "#3b82f6", "Photo avant travaux") }
    ],
    electros: [
      { id: 1, type: "Four", brand: "Bosch", model: "HBA171BS0", serial: "BSH-887421", notice: true, noticeUrl: "#", notes: "Encastrable 60cm" },
      { id: 2, type: "Lave-vaisselle", brand: "Siemens", model: "SN236I01ME", serial: "SIE-334521", notice: true, noticeUrl: "#", notes: "Full intégrable 60cm" },
      { id: 3, type: "Hotte", brand: "Neff", model: "D64BHM1N0", serial: "", notice: false, noticeUrl: "", notes: "Hotte visière 60cm" }
    ],
    report: {
      status: "submitted", submittedAt: "2026-04-08T16:30:00",
      checks: { poseComplete: true, poseComment: "", elecOk: true, elecComment: "", sanitOk: true, sanitComment: "", reglagesOk: true, reglagesComment: "", conforme: true, conformeComment: "", clientInformed: true, clientInformedComment: "" },
      problems: { level: "none", detail: "" },
      sav: { needed: false, desc: "", urgency: "" },
      photos: [
        { id: 1, src: _ph(400, 400, "#dcfce7", "#22c55e", "Vue ensemble"), caption: "Vue d'ensemble cuisine" },
        { id: 2, src: _ph(400, 400, "#dbeafe", "#3b82f6", "Plan travail"), caption: "Plan de travail" },
        { id: 3, src: _ph(400, 400, "#fef3c7", "#f59e0b", "Electros"), caption: "Électroménagers installés" }
      ],
      clientRemarks: "Très satisfaite du résultat. RAS.",
      signatory: "Marie LAMBERT",
      signatureData: _ph(300, 100, "#ffffff", "#1a1a2e", "~ Signature ~"),
      signatureDate: "2026-04-08T16:28:00"
    }
  },
  {
    id: 2, num: "DOS-2026-0042", status: "in_progress", poseurId: 2,
    client: { civ: "M.", firstName: "Jean-Pierre", lastName: "DUBOIS", address: "Rue de Namur 12", city: "5000 Namur", phone: "+32 495 87 65 43", email: "jp.dubois@outlook.be" },
    amount: 12200,
    documents: [
      { id: 4, name: "Plan cuisine en L", type: "image", date: "2026-04-01", url: _ph(400, 300, "#fef3c7", "#d97706", "Plan cuisine en L") },
      { id: 5, name: "Bon de commande", type: "pdf", date: "2026-04-02", url: "" }
    ],
    electros: [
      { id: 4, type: "Four vapeur", brand: "Miele", model: "H7164BP", serial: "", notice: true, noticeUrl: "#", notes: "Four vapeur combiné" },
      { id: 5, type: "Réfrigérateur", brand: "Samsung", model: "RB38T776CS9", serial: "", notice: true, noticeUrl: "#", notes: "Combi frigo-congélo" },
      { id: 6, type: "Plaque", brand: "AEG", model: "IKE85471FB", serial: "", notice: false, noticeUrl: "", notes: "Induction 80cm" },
      { id: 7, type: "Hotte", brand: "Faber", model: "INCA SMART", serial: "", notice: false, noticeUrl: "", notes: "Hotte intégrée plan de travail" }
    ],
    report: {
      status: "draft", submittedAt: "",
      checks: { poseComplete: false, poseComment: "", elecOk: false, elecComment: "", sanitOk: false, sanitComment: "", reglagesOk: false, reglagesComment: "", conforme: false, conformeComment: "", clientInformed: false, clientInformedComment: "" },
      problems: { level: "none", detail: "" },
      sav: { needed: false, desc: "", urgency: "" },
      photos: [],
      clientRemarks: "",
      signatory: "Jean-Pierre DUBOIS",
      signatureData: "",
      signatureDate: ""
    }
  },
  {
    id: 3, num: "DOS-2026-0043", status: "sav_pending", poseurId: 3,
    client: { civ: "Mme", firstName: "Sophie", lastName: "RENARD", address: "Boulevard de la Sauvenière 78", city: "4000 Liège", phone: "+32 472 33 44 55", email: "sophie.renard@gmail.com" },
    amount: 6800,
    documents: [
      { id: 6, name: "Bon de commande", type: "pdf", date: "2026-03-25", url: "" }
    ],
    electros: [
      { id: 8, type: "Four", brand: "Bosch", model: "HBG675BS1", serial: "BSH-112233", notice: true, noticeUrl: "#", notes: "Pyrolyse 60cm" },
      { id: 9, type: "Plaque", brand: "Siemens", model: "EX675LYC1E", serial: "", notice: true, noticeUrl: "#", notes: "Induction flexZone" }
    ],
    report: {
      status: "submitted", submittedAt: "2026-04-05T14:00:00",
      checks: { poseComplete: true, poseComment: "", elecOk: true, elecComment: "", sanitOk: true, sanitComment: "", reglagesOk: false, reglagesComment: "Porte four ne ferme pas correctement", conforme: false, conformeComment: "Porte four — SAV prévu", clientInformed: true, clientInformedComment: "" },
      problems: { level: "minor", detail: "Porte du four Bosch ne se ferme pas correctement — jeu de 3mm côté charnière droite." },
      sav: { needed: true, desc: "Remplacement charnière porte four Bosch HBG675BS1 — commande pièce nécessaire.", urgency: "medium" },
      photos: [
        { id: 4, src: _ph(400, 400, "#fef2f2", "#ef4444", "Porte four"), caption: "Porte four — jeu visible" },
        { id: 5, src: _ph(400, 400, "#dcfce7", "#22c55e", "Vue cuisine"), caption: "Vue d'ensemble cuisine Renard" }
      ],
      clientRemarks: "Satisfaite dans l'ensemble mais la porte du four doit être réparée rapidement.",
      signatory: "Sophie RENARD",
      signatureData: _ph(300, 100, "#ffffff", "#1a1a2e", "~ S.Renard ~"),
      signatureDate: "2026-04-05T13:58:00"
    }
  }
];

/* ---- Activités ---- */
let ACTIVITIES = [
  { id: 1, type: "Pose", status: "confirmed", dossierId: 2, poseurId: 2, client: { firstName: "Jean-Pierre", lastName: "DUBOIS", phone: "+32 495 87 65 43", address: "Rue de Namur 12", city: "5000 Namur" }, slot: _dOff(1, 8, 0, 18, 0), notes: "" },
  { id: 2, type: "SAV", status: "urgent", dossierId: 3, poseurId: 1, client: { firstName: "Sophie", lastName: "RENARD", phone: "+32 472 33 44 55", address: "Bd de la Sauvenière 78", city: "4000 Liège" }, slot: _dOff(2, 9, 0, 12, 0), notes: "Porte four Bosch — charnière" },
  { id: 3, type: "Livraison", status: "confirmed", dossierId: null, poseurId: 1, client: { firstName: "Émilie", lastName: "CLAES", phone: "+32 486 23 45 67", address: "Rue de Fer 78", city: "5000 Namur" }, slot: _dOff(3, 7, 30, 10, 0), notes: "" },
  { id: 4, type: "Pose", status: "pending", dossierId: null, poseurId: 2, client: { firstName: "Marc", lastName: "VANDENBERGHE", phone: "+32 472 34 56 78", address: "Chaussée de Waterloo 234", city: "1060 Bruxelles" }, slot: _dOff(5, 8, 0, 18, 0), notes: "" },
  { id: 5, type: "Pose", status: "confirmed", dossierId: null, poseurId: 1, client: { firstName: "Isabelle", lastName: "PEETERS", phone: "+32 477 45 67 89", address: "Quai de la Boverie 15", city: "4020 Liège" }, slot: _dOff(7, 8, 30, 16, 30), notes: "" },
  { id: 6, type: "SAV", status: "confirmed", dossierId: null, poseurId: 2, client: { firstName: "Thomas", lastName: "HENRARD", phone: "+32 496 56 78 90", address: "Rue des Guillemins 63", city: "4000 Liège" }, slot: _dOff(9, 10, 0, 13, 0), notes: "Fuite raccord plomberie" },
  { id: 7, type: "Livraison", status: "pending", dossierId: null, poseurId: 1, client: { firstName: "Catherine", lastName: "WILLEMS", phone: "+32 474 67 89 01", address: "Boulevard d'Avroy 92", city: "4000 Liège" }, slot: _dOff(11, 8, 0, 11, 0), notes: "" },
  { id: 8, type: "Pose", status: "urgent", dossierId: null, poseurId: 1, client: { firstName: "David", lastName: "FRANCK", phone: "+32 479 78 90 12", address: "Place Saint-Lambert 1", city: "4000 Liège" }, slot: _dOff(0, 8, 0, 17, 0), notes: "Code parking: 4589" },
  { id: 9, type: "SAV", status: "pending", dossierId: null, poseurId: 2, client: { firstName: "Nathalie", lastName: "SIMON", phone: "+32 483 89 01 23", address: "Rue Hors-Château 30", city: "4000 Liège" }, slot: _dOff(14, 9, 0, 11, 30), notes: "" },
  { id: 10, type: "Pose", status: "done", dossierId: 1, poseurId: 1, client: { firstName: "Marie", lastName: "LAMBERT", phone: "+32 478 12 34 56", address: "Avenue des Lilas 45", city: "4000 Liège" }, slot: _dOff(-5, 8, 0, 17, 0), notes: "Pose terminée" }
];
