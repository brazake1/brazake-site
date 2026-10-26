/* BRAZAKE — calculateur de crédit d'impôt « services à la personne »
   Règles (BOFiP BOI-IR-RICI-150-20) : taux 50 % ; plafond de dépenses 12 000 €,
   majoré de 1 500 € par enfant à charge et par membre du foyer de plus de 65 ans,
   sans dépasser 15 000 € ; 20 000 € (sans majoration) si carte d'invalidité. */
(function () {
  "use strict";
  var TAUX = 0.5, BASE = 12000, MAJ = 1500, MAXI = 15000, MAXI_INV = 20000;
  var root = document.querySelector("[data-calc]");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    montant: $("c-montant"), passages: $("c-passages"), passagesV: $("c-passages-v"),
    enfants: $("c-enfants"), seniors: $("c-seniors"), invalide: $("c-invalide"), autres: $("c-autres"),
    presets: root.querySelectorAll("[data-preset]")
  };
  var fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
  var pct = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  function e(x) { return fmt.format(Math.round(x * 100) / 100).replace(/ | /g, " "); }
  function num(node, min, max, def) {
    var v = parseFloat(String(node.value).replace(",", "."));
    if (!isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
  }
  function set(key, txt) {
    var n = root.querySelectorAll('[data-r="' + key + '"]');
    for (var i = 0; i < n.length; i++) n[i].textContent = txt;
  }
  function show(key, on) {
    var n = root.querySelectorAll('[data-r="' + key + '"]');
    for (var i = 0; i < n.length; i++) n[i].hidden = !on;
  }

  /* calcul pur, exposé pour les tests */
  function calcule(p) {
    var plafond = p.invalide ? MAXI_INV : Math.min(MAXI, BASE + MAJ * (p.enfants + p.seniors));
    var facture = p.montant * p.passages;
    var dispo = Math.max(0, plafond - p.autres);
    var eligible = Math.min(facture, dispo);
    var credit = Math.round(eligible * TAUX * 100) / 100;
    var reste = Math.round((facture - credit) * 100) / 100;
    var depasse = Math.max(0, facture - eligible);
    return {
      plafond: plafond, facture: facture, dispo: dispo, eligible: eligible, credit: credit,
      reste: reste, depasse: depasse, perdu: Math.round(depasse * TAUX * 100) / 100,
      utilise: p.autres + facture
    };
  }
  window.BrazakeCalc = { calcule: calcule };

  function lire() {
    return {
      montant: num(el.montant, 0, 100000, 0),
      passages: Math.round(num(el.passages, 1, 12, 1)),
      enfants: Math.round(num(el.enfants, 0, 10, 0)),
      seniors: Math.round(num(el.seniors, 0, 10, 0)),
      invalide: !!(el.invalide && el.invalide.checked),
      autres: num(el.autres, 0, 100000, 0)
    };
  }

  function maj(sync) {
    var p = lire(), r = calcule(p);
    el.passagesV.textContent = p.passages + (p.passages > 1 ? " passages" : " passage");
    var ok = p.montant > 0;
    show("vide", !ok); show("resultats", ok);
    if (ok) {
      var moy = r.reste / p.passages;
      set("facture", e(r.facture));
      set("credit", e(r.credit));
      set("reste", e(r.reste));
      set("avance-paye", e(r.reste));
      set("avance-par", (r.depasse > 0 ? "≈ " : "") + e(moy) + " par passage");
      set("classique-paye", e(r.facture));
      set("classique-recup", e(r.credit));
      set("plafond", e(r.plafond));
      set("utilise", e(r.utilise));
      var part = Math.min(100, Math.round(r.utilise / r.plafond * 100));
      set("part", pct.format(Math.round(r.utilise / r.plafond * 100)) + " %");
      var barre = root.querySelector("[data-barre]");
      if (barre) { barre.style.width = part + "%"; barre.parentNode.setAttribute("aria-valuenow", String(part)); barre.className = r.depasse > 0 ? "alerte" : ""; }
      show("alerte", r.depasse > 0);
      if (r.depasse > 0) set("alerte-txt", "Votre plafond annuel de " + e(r.plafond) + " est dépassé : " + e(r.depasse) + " de dépenses ne donnent pas droit au crédit d'impôt (" + e(r.perdu) + " de crédit non perçu).");
      var phrase;
      if (r.depasse > 0) phrase = "Pour " + p.passages + " passage" + (p.passages > 1 ? "s" : "") + " à " + e(p.montant) + " (" + e(r.facture) + " au total), le crédit d'impôt est limité à " + e(r.credit) + " par le plafond : vous supportez " + e(r.reste) + ".";
      else phrase = "Pour " + p.passages + " passage" + (p.passages > 1 ? "s" : "") + " à " + e(p.montant) + ", vous réglez " + e(r.reste) + " au lieu de " + e(r.facture) + " : l'État prend en charge " + e(r.credit) + " (50 %).";
      set("phrase", phrase);
    }
    for (var i = 0; i < el.presets.length; i++) {
      var on = parseFloat(el.presets[i].getAttribute("data-preset")) === p.montant;
      el.presets[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (sync !== false) {
      try {
        var q = "?montant=" + p.montant + "&passages=" + p.passages + (p.enfants ? "&enfants=" + p.enfants : "") + (p.seniors ? "&seniors=" + p.seniors : "") + (p.autres ? "&autres=" + p.autres : "") + (p.invalide ? "&invalide=1" : "");
        history.replaceState(null, "", location.pathname + q);
      } catch (x) {}
    }
    envoyerHauteur();
  }

  function envoyerHauteur() {
    if (window.parent === window) return;
    try { window.parent.postMessage({ brazakeCalcHeight: document.documentElement.scrollHeight }, "*"); } catch (x) {}
  }

  /* préremplissage par l'adresse : ?montant=140&passages=2 */
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("montant")) el.montant.value = String(Math.min(100000, Math.max(0, parseFloat(q.get("montant")) || 0)) || el.montant.value);
    if (q.get("passages")) el.passages.value = String(Math.min(12, Math.max(1, parseInt(q.get("passages"), 10) || 1)));
    if (q.get("enfants")) el.enfants.value = String(Math.min(10, Math.max(0, parseInt(q.get("enfants"), 10) || 0)));
    if (q.get("seniors")) el.seniors.value = String(Math.min(10, Math.max(0, parseInt(q.get("seniors"), 10) || 0)));
    if (q.get("autres")) el.autres.value = String(Math.max(0, parseFloat(q.get("autres")) || 0));
    if (q.get("invalide") === "1" && el.invalide) el.invalide.checked = true;
  } catch (x) {}

  root.addEventListener("input", function () { maj(); });
  root.addEventListener("change", function () { maj(); });
  for (var i = 0; i < el.presets.length; i++) {
    el.presets[i].addEventListener("click", function () {
      el.montant.value = this.getAttribute("data-preset"); maj();
    });
  }
  var cp = root.ownerDocument.querySelector("[data-copy]");
  if (cp) cp.addEventListener("click", function () {
    var code = document.getElementById("embed-code"); if (!code) return;
    var done = function () { cp.textContent = "Copié ✓"; setTimeout(function () { cp.textContent = "Copier le code"; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code.textContent).then(done, function () {});
    else { var r = document.createRange(); r.selectNodeContents(code); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); try { document.execCommand("copy"); done(); } catch (x) {} }
  });
  window.addEventListener("resize", envoyerHauteur);
  maj(false);
  window.addEventListener("load", envoyerHauteur);
})();
