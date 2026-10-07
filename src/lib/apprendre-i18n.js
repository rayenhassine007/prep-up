// Textes de la page « Apprendre à apprendre », en français et en arabe.
//
// Le français est aussi écrit en dur dans apprendre-a-apprendre.html : c'est la
// version que lisent les moteurs de recherche et les navigateurs sans JS. Un
// test vérifie que les deux copies restent identiques.
//
// Les valeurs peuvent contenir des marqueurs {lien} ou {cours} : le module de
// la page les remplace par un vrai lien ou un titre en italique, sans jamais
// passer par innerHTML.

export const TEXTES = {
  fr: {
    'meta.titre': 'Apprendre à apprendre : 7 méthodes de révision pour la prépa | Prep\'Up',
    'nav.accueil': '← Accueil',
    'langue.bouton': 'عربي',

    'hero.titre': 'Apprendre à apprendre',
    'hero.sous': '7 méthodes prouvées par la science pour retenir plus en travaillant moins.',
    'hero.lecture': 'Lecture : 3 min',
    'hero.test': 'Faire le test (1 min)',
    'hero.methodes': 'Voir les méthodes',

    'pilule.aria': 'Aller à',
    'pilule.test': 'Test',
    'pilule.methodes': 'Méthodes',
    'pilule.outil': 'Outil',

    'quiz.titre': 'Test rapide : qu\'est-ce que tu dois améliorer ?',
    'quiz.q1': 'Je lis la correction puis je passe directement à l\'exercice suivant.',
    'quiz.q2': 'Je révise surtout en relisant mon cours.',
    'quiz.q3': 'Je révise beaucoup la veille du DS.',
    'quiz.q4': 'Je reste des heures sur le même chapitre.',
    'quiz.q5': 'Je dors moins en période d\'examens.',
    'quiz.oui': 'Oui',
    'quiz.non': 'Non',
    'quiz.priorites': 'Tes priorités :',
    'quiz.methode': 'méthode {n}',
    'quiz.bravo': 'Bravo, tu as de bonnes habitudes ! Garde le rythme avec le planificateur.',
    'quiz.reste1': 'Encore 1 question.',
    'quiz.resteN': 'Encore {n} questions.',
    'quiz.refaire': 'Refaire le test',

    'cerveau.titre': 'Comment ton cerveau apprend',
    'cerveau.c1t': 'Concentré vs diffus',
    'cerveau.c1': 'Ton cerveau a deux modes : concentré (tu travailles) et diffus (tu te reposes et il fait des liens). Bloqué ? Fais une pause : la solution vient souvent après.',
    'cerveau.c2t': 'Les « chunks »',
    'cerveau.c2': 'Chaque méthode que tu maîtrises devient un bloc que ton cerveau utilise automatiquement. La prépa, c\'est construire ces blocs par la pratique.',

    'methodes.titre': 'Les 7 méthodes',
    'methodes.pourquoi': 'Pourquoi ?',
    'm1.titre': 'Refais seul, sans la correction',
    'm1.action': 'Bloqué ? Lis la correction, puis refais l\'exercice le lendemain sur une feuille blanche.',
    'm1.pourquoi': 'Comprendre une solution n\'est pas savoir la refaire. C\'est la pratique qui fixe la méthode.',
    'm2.titre': 'Espace tes révisions',
    'm2.action': 'Revois chaque chapitre après 1, 3, 7, 14 puis 30 jours. {lien} le fait pour toi.',
    'm2.lien': 'Le planificateur ↓',
    'm2.pourquoi': 'Plusieurs révisions courtes et espacées retiennent mieux qu\'une longue séance la veille.',
    'm3.titre': 'Dors : c\'est du travail',
    'm3.action': 'Relis tes formules du jour avant de dormir. Ne sacrifie pas ta nuit avant un DS.',
    'm3.pourquoi': 'Pendant le sommeil, ton cerveau consolide ce que tu as appris dans la journée.',
    'm4.titre': 'Récite au lieu de relire',
    'm4.action': 'Ferme le cours et écris de mémoire définitions et théorèmes. Puis vérifie.',
    'm4.pourquoi': 'Relire donne l\'illusion de savoir. Se souvenir sans regarder renforce la mémoire.',
    'm5.titre': 'Teste-toi',
    'm5.action': 'Après chaque chapitre : 3 exercices sans aide, chronométrés. Des sujets de concours t\'attendent dans la {lien}.',
    'm5.lien': 'bibliothèque ↗',
    'm5.pourquoi': 'Le test montre ce que tu sais vraiment, et il t\'aide à retenir.',
    'm6.titre': 'Mélange les chapitres',
    'm6.action': 'Dans une même séance, alterne des exercices de chapitres différents.',
    'm6.pourquoi': 'Au concours, personne ne te dit quel chapitre utiliser. Tu dois reconnaître la bonne méthode.',
    'm7.titre': 'Planifie ta journée (et ta vie)',
    'm7.action': 'Le soir, écris 5 à 7 tâches pour demain, avec du sport, des pauses et une heure de fin.',
    'm7.pourquoi': 'Écrire libère ton esprit, et prévoir du repos évite l\'épuisement.',

    'procra.titre': 'Tu procrastines ?',
    'procra.p1': 'Lance un Pomodoro : 25 min concentré, téléphone dans une autre pièce, puis 5 min de pause.',
    'procra.p2': 'Vise le temps, pas le résultat : « 2 Pomodoros de physique » plutôt que « finir le chapitre ».',
    'procra.p3': 'Commence ta journée par la tâche la plus difficile.',
    'procra.bouton': 'Lancer le minuteur',
    'nouvel.onglet': '(Rakezly, nouvel onglet)',

    'concours.titre': 'Le jour du concours',
    'concours.c1': 'Lis tout le sujet et commence par une question difficile. Bloqué après 1–2 min ? Passe à une facile, puis reviens.',
    'concours.c2': 'Respire profondément pour calmer le stress.',
    'concours.c3': 'À la fin, relis ta copie comme si c\'était celle d\'un autre.',

    'plan.titre': 'Planificateur de révisions',
    'plan.intro': 'Note un chapitre le jour où tu l\'étudies : ses dates de révision s\'affichent toutes seules.',
    'plan.nom': 'Chapitre ou notion',
    'plan.exemple': 'Ex. Séries entières',
    'plan.date': 'Date d\'étude',
    'plan.ajouter': 'Ajouter',
    'plan.aujourdhui': 'À réviser aujourd\'hui',
    'plan.retard': 'En retard',
    'plan.rien': 'Rien à réviser aujourd\'hui 🎉',
    'plan.chapitres': 'Mes chapitres',
    'plan.etudie': 'étudié le {date}',
    'plan.supprimer': 'Supprimer',
    'plan.fait': 'Fait',
    'plan.confirmer': 'Supprimer « {nom} » et ses révisions ?',
    'plan.erreur.nom': 'Indique le chapitre ou la notion.',
    'plan.erreur.date': 'Choisis une date valide.',
    'plan.bloque': 'Ton navigateur bloque l\'enregistrement : ce que tu notes disparaîtra au rechargement.',
    'plan.local': 'Tout reste sur ton appareil : rien n\'est envoyé.',
    'plan.nojs': 'Le planificateur a besoin de JavaScript.',

    'credit.texte': 'D\'après le cours {cours} (B. Oakley & T. Sejnowski) sur Coursera, adapté à la prépa par Rayen. Prep\'Up n\'est pas affilié à Coursera. {lien}',
    'credit.lien': 'Suivre le cours',

    'pied.aria': 'Outils Prep\'Up',
    'pied.accueil': 'Accueil',
    'pied.calculateur': 'Calculateur de rang',
    'pied.places': 'Places 2026',
    'pied.ressources': 'Ressources',
    'pied.chapitres': 'Chapitres du concours',
    'pied.note': 'Des méthodes d\'apprentissage adaptées à la prépa.',
  },

  ar: {
    'meta.titre': 'تعلّم كيف تتعلّم: 7 طرق للمراجعة في الأقسام التحضيرية | Prep\'Up',
    'nav.accueil': '→ الرئيسية',
    'langue.bouton': 'Français',

    'hero.titre': 'تعلّم كيف تتعلّم',
    'hero.sous': '7 طرق مثبتة علميًا لتحفظ أكثر وتتعب أقل.',
    'hero.lecture': 'مدة القراءة: 3 دقائق',
    'hero.test': 'قم بالاختبار (دقيقة واحدة)',
    'hero.methodes': 'شاهد الطرق',

    'pilule.aria': 'انتقل إلى',
    'pilule.test': 'الاختبار',
    'pilule.methodes': 'الطرق',
    'pilule.outil': 'المخطّط',

    'quiz.titre': 'اختبار سريع: ما الذي يجب أن تحسّنه؟',
    'quiz.q1': 'أقرأ الإصلاح ثم أنتقل مباشرة إلى التمرين الموالي.',
    'quiz.q2': 'أراجع غالبًا بإعادة قراءة الدرس.',
    'quiz.q3': 'أراجع كثيرًا في الليلة التي تسبق الـDS.',
    'quiz.q4': 'أبقى ساعات على نفس الفصل.',
    'quiz.q5': 'أنام أقل في فترة الامتحانات.',
    'quiz.oui': 'نعم',
    'quiz.non': 'لا',
    'quiz.priorites': 'أولوياتك:',
    'quiz.methode': 'الطريقة {n}',
    'quiz.bravo': 'أحسنت، عاداتك جيدة! حافظ على النسق مع مخطّط المراجعة.',
    'quiz.reste1': 'بقي سؤال واحد.',
    'quiz.resteN': 'بقيت {n} أسئلة.',
    'quiz.refaire': 'أعد الاختبار',

    'cerveau.titre': 'كيف يتعلّم دماغك',
    'cerveau.c1t': 'التركيز والنمط المنتشر',
    'cerveau.c1': 'لدماغك نمطان: التركيز (عندما تعمل) والنمط المنتشر (عندما ترتاح فيربط الأفكار). علقت؟ خذ استراحة، فالحل كثيرًا ما يأتي بعدها.',
    'cerveau.c2t': 'الكتل (chunks)',
    'cerveau.c2': 'كل طريقة تتقنها تصبح كتلة يستعملها دماغك تلقائيًا. السنوات التحضيرية هي بناء هذه الكتل بالتمرين.',

    'methodes.titre': 'الطرق السبع',
    'methodes.pourquoi': 'لماذا؟',
    'm1.titre': 'أعد الحل وحدك، دون الإصلاح',
    'm1.action': 'علقت؟ اقرأ الإصلاح، ثم أعد التمرين في الغد على ورقة بيضاء.',
    'm1.pourquoi': 'فهم الحل لا يعني القدرة على إعادته. التمرين هو الذي يثبّت الطريقة.',
    'm2.titre': 'باعد بين مراجعاتك',
    'm2.action': 'راجع كل فصل بعد 1، 3، 7، 14 ثم 30 يومًا. {lien} يقوم بذلك عنك.',
    'm2.lien': 'مخطّط المراجعة ↓',
    'm2.pourquoi': 'مراجعات قصيرة ومتباعدة تُثبّت المعلومة أكثر من حصة طويلة في الليلة الأخيرة.',
    'm3.titre': 'النوم جزء من العمل',
    'm3.action': 'راجع قوانين اليوم قبل النوم، ولا تضحِّ بنومك قبل الـDS.',
    'm3.pourquoi': 'أثناء النوم، يثبّت دماغك ما تعلّمته خلال اليوم.',
    'm4.titre': 'استرجع بدل أن تعيد القراءة',
    'm4.action': 'أغلق الدرس واكتب من ذاكرتك التعريفات والمبرهنات، ثم تحقّق.',
    'm4.pourquoi': 'إعادة القراءة توهمك بأنك تعرف. التذكّر دون النظر يقوّي الذاكرة.',
    'm5.titre': 'اختبر نفسك',
    'm5.action': 'بعد كل فصل: 3 تمارين دون مساعدة وبتوقيت. مواضيع المناظرة متوفرة في {lien}.',
    'm5.lien': 'المكتبة ↗',
    'm5.pourquoi': 'الاختبار يكشف ما تعرفه فعلًا ويساعدك على الحفظ.',
    'm6.titre': 'اخلط الفصول',
    'm6.action': 'في الحصة نفسها، نوّع بين تمارين من فصول مختلفة.',
    'm6.pourquoi': 'في المناظرة لا أحد يخبرك أي فصل تستعمل. عليك أن تتعرّف بنفسك على الطريقة المناسبة.',
    'm7.titre': 'خطّط ليومك (ولحياتك)',
    'm7.action': 'في المساء، اكتب من 5 إلى 7 مهام للغد، مع الرياضة والاستراحات وساعة لنهاية العمل.',
    'm7.pourquoi': 'الكتابة تريح ذهنك، وبرمجة الراحة تحميك من الإرهاق.',

    'procra.titre': 'تؤجّل دائمًا؟',
    'procra.p1': 'ابدأ Pomodoro: 25 دقيقة تركيز، والهاتف في غرفة أخرى، ثم 5 دقائق راحة.',
    'procra.p2': 'ركّز على الوقت لا على النتيجة: «حصتا Pomodoro في الفيزياء» بدل «إنهاء الفصل».',
    'procra.p3': 'ابدأ يومك بأصعب مهمة.',
    'procra.bouton': 'شغّل المؤقّت',
    'nouvel.onglet': '(Rakezly، في نافذة جديدة)',

    'concours.titre': 'يوم المناظرة',
    'concours.c1': 'اقرأ الموضوع كاملًا وابدأ بسؤال صعب. علقت بعد دقيقة أو دقيقتين؟ انتقل إلى سؤال سهل ثم عد إليه.',
    'concours.c2': 'تنفّس بعمق لتهدئة التوتر.',
    'concours.c3': 'في النهاية، راجع ورقتك كأنها ورقة شخص آخر.',

    'plan.titre': 'مخطّط المراجعة',
    'plan.intro': 'سجّل الفصل يوم دراسته، وستظهر مواعيد مراجعته تلقائيًا.',
    'plan.nom': 'الفصل أو المفهوم',
    'plan.exemple': 'مثال: المتسلسلات الصحيحة',
    'plan.date': 'تاريخ الدراسة',
    'plan.ajouter': 'أضف',
    'plan.aujourdhui': 'للمراجعة اليوم',
    'plan.retard': 'متأخّر',
    'plan.rien': 'لا شيء للمراجعة اليوم 🎉',
    'plan.chapitres': 'فصولي',
    'plan.etudie': 'دُرس في {date}',
    'plan.supprimer': 'حذف',
    'plan.fait': 'تمّ',
    'plan.confirmer': 'حذف «{nom}» ومراجعاته؟',
    'plan.erreur.nom': 'اكتب الفصل أو المفهوم.',
    'plan.erreur.date': 'اختر تاريخًا صحيحًا.',
    'plan.bloque': 'متصفحك يمنع الحفظ: ما تسجّله سيختفي عند إعادة تحميل الصفحة.',
    'plan.local': 'كل شيء يبقى على جهازك: لا يُرسل أي شيء.',
    'plan.nojs': 'يحتاج المخطّط إلى JavaScript.',

    'credit.texte': 'مستوحاة من دورة {cours} (ب. أوكلي وت. سيجنوفسكي) على Coursera، ومكيّفة للأقسام التحضيرية من طرف ريان. Prep\'Up غير تابع لـCoursera. {lien}',
    'credit.lien': 'تابع الدورة',

    'pied.aria': 'أدوات Prep\'Up',
    'pied.accueil': 'الرئيسية',
    'pied.calculateur': 'حاسبة الترتيب',
    'pied.places': 'مقاعد 2026',
    'pied.ressources': 'الموارد',
    'pied.chapitres': 'فصول المناظرة',
    'pied.note': 'طرق تعلّم مكيّفة للأقسام التحضيرية.',
  },
};

/** Texte d'une clé, avec ses {variables} remplacées ; le français sert de repli. */
export function t(langue, cle, vars = {}) {
  const brut = TEXTES[langue]?.[cle] ?? TEXTES.fr[cle] ?? cle;
  return brut.replace(/\{(\w+)\}/g, (m, nom) => (nom in vars ? String(vars[nom]) : m));
}

/**
 * Découpe un texte à marqueurs en morceaux : chaînes simples et
 * { marqueur: 'lien' } là où le module doit insérer un élément.
 */
export function morceaux(texte) {
  const parts = [];
  let reste = texte;
  const re = /\{(lien|cours)\}/;
  let m;
  while ((m = re.exec(reste))) {
    if (m.index) parts.push(reste.slice(0, m.index));
    parts.push({ marqueur: m[1] });
    reste = reste.slice(m.index + m[0].length);
  }
  if (reste) parts.push(reste);
  return parts;
}
