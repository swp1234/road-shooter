// Keep document language aligned with the locale selected by the game.
(function () {
  'use strict';

  const supported = ['ko','en','zh','hi','ru','ja','es','pt','id','tr','de','fr'];
  const requested = new URLSearchParams(window.location.search).get('lang');
  let saved = '';

  try {
    saved = JSON.parse(localStorage.getItem('roadShooter_save'))?.settings?.language || '';
  } catch (_) {
    // Invalid local data must not block the game.
  }

  const browser = (navigator.language || 'en').split('-')[0];
  const lang = supported.includes(requested)
    ? requested
    : supported.includes(saved)
      ? saved
      : supported.includes(browser) ? browser : 'en';
  document.documentElement.lang = lang;

  const descriptions = {
    ko: '혼자 시작해서 군대를 만들어라! 아이템을 모으고 게이트를 선택해 보스를 물리치는 분대 러너 슈터입니다.',
    en: 'Start alone and build an army. Collect soldiers, choose gates, and defeat bosses in a squad runner shooter.',
    zh: '从一人到一支军队！收集士兵、选择门并击败 Boss。',
    hi: 'अकेले शुरू करें, सैनिक जुटाएँ, गेट चुनें और बॉस को हराएँ।',
    ru: 'Начните в одиночку, соберите отряд, выбирайте ворота и побеждайте боссов.',
    ja: '一人から部隊を作り、兵士を集め、ゲートを選び、ボスを倒すランナーシューターです。',
    es: 'Empieza solo, reúne soldados, elige puertas y derrota a los jefes.',
    pt: 'Comece sozinho, reúna soldados, escolha portões e derrote chefes.',
    id: 'Mulai sendiri, kumpulkan prajurit, pilih gerbang, dan kalahkan bos.',
    tr: 'Tek başına başla, asker topla, kapıları seç ve patronları yen.',
    de: 'Starte allein, sammle Soldaten, wähle Tore und besiege Bosse.',
    fr: 'Commencez seul, recrutez des soldats, choisissez les portes et battez les boss.',
  };
  const titles = {
    ko: 'Road Shooter - 분대 러너 슈터 게임 | DopaBrain',
    en: 'Road Shooter - Squad Runner Shooter | DopaBrain',
    zh: 'Road Shooter - 小队跑酷射击 | DopaBrain',
    hi: 'Road Shooter - स्क्वाड रनर शूटर | DopaBrain',
    ru: 'Road Shooter - Отрядный раннер-шутер | DopaBrain',
    ja: 'Road Shooter - スクワッドランナーシューター | DopaBrain',
    es: 'Road Shooter - Juego de escuadrón runner | DopaBrain',
    pt: 'Road Shooter - Jogo de esquadrão runner | DopaBrain',
    id: 'Road Shooter - Game pasukan runner | DopaBrain',
    tr: 'Road Shooter - Takım koşu nişancı oyunu | DopaBrain',
    de: 'Road Shooter - Trupp-Runner-Shooter | DopaBrain',
    fr: 'Road Shooter - Jeu de tir en escouade | DopaBrain',
  };
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = descriptions[lang];
  document.title = titles[lang];
})();
