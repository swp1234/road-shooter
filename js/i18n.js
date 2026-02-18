// Road Shooter - i18n (Internationalization)
(function() {
  'use strict';
  try {
    const SUPPORTED = ['ko','en','zh','hi','ru','ja','es','pt','id','tr','de','fr'];

    function detectLang() {
      // Check saved preference
      try {
        const save = JSON.parse(localStorage.getItem('roadShooter_save'));
        if (save && save.settings && save.settings.language) return save.settings.language;
      } catch(e) {}
      // Check URL param
      const params = new URLSearchParams(window.location.search);
      if (params.get('lang') && SUPPORTED.includes(params.get('lang'))) return params.get('lang');
      // Check browser language
      const browserLang = (navigator.language || 'ko').split('-')[0];
      return SUPPORTED.includes(browserLang) ? browserLang : 'ko';
    }

    const lang = detectLang();
    document.documentElement.lang = lang;

    // Update meta tags
    const descMap = {
      ko: '혼자 시작해서 군대를 만들어라! 아이템 수집, 게이트 선택, 보스 격파 - 중독성 넘치는 분대 러너 슈터',
      en: 'Start alone, build an army! Collect soldiers, choose gates, and defeat bosses in this addictive squad runner shooter!',
      ja: '一人から軍隊へ！アイテム収集、ゲート選択、ボス撃破 - 中毒性抜群のスクワッドランナーシューター',
      zh: '从一人到军队！收集士兵、选择门、击败Boss - 令人上瘾的小队跑酷射击游戏',
      es: '¡Empieza solo, construye un ejército! Recoge soldados, elige puertas y derrota jefes.',
      fr: 'Commencez seul, construisez une armée ! Collectez des soldats, choisissez des portes, battez des boss !',
      de: 'Starte allein, baue eine Armee! Sammle Soldaten, wähle Tore und besiege Bosse!',
      pt: 'Comece sozinho, construa um exército! Colete soldados, escolha portões e derrote chefes!',
      ru: 'Начни один, собери армию! Собирай солдат, выбирай ворота и побеждай боссов!',
      hi: 'अकेले शुरू करो, सेना बनाओ! सैनिक इकट्ठा करो, गेट चुनो और बॉस को हराओ!',
      id: 'Mulai sendiri, bangun pasukan! Kumpulkan prajurit, pilih gerbang, dan kalahkan bos!',
      tr: 'Tek başına başla, ordu kur! Asker topla, kapı seç ve patronları yen!'
    };
    const desc = descMap[lang] || descMap.en;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = desc;

    // Set title
    const titleMap = {
      ko: 'Road Shooter - 분대 러너 슈터 게임 | DopaBrain',
      en: 'Road Shooter - Squad Runner Shooter | DopaBrain',
      ja: 'Road Shooter - スクワッドランナーシューター | DopaBrain',
      zh: 'Road Shooter - 小队跑酷射击 | DopaBrain',
      es: 'Road Shooter - Juego de Escuadrón Runner | DopaBrain',
      fr: 'Road Shooter - Jeu de Tir en Escouade | DopaBrain',
      de: 'Road Shooter - Trupp-Runner-Shooter | DopaBrain',
      pt: 'Road Shooter - Jogo de Esquadrão | DopaBrain',
      ru: 'Road Shooter - Отрядный Раннер Шутер | DopaBrain',
      hi: 'Road Shooter - स्क्वाड रनर शूटर गेम | DopaBrain',
      id: 'Road Shooter - Game Pasukan Runner Shooter | DopaBrain',
      tr: 'Road Shooter - Manga Koşucu Nişancı Oyunu | DopaBrain'
    };
    document.title = titleMap[lang] || titleMap.en;

  } catch(e) {
    // Silent fail - don't block app loader
  }
})();
