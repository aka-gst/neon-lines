/* Прослойка Яндекс Игр. Подключается ТОЛЬКО сборкой tools/sobrat-yandex.sh, на aka-gst.ru её нет.
   Грузится до game.js, механику и счёт не трогает:
   - звук молчит, пока вкладка скрыта (требование площадки), и оживает при возврате;
   - запросы к /api/leaderboard (наш сервер) не уходят: на Яндексе его нет, таблица — пустая;
   - SDK: YaGames.init → LoadingAPI.ready(), когда игра отрисовала поле. Нет SDK (локально) — молча дальше. */
(() => {
  const contexts = [];
  const Engine = window.AudioContext || window.webkitAudioContext;
  if (Engine) {
    const Wrapped = function (...args) { const c = new Engine(...args); contexts.push(c); return c; };
    Wrapped.prototype = Engine.prototype;
    window.AudioContext = Wrapped;
    if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  }
  document.addEventListener('visibilitychange', () => {
    for (const c of contexts) {
      if (document.hidden) { if (c.state === 'running') void c.suspend().catch(() => {}); }
      else if (c.state === 'suspended') void c.resume().catch(() => {});
    }
  });

  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url || '';
    if (url.startsWith('/api/leaderboard')) {
      const body = url.includes('/scores') ? { scores: [] } : {};
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch(input, init);
  };

  const ready = () => {
    if (typeof window.YaGames === 'undefined') return;
    window.YaGames.init().then(ysdk => {
      window.ysdk = ysdk;
      ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready();
    }).catch(() => {});
  };
  if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready, { once: true });
})();
