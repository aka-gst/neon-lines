#!/usr/bin/env sh
# Сборка «Неон Линий» для Яндекс Игр — НЕ публикует (аккаунт и публикация за Сергеем).
# Своя сборка для aka-gst.ru — tools/vylozhit.sh, в ней Яндекса нет.
#
#   sh tools/sobrat-yandex.sh     → dist-yandex/ и dist-yandex.zip (оба в .gitignore)
#
# Берёт тот же белый список, что своя выкладка, и меняет копию index.html по якорям,
# каждый из которых обязан найтись ровно один раз (иначе стоп):
#   - убраны общие файлы сайта (/game-menu.css, /player-name.js, /tour.js) и счётчик /pulse;
#   - убрана ссылка «НА САЙТ» и og/twitter-ссылки на aka-gst.ru (внешние ссылки площадка запрещает);
#   - добавлены /sdk.js (его отдаёт сам Яндекс) и yandex.js до game.js;
#   - в копии game.js не регистрируется service worker (в iframe площадки он не нужен).
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"
OUT=dist-yandex
FILES="index.html game.js flow.js styles.css android.css manifest.webmanifest favicon.svg burst.png icon-192.png icon-512.png art yandex.js"
rm -rf "$OUT" "$OUT.zip"; mkdir -p "$OUT"
for f in $FILES; do [ -e "$f" ] || { echo "нет файла: $f" >&2; exit 2; }; cp -R "$f" "$OUT/"; done

python3 - "$OUT" <<'PY'
import re, sys, pathlib
out = pathlib.Path(sys.argv[1])
def zamena(path, old, new):
    s = path.read_text(encoding='utf-8'); n = s.count(old)
    if n != 1: sys.exit(f'ОШИБКА: в {path.name} якорь найден {n} раз, а должен 1: {old[:60]!r}')
    path.write_text(s.replace(old, new), encoding='utf-8')
idx = out / 'index.html'
for old in ['  <link rel="stylesheet" href="/game-menu.css?v=1">\n',
            '  <script defer src="/player-name.js?v=3"></script>\n',
            '  <script defer src="/tour.js?v=1"></script>\n',
            '    <a class="game-home-menu" href="/">НА САЙТ</a>\n']:
    zamena(idx, old, '')
s = idx.read_text(encoding='utf-8')
pulse = re.findall(r'  <script>\n    /\* \?test.*?</script>\n', s, flags=re.S)
if len(pulse) != 1: sys.exit(f'ОШИБКА: блок счётчика найден {len(pulse)} раз')
s = s.replace(pulse[0], '')
s, n = re.subn(r'  <meta (property="og:[^"]+"|name="twitter:[^"]+") content="https://aka-gst\.ru[^"]*">\n', '', s)
idx.write_text(s, encoding='utf-8')
zamena(idx, '  <script src="flow.js?v=3"></script>\n',
       '  <script src="/sdk.js"></script>\n  <script src="yandex.js?v=1"></script>\n  <script src="flow.js?v=3"></script>\n')
zamena(out / 'game.js', "if('serviceWorker' in navigator)void navigator.serviceWorker.register(",
       "if(false&&'serviceWorker' in navigator)void navigator.serviceWorker.register(")
s = idx.read_text(encoding='utf-8')
for bad in ['aka-gst.ru', '/pulse/', 'НА САЙТ', 'game-menu.css']:
    if bad in s: sys.exit(f'ОШИБКА: в index.html Яндекса осталось «{bad}»')
print(f'index.html: убрано og/twitter {n}, счётчик 1, общие файлы 3, «НА САЙТ» 1; добавлены sdk.js и yandex.js')
PY
(cd "$OUT" && zip -qr "../$OUT.zip" .)
echo "готово: $OUT/ и $OUT.zip ($(du -h "$OUT.zip" | cut -f1)) — загружать в консоль Яндекс Игр Сергей будет сам"
