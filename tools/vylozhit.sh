#!/usr/bin/env sh
# Выкладка «Неон Линий» по БЕЛОМУ списку и сверка по бою.
#
# Заведено 3 сентября 2026 после того, как в публичном репозитории нашли
# ФИНИШ.md с картой сервера. Сам файл наружу не отдавался, но выкладка тут
# делалась руками, и следующий `rsync -av .` унёс бы на сайт всё разом:
# ФИНИШ.md, съёмка-карточек.md, assets-wanted.json.
#
# Чёрный список защищает только от того, что в него успели вписать, и новый
# файл проходит сквозь него молча. Поэтому здесь белый: что не перечислено,
# то не уезжает.
#
# `-R` обязателен: без него rsync берёт от аргумента только имя, и папка
# art/ легла бы в корень сайта вместо lines/art/.
#
# Имена переменных латиницей намеренно: POSIX-оболочка не принимает кириллицу
# в имени и падает на первом же присваивании.
#
#   sh tools/vylozhit.sh
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

DEST="${DEST:-bonita:/opt/zakriva/caddy/site/lines/}"
SITE="${SITE:-https://aka-gst.ru/lines}"

# Белый список. Добавил файл в игру — впиши сюда, иначе он не уедет.
FILES="index.html game.js styles.css android.css sw.js manifest.webmanifest
       favicon.svg burst.png og.jpg icon-192.png icon-512.png icon-maskable-512.png art"

LIST=""
for f in $FILES; do
  [ -e "$f" ] || { echo "  нет такого файла: $f"; exit 2; }
  LIST="$LIST ./$f"
done

n=1
while [ "$n" -le 3 ]; do
  # shellcheck disable=SC2086
  if rsync -avzR --timeout=120 -e "ssh -o ConnectTimeout=25" \
      --exclude='*.md' --exclude='.git*' --exclude='assets-wanted.json' --exclude='tools/' \
      $LIST "$DEST" >/dev/null 2>&1; then
    break
  fi
  n=$((n + 1)); sleep 5
done
[ "$n" -le 3 ] || { echo "  rsync не прошёл трижды"; exit 1; }

echo "== сверка по бою =="
bad=0; seen=0
for f in index.html game.js styles.css sw.js art/ball-core-red.png; do
  seen=$((seen + 1))
  a=$(shasum -a 256 "$f" | cut -c1-12)
  b=$(curl -s --retry 3 --retry-all-errors --max-time 40 -o /tmp/vyl.$$ "$SITE/$f?svezho=$(date +%s)" \
      && shasum -a 256 /tmp/vyl.$$ | cut -c1-12)
  if [ "$a" = "$b" ]; then printf '  ok    %-26s %s\n' "$f" "$a"
  else printf '  FAIL  %-26s дерево %s, бой %s\n' "$f" "$a" "$b"; bad=$((bad + 1)); fi
done
rm -f /tmp/vyl.$$
# Ноль сверенных — это не успех, а молчание меры.
[ "$seen" -gt 0 ] || { echo "  нечего было сверять"; exit 1; }

echo "== внутренние файлы обязаны отдавать 404 =="
for f in "ФИНИШ.md" "съёмка-карточек.md" "assets-wanted.json"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --retry 2 --max-time 30 "$SITE/$f?svezho=$(date +%s)")
  if [ "$code" = "404" ] || [ "$code" = "403" ]; then printf '  ok    %-26s %s\n' "$f" "$code"
  else printf '  ТЕЧЁТ %-26s %s\n' "$f" "$code"; bad=$((bad + 1)); fi
done

[ "$bad" -eq 0 ] || { echo "  не сошлось: $bad"; exit 1; }
echo "  всё доехало, внутреннее закрыто"
